package debugger

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"
)

// TraceEntry represents a captured request/response for debugging.
type TraceEntry struct {
	ID            string            `json:"id"`
	Timestamp     time.Time         `json:"timestamp"`
	Method        string            `json:"method"`
	Path          string            `json:"path"`
	Host          string            `json:"host"`
	RequestHeaders map[string]string `json:"requestHeaders"`
	StatusCode    int               `json:"statusCode"`
	ResponseHeaders map[string]string `json:"responseHeaders,omitempty"`
	Duration      time.Duration     `json:"duration"`
	Router        string            `json:"router,omitempty"`
	Service       string            `json:"service,omitempty"`
	Middlewares   []string          `json:"middlewares,omitempty"`
	Error         string            `json:"error,omitempty"`
}

// Debugger captures and serves traffic traces for debugging.
type Debugger struct {
	mu      sync.RWMutex
	traces  []TraceEntry
	maxSize int
	enabled bool
}

// New creates a new traffic debugger.
func New(maxSize int) *Debugger {
	if maxSize <= 0 {
		maxSize = 1000
	}
	return &Debugger{
		traces:  make([]TraceEntry, 0, maxSize),
		maxSize: maxSize,
		enabled: true,
	}
}

// Record adds a trace entry.
func (d *Debugger) Record(entry TraceEntry) {
	if !d.enabled {
		return
	}
	d.mu.Lock()
	defer d.mu.Unlock()

	if len(d.traces) >= d.maxSize {
		d.traces = d.traces[1:]
	}
	d.traces = append(d.traces, entry)
}

// Enable enables/disables the debugger.
func (d *Debugger) Enable(enabled bool) {
	d.enabled = enabled
}

// Clear removes all traces.
func (d *Debugger) Clear() {
	d.mu.Lock()
	d.traces = d.traces[:0]
	d.mu.Unlock()
}

// ServeHTTP serves the debug traces API.
func (d *Debugger) ServeHTTP(rw http.ResponseWriter, req *http.Request) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	rw.Header().Set("Content-Type", "application/json")

	filter := req.URL.Query().Get("path")
	if filter == "" {
		json.NewEncoder(rw).Encode(d.traces)
		return
	}

	var filtered []TraceEntry
	for _, t := range d.traces {
		if t.Path == filter {
			filtered = append(filtered, t)
		}
	}
	json.NewEncoder(rw).Encode(filtered)
}
