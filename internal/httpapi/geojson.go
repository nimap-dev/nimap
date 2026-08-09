package httpapi

// MultiPolygon is a GeoJSON MultiPolygon geometry.
type MultiPolygon struct {
	Type        string          `json:"type" enum:"MultiPolygon" doc:"GeoJSON geometry type"`
	Coordinates [][][][]float64 `json:"coordinates" doc:"An array of polygons, each an array of linear rings of [longitude, latitude] positions; a ring's first entry is its exterior boundary and the rest are holes"`
}

// Point is a GeoJSON Point geometry.
type Point struct {
	Type        string    `json:"type" enum:"Point" doc:"GeoJSON geometry type"`
	Coordinates []float64 `json:"coordinates" minItems:"2" maxItems:"3" doc:"A [longitude, latitude] position, optionally with elevation"`
}
