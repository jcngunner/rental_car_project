package cookies

import (
	"net/http"
	"time"
)

const SessionCookieName = "hn_concierge_session"

// SetSessionToken injects an identification token wrapper for system personalization
func SetSessionToken(w http.ResponseWriter, token string) {
	cookie := &http.Cookie{
		Name:     SessionCookieName,
		Value:    token,
		Path:     "/",
		Expires:  time.Now().Add(24 * 7 * time.Hour), // 7-Day Window Context
		HttpOnly: true,                               // Prevents cross-site script extraction
		SameSite: http.SameSiteLaxMode,
	}
	http.SetCookie(w, cookie)
}

// GetSessionToken extracts client identification keys silently out of requests
func GetSessionToken(r *http.Request) string {
	cookie, err := r.Cookie(SessionCookieName)
	if err != nil {
		return ""
	}
	return cookie.Value
}

// ClearSessionToken purges local verification tracking frames immediately
func ClearSessionToken(w http.ResponseWriter) {
	cookie := &http.Cookie{
		Name:     SessionCookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
	}
	http.SetCookie(w, cookie)
}
