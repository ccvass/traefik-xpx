package events

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"
)

// EventType classifies events for correlation.
type EventType string

const (
	EventConfigChange  EventType = "config_change"
	EventDeploy        EventType = "deploy"
	EventErrorSpike    EventType = "error_spike"
	EventLatencySpike  EventType = "latency_spike"
	EventCertEvent     EventType = "cert_event"
	EventScaling       EventType = "scaling"
)

// Event represents a system event.
type Event struct {
	ID        string            `json:"id"`
	Type      EventType         `json:"type"`
	Source    string            `json:"source"`
	Message  string            `json:"message"`
	Severity string            `json:"severity"` // info, warning, critical
	Timestamp time.Time         `json:"timestamp"`
	Metadata map[string]string  `json:"metadata,omitempty"`
}

// CorrelationGroup holds correlated events that likely share a root cause.
type CorrelationGroup struct {
	ID        string    `json:"id"`
	RootCause string    `json:"rootCause,omitempty"`
	Events    []Event   `json:"events"`
	StartTime time.Time `json:"startTime"`
	EndTime   time.Time `json:"endTime"`
}

// Config holds event correlation configuration.
type Config struct {
	RetentionPeriod   time.Duration `json:"retentionPeriod,omitempty"`
	CorrelationWindow time.Duration `json:"correlationWindow,omitempty"`
	MaxEvents         int           `json:"maxEvents,omitempty"`
}

// Correlator aggregates events and groups them by time proximity.
type Correlator struct {
	mu       sync.RWMutex
	events   []Event
	window   time.Duration
	maxEvents int
	retention time.Duration
}

// New creates a new event correlator with automatic retention cleanup.
func New(config Config) *Correlator {
	window := config.CorrelationWindow
	if window <= 0 {
		window = 5 * time.Minute
	}
	retention := config.RetentionPeriod
	if retention <= 0 {
		retention = 24 * time.Hour
	}
	maxEvents := config.MaxEvents
	if maxEvents <= 0 {
		maxEvents = 10000
	}
	c := &Correlator{
		events:    make([]Event, 0, 256),
		window:    window,
		maxEvents: maxEvents,
		retention: retention,
	}
	// Auto-cleanup goroutine enforces retention automatically.
	go func() {
		ticker := time.NewTicker(retention / 10)
		defer ticker.Stop()
		for range ticker.C {
			c.Cleanup()
		}
	}()
	return c
}

// Record adds an event.
func (c *Correlator) Record(event Event) {
	if event.Timestamp.IsZero() {
		event.Timestamp = time.Now()
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	if len(c.events) >= c.maxEvents {
		c.events = c.events[1:]
	}
	c.events = append(c.events, event)
}

// Correlate returns groups of events within the correlation window.
func (c *Correlator) Correlate() []CorrelationGroup {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if len(c.events) == 0 {
		return nil
	}

	var groups []CorrelationGroup
	used := make(map[int]bool)

	for i, ev := range c.events {
		if used[i] {
			continue
		}
		group := CorrelationGroup{
			ID:        ev.ID,
			Events:    []Event{ev},
			StartTime: ev.Timestamp,
			EndTime:   ev.Timestamp,
		}
		used[i] = true

		for j := i + 1; j < len(c.events); j++ {
			if used[j] {
				continue
			}
			if c.events[j].Timestamp.Sub(group.StartTime) <= c.window {
				group.Events = append(group.Events, c.events[j])
				if c.events[j].Timestamp.After(group.EndTime) {
					group.EndTime = c.events[j].Timestamp
				}
				used[j] = true
			}
		}

		if len(group.Events) > 1 {
			group.RootCause = inferRootCause(group.Events)
			groups = append(groups, group)
		}
	}

	return groups
}

// Timeline returns events in chronological order within a time range.
func (c *Correlator) Timeline(from, to time.Time) []Event {
	c.mu.RLock()
	defer c.mu.RUnlock()

	var result []Event
	for _, ev := range c.events {
		if (ev.Timestamp.Equal(from) || ev.Timestamp.After(from)) && ev.Timestamp.Before(to) {
			result = append(result, ev)
		}
	}
	return result
}

// Cleanup removes events older than retention period.
func (c *Correlator) Cleanup() {
	c.mu.Lock()
	defer c.mu.Unlock()
	cutoff := time.Now().Add(-c.retention)
	i := 0
	for i < len(c.events) && c.events[i].Timestamp.Before(cutoff) {
		i++
	}
	c.events = c.events[i:]
}

// ServeHTTP serves correlated events as JSON.
func (c *Correlator) ServeHTTP(rw http.ResponseWriter, _ *http.Request) {
	rw.Header().Set("Content-Type", "application/json")
	json.NewEncoder(rw).Encode(c.Correlate())
}

// inferRootCause attempts to identify the most likely root cause from correlated events.
func inferRootCause(events []Event) string {
	// Priority: config_change > deploy > scaling > cert_event > error_spike > latency_spike
	priority := map[EventType]int{
		EventConfigChange: 6, EventDeploy: 5, EventScaling: 4,
		EventCertEvent: 3, EventErrorSpike: 2, EventLatencySpike: 1,
	}
	var best Event
	bestPri := 0
	for _, ev := range events {
		if p := priority[ev.Type]; p > bestPri {
			bestPri = p
			best = ev
		}
	}
	if bestPri > 0 {
		return string(best.Type) + ": " + best.Message
	}
	return "unknown"
}
