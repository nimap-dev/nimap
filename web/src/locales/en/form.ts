/** The shared form fields: address, map shapes and the parent location. */
export default {
  address: {
    street: 'Street',
    zip: 'ZIP',
    city: 'City',
    country: 'Country',
    countryHint: 'Two-letter code',
  },
  shape: {
    parts_one: '{{count}} part',
    parts_other: '{{count}} parts',
    partsDrawn_one: '{{count}} part drawn',
    partsDrawn_other: '{{count}} parts drawn',
    clickToDraw: 'Click on the map to draw',
    draw: 'Draw',
    discard: 'Discard',
  },
  area: {
    label: 'Boundary',
    notDrawn: 'Not drawn — optional',
    paused: 'Paused while you place the point',
    pausedSuffix: ' · paused while you place the point',
  },
  footprint: {
    label: 'Footprint',
    reshape: ' — drag a point to reshape',
  },
  point: {
    label: 'Map point',
    clickToPlace: 'Click on the map to place it',
    derived: 'Derived from the boundary',
    notPlaced: 'Not placed — optional',
    place: 'Place',
  },
  location: {
    label: 'Inside',
    empty: 'Not inside anything',
    fromShape: 'From the shape drawn on the map',
    shapeSitsIn: 'The shape sits in {{name}}',
    use: 'Use',
  },
}
