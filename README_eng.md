# Hong Kong Football Fields Map

https://alexyip712.github.io/HK_football_field_map/

## Overview
This project is an interactive web application that maps football fields in Hong Kong, including 5-a-side, 7-a-side, and 11-a-side pitches, both natural and artificial grass. It uses MapLibre GL JS to display an interactive map with filtering and search capabilities, allowing users to locate football fields by district or name, view details such as facilities and opening hours, and interact with the map through clicks and touch gestures.

## Features
- **Interactive Map**: Displays football fields across Hong Kong with distinct markers for different pitch types (5-a-side, 7-a-side, 11-a-side, natural/artificial).
- **Search and Filter**: Search by name, address, or district, with autocomplete suggestions and district-based filtering.
- **Responsive Design**: Optimized for both desktop and mobile devices, with a collapsible info card on mobile.
- **Geolocation**: Allows users to locate fields near their current position.
- **Layer Control**: Toggle visibility of different pitch types with color-coded markers.
- **Service Worker**: Caches map tiles for offline access and improved performance.
- **Accessibility**: Includes features like tactile guides and accessible facilities in field details where available.

## Usage
- **Map Navigation**: Zoom and pan the map to explore football fields. Use the navigation controls in the top-left corner.
- **Search**: Enter a field name, address, or district in the search bar to filter results. Suggestions appear as you type.
- **District Filter**: Select a district from the dropdown to show only fields in that area.
- **Layer Toggle**: Use the checkboxes in the layer control to show/hide specific pitch types.
- **Field Details**: Click or tap a marker to view details like address, facilities, opening hours, and contact information.
- **Geolocation**: Click the location button to center the map on your current position (browser permission required).
- **Clear Filters**: Click the "Clear" button to reset the map and filters.

## File Structure
- `index.html`: Main HTML file with the map container and UI elements.
- `all_football_fields.js`: GeoJSON data containing football field locations and properties.
- `maplibre.js`: JavaScript logic for map initialization, filtering, and interactions.
- `custom.css`: CSS styles for the map, info card, and responsive design.

## Technologies Used
- **MapLibre GL JS**: For rendering the interactive map.
- **OpenStreetMap**: Provides the base map tiles.
- **Font Awesome**: For icons in the UI.

## Data Source
The football field data is stored in `all_football_fields.js` as a GeoJSON `FeatureCollection`. Each feature includes:
- Coordinates (longitude, latitude)
- Properties: category, name, address, district, opening hours, facilities, phone, status, and number of pitches.

## Reporting Issues
Found a data error or bug? Use the "Report Issue" link in the application footer or create an issue on GitHub with details.

## Acknowledgments
- MapLibre GL JS for the open-source mapping library.
- OpenStreetMap contributors for providing map tiles.
- Noto Sans TC for supporting Chinese text rendering.
- Inspired by: <a href="https://github.com/hk01data/carpark">01CarPark/a>。
