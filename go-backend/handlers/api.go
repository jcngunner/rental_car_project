package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"viewer/models"
)

// DataCache acts as the volatile memory pointer to your data.json dataset store
var DataCache *models.AutoData

// GetModels serves the entire active vehicle inventory listing safely
func GetModels(w http.ResponseWriter, r *http.Request) {
	if DataCache == nil {
		http.Error(w, `{"error":"Database memory block unit uninitialized"}`, http.StatusInternalServerError)
		return
	}

	// FORCE EMPTY ARRAY INSTEAD OF NULL IF INVENTORY IS EMPTY
	if DataCache.Models == nil {
		w.Write([]byte("[]"))
		return
	}

	json.NewEncoder(w).Encode(DataCache.Models)
}

// GetModelByID returns targeted specification parameters along with corporate manufacturer details
func GetModelByID(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid asset tracking identifier sequence"})
		return
	}

	var targetedModel *models.VehicleModel
	for _, m := range DataCache.Models {
		if m.ID == id {
			targetedModel = &m
			break
		}
	}

	if targetedModel == nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Asset registry entry not found"})
		return
	}

	// Locate manufacturer cross-reference records row manually
	var linkedMfg models.Manufacturer
	for _, mfg := range DataCache.Manufacturers {
		if mfg.ID == targetedModel.ManufacturerID {
			linkedMfg = mfg
			break
		}
	}

	// Combine profiles inside custom transmission envelope wrapper block
	payload := map[string]interface{}{
		"model":        targetedModel,
		"manufacturer": linkedMfg,
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(payload)
}

// GetCategories dumps corporate categorization classifications structures out to user selection dropdown sheets
func GetCategories(w http.ResponseWriter, r *http.Request) {
	if DataCache == nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Database structure missing"})
		return
	}
	json.NewEncoder(w).Encode(DataCache.Categories)
}
