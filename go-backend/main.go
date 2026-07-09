package main

import (
	"encoding/json"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"viewer/handlers"
	"viewer/models"
)

func main() {
	// ==================================================================
	// SECTION 1: DATABASE BOOTSTRAP INITIALIZATION
	// ==================================================================
	var catalog models.AutoData
	file, err := os.ReadFile("data.json")
	if err != nil {
		log.Fatalf("Fatal: Missing data.json file asset source: %v", err)
	}
	if err := json.Unmarshal(file, &catalog); err != nil {
		log.Fatalf("Fatal: Corruption detected parsing data.json: %v", err)
	}

	handlers.DataCache = &catalog

	// ==================================================================
	// SECTION 2: ASYNCHRONOUS PROCESSING COROUTINES (Channels)
	// ==================================================================
	go handlers.ProcessAsyncBookings()
	go handlers.ProcessAsyncContacts()

	// ==================================================================
	// SECTION 3: WEB ROUTING MULTIPLEXER ENGINE
	// ==================================================================
	mux := http.NewServeMux()

	// API Routing Handlers
	mux.HandleFunc("GET /api/models", handlers.ApiWrap(handlers.GetModels))
	mux.HandleFunc("GET /api/models/{id}", handlers.ApiWrap(handlers.GetModelByID))
	mux.HandleFunc("GET /api/categories", handlers.ApiWrap(handlers.GetCategories))
	mux.HandleFunc("GET /api/bookings/lookup", handlers.ApiWrap(handlers.LookupBookingReference))
	mux.HandleFunc("POST /api/bookings", handlers.ApiWrap(handlers.AddBooking))
	mux.HandleFunc("POST /api/contact", handlers.ApiWrap(handlers.AddContact))

	// Physical Vehicle Media Storage Delivery Rule
	mux.Handle("GET /api/images/", http.StripPrefix("/api/images/", http.FileServer(http.Dir("img"))))

	// ==================================================================
	// SECTION 4: SAFE STATIC FILE ROUTING (MIME-Type Enforcer)
	// ==================================================================
	fileServer := http.FileServer(http.Dir("static"))
	mux.HandleFunc("GET /static/", func(w http.ResponseWriter, r *http.Request) {
		ext := filepath.Ext(r.URL.Path)
		if ext == ".js" {
			w.Header().Set("Content-Type", "application/javascript; charset=utf-8")
		} else if ext == ".css" {
			w.Header().Set("Content-Type", "text/css; charset=utf-8")
		}
		http.StripPrefix("/static/", fileServer).ServeHTTP(w, r)
	})

	// Redirect explicit /index.html paths straight to our clean base domain
	mux.HandleFunc("GET /index.html", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/", http.StatusMovedPermanently)
	})

	// ==================================================================
	// SECTION 5: MODULAR HTML TEMPLATE LAYOUT RENDERER
	// ==================================================================
	mux.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")

		// Compile ALL structural layout modules together so Go can cross-reference blocks
		tmpl, err := template.ParseFiles(
			"templates/index.html",
			"templates/navfooter.html",
			"templates/home.html",
			"templates/404.html",
		)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			fmt.Fprintf(w, "Error compiling structural layout templates: %v", err)
			return
		}

		// Handle explicit 404 Route context layout generation rules
		if r.URL.Path != "/" {
			w.WriteHeader(http.StatusNotFound)
			err = tmpl.ExecuteTemplate(w, "index.html", map[string]interface{}{"View": "404"})
			if err != nil {
				log.Printf("Template render crash on 404 block: %v", err)
			}
			return
		}

		// Handle core Showroom view context template assembly rules
		err = tmpl.ExecuteTemplate(w, "index.html", map[string]interface{}{"View": "home"})
		if err != nil {
			log.Printf("Template render crash on home block: %v", err)
		}
	})

	// ==================================================================
	// SECTION 6: SERVICE LISTENER ACTIVATION LOOP
	// ==================================================================
	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	fmt.Printf("Hakamada & Nicacio Modular Core running at http://localhost:%s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, mux))
}
