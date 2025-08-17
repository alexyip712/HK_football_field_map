try {
    const map = new maplibregl.Map({
        container: 'map',
        style: {
            'version': 8,
            'sources': {
                'osm-tiles': {
                    'type': 'raster',
                    'tiles': ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                    'tileSize': 256,
                    'attribution': '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                }
            },
            'glyphs': 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
            'layers': [{
                'id': 'osm-tiles',
                'type': 'raster',
                'source': 'osm-tiles',
                'minzoom': 11,
                'maxzoom': 21
            }]
        },
        center: [114.17475, 22.337533],
        zoom: 11,
        minZoom: 11,
        maxZoom: 19,
        maxBounds: [[113.835, 22.153], [114.441, 22.561]]
    });

    const layerControl = {
        '七人硬地足球場': { layerId: 'seven-a-side', labelId: 'seven-a-side-labels', color: 'blue' },
        '五人硬地足球場': { layerId: 'five-a-side', labelId: 'five-a-side-labels', color: 'green' }
    };

    let currentPopup = null;
    let longPressTimer = null;
    let debounceTimer = null;

    const searchInput = document.getElementById('searchInput');
    const suggestions = document.getElementById('suggestions');
    const districtSelect = document.getElementById('districtFilter');
    const clearButton = document.getElementById('clearFilter');

    function updateInfo(properties) {
        const info = document.getElementById('info');
        const branchStatus = document.getElementById('branchStatus');
        const branchName = document.getElementById('branchName');
        const branchDetail = document.getElementById('branchDetail');
        const branchDistrict = document.getElementById('branchdistrict');
        const facilities = document.getElementById('facilities');
        const phone = document.getElementById('phone');
        const opening_hours = document.getElementById('opening_hours');
        const number = document.getElementById('number');
        const closeButton = document.querySelector('.close');
        const toggleButton = document.getElementById('toggleCard');

        facilities.innerHTML = properties.facilities ? `<li>設施：${properties.facilities}</li>` : '<li>設施：未提供</li>';
        phone.innerHTML = properties.phone ? `<li>電話：${properties.phone}</li>` : '<li>電話：未提供</li>';
        opening_hours.innerHTML = properties.opening_hours ? `<li>開放時間：${properties.opening_hours}</li>` : '<li>開放時間：未提供</li>';
        number.innerHTML = properties.number ? `<li>球場數目：${properties.number}</li>` : '<li>球場數目：未提供</li>';

        if (properties) {
            info.classList.remove('card-hidden');
            branchStatus.className = layerControl[properties.cate].color;
            branchStatus.textContent = properties.type;
            branchName.textContent = properties.name_chi;
            branchDetail.textContent = properties.address;
            branchDistrict.textContent = properties.district;
            toggleButton.style.display = window.innerWidth <= 835 ? 'block' : 'none';
            closeButton.onclick = () => info.classList.add('card-hidden');
            toggleButton.onclick = () => {
                info.classList.toggle('expanded');
                toggleButton.textContent = info.classList.contains('expanded') ? '收起' : '展開';
                toggleButton.setAttribute('aria-expanded', info.classList.contains('expanded'));
            };
        } else {
            info.classList.add('card-hidden');
        }
    }

    function filterData(searchTerm, district) {
        let filteredFeatures = seven_a_side_list.features.concat(five_a_side_list.features);
        // 為每個特徵添加 clean_name_chi（移除括號）
        filteredFeatures = filteredFeatures.map(f => ({
            ...f,
            properties: {
                ...f.properties,
                clean_name_chi: f.properties.name_chi.replace(/\s*\(.*\)/, '')
            }
        }));
        if (searchTerm) {
            searchTerm = searchTerm.toLowerCase();
            filteredFeatures = filteredFeatures.filter(f =>
                f.properties.name_chi.toLowerCase().includes(searchTerm) ||
                f.properties.address.toLowerCase().includes(searchTerm) ||
                f.properties.district.toLowerCase().includes(searchTerm)
            );
        }
        if (district) {
            filteredFeatures = filteredFeatures.filter(f => f.properties.district === district);
        }
        return {
            type: 'FeatureCollection',
            features: filteredFeatures
        };
    }

    function updateSuggestions(searchTerm) {
        suggestions.innerHTML = '';
        if (!searchTerm) {
            suggestions.style.display = 'none';
            return;
        }
        const filtered = filterData(searchTerm, '').features.slice(0, 10);
        if (filtered.length) {
            filtered.forEach(f => {
                const div = document.createElement('div');
                div.className = 'suggestion-item';
                div.textContent = f.properties.name_chi + (f.properties.cate === '七人硬地足球場' ? ' (七人)' : ' (五人)');
                div.setAttribute('role', 'option');
                div.onclick = () => {
                    searchInput.value = f.properties.name_chi;
                    updateInfo(f.properties);
                    map.flyTo({ center: f.geometry.coordinates, zoom: 17 });
                    suggestions.style.display = 'none';
                };
                suggestions.appendChild(div);
            });
            suggestions.style.display = 'block';
        } else {
            suggestions.style.display = 'none';
        }
    }

    map.on('load', () => {
        try {
            map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');

            class GeolocationControl {
                onAdd(map) {
                    this._map = map;
                    this._container = document.createElement('div');
                    this._container.className = 'maplibregl-ctrl maplibregl-ctrl-group';
                    const button = document.createElement('button');
                    button.className = 'geolocation-button';
                    button.innerHTML = '<i class="fas fa-location-arrow"></i>';
                    button.title = '定位到當前位置';
                    button.onclick = () => {
                        if (navigator.geolocation) {
                            navigator.geolocation.getCurrentPosition((position) => {
                                map.flyTo({
                                    center: [position.coords.longitude, position.coords.latitude],
                                    zoom: 16
                                });
                            }, () => alert('無法獲取您的位置'));
                        } else {
                            alert('您的瀏覽器不支援地理定位');
                        }
                    };
                    this._container.appendChild(button);
                    return this._container;
                }
                onRemove() {
                    this._container.parentNode.removeChild(this._container);
                    this._map = undefined;
                }
            }
            map.addControl(new GeolocationControl(), 'top-left');

            map.addSource('football-fields', {
                type: 'geojson',
                data: filterData('', '')
            });

            map.addLayer({
                id: 'seven-a-side',
                type: 'circle',
                source: 'football-fields',
                filter: ['==', 'cate', '七人硬地足球場'],
                paint: {
                    'circle-radius': 15,
                    'circle-color': '#3498db',
                    'circle-opacity': 0.7,
                    'circle-stroke-color': '#3498db',
                    'circle-stroke-width': 1
                }
            });

            map.addLayer({
                id: 'five-a-side',
                type: 'circle',
                source: 'football-fields',
                filter: ['==', 'cate', '五人硬地足球場'],
                paint: {
                    'circle-radius': 15,
                    'circle-color': '#2ecc71',
                    'circle-opacity': 0.7,
                    'circle-stroke-color': '#2ecc71',
                    'circle-stroke-width': 1
                }
            });

            map.addLayer({
                id: 'seven-a-side-labels',
                type: 'symbol',
                source: 'football-fields',
                minzoom: 15,
                filter: ['==', 'cate', '七人硬地足球場'],
                layout: {
                    'text-field': ['get', 'clean_name_chi'],
                    'text-font': ['Noto Sans TC'],
                    'text-size': 12,
                    'text-offset': [0, 1.5],
                    'text-anchor': 'top',
                    'text-allow-overlap': false
                },
                paint: {
                    'text-color': '#3498db'
                }
            });

            map.addLayer({
                id: 'five-a-side-labels',
                type: 'symbol',
                source: 'football-fields',
                minzoom: 15,
                filter: ['==', 'cate', '五人硬地足球場'],
                layout: {
                    'text-field': ['get', 'clean_name_chi'],
                    'text-font': ['Noto Sans TC'],
                    'text-size': 12,
                    'text-offset': [0, 1.5],
                    'text-anchor': 'top',
                    'text-allow-overlap': false
                },
                paint: {
                    'text-color': '#2ecc71'
                }
            });

            const layerControlDiv = document.createElement('div');
            layerControlDiv.className = 'maplibregl-ctrl maplibregl-ctrl-group';
            layerControlDiv.style.position = 'absolute';
            layerControlDiv.style.top = '10px';
            layerControlDiv.style.right = '10px';
            layerControlDiv.style.fontFamily = "'Noto Sans TC', sans-serif";
            layerControlDiv.style.fontSize = '1rem';
            layerControlDiv.style.padding = '0.25rem 0.8rem';

            for (const [label, { layerId, labelId, color }] of Object.entries(layerControl)) {
                const div = document.createElement('div');
                div.style.padding = '5px';
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `${layerId}-checkbox`;
                checkbox.checked = true;
                checkbox.addEventListener('change', () => {
                    map.setLayoutProperty(layerId, 'visibility', checkbox.checked ? 'visible' : 'none');
                    map.setLayoutProperty(labelId, 'visibility', checkbox.checked ? 'visible' : 'none');
                });
                const labelElem = document.createElement('label');
                labelElem.htmlFor = `${layerId}-checkbox`;
                const iconSpan = document.createElement('span');
                iconSpan.textContent = color === 'blue' ? '🔵' : '🟢';
                iconSpan.style.marginRight = '5px';
                iconSpan.setAttribute('aria-label', color === 'blue' ? '藍色圓點表示七人硬地足球場' : '綠色圓點表示五人硬地足球場');
                labelElem.appendChild(iconSpan);
                labelElem.appendChild(document.createTextNode(label));
                div.appendChild(checkbox);
                div.appendChild(labelElem);
                layerControlDiv.appendChild(div);
            }
            map.getContainer().appendChild(layerControlDiv);

            const districts = [...new Set(seven_a_side_list.features.concat(five_a_side_list.features).map(f => f.properties.district))];
            districts.forEach(district => {
                const option = document.createElement('option');
                option.value = district;
                option.textContent = district;
                districtSelect.appendChild(option);
            });

            searchInput.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    const data = filterData(searchInput.value, districtSelect.value);
                    map.getSource('football-fields').setData(data);
                    updateSuggestions(searchInput.value);
                    if (data.features.length && searchInput.value) {
                        map.flyTo({ center: data.features[0].geometry.coordinates, zoom: 17 });
                    }
                }, 300);
            });

            searchInput.addEventListener('blur', () => {
                setTimeout(() => suggestions.style.display = 'none', 200);
            });

            districtSelect.addEventListener('change', () => {
                const data = filterData(searchInput.value, districtSelect.value);
                map.getSource('football-fields').setData(data);
                updateSuggestions(searchInput.value);
                if (data.features.length) {
                    map.flyTo({ center: data.features[0].geometry.coordinates, zoom: 17 });
                }
            });

            clearButton.addEventListener('click', () => {
                searchInput.value = '';
                districtSelect.value = '';
                suggestions.style.display = 'none';
                map.getSource('football-fields').setData(filterData('', ''));
                map.flyTo({ center: [114.17475, 22.337533], zoom: 11 });
            });

            map.on('zoomend', () => {
                if (map.getZoom() >= map.getMaxZoom()) {
                    const alertDiv = document.createElement('div');
                    alertDiv.className = 'zoom-alert';
                    alertDiv.textContent = '已達到最大縮放';
                    map.getContainer().appendChild(alertDiv);
                    setTimeout(() => alertDiv.remove(), 2000);
                }
            });

            map.on('click', ['seven-a-side', 'five-a-side'], (e) => {
                const features = map.queryRenderedFeatures(e.point, { layers: ['seven-a-side', 'five-a-side'] });
                if (features.length) {
                    updateInfo(features[0].properties);
                    map.flyTo({ center: features[0].geometry.coordinates, zoom: 17 });
                }
            });

            map.on('mouseenter', ['seven-a-side', 'five-a-side'], (e) => {
                map.getCanvas().style.cursor = 'pointer';
                if (currentPopup) currentPopup.remove();
                currentPopup = new maplibregl.Popup({ closeButton: false })
                    .setLngLat(e.features[0].geometry.coordinates)
                    .setHTML(`<span>${e.features[0].properties.clean_name_chi}</span>`)
                    .addTo(map);
            });

            map.on('mouseleave', ['seven-a-side', 'five-a-side'], () => {
                map.getCanvas().style.cursor = '';
                if (currentPopup) currentPopup.remove();
            });

            map.on('touchstart', ['seven-a-side', 'five-a-side'], (e) => {
                e.preventDefault();
                longPressTimer = setTimeout(() => {
                    if (currentPopup) currentPopup.remove();
                    currentPopup = new maplibregl.Popup({ closeButton: false })
                        .setLngLat(e.features[0].geometry.coordinates)
                        .setHTML(`<span>${e.features[0].properties.clean_name_chi}</span>`)
                        .addTo(map);
                }, 500);
            });

            map.on('touchend', ['seven-a-side', 'five-a-side'], () => {
                clearTimeout(longPressTimer);
            });

            map.on('touchmove', () => {
                clearTimeout(longPressTimer);
            });
        } catch (e) {
            console.error('地圖加載錯誤:', e);
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error';
            errorDiv.textContent = '地圖加載失敗，請檢查網絡或控制台錯誤';
            document.body.appendChild(errorDiv);
        }
    });

    map.on('error', (e) => {
        console.error('MapLibre 錯誤:', e);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = '地圖初始化失敗，請檢查網絡或控制台錯誤';
        document.body.appendChild(errorDiv);
    });

    map.on('tileerror', (e) => {
        console.error('圖磚加載錯誤:', e);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = '圖磚加載失敗，請檢查網絡或稍後重試';
        document.body.appendChild(errorDiv);
    });
} catch (e) {
    console.error('初始化錯誤:', e);
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = '地圖初始化失敗，請檢查網絡或控制台錯誤';
    document.body.appendChild(errorDiv);
}