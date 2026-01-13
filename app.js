/**
 * Football Map App
 */

const FIELD_TYPES = [
    { id: 'five-a-side', label: '五人硬地', dataVar: 'five_a_side_list', color: '#ef4444', sortKey: 10 }, 
    { id: 'seven-a-side', label: '七人硬地', dataVar: 'seven_a_side_list', color: '#3b82f6', sortKey: 1 }, 
    { id: 'artificial-seven-a-side', label: '七人人造草', dataVar: 'artificial_seven_a_side_list', color: '#22c55e', sortKey: 8 }, 
    { id: 'natural-seven-a-side', label: '七人真草', dataVar: 'natural_seven_a_side_list', color: '#15803d', sortKey: 9 }, 
    { id: 'artificial-11-a-side', label: '十一人人造草', dataVar: 'artificial_11_a_side_list', color: '#f59e0b', sortKey: 8 }, 
    { id: 'natural-11-a-side', label: '十一人真草', dataVar: 'natural_11_a_side_list', color: '#a855f7', sortKey: 9 } 
];

function adjustColorBrightness(hex, percent) {
    hex = hex.replace(/^\s*#|\s*$/g, '');
    if (hex.length === 3) hex = hex.replace(/(.)/g, '$1$1');
    let r = parseInt(hex.substr(0, 2), 16),
        g = parseInt(hex.substr(2, 2), 16),
        b = parseInt(hex.substr(4, 2), 16);
    return '#' +
       ((0|(1<<8) + r * (100 - percent) / 100).toString(16)).substr(1) +
       ((0|(1<<8) + g * (100 - percent) / 100).toString(16)).substr(1) +
       ((0|(1<<8) + b * (100 - percent) / 100).toString(16)).substr(1);
}

class FootballMapApp {
    constructor() {
        this.map = null;
        this.allFeatures = [];
        this.activeFilters = new Set(FIELD_TYPES.map(t => t.id));
        this.favorites = JSON.parse(localStorage.getItem('hk_football_favs') || '[]');
        this.searchHistory = JSON.parse(localStorage.getItem('hk_football_history') || '[]');
        this.isShowingFavorites = false;
        this.currentFeature = null;
        this.init();
    }

    init() {
        this.consolidateData();
        this.initMap();
        this.initUI();
        this.registerServiceWorker(); 
    }

    consolidateData() {
        FIELD_TYPES.forEach(type => {
            if (window[type.dataVar] && window[type.dataVar].features) {
                const darkColor = adjustColorBrightness(type.color, 25);
                const features = window[type.dataVar].features.map(f => ({
                    ...f,
                    properties: {
                        ...f.properties,
                        typeId: type.id,
                        typeColor: type.color,
                        darkTypeColor: darkColor,
                        sortKey: type.sortKey, 
                        clean_name: f.properties.name_chi,
                        uid: f.properties.name_chi + (f.properties.address || '')
                    }
                }));
                this.allFeatures = this.allFeatures.concat(features);
            }
        });
    }

    

    getHashSuffix(cate) {
        if(cate.includes('五人')) return '5';
        if(cate.includes('七人') && cate.includes('硬地')) return '7';
        if(cate.includes('七人') && cate.includes('人造')) return '7A';
        if(cate.includes('七人') && cate.includes('天然')) return '7N';
        if(cate.includes('十一人') && cate.includes('人造')) return '11A';
        if(cate.includes('十一人') && cate.includes('天然')) return '11N';
        return '';
    }

    initMap() {
        this.map = new maplibregl.Map({
            container: 'map',
            style: {
                'version': 8,
                "glyphs": "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
                'sources': {
                    'osm-tiles': { 'type': 'raster', 'tiles': ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], 'tileSize': 256, 'attribution': '© OSM' },
                    'hkgov-base-tiles': { 'type': 'raster', 'tiles': ['https://mapapi.geodata.gov.hk/gs/api/v1.0.0/xyz/basemap/wgs84/{z}/{x}/{y}.png'], 'tileSize': 256, 'attribution': '© 地圖版權屬香港特別行政區政府' },
                    'hkgov-label-tiles': { 'type': 'raster', 'tiles': ['https://mapapi.geodata.gov.hk/gs/api/v1.0.0/xyz/label/hk/tc/wgs84/{z}/{x}/{y}.png'], 'tileSize': 256, 'attribution': '© 地圖版權屬香港特別行政區政府' },
                    'satellite-tiles': { 'type': 'raster', 'tiles': ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], 'tileSize': 256, 'attribution': '© 地圖版權屬香港特別行政區政府','maxzoom': 19 }
                },
                'layers': [
                    { 'id': 'osm-layer', 'type': 'raster', 'source': 'osm-tiles', 'layout': { 'visibility': 'none' } },
                    { 'id': 'satellite-layer', 'type': 'raster', 'source': 'satellite-tiles', 'layout': { 'visibility': 'none' } },
                    { 'id': 'hkgov-base-layer', 'type': 'raster', 'source': 'hkgov-base-tiles', 'layout': { 'visibility': 'visible' } },
                    { 'id': 'hkgov-label-layer', 'type': 'raster', 'source': 'hkgov-label-tiles', 'layout': { 'visibility': 'visible' } }
                ]
            },
            center: [114.17475, 22.367533], zoom: 11, maxBounds: [[113.6, 22.1], [114.6, 22.6]], maxZoom: 19,
        });

        // disable map rotation using right click + drag
        this.map.dragRotate.disable();

        // disable map rotation using keyboard
        this.map.keyboard.disable();

        // disable map rotation using touch rotation gesture
        this.map.touchZoomRotate.disableRotation();

        this.map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

        this.map.on('load', () => {
            this.addFootballLayers();
            this.handleUrlParams();
            document.getElementById('loader').classList.add('hidden');
        });
    }

    addFootballLayers() {
        this.map.addSource('football-fields', { type: 'geojson', data: { type: 'FeatureCollection', features: this.allFeatures } });

        this.map.addLayer({
            id: 'fields-circles',
            type: 'circle',
            source: 'football-fields',
            paint: {
                'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 5, 13, 8, 15, 12, 17, 16],
                'circle-color': ['get', 'typeColor'],
                'circle-stroke-width': 2,
                'circle-stroke-color': '#ffffff'
            }
        });

        this.map.addLayer({
            id: 'fields-labels',
            type: 'symbol',
            source: 'football-fields',
            minzoom: 13,
            layout: {
                'text-field': ['get', 'name_chi'],
                'text-font': ['Noto Sans Bold'],
                'text-size': 13,
                'text-anchor': 'top',
                'text-offset': [0, 1.2],
                'text-optional': true,
                'symbol-sort-key': ['get', 'sortKey'] 
            },
            paint: {
                'text-color': ['get', 'darkTypeColor'], 
                'text-halo-color': '#ffffff',
                'text-halo-width': 3
            }
        });

        this.map.on('click', 'fields-circles', (e) => this.selectField(e.features[0]));
        this.map.on('mouseenter', 'fields-circles', () => this.map.getCanvas().style.cursor = 'pointer');
        this.map.on('mouseleave', 'fields-circles', () => this.map.getCanvas().style.cursor = '');
    }

    initUI() {
        const chipsContainer = document.querySelector('.filter-chips-container');
        FIELD_TYPES.forEach(type => {
            const chip = document.createElement('div');
            chip.className = 'chip active';
            chip.dataset.id = type.id;
            chip.innerHTML = `<span class="dot"></span> ${type.label}`;
            this.setChipStyle(chip, true, type.color);
            chip.onclick = () => this.toggleFilter(type.id, chip, type.color);
            chipsContainer.appendChild(chip);
        });

        const favFilterBtn = document.getElementById('favFilterBtn');
        favFilterBtn.addEventListener('click', () => {
            this.isShowingFavorites = !this.isShowingFavorites;
            favFilterBtn.classList.toggle('active', this.isShowingFavorites);
            favFilterBtn.innerHTML = this.isShowingFavorites ? '<i class="fa-solid fa-star"></i>' : '<i class="fa-regular fa-star"></i>';
            this.applyFilters();
        });

        const searchInput = document.getElementById('searchInput');
        const clearBtn = document.getElementById('clearSearch');
        const suggestionsDiv = document.getElementById('suggestions');

        // [Logic: Show history on Focus or Empty input]
        searchInput.addEventListener('focus', () => {
            if (searchInput.value.trim() === '') {
                this.showSearchHistory();
            } else {
                // If text exists, do nothing or show results if available
                if (suggestionsDiv.children.length > 0) suggestionsDiv.classList.remove('hidden');
            }
        });

        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase().trim();
            clearBtn.classList.toggle('hidden', term === '');
            if (term === '') {
                this.showSearchHistory();
            } else {
                this.handleSearch(term);
            }
        });

        // [Logic: Hide when clicking outside]
        document.addEventListener('click', (e) => {
            const container = document.getElementById('searchContainer');
            if (!container.contains(e.target)) {
                suggestionsDiv.classList.add('hidden');
            }
        });

        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearBtn.classList.add('hidden');
            this.showSearchHistory(); 
        });

        const layerBtn = document.getElementById('layerBtn');
        const layerMenu = document.getElementById('layerMenu');
        layerBtn.onclick = (e) => { e.stopPropagation(); layerMenu.classList.toggle('hidden'); };
        document.querySelectorAll('.layer-option').forEach(opt => {
            opt.onclick = () => {
                this.switchBaseLayer(opt.dataset.layer);
                document.querySelectorAll('.layer-option').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                layerMenu.classList.add('hidden');
            }
        });

        document.getElementById('favActionBtn').addEventListener('click', (e) => {
             e.stopPropagation();
             this.toggleCurrentFavorite();
        });
        document.getElementById('closeCard').addEventListener('click', () => {
            const card = document.getElementById('infoCard');
            card.classList.remove('open', 'peek');
            card.classList.add('hidden');
            document.title = '香港足球場地圖';
            history.pushState({}, '', window.location.pathname);
        });
        document.getElementById('locateBtn').addEventListener('click', () => this.locateUser());

        this.initMobileDrag();
        this.initPCDrag();
    }

    showSearchHistory() {
        const suggestionsDiv = document.getElementById('suggestions');
        suggestionsDiv.innerHTML = '';
        
        if (this.searchHistory.length === 0) {
            suggestionsDiv.classList.add('hidden');
            return;
        }

        suggestionsDiv.classList.remove('hidden');
        const header = document.createElement('div');
        header.className = 'suggestion-header';
        header.textContent = '最近搜尋';
        suggestionsDiv.appendChild(header);

        this.searchHistory.forEach(term => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.innerHTML = `
                <div class="suggestion-content">
                    <i class="fa-solid fa-clock-rotate-left history-icon"></i>
                    <strong>${term}</strong>
                </div>
                <button class="delete-history-btn" aria-label="刪除"><i class="fa-solid fa-xmark"></i></button>
            `;
            
            div.querySelector('.delete-history-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.updateSearchHistory(term, true);
                this.showSearchHistory(); 
            });

            div.addEventListener('click', () => {
                document.getElementById('searchInput').value = term;
                document.getElementById('clearSearch').classList.remove('hidden');
                this.handleSearch(term.toLowerCase());
            });
            
            suggestionsDiv.appendChild(div);
        });
    }

    updateSearchHistory(term, isDelete = false) {
        if (isDelete) {
            this.searchHistory = this.searchHistory.filter(t => t !== term);
        } else {
            this.searchHistory = this.searchHistory.filter(t => t !== term);
            this.searchHistory.unshift(term);
            if (this.searchHistory.length > 5) this.searchHistory.pop(); 
        }
        localStorage.setItem('hk_football_history', JSON.stringify(this.searchHistory));
    }

    setChipStyle(chip, isActive, color) {
        const dot = chip.querySelector('.dot');
        if (isActive) {
            chip.classList.add('active');
            chip.style.backgroundColor = '#ffffff';
            chip.style.color = color;
            chip.style.borderColor = color;
            dot.style.backgroundColor = color;
        } else {
            chip.classList.remove('active');
            chip.style.backgroundColor = '#f3f4f6';
            chip.style.color = '#6b7280';
            chip.style.borderColor = 'transparent';
            dot.style.backgroundColor = '#9ca3af';
        }
    }

    toggleFilter(id, chip, color) {
        if (this.isShowingFavorites) {
            this.isShowingFavorites = false;
            const favBtn = document.getElementById('favFilterBtn');
            favBtn.classList.remove('active');
            favBtn.innerHTML = '<i class="fa-regular fa-star"></i>';
        }
        if (this.activeFilters.has(id)) {
            this.activeFilters.delete(id);
            this.setChipStyle(chip, false, color);
        } else {
            this.activeFilters.add(id);
            this.setChipStyle(chip, true, color);
        }
        this.applyFilters();
    }

    switchBaseLayer(layerName) {
        const layers = ['osm-layer', 'hkgov-base-layer', 'hkgov-label-layer', 'satellite-layer'];
        layers.forEach(l => this.map.setLayoutProperty(l, 'visibility', 'none'));
        
        if (layerName === 'hkgov') {
            this.map.setLayoutProperty('hkgov-base-layer', 'visibility', 'visible');
            this.map.setLayoutProperty('hkgov-label-layer', 'visibility', 'visible');
        } else if (layerName === 'satellite') {
            this.map.setLayoutProperty('satellite-layer', 'visibility', 'visible');
        } else {
            this.map.setLayoutProperty('osm-layer', 'visibility', 'visible');
        }
    }

    applyFilters() {
        let filter;
        if (this.isShowingFavorites) {
            filter = this.favorites.length === 0 ? ['==', 'uid', 'none'] : ['in', 'uid', ...this.favorites];
        } else {
            const filterArray = ['in', 'typeId', ...Array.from(this.activeFilters)];
            filter = this.activeFilters.size === 0 ? ['==', 'typeId', 'none'] : filterArray;
        }
        this.map.setFilter('fields-circles', filter);
        this.map.setFilter('fields-labels', filter);
    }

    selectField(feature) {
        this.currentFeature = feature;
        const props = feature.properties;
        
        this.map.flyTo({ center: feature.geometry.coordinates, zoom: 17, padding: { bottom: 100 } });

        document.getElementById('cardTitle').textContent = props.name_chi;
        document.getElementById('cardAddress').innerHTML = `<i class="fa-solid fa-location-dot"></i> ${props.address}`;
        document.getElementById('cardDistrictBadge').textContent = props.district;
        document.getElementById('cardTypeBadge').textContent = props.cate;
        document.getElementById('cardTypeBadge').style.backgroundColor = props.typeColor;
        
        document.getElementById('cardHours').innerHTML = props.opening_hours || '未提供';
        document.getElementById('cardNumber').textContent = props.number || '未提供';
        document.getElementById('cardFacilities').innerHTML = props.facilities || '未提供';
        document.getElementById('cardPhone').textContent = props.phone || '未提供';

        const rowOther = document.getElementById('rowOther');
        const cardOther = document.getElementById('cardOther');
        if (props.other && props.other !== '未提供' && props.other.trim() !== '') {
            cardOther.innerHTML = props.other;
            rowOther.classList.remove('hidden');
        } else {
            rowOther.classList.add('hidden');
        }

        const coords = feature.geometry.coordinates;
        document.getElementById('btnDirections').href = `https://www.google.com/maps/dir/?api=1&destination=${coords[1]},${coords[0]}&destination_place_id=${encodeURIComponent(props.name_chi)}`;

        document.getElementById('btnShare').onclick = (e) => {
            e.preventDefault();
            const typeCode = this.getHashSuffix(props.cate);
            const shareUrl = `${window.location.origin}${window.location.pathname}?name=${encodeURIComponent(props.name_chi)}&type=${typeCode}`;
            if (navigator.share) {
                navigator.share({ title: props.name_chi, text: `睇下呢個球場: ${props.name_chi}`, url: shareUrl });
            } else {
                navigator.clipboard.writeText(shareUrl);
                alert('連結已複製');
            }
        };

        // URL Update with Shortcodes
        const typeCode = this.getHashSuffix(props.cate);
        const newUrl = `?name=${encodeURIComponent(props.name_chi)}&type=${typeCode}`;
        history.pushState({}, '', newUrl);
        document.title = `${props.name_chi} | 香港足球場地圖`;

        const favBtn = document.getElementById('favActionBtn');
        const isFav = this.favorites.includes(props.uid);
        favBtn.classList.toggle('active', isFav);
        favBtn.innerHTML = isFav ? '<i class="fa-solid fa-star"></i>' : '<i class="fa-regular fa-star"></i>';

        const card = document.getElementById('infoCard');
        card.classList.remove('hidden');
        
        if (window.innerWidth < 768) {
            card.classList.remove('open');
            card.classList.add('peek');
        } else {
            card.classList.add('open');
        }
    }

    toggleCurrentFavorite() {
        if (!this.currentFeature) return;
        const uid = this.currentFeature.properties.uid;
        const index = this.favorites.indexOf(uid);
        const favBtn = document.getElementById('favActionBtn');
        
        if (index === -1) {
            this.favorites.push(uid);
            favBtn.classList.add('active');
            favBtn.innerHTML = '<i class="fa-solid fa-star"></i>';
        } else {
            this.favorites.splice(index, 1);
            favBtn.classList.remove('active');
            favBtn.innerHTML = '<i class="fa-regular fa-star"></i>';
        }
        localStorage.setItem('hk_football_favs', JSON.stringify(this.favorites));
        if (this.isShowingFavorites) this.applyFilters();
    }

    handleSearch(term, showAll = false) {
        const suggestionsDiv = document.getElementById('suggestions');
        suggestionsDiv.innerHTML = '';
        if (!term) { suggestionsDiv.classList.add('hidden'); return; }
        
        const matches = this.allFeatures.filter(f => 
            f.properties.name_chi.includes(term) || f.properties.district.includes(term)
        );

        if (matches.length > 0) {
            suggestionsDiv.classList.remove('hidden');
            const limit = 5;
            const displayList = showAll ? matches : matches.slice(0, limit);

            displayList.forEach(f => {
                const div = document.createElement('div');
                div.className = 'suggestion-item';
                div.innerHTML = `<strong>${f.properties.name_chi}</strong><span>${f.properties.cate} - ${f.properties.district}</span>`;
                div.onclick = () => {
                    this.updateSearchHistory(f.properties.name_chi); 
                    this.selectField(f);
                    document.getElementById('searchInput').value = f.properties.name_chi;
                    suggestionsDiv.classList.add('hidden');
                };
                suggestionsDiv.appendChild(div);
            });

            if (!showAll && matches.length > limit) {
                const moreBtn = document.createElement('div');
                moreBtn.className = 'suggestion-more';
                moreBtn.textContent = `顯示全部 (共 ${matches.length} 筆)`;
                moreBtn.onclick = () => {
                    this.handleSearch(term, true);
                };
                suggestionsDiv.appendChild(moreBtn);
            }
        } else {
            suggestionsDiv.classList.add('hidden');
        }
    }

    locateUser() {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(pos => {
            const { longitude, latitude } = pos.coords;
            if (this.userMarker) this.userMarker.remove();
            const el = document.createElement('div');
            el.style.cssText = 'width:20px;height:20px;background:#2563eb;border-radius:50%;border:3px solid white;box-shadow:0 0 10px rgba(0,0,0,0.3);';
            this.userMarker = new maplibregl.Marker(el).setLngLat([longitude, latitude]).addTo(this.map);
            this.map.flyTo({ center: [longitude, latitude], zoom: 15 });
        });
    }

    handleUrlParams() {
        const params = new URLSearchParams(window.location.search);
        const name = params.get('name');
        if (name) {
            const found = this.allFeatures.find(f => f.properties.name_chi === name);
            if (found) this.selectField(found);
        }
    }

    initMobileDrag() {
        const card = document.getElementById('infoCard');
        const handle = document.getElementById('cardDragHandle');
        let startY = 0; let isDragging = false;
        handle.addEventListener('touchstart', (e) => {
            if(window.innerWidth >= 768) return;
            isDragging = true; startY = e.touches[0].clientY; card.style.transition = 'none';
        }, {passive: true});
        handle.addEventListener('touchmove', (e) => { if (!isDragging) return; }, {passive: true});
        handle.addEventListener('touchend', (e) => {
            if (!isDragging) return;
            isDragging = false;
            card.style.transition = 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)';
            const deltaY = e.changedTouches[0].clientY - startY;
            if (deltaY < -50) { card.classList.remove('peek'); card.classList.add('open'); }
            else if (deltaY > 50) { card.classList.remove('open'); card.classList.add('peek'); }
        });
    }

    initPCDrag() {
        const card = document.getElementById('infoCard');
        const handle = document.getElementById('cardDragHandle');
        let isDragging = false; let startX, startY, initialLeft, initialTop;

        handle.addEventListener('mousedown', (e) => {
            if (window.innerWidth < 768) return;
            isDragging = true; startX = e.clientX; startY = e.clientY;
            const rect = card.getBoundingClientRect();
            initialLeft = rect.left; initialTop = rect.top;
            card.style.transition = 'none'; card.style.transform = 'none';
            e.preventDefault(); document.body.style.cursor = 'grabbing'; handle.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            card.style.left = `${initialLeft + (e.clientX - startX)}px`;
            card.style.top = `${initialTop + (e.clientY - startY)}px`;
            card.style.margin = '0';
        });

        document.addEventListener('mouseup', () => {
            if (!isDragging) return;
            isDragging = false;
            document.body.style.cursor = 'default'; handle.style.cursor = 'grab';
        });
    }

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./HK_football_field_map/sw.js').catch(err => console.error('SW Error:', err));
        }
    }
}

document.addEventListener('DOMContentLoaded', () => { window.footballMapApp = new FootballMapApp(); });