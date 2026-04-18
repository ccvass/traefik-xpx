#!/usr/bin/env bash
# Build traefik-api-srv with FIPS 140-2 compliant cryptography.
#
# Uses Go's BoringCrypto experiment (GOEXPERIMENT=boringcrypto) which
# replaces the standard crypto/tls, crypto/x509, and crypto/ecdsa
# implementations with BoringSSL (FIPS 140-2 validated).
#
# Requirements:
# - Go 1.22+ (boringcrypto support)
# - Linux (amd64 or arm64) — BoringCrypto is not available on other platforms
#
# Usage:
#   ./script/build-fips.sh              # Build binary
#   ./script/build-fips.sh docker       # Build Docker image

set -euo pipefail

BINARY_NAME="traefik-fips"
VERSION="${VERSION:-$(git describe --tags --always --dirty 2>/dev/null || echo dev)}"
BUILD_DATE="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

export CGO_ENABLED=1
export GOEXPERIMENT=boringcrypto

echo "Building ${BINARY_NAME} ${VERSION} with FIPS 140-2 (BoringCrypto)..."

go build \
    -tags "boringcrypto" \
    -ldflags "-s -w -X github.com/traefik/traefik/v3/pkg/version.Version=${VERSION} -X github.com/traefik/traefik/v3/pkg/version.BuildDate=${BUILD_DATE}" \
    -o "${BINARY_NAME}" \
    ./cmd/traefik

# Verify BoringCrypto is linked.
if go tool nm "${BINARY_NAME}" 2>/dev/null | grep -q "_Cfunc__goboringcrypto_"; then
    echo "✓ FIPS 140-2 (BoringCrypto) verified in binary"
else
    echo "⚠ WARNING: BoringCrypto symbols not found — binary may not be FIPS compliant"
    echo "  Ensure Go was built with GOEXPERIMENT=boringcrypto support"
fi

if [ "${1:-}" = "docker" ]; then
    echo "Building FIPS Docker image..."
    docker build -f Dockerfile.fips -t "traefik-api-srv:${VERSION}-fips" .
fi

echo "Done: ${BINARY_NAME} (${VERSION})"
