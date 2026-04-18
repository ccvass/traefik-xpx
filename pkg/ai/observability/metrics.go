package observability

import (
	"context"
	"sync/atomic"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/trace"
)

const instrumentationName = "github.com/traefik/traefik/v3/pkg/ai/observability"

// Metrics holds AI-specific OpenTelemetry metrics.
type Metrics struct {
	tracer           trace.Tracer
	requestCounter   metric.Int64Counter
	tokenCounter     metric.Int64Counter
	latencyHistogram metric.Float64Histogram
	errorCounter     metric.Int64Counter
	costCounter      metric.Float64Counter
	activeRequests   atomic.Int64
}

// NewMetrics creates AI observability metrics.
func NewMetrics() (*Metrics, error) {
	tracer := otel.Tracer(instrumentationName)
	meter := otel.Meter(instrumentationName)

	reqCounter, err := meter.Int64Counter("ai.requests.total",
		metric.WithDescription("Total AI requests"))
	if err != nil {
		return nil, err
	}

	tokenCounter, err := meter.Int64Counter("ai.tokens.total",
		metric.WithDescription("Total tokens consumed"))
	if err != nil {
		return nil, err
	}

	latency, err := meter.Float64Histogram("ai.request.duration_seconds",
		metric.WithDescription("AI request duration in seconds"))
	if err != nil {
		return nil, err
	}

	errCounter, err := meter.Int64Counter("ai.errors.total",
		metric.WithDescription("Total AI request errors"))
	if err != nil {
		return nil, err
	}

	costCounter, err := meter.Float64Counter("ai.cost.total_usd",
		metric.WithDescription("Estimated total cost in USD"))
	if err != nil {
		return nil, err
	}

	return &Metrics{
		tracer:           tracer,
		requestCounter:   reqCounter,
		tokenCounter:     tokenCounter,
		latencyHistogram: latency,
		errorCounter:     errCounter,
		costCounter:      costCounter,
	}, nil
}

// StartSpan starts a traced AI request span.
func (m *Metrics) StartSpan(ctx context.Context, provider, model, operation string) (context.Context, trace.Span) {
	m.activeRequests.Add(1)
	return m.tracer.Start(ctx, "ai."+operation,
		trace.WithAttributes(
			attribute.String("ai.provider", provider),
			attribute.String("ai.model", model),
			attribute.String("ai.operation", operation),
		),
	)
}

// RecordRequest records a completed AI request.
func (m *Metrics) RecordRequest(ctx context.Context, provider, model string, duration time.Duration, promptTokens, completionTokens int, costUSD float64, err error) {
	m.activeRequests.Add(-1)

	attrs := []attribute.KeyValue{
		attribute.String("ai.provider", provider),
		attribute.String("ai.model", model),
	}

	m.requestCounter.Add(ctx, 1, metric.WithAttributes(attrs...))
	m.tokenCounter.Add(ctx, int64(promptTokens+completionTokens), metric.WithAttributes(attrs...))
	m.latencyHistogram.Record(ctx, duration.Seconds(), metric.WithAttributes(attrs...))

	if costUSD > 0 {
		m.costCounter.Add(ctx, costUSD, metric.WithAttributes(attrs...))
	}

	if err != nil {
		m.errorCounter.Add(ctx, 1, metric.WithAttributes(attrs...))
	}
}

// ActiveRequests returns the number of in-flight AI requests.
func (m *Metrics) ActiveRequests() int64 {
	return m.activeRequests.Load()
}
