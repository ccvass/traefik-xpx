package api

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog/log"
)

type redisStore struct {
	client *redis.Client
	prefix string
}

func newValkeyStore(valkeyURL string) *redisStore {
	opts, err := redis.ParseURL(valkeyURL)
	if err != nil {
		log.Warn().Err(err).Msg("Invalid Valkey URL for auth store, using file fallback")
		return nil
	}
	client := redis.NewClient(opts)
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	if err := client.Ping(ctx).Err(); err != nil {
		log.Warn().Err(err).Msg("Valkey not reachable for auth store, using file fallback")
		return nil
	}
	log.Info().Msg("Valkey connected for auth store (users + sessions)")
	return &redisStore{client: client, prefix: "traefik-xp:"}
}

// Users

func (r *redisStore) getUsers() map[string]string {
	ctx := context.Background()
	data, err := r.client.HGetAll(ctx, r.prefix+"users").Result()
	if err != nil {
		return nil
	}
	return data
}

func (r *redisStore) setUser(username, password string) {
	ctx := context.Background()
	r.client.HSet(ctx, r.prefix+"users", username, password)
}

func (r *redisStore) deleteUser(username string) {
	ctx := context.Background()
	r.client.HDel(ctx, r.prefix+"users", username)
}

// Sessions

func (r *redisStore) setSession(token, user string, ttl time.Duration) {
	ctx := context.Background()
	r.client.Set(ctx, r.prefix+"session:"+token, user, ttl)
}

func (r *redisStore) getSession(token string) (string, bool) {
	ctx := context.Background()
	user, err := r.client.Get(ctx, r.prefix+"session:"+token).Result()
	if err != nil {
		return "", false
	}
	return user, true
}

func (r *redisStore) deleteSession(token string) {
	ctx := context.Background()
	r.client.Del(ctx, r.prefix+"session:"+token)
}

// Integration with sessionManager

func (sm *sessionManager) initRedis(valkeyURL string) {
	if valkeyURL == "" {
		return
	}
	sm.redis = newValkeyStore(valkeyURL)
	if sm.redis == nil {
		return
	}
	// Load users from Valkey
	users := sm.redis.getUsers()
	sm.mu.Lock()
	for k, v := range users {
		sm.users[k] = v
	}
	// Push local users to Valkey (ensure admin exists)
	for k, v := range sm.users {
		sm.redis.setUser(k, v)
	}
	sm.mu.Unlock()
}

func (sm *sessionManager) persistUser(username, password string) {
	sm.saveUsersToFile()
	if sm.redis != nil {
		sm.redis.setUser(username, password)
	}
}

func (sm *sessionManager) persistDeleteUser(username string) {
	sm.saveUsersToFile()
	if sm.redis != nil {
		sm.redis.deleteUser(username)
	}
}

func (sm *sessionManager) persistSession(token, user string) {
	if sm.redis != nil {
		sm.redis.setSession(token, user, sm.tokenTTL)
	}
}

func (sm *sessionManager) checkSessionRedis(token string) (string, bool) {
	if sm.redis != nil {
		return sm.redis.getSession(token)
	}
	return "", false
}

func (sm *sessionManager) persistDeleteSession(token string) {
	if sm.redis != nil {
		sm.redis.deleteSession(token)
	}
}
