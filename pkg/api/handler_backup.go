package api

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

// BackupHandler provides backup and restore endpoints for configuration state.
type BackupHandler struct {
	staticPath  string
	dynamicPath string
}

func newBackupHandler(staticPath, dynamicPath string) *BackupHandler {
	return &BackupHandler{staticPath: staticPath, dynamicPath: dynamicPath}
}

// handleBackup exports static + dynamic config as a gzipped tarball.
func (b *BackupHandler) handleBackup(rw http.ResponseWriter, _ *http.Request) {
	var buf bytes.Buffer
	gw := gzip.NewWriter(&buf)
	tw := tar.NewWriter(gw)

	for _, path := range []string{b.staticPath, b.dynamicPath} {
		if path == "" {
			continue
		}
		data, err := os.ReadFile(path)
		if err != nil {
			continue
		}
		hdr := &tar.Header{
			Name:    filepath.Base(path),
			Size:    int64(len(data)),
			Mode:    0644,
			ModTime: time.Now(),
		}
		tw.WriteHeader(hdr)
		tw.Write(data)
	}

	tw.Close()
	gw.Close()

	rw.Header().Set("Content-Type", "application/gzip")
	rw.Header().Set("Content-Disposition", "attachment; filename=traefik-backup-"+time.Now().Format("20060102-150405")+".tar.gz")
	rw.Write(buf.Bytes())
}

// handleRestore imports a backup tarball and overwrites config files.
func (b *BackupHandler) handleRestore(rw http.ResponseWriter, req *http.Request) {
	body, err := io.ReadAll(req.Body)
	if err != nil {
		http.Error(rw, "reading body: "+err.Error(), http.StatusBadRequest)
		return
	}

	gr, err := gzip.NewReader(bytes.NewReader(body))
	if err != nil {
		http.Error(rw, "invalid gzip: "+err.Error(), http.StatusBadRequest)
		return
	}
	defer gr.Close()

	tr := tar.NewReader(gr)
	restored := []string{}

	for {
		hdr, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			http.Error(rw, "reading tar: "+err.Error(), http.StatusBadRequest)
			return
		}

		data, _ := io.ReadAll(tr)

		var targetPath string
		switch hdr.Name {
		case filepath.Base(b.staticPath):
			targetPath = b.staticPath
		case filepath.Base(b.dynamicPath):
			targetPath = b.dynamicPath
		default:
			continue
		}

		if err := os.WriteFile(targetPath, data, 0644); err != nil {
			http.Error(rw, "writing "+hdr.Name+": "+err.Error(), http.StatusInternalServerError)
			return
		}
		restored = append(restored, hdr.Name)
	}

	rw.Header().Set("Content-Type", "application/json")
	json.NewEncoder(rw).Encode(map[string]interface{}{
		"status":   "restored",
		"files":    restored,
		"message":  "Restart or reload required to apply static config changes",
	})
}
