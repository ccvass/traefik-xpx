package api

import (
	"encoding/json"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"sync"
	"syscall"
	"time"

	"github.com/fsnotify/fsnotify"
	"github.com/rs/zerolog/log"
)

// StaticReloader watches the static config file and provides a reload endpoint.
type StaticReloader struct {
	mu          sync.Mutex
	filePath    string
	lastReload  time.Time
	autoReload  bool
}

func newStaticReloader(filePath string, autoReload bool) *StaticReloader {
	sr := &StaticReloader{
		filePath:   filePath,
		autoReload: autoReload,
	}
	if autoReload && filePath != "" {
		go sr.watch()
	}
	return sr
}

func (sr *StaticReloader) watch() {
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		log.Error().Err(err).Msg("Failed to create static config watcher")
		return
	}
	defer watcher.Close()

	dir := filepath.Dir(sr.filePath)
	if err := watcher.Add(dir); err != nil {
		log.Error().Err(err).Str("dir", dir).Msg("Failed to watch static config directory")
		return
	}

	log.Info().Str("file", sr.filePath).Msg("Watching static config for changes")

	for {
		select {
		case event, ok := <-watcher.Events:
			if !ok {
				return
			}
			if filepath.Base(event.Name) == filepath.Base(sr.filePath) && (event.Op&fsnotify.Write != 0 || event.Op&fsnotify.Create != 0) {
				sr.mu.Lock()
				if time.Since(sr.lastReload) > 2*time.Second {
					sr.lastReload = time.Now()
					log.Info().Msg("Static config changed, triggering graceful reload")
					sr.triggerReload()
				}
				sr.mu.Unlock()
			}
		case err, ok := <-watcher.Errors:
			if !ok {
				return
			}
			log.Error().Err(err).Msg("Static config watcher error")
		}
	}
}

func (sr *StaticReloader) triggerReload() {
	// Send SIGHUP to self for graceful reload.
	p, err := os.FindProcess(os.Getpid())
	if err != nil {
		log.Error().Err(err).Msg("Cannot find own process for reload")
		return
	}
	if err := p.Signal(syscall.SIGHUP); err != nil {
		log.Error().Err(err).Msg("Failed to send SIGHUP for reload")
		// Fallback: exec self.
		exe, _ := os.Executable()
		if exe != "" {
			exec.Command("systemctl", "restart", "traefik-api-srv").Start()
		}
	}
}

// handleReload provides a manual reload endpoint.
func (sr *StaticReloader) handleReload(rw http.ResponseWriter, _ *http.Request) {
	sr.mu.Lock()
	defer sr.mu.Unlock()

	sr.lastReload = time.Now()
	log.Info().Msg("Manual reload triggered via API")
	go sr.triggerReload()

	rw.Header().Set("Content-Type", "application/json")
	json.NewEncoder(rw).Encode(map[string]string{
		"status":  "reloading",
		"message": "Graceful reload initiated",
	})
}

// handleReloadStatus returns the last reload time.
func (sr *StaticReloader) handleReloadStatus(rw http.ResponseWriter, _ *http.Request) {
	sr.mu.Lock()
	defer sr.mu.Unlock()

	rw.Header().Set("Content-Type", "application/json")
	json.NewEncoder(rw).Encode(map[string]interface{}{
		"autoReload": sr.autoReload,
		"configFile": sr.filePath,
		"lastReload": sr.lastReload,
	})
}
