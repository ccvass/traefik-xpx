package audit

import (
	"encoding/json"
	"io"
	"os"
	"sync"
	"time"
)

// Event represents an auditable agent interaction.
type Event struct {
	Timestamp   time.Time         `json:"timestamp"`
	EventType   string            `json:"eventType"` // tool_call, resource_access, policy_decision, error
	AgentID     string            `json:"agentId"`
	SessionID   string            `json:"sessionId,omitempty"`
	Tool        string            `json:"tool,omitempty"`
	Resource    string            `json:"resource,omitempty"`
	Action      string            `json:"action,omitempty"` // allowed, denied, error
	Duration    time.Duration     `json:"duration,omitempty"`
	StatusCode  int               `json:"statusCode,omitempty"`
	Error       string            `json:"error,omitempty"`
	Metadata    map[string]string `json:"metadata,omitempty"`
}

// Logger writes structured audit events.
type Logger struct {
	mu     sync.Mutex
	writer io.Writer
	enc    *json.Encoder
}

// NewLogger creates an audit logger writing to the given path. Use "-" for stdout.
func NewLogger(path string) (*Logger, error) {
	var w io.Writer
	if path == "" || path == "-" {
		w = os.Stdout
	} else {
		f, err := os.OpenFile(path, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o644)
		if err != nil {
			return nil, err
		}
		w = f
	}

	return &Logger{
		writer: w,
		enc:    json.NewEncoder(w),
	}, nil
}

// Log writes an audit event.
func (l *Logger) Log(event Event) {
	if event.Timestamp.IsZero() {
		event.Timestamp = time.Now()
	}
	l.mu.Lock()
	l.enc.Encode(event)
	l.mu.Unlock()
}

// LogToolCall logs a tool invocation event.
func (l *Logger) LogToolCall(agentID, sessionID, tool, action string, duration time.Duration, err error) {
	e := Event{
		EventType: "tool_call",
		AgentID:   agentID,
		SessionID: sessionID,
		Tool:      tool,
		Action:    action,
		Duration:  duration,
	}
	if err != nil {
		e.Error = err.Error()
		e.Action = "error"
	}
	l.Log(e)
}

// LogPolicyDecision logs a policy evaluation event.
func (l *Logger) LogPolicyDecision(agentID, tool, rule, action, reason string) {
	l.Log(Event{
		EventType: "policy_decision",
		AgentID:   agentID,
		Tool:      tool,
		Action:    action,
		Metadata:  map[string]string{"rule": rule, "reason": reason},
	})
}
