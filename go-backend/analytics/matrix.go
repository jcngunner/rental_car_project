package analytics

import (
	"sync"
)

// AnalyticsEngine monitors high-level asset interaction trends
type AnalyticsEngine struct {
	mu            sync.RWMutex
	CategoryViews map[string]int
	AssetClicks   map[int]int
}

// GlobalMatrix instance for application runtime tracking boundary tracking
var GlobalMatrix = &AnalyticsEngine{
	CategoryViews: make(map[string]int),
	AssetClicks:   make(map[int]int),
}

// LogCategoryView registers interest vectors for tailored client suggestions
func (ae *AnalyticsEngine) LogCategoryView(catID string) {
	ae.mu.Lock()
	defer ae.mu.Unlock()
	ae.CategoryViews[catID]++
}

// LogAssetClick indexes high-demand catalog selections
func (ae *AnalyticsEngine) LogAssetClick(assetID int) {
	ae.mu.Lock()
	defer ae.mu.Unlock()
	ae.AssetClicks[assetID]++
}

// GetTrendingMetrics returns a snapshot of interactions safely
func (ae *AnalyticsEngine) GetTrendingMetrics() (map[string]int, map[int]int) {
	ae.mu.RLock()
	defer ae.mu.RUnlock()

	// Deep copy to prevent extraction data races
	cats := make(map[string]int, len(ae.CategoryViews))
	for k, v := range ae.CategoryViews {
		cats[k] = v
	}
	assets := make(map[int]int, len(ae.AssetClicks))
	for k, v := range ae.AssetClicks {
		assets[k] = v
	}
	return cats, assets
}