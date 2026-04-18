# Semantic Cache

Cache LLM responses based on semantic similarity of prompts.

## Configuration

```yaml
http:
  middlewares:
    ai-cache:
      semanticCache:
        ttl: 3600
        maxEntries: 10000
        similarityThreshold: 0.92
        embeddingModel: "text-embedding-3-small"
```

## Options

| Field | Description | Default |
|-------|-------------|---------|
| `ttl` | Cache entry TTL in seconds | 3600 |
| `maxEntries` | Maximum cached entries | 10000 |
| `similarityThreshold` | Cosine similarity threshold (0-1) | 0.92 |
| `embeddingModel` | Model for computing embeddings | text-embedding-3-small |
