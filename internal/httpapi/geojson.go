package httpapi

import "encoding/json"

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

// multiPolygonGeoJSON renders an optional polygon for the generated queries.
// See pointGeoJSON for what a missing one means.
func multiPolygonGeoJSON(area *MultiPolygon) (*string, error) {
	if area == nil {
		return nil, nil
	}

	raw, err := json.Marshal(area)
	if err != nil {
		return nil, err
	}

	encoded := string(raw)

	return &encoded, nil
}

// pointGeoJSON renders an optional point for the generated queries, which take
// the geometry as GeoJSON text. A missing point stays missing: the queries hand
// NULL to ST_GeomFromGeoJSON, which returns NULL rather than a geometry.
func pointGeoJSON(point *Point) (*string, error) {
	if point == nil {
		return nil, nil
	}

	raw, err := json.Marshal(point)
	if err != nil {
		return nil, err
	}

	encoded := string(raw)

	return &encoded, nil
}
