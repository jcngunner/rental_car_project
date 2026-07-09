package handlers

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"sync"
	"viewer/models"
)

// Channel queues to pass pipeline tasks to async background thread loops safely
var BookingChannel = make(chan models.BookingRequest, 100)
var ContactChannel = make(chan models.ContactRequest, 100)

var fileMutex sync.Mutex

// GenerateReferenceToken outputs unique randomized alphanumeric identifiers (e.g. HN-XXXXXX)
func GenerateReferenceToken() string {
	b := make([]byte, 3)
	rand.Read(b)
	return fmt.Sprintf("HN-%X", b)
}

// AddBooking queues an inbound lease arrangement transaction block frame
func AddBooking(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req models.BookingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Malformed structural transmission schema"})
		return
	}

	req.BookingRef = GenerateReferenceToken()
	BookingChannel <- req // Dispatch task straight into live concurrent worker thread channels

	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "Queued into ledger spooler pipeline block",
		"booking": req,
	})
}

// AddContact fields custom message threads safely outside core runtime context boundaries
func AddContact(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req models.ContactRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	ContactChannel <- req // Queue data stream block array directly out to pool workers

	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(map[string]string{"status": "Support sequence registered successfully"})
}

// LookupBookingReference reads booking entries out of local record logs store
func LookupBookingReference(w http.ResponseWriter, r *http.Request) {
	ref := r.URL.Query().Get("ref")
	if ref == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Missing reference verification code token"})
		return
	}

	fileMutex.Lock()
	defer fileMutex.Unlock()

	file, err := os.ReadFile("bookings.json")
	if err != nil {
		w.WriteHeader(http.StatusNotFound)
		return
	}

	var historicalRecords []models.BookingRequest
	json.Unmarshal(file, &historicalRecords)

	for _, b := range historicalRecords {
		if b.BookingRef == ref {
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(b)
			return
		}
	}

	w.WriteHeader(http.StatusNotFound)
	json.NewEncoder(w).Encode(map[string]string{"error": "Reference identifier not indexed"})
}

// ProcessAsyncBookings loops infinitely over channels, writing booking states to bookings.json safely
func ProcessAsyncBookings() {
	for req := range BookingChannel {
		fileMutex.Lock()
		var logStore []models.BookingRequest

		file, err := os.ReadFile("bookings.json")
		if err == nil {
			json.Unmarshal(file, &logStore)
		}

		logStore = append(logStore, req)
		output, _ := json.MarshalIndent(logStore, "", "  ")
		os.WriteFile("bookings.json", output, 0644)
		fileMutex.Unlock()
	}
}

// ProcessAsyncContacts logs customer text blueprint sequences background frames into contacts.json safely
func ProcessAsyncContacts() {
	for req := range ContactChannel {
		fileMutex.Lock()
		var logStore []models.ContactRequest

		file, err := os.ReadFile("contacts.json")
		if err == nil {
			json.Unmarshal(file, &logStore)
		}

		logStore = append(logStore, req)
		output, _ := json.MarshalIndent(logStore, "", "  ")
		os.WriteFile("contacts.json", output, 0644)
		fileMutex.Unlock()
	}
}
