package cluster

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"fmt"
	"math/big"
	"net"
	"os"
	"path/filepath"
	"time"

	"github.com/rs/zerolog/log"
)

// MTLSConfig holds the mTLS cluster communication configuration.
type MTLSConfig struct {
	Enabled  bool   `json:"enabled" toml:"enabled" yaml:"enabled"`
	CertDir  string `json:"certDir,omitempty" toml:"certDir,omitempty" yaml:"certDir,omitempty"`
	CAFile   string `json:"caFile,omitempty" toml:"caFile,omitempty" yaml:"caFile,omitempty"`
	CertFile string `json:"certFile,omitempty" toml:"certFile,omitempty" yaml:"certFile,omitempty"`
	KeyFile  string `json:"keyFile,omitempty" toml:"keyFile,omitempty" yaml:"keyFile,omitempty"`
}

// InternalCA manages an auto-generated internal CA for cluster mTLS.
type InternalCA struct {
	caCert    *x509.Certificate
	caKey     *ecdsa.PrivateKey
	caPEM     []byte
	certDir   string
}

// NewInternalCA creates or loads an internal CA for cluster communication.
func NewInternalCA(config MTLSConfig) (*InternalCA, error) {
	certDir := config.CertDir
	if certDir == "" {
		certDir = "/etc/traefik/cluster-certs"
	}

	if err := os.MkdirAll(certDir, 0700); err != nil {
		return nil, fmt.Errorf("creating cert dir: %w", err)
	}

	caPath := filepath.Join(certDir, "ca.pem")
	keyPath := filepath.Join(certDir, "ca-key.pem")

	// Try to load existing CA.
	if _, err := os.Stat(caPath); err == nil {
		return loadCA(caPath, keyPath, certDir)
	}

	// Generate new CA.
	return generateCA(caPath, keyPath, certDir)
}

func generateCA(caPath, keyPath, certDir string) (*InternalCA, error) {
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return nil, fmt.Errorf("generating CA key: %w", err)
	}

	template := &x509.Certificate{
		SerialNumber: big.NewInt(1),
		Subject: pkix.Name{
			Organization: []string{"traefik-api-srv"},
			CommonName:   "traefik-api-srv Internal CA",
		},
		NotBefore:             time.Now(),
		NotAfter:              time.Now().Add(10 * 365 * 24 * time.Hour),
		KeyUsage:              x509.KeyUsageCertSign | x509.KeyUsageCRLSign,
		BasicConstraintsValid: true,
		IsCA:                  true,
	}

	certDER, err := x509.CreateCertificate(rand.Reader, template, template, &key.PublicKey, key)
	if err != nil {
		return nil, fmt.Errorf("creating CA cert: %w", err)
	}

	cert, err := x509.ParseCertificate(certDER)
	if err != nil {
		return nil, fmt.Errorf("parsing CA cert: %w", err)
	}

	// Write CA cert.
	caPEM := pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: certDER})
	if err := os.WriteFile(caPath, caPEM, 0644); err != nil {
		return nil, fmt.Errorf("writing CA cert: %w", err)
	}

	// Write CA key.
	keyDER, _ := x509.MarshalECPrivateKey(key)
	keyPEM := pem.EncodeToMemory(&pem.Block{Type: "EC PRIVATE KEY", Bytes: keyDER})
	if err := os.WriteFile(keyPath, keyPEM, 0600); err != nil {
		return nil, fmt.Errorf("writing CA key: %w", err)
	}

	log.Info().Str("path", caPath).Msg("Generated internal CA for cluster mTLS")

	return &InternalCA{caCert: cert, caKey: key, caPEM: caPEM, certDir: certDir}, nil
}

func loadCA(caPath, keyPath, certDir string) (*InternalCA, error) {
	caPEM, err := os.ReadFile(caPath)
	if err != nil {
		return nil, err
	}
	block, _ := pem.Decode(caPEM)
	cert, err := x509.ParseCertificate(block.Bytes)
	if err != nil {
		return nil, err
	}

	keyPEM, err := os.ReadFile(keyPath)
	if err != nil {
		return nil, err
	}
	keyBlock, _ := pem.Decode(keyPEM)
	key, err := x509.ParseECPrivateKey(keyBlock.Bytes)
	if err != nil {
		return nil, err
	}

	log.Info().Str("path", caPath).Msg("Loaded internal CA for cluster mTLS")
	return &InternalCA{caCert: cert, caKey: key, caPEM: caPEM, certDir: certDir}, nil
}

// IssueCert issues a node certificate signed by the internal CA.
func (ca *InternalCA) IssueCert(nodeID string, ips []net.IP) (tls.Certificate, error) {
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return tls.Certificate{}, fmt.Errorf("generating node key: %w", err)
	}

	serial, _ := rand.Int(rand.Reader, big.NewInt(1<<62))
	template := &x509.Certificate{
		SerialNumber: serial,
		Subject: pkix.Name{
			Organization: []string{"traefik-api-srv"},
			CommonName:   nodeID,
		},
		NotBefore:   time.Now(),
		NotAfter:    time.Now().Add(365 * 24 * time.Hour),
		KeyUsage:    x509.KeyUsageDigitalSignature | x509.KeyUsageKeyEncipherment,
		ExtKeyUsage: []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth, x509.ExtKeyUsageClientAuth},
		IPAddresses: ips,
	}

	certDER, err := x509.CreateCertificate(rand.Reader, template, ca.caCert, &key.PublicKey, ca.caKey)
	if err != nil {
		return tls.Certificate{}, fmt.Errorf("signing node cert: %w", err)
	}

	certPEM := pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: certDER})
	keyDER, _ := x509.MarshalECPrivateKey(key)
	keyPEM := pem.EncodeToMemory(&pem.Block{Type: "EC PRIVATE KEY", Bytes: keyDER})

	tlsCert, err := tls.X509KeyPair(certPEM, keyPEM)
	if err != nil {
		return tls.Certificate{}, err
	}

	log.Info().Str("node", nodeID).Msg("Issued node certificate")
	return tlsCert, nil
}

// TLSConfig returns a tls.Config for mTLS communication between nodes.
func (ca *InternalCA) TLSConfig(nodeCert tls.Certificate) *tls.Config {
	pool := x509.NewCertPool()
	pool.AppendCertsFromPEM(ca.caPEM)

	return &tls.Config{
		Certificates: []tls.Certificate{nodeCert},
		ClientCAs:    pool,
		RootCAs:      pool,
		ClientAuth:   tls.RequireAndVerifyClientCert,
		MinVersion:   tls.VersionTLS13,
	}
}

// CAPem returns the CA certificate in PEM format.
func (ca *InternalCA) CAPem() []byte {
	return ca.caPEM
}
