package api

import (
	"encoding/json"
	"net/http"

	"github.com/traefik/traefik/v3/pkg/apimgmt/grafana"
)

func (h *Handler) getGrafanaDashboards(rw http.ResponseWriter, _ *http.Request) {
	dashboards := grafana.BuiltinDashboards()
	rw.Header().Set("Content-Type", "application/json")
	json.NewEncoder(rw).Encode(dashboards)
}
