# Development Standards — Traefik-XPX

## Backend (Go)
- Go 1.24+
- Standard project structure (pkg/, cmd/)
- `go build ./cmd/traefik/` to compile
- `go test ./...` for tests
- Error handling: explicit, no silent catches
- Logging: zerolog (structured JSON)

## Frontend (webui-new/)
- React 19 + TypeScript 5.9+ (strict)
- Vite for build tooling
- Tailwind CSS for styling
- Lucide React for icons
- SWR for data fetching (5s polling)
- React Router v6 (HashRouter)
- Named exports (no default exports)
- Feature-based directory structure

## Linting & Formatting
- Go: `gofmt`, `go vet`
- TypeScript: ESLint + Prettier
- Markdown: CommonMark compliant

## Testing
- Go: `go test` for unit tests
- Frontend: Playwright for UI validation
- Screenshots at 3 viewports (375, 768, 1920)

## Git
- Conventional commits: `<type>(<scope>): <subject> (#issue)`
- Branches: `feat/`, `fix/`, `docs/`, `chore/`
- PRs to master, delete branch after merge

## Build
```bash
# Frontend
cd webui-new && npm ci && npx vite build

# Backend
go build -o traefik-xpx ./cmd/traefik

# FIPS
CGO_ENABLED=1 GOEXPERIMENT=boringcrypto go build -o traefik-xpx ./cmd/traefik

# Docker
docker build -t traefik-xpx .
docker build -f Dockerfile.fips -t traefik-xpx:fips .
```

## Deploy
```bash
# Remote
ssh root@159.203.139.159
cd /opt/traefik-api-srv
git pull origin master
cd webui-new && npx vite build
cd .. && go build -o traefik-api-srv ./cmd/traefik
systemctl restart traefik-api-srv
```
