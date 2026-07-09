package models

// AutoData serves as the master database serialization tracking template structure
type AutoData struct {
	Manufacturers []Manufacturer  `json:"manufacturers"`
	Categories    []AssetCategory `json:"categories"`
	Models        []VehicleModel  `json:"carModels"`
}

// Manufacturer represents high-end corporate builder origin profiles
type Manufacturer struct {
	ID           int    `json:"id"`
	Name         string `json:"name"`
	Country      string `json:"country"`
	FoundingYear int    `json:"foundingYear"`
}

// AssetCategory organizes the vehicle catalog by utility metrics
type AssetCategory struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

// VehicleModel outlines physical asset dimensions and dynamic rate metrics
type VehicleModel struct {
	ID             int                `json:"id"`
	ManufacturerID int                `json:"manufacturerId"`
	CategoryId     int                `json:"categoryId"`
	Name           string             `json:"name"`
	Year           int                `json:"year"`
	PricePerDay    int                `json:"pricePerDay"`
	Image          string             `json:"image"`
	Specifications SpecsSpecification `json:"specifications"`
}

// SpecsSpecification deep indexes precise mechanical blueprint fields
type SpecsSpecification struct {
	Engine       string `json:"engine"`
	Horsepower   int    `json:"horsepower"`
	Transmission string `json:"transmission"`
	Drivetrain   string `json:"drivetrain"`
}

// BookingRequest defines transactional variables stored in the bookings database ledger
type BookingRequest struct {
	BookingRef string `json:"bookingRef,omitempty"`
	CarName    string `json:"carName"`
	FullName   string `json:"fullName"`
	Email      string `json:"email"`
	Phone      string `json:"phone"`
	PickupDate string `json:"pickupDate"`
	Duration   string `json:"duration"`
	TotalPrice string `json:"totalPrice"`
}

// ContactRequest handles messaging sequences processed background worker spools
type ContactRequest struct {
	Name    string `json:"name"`
	Email   string `json:"email"`
	Message string `json:"message"`
}
