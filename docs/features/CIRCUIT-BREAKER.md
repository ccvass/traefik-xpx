# Circuit Breaker

Trips when error ratio exceeds threshold, preventing cascade failures.

## Configuration

```yaml
http:
  middlewares:
    my-circuitBreaker:
      circuitBreaker:
        expression: "NetworkErrorRatio() > 0.5"
```

## Docker Swarm Labels

```yaml
deploy:
  labels:
    - "traefik.http.middlewares.my-circuitBreaker.circuitBreaker.expression="NetworkErrorRatio()>0.5""
```
