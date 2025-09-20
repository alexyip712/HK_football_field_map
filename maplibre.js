document.addEventListener('DOMContentLoaded', () => {
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
                    'minzoom': 9,
                    'maxzoom': 21
                }]
            },
            center: [114.17475, 22.367533],
            zoom: 12,
            minZoom: 10,
            maxZoom: 19,
            maxBounds: [[113.75, 22.15], [114.481, 22.571]]
        });

        // disable map rotation using right click + drag
        map.dragRotate.disable();

        // disable map rotation using keyboard
        map.keyboard.disable();

        // disable map rotation using touch rotation gesture
        map.touchZoomRotate.disableRotation();

        const layerControl = {
            '五人硬地足球場': { layerId: 'five-a-side', labelId: 'five-a-side-labels', color: 'green' },
            '七人硬地足球場': { layerId: 'seven-a-side', labelId: 'seven-a-side-labels', color: 'blue' },
            '七人人造草足球場': { layerId: 'artificial-seven-a-side', labelId: 'artificial-seven-a-side-labels', color: 'limegreen' },
            '七人天然草足球場': { layerId: 'natural-seven-a-side', labelId: 'natural-seven-a-side-labels', color: 'darkgreen' },            
            '十一人人造草足球場': { layerId: 'artificial-11-a-side', labelId: 'artificial-11-a-side-labels', color: 'turquoise' },
            '十一人天然草足球場': { layerId: 'natural-11-a-side', labelId: 'natural-11-a-side-labels', color: 'teal' }
        };

        let currentPopup = null;
        let longPressTimer = null;
        let debounceTimer = null;

        const searchInput = document.getElementById('searchInput');
        const suggestions = document.getElementById('suggestions');
        const districtSelect = document.getElementById('districtFilter');
        const clearButton = document.getElementById('clearFilter');
        const info = document.getElementById('info');
        const toggleIcon = document.getElementById('toggleCard');

        function getHashSuffix(cate) {
            switch (cate) {
                case '五人硬地足球場': return '5';
                case '七人硬地足球場': return '7';
                case '七人人造草足球場': return '7A';
                case '七人天然草足球場': return '7N';
                case '十一人人造草足球場': return '11A';
                case '十一人天然草足球場': return '11N';
                default: return '';
            }
        }

        function updateInfo(properties) {
            const branchStatus = document.getElementById('branchStatus');
            const branchName = document.getElementById('branchName');
            const branchDetail = document.getElementById('branchDetail');
            const branchDistrict = document.getElementById('branchdistrict');
            const facilities = document.getElementById('facilities');
            const other = document.getElementById('other');
            const phone = document.getElementById('phone');
            const opening_hours = document.getElementById('opening_hours');
            const number = document.getElementById('number');
            const closeButton = document.querySelector('.close');

            facilities.innerHTML = properties.facilities ? `<li>設施：${properties.facilities}</li>` : '<li>設施：未提供</li>';
            phone.innerHTML = properties.phone ? `<li>電話：${properties.phone}</li>` : '<li>電話：未提供</li>';
            opening_hours.innerHTML = properties.opening_hours ? `<li>開放時間：${properties.opening_hours}</li>` : '<li>開放時間：未提供</li>';
            number.innerHTML = properties.number ? `<li>球場數目：${properties.number}</li>` : '<li>球場數目：未提供</li>';
            other.innerHTML = properties.other ? `<li>其他：${properties.other}</li>` : '<li>其他：未提供</li>';

            if (properties) {
                info.classList.remove('card-hidden');
                branchStatus.className = layerControl[properties.cate].color;
                branchStatus.textContent = properties.cate;
                branchName.textContent = properties.name_chi;
                branchDetail.textContent = properties.address;
                branchDistrict.textContent = properties.district;
                toggleIcon.style.display = window.innerWidth <= 835 ? 'block' : 'none';
                closeButton.onclick = () => {
                    info.classList.add('card-hidden');
                    history.pushState({}, '', window.location.pathname);
                    document.title = '香港足球場地圖'; // 重置標題
                };
                toggleIcon.onclick = () => {
                    const isExpanded = info.classList.toggle('expanded');
                    toggleIcon.innerHTML = isExpanded ? '<i class="fas fa-chevron-down"></i>' : '<i class="fas fa-chevron-up"></i>';
                    toggleIcon.setAttribute('aria-label', isExpanded ? '收起資訊卡' : '展開資訊卡');
                };
                // 動態更新 <title>
                document.title = `${properties.clean_name_chi} | 香港足球場地圖`;
            } else {
                info.classList.add('card-hidden');
                document.title = '香港足球場地圖'; // 重置標題
            }
        }

        function filterData(searchTerm, district) {
            let filteredFeatures = seven_a_side_list.features
                .concat(five_a_side_list.features)
                .concat(artificial_11_a_side_list.features)
                .concat(natural_11_a_side_list.features)
                .concat(natural_seven_a_side_list.features)
                .concat(artificial_seven_a_side_list.features);
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
                    div.textContent = f.properties.name_chi + (f.properties.cate.includes('十一人') ? ' (11)' : f.properties.cate.includes('七人') ? ' (7)' : ' (5)');
                    div.setAttribute('role', 'option');
                    div.onclick = () => {
                        searchInput.value = f.properties.name_chi;
                        updateInfo(f.properties);
                        map.flyTo({ center: f.geometry.coordinates, zoom: 16.9, essential: true });
                        history.pushState({}, '', `?name=${encodeURIComponent(f.properties.name_chi)}&type=${getHashSuffix(f.properties.cate)}`);
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
                                        zoom: 16,
                                        essential: true
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

                // 清除按鈕
                const searchContainer = searchInput.parentElement;
                const clearInput = document.createElement('span');
                clearInput.className = 'clear-input';
                clearInput.textContent = '×';
                clearInput.setAttribute('aria-label', '清除搜索');
                clearInput.setAttribute('tabindex', '0');
                clearInput.style.display = 'none';
                searchContainer.style.position = 'relative';
                searchContainer.appendChild(clearInput);

                searchInput.addEventListener('input', () => {
                    clearInput.style.display = searchInput.value.length > 0 ? 'block' : 'none';
                });

                clearInput.addEventListener('click', () => {
                    searchInput.value = '';
                    clearInput.style.display = 'none';
                    const data = filterData('', districtSelect.value);
                    map.getSource('football-fields').setData(data);
                    updateSuggestions('');
                });

                clearInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        clearInput.click();
                    }
                });

                // 動態生成 JSON-LD
                const allFeatures = [
                    five_a_side_list,
                    seven_a_side_list,
                    artificial_11_a_side_list,
                    natural_11_a_side_list,
                    natural_seven_a_side_list,
                    artificial_seven_a_side_list
                ]
                    .filter(list => list && list.features)
                    .reduce((acc, list) => acc.concat(list.features), [])
                    .slice(80, 294);

                const jsonLD = {
                    "@context": "https://schema.org",
                    "@type": "Map",
                    "name": "香港足球場地圖",
                    "url": window.location.href,
                    "description": "互動地圖展示香港所有五人、七人及十一人足球場，包含地址、開放時間及設施資訊",
                    "hasMap": allFeatures.map(feature => ({
                        "@type": "Place",
                        "name": feature.properties.name_chi,
                        "address": {
                            "@type": "PostalAddress",
                            "streetAddress": feature.properties.address || "未提供",
                            "addressLocality": feature.properties.district || "未提供",
                            "addressCountry": "HK"
                        },
                        "geo": {
                            "@type": "GeoCoordinates",
                            "latitude": feature.geometry.coordinates[1],
                            "longitude": feature.geometry.coordinates[0]
                        },
                        "description": `${feature.properties.cate}，設施：${feature.properties.facilities || '未提供'}，開放時間：${feature.properties.opening_hours || '未提供'}`
                    }))
                };

                const script = document.createElement('script');
                script.type = 'application/ld+json';
                script.textContent = JSON.stringify(jsonLD, null, 2);
                document.head.appendChild(script);

                map.addSource('football-fields', {
                    type: 'geojson',
                    data: filterData('', '')
                });

                const layers = [
                    {
                        id: 'natural-seven-a-side',
                        filter: ['==', 'cate', '七人天然草足球場'],
                        paint: {
                            'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 5, 15, 12, 18, 18],
                            'circle-color': '#fbff00ff',
                            'circle-opacity': 0.7,
                            'circle-stroke-color': '#838101ff',
                            'circle-stroke-width': 2
                        }
                    },
                    {
                        id: 'artificial-seven-a-side',
                        filter: ['==', 'cate', '七人人造草足球場'],
                        paint: {
                            'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 5, 15, 12, 18, 18],
                            'circle-color': '#32CD32',
                            'circle-opacity': 0.7,
                            'circle-stroke-color': '#228B22',
                            'circle-stroke-width': 2
                        }
                    },
                    {
                        id: 'five-a-side',
                        filter: ['==', 'cate', '五人硬地足球場'],
                        paint: {
                            'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 5, 15, 12, 18, 18],
                            'circle-color': '#c93939ff',
                            'circle-opacity': 0.7,
                            'circle-stroke-color': '#c92d2dff',
                            'circle-stroke-width': 2
                        }
                    },
                    {
                        id: 'seven-a-side',
                        filter: ['==', 'cate', '七人硬地足球場'],
                        paint: {
                            'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 5, 15, 12, 18, 18],
                            'circle-color': '#509cf3ff',
                            'circle-opacity': 0.7,
                            'circle-stroke-color': '#3e74bbff',
                            'circle-stroke-width': 2
                        }
                    },
                    {
                        id: 'artificial-11-a-side',
                        filter: ['==', 'cate', '十一人人造草足球場'],
                        paint: {
                            'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 5, 15, 12, 18, 18],
                            'circle-color': '#ffa735ff',
                            'circle-opacity': 0.7,
                            'circle-stroke-color': '#db5800ff',
                            'circle-stroke-width': 2
                        }
                    },
                    {
                        id: 'natural-11-a-side',
                        filter: ['==', 'cate', '十一人天然草足球場'],
                        paint: {
                            'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 5, 15, 12, 18, 18],
                            'circle-color': '#b03dd3ff',
                            'circle-opacity': 0.7,
                            'circle-stroke-color': '#672885ff',
                            'circle-stroke-width': 2
                        }
                    }
                ];

                // 添加圓圈層
                layers.forEach(layer => {
                    map.addLayer({
                        id: layer.id,
                        type: 'circle',
                        source: 'football-fields',
                        filter: layer.filter,
                        paint: layer.paint
                    });

                    map.on('click', layer.id, (e) => {
                        const features = map.queryRenderedFeatures(e.point, { layers: [layer.id] });
                        if (features.length) {
                            updateInfo(features[0].properties);
                            map.flyTo({ center: features[0].geometry.coordinates, zoom: 16.9, essential: true });
                            history.pushState({}, '', `?name=${encodeURIComponent(features[0].properties.name_chi)}&type=${getHashSuffix(features[0].properties.cate)}`);
                        }
                    });

                    map.on('mouseenter', layer.id, () => {
                        map.getCanvas().style.cursor = 'pointer';
                        if (currentPopup) currentPopup.remove();
                    });

                    map.on('mouseleave', layer.id, () => {
                        map.getCanvas().style.cursor = '';
                        if (currentPopup) currentPopup.remove();
                    });

                    map.on('touchstart', layer.id, (e) => {
                        e.preventDefault();
                        longPressTimer = setTimeout(() => {
                            if (currentPopup) currentPopup.remove();
                            currentPopup = new maplibregl.Popup({ closeButton: false })
                                .setLngLat(e.features[0].geometry.coordinates)
                                .setHTML(`<span>${e.features[0].properties.clean_name_chi}</span>`)
                                .addTo(map);
                        }, 500);
                    });

                    map.on('touchend', layer.id, () => {
                        clearTimeout(longPressTimer);
                    });
                });

                // 添加標籤層（只添加一次）
                map.addLayer({
                    id: 'seven-a-side-labels',
                    type: 'symbol',
                    source: 'football-fields',
                    minzoom: 14,
                    filter: ['==', 'cate', '七人硬地足球場'],
                    layout: {
                        'text-field': ['get', 'clean_name_chi'],
                        'text-font': ['Noto Sans TC Bold'],
                        'text-size': 12,
                        'text-offset': [0, 1.5],
                        'text-anchor': 'top',
                        'text-allow-overlap': false
                    },
                    paint: {
                        'text-color': '#143674ff',
                        'text-halo-color': '#fff',
                        'text-halo-width': 2.2
                    }
                });

                map.addLayer({
                    id: 'five-a-side-labels',
                    type: 'symbol',
                    source: 'football-fields',
                    minzoom: 14,
                    filter: ['==', 'cate', '五人硬地足球場'],
                    layout: {
                        'text-field': ['get', 'clean_name_chi'],
                        'text-font': ['Noto Sans TC Bold'],
                        'text-size': 12,
                        'text-offset': [0, 1.5],
                        'text-anchor': 'top',
                        'text-allow-overlap': false
                    },
                    paint: {
                        'text-color': '#6b0505ff',
                        'text-halo-color': '#fff',
                        'text-halo-width': 2.2
                    }
                });

                map.addLayer({
                    id: 'artificial-11-a-side-labels',
                    type: 'symbol',
                    source: 'football-fields',
                    minzoom: 14,
                    filter: ['==', 'cate', '十一人人造草足球場'],
                    layout: {
                        'text-field': ['get', 'clean_name_chi'],
                        'text-font': ['Noto Sans TC Bold'],
                        'text-size': 12,
                        'text-offset': [0, 1.5],
                        'text-anchor': 'top',
                        'text-allow-overlap': true
                    },
                    paint: {
                        'text-color': '#a84300ff',
                        'text-halo-color': '#fff',
                        'text-halo-width': 2.2
                    }
                });

                map.addLayer({
                    id: 'natural-11-a-side-labels',
                    type: 'symbol',
                    source: 'football-fields',
                    minzoom: 14,
                    filter: ['==', 'cate', '十一人天然草足球場'],
                    layout: {
                        'text-field': ['get', 'clean_name_chi'],
                        'text-font': ['Noto Sans TC Bold'],
                        'text-size': 12,
                        'text-offset': [0, 1.5],
                        'text-anchor': 'top',
                        'text-allow-overlap': true
                    },
                    paint: {
                        'text-color': '#3a0055ff',
                        'text-halo-color': '#fff',
                        'text-halo-width': 2.2
                    }
                });

                map.addLayer({
                    id: 'natural-seven-a-side-labels',
                    type: 'symbol',
                    source: 'football-fields',
                    minzoom: 14,
                    filter: ['==', 'cate', '七人天然草足球場'],
                    layout: {
                        'text-field': ['get', 'clean_name_chi'],
                        'text-font': ['Noto Sans TC Bold'],
                        'text-size': 12,
                        'text-offset': [0, 1.5],
                        'text-anchor': 'top',
                        'text-allow-overlap': true
                    },
                    paint: {
                        'text-color': '#fffd75ff',
                        'text-halo-color': '#000000ff',
                        'text-halo-width': 2
                    }
                });

                map.addLayer({
                    id: 'artificial-seven-a-side-labels',
                    type: 'symbol',
                    source: 'football-fields',
                    minzoom: 14,
                    filter: ['==', 'cate', '七人人造草足球場'],
                    layout: {
                        'text-field': ['get', 'clean_name_chi'],
                        'text-font': ['Noto Sans TC Bold'],
                        'text-size': 12,
                        'text-offset': [0, 1.5],
                        'text-anchor': 'top',
                        'text-allow-overlap': true
                    },
                    paint: {
                        'text-color': '#1B761B',
                        'text-halo-color': '#fff',
                        'text-halo-width': 2.2
                    }
                });

                map.on('touchmove', () => {
                    clearTimeout(longPressTimer);
                });

                // Handle URL query on load
                if (window.location.search) {
                    const params = new URLSearchParams(window.location.search);
                    const fieldName = params.get('name');
                    const fieldType = params.get('type');
                    if (fieldName && fieldType) {
                        const data = filterData('', '');
                        const feature = data.features.find(f => f.properties.name_chi === fieldName && getHashSuffix(f.properties.cate) === fieldType);
                        if (feature) {
                            map.flyTo({ center: feature.geometry.coordinates, zoom: 16.9, essential: true });
                            updateInfo(feature.properties);
                        } else {
                            document.title = '香港足球場地圖'; // 無效 URL，重置標題
                        }
                    } else {
                        document.title = '香港足球場地圖'; // 無效 URL，重置標題
                    }
                } else {
                    document.title = '香港足球場地圖'; // 默認標題
                }

                // Handle query changes (e.g., back/forward)
                window.addEventListener('popstate', () => {
                    if (window.location.search) {
                        const params = new URLSearchParams(window.location.search);
                        const fieldName = params.get('name');
                        const fieldType = params.get('type');
                        if (fieldName && fieldType) {
                            const data = filterData('', '');
                            const feature = data.features.find(f => f.properties.name_chi === fieldName && getHashSuffix(f.properties.cate) === fieldType);
                            if (feature) {
                                map.flyTo({ center: feature.geometry.coordinates, zoom: 16.9, essential: true });
                                updateInfo(feature.properties);
                            } else {
                                document.title = '香港足球場地圖'; // 無效 URL，重置標題
                            }
                        } else {
                            document.title = '香港足球場地圖'; // 無效 URL，重置標題
                        }
                    } else {
                        info.classList.add('card-hidden');
                        document.title = '香港足球場地圖'; // 重置標題
                    }
                });

                // 自訂地區排序
                const customOrder = [
                    '中西區', '灣仔區', '東區', '南區',
                    '油尖旺區', '深水埗區', '九龍城區', '黃大仙區', '觀塘區',
                    '北區', '大埔區', '沙田區', '西貢區', '荃灣區', '屯門區', '元朗區', '葵青區', '離島區'
                ];
                const districts = [...new Set(seven_a_side_list.features
                    .concat(five_a_side_list.features)
                    .concat(artificial_11_a_side_list.features)
                    .concat(natural_11_a_side_list.features)
                    .concat(natural_seven_a_side_list.features)
                    .concat(artificial_seven_a_side_list.features)
                    .map(f => f.properties.district))]
                    .sort((a, b) => {
                        const indexA = customOrder.indexOf(a);
                        const indexB = customOrder.indexOf(b);
                        // 若地區不在 customOrder 中，放在末尾
                        if (indexA === -1) return 1;
                        if (indexB === -1) return -1;
                        return indexA - indexB;
                    });

                // 添加預設選項
                //const defaultOption = document.createElement('option');
                //defaultOption.value = '';
                //defaultOption.textContent = '所有地區';
                //districtSelect.appendChild(defaultOption);

                // 添加排序後的地區
                districts.forEach(district => {
                    const option = document.createElement('option');
                    option.value = district;
                    option.textContent = district;
                    districtSelect.appendChild(option);
                });

                // 檢查未排序的地區
                const missingDistricts = districts.filter(d => !customOrder.includes(d));
                if (missingDistricts.length > 0) {
                    console.warn('以下地區不在自訂排序列表中，已放末尾：', missingDistricts);
                }

                const layerControlDiv = document.createElement('div');
                layerControlDiv.className = 'layer-control';
                const toggleLayerContainer = document.createElement('div');
                toggleLayerContainer.className = 'toggle-layer-container';
                const toggleLayerTitle = document.createElement('span');
                toggleLayerTitle.style.fontWeight = 'bold';
                const toggleLayerIcon = document.createElement('span');
                toggleLayerIcon.className = 'toggle-layer-icon';
                toggleLayerIcon.innerHTML = '<i class="fa-solid fa-filter"></i>';
                toggleLayerIcon.setAttribute('aria-label', '展開圖層控制');
                toggleLayerContainer.appendChild(toggleLayerTitle);
                toggleLayerContainer.appendChild(toggleLayerIcon);
                layerControlDiv.appendChild(toggleLayerContainer);
                const layerContent = document.createElement('div');
                layerContent.className = 'layer-content';
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
                    iconSpan.textContent = color === 'blue' ? '🔵' :
                                        color === 'green' ? '🔴' :
                                        color === 'turquoise' ? '🟠' :
                                        color === 'teal' ? '🟣' :
                                        color === 'darkgreen' ? '🟡' : '🟢';
                    iconSpan.style.marginRight = '5px';
                    iconSpan.setAttribute('aria-label',
                        color === 'blue' ? '藍色圓點表示七人硬地足球場' :
                        color === 'green' ? '綠色圓點表示五人硬地足球場' :
                        color === 'turquoise' ? '藍綠圓點表示十一人人造草足球場' :
                        color === 'teal' ? '深藍綠圓點表示十一人天然草足球場' :
                        color === 'darkgreen' ? '深綠圓點表示七人天然草足球場' :
                        '淺綠圓點表示七人人造草足球場');
                    labelElem.appendChild(iconSpan);
                    labelElem.appendChild(document.createTextNode(label));
                    div.appendChild(checkbox);
                    div.appendChild(labelElem);
                    layerContent.appendChild(div);
                }
                layerControlDiv.appendChild(layerContent);

                toggleLayerIcon.onclick = () => {
                    const isCollapsed = layerControlDiv.classList.toggle('collapsed');
                    toggleLayerIcon.innerHTML = isCollapsed ? '<i class="fa-solid fa-filter"></i>' : '<i class="fa fa-chevron-up"></i>';
                    toggleLayerIcon.setAttribute('aria-label', isCollapsed ? '展開圖層控制' : '收起圖層控制');
                };

                const existingLayerControl = document.querySelector('.layer-control');
                if (existingLayerControl) {
                    existingLayerControl.remove();
                }
                if (window.innerWidth <= 835) {
                    document.getElementById('searchFilter').appendChild(layerControlDiv);
                    layerControlDiv.classList.add('collapsed');
                } else {
                    document.body.appendChild(layerControlDiv);
                }

                window.addEventListener('resize', () => {
                    const existingLayerControl = document.querySelector('.layer-control');
                    if (existingLayerControl) {
                        existingLayerControl.remove();
                    }
                    if (window.innerWidth <= 835) {
                        document.getElementById('searchFilter').appendChild(layerControlDiv);
                        layerControlDiv.classList.add('collapsed');
                    } else {
                        document.body.appendChild(layerControlDiv);
                        layerControlDiv.classList.remove('collapsed');
                    }
                });

                searchInput.addEventListener('input', () => {
                    clearTimeout(debounceTimer);
                    debounceTimer = setTimeout(() => {
                        const data = filterData(searchInput.value, districtSelect.value);
                        map.getSource('football-fields').setData(data);
                        updateSuggestions(searchInput.value);
                        if (data.features.length && searchInput.value) {
                            map.flyTo({ center: data.features[0].geometry.coordinates, zoom: 16.9, essential: true });
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
                        map.flyTo({ center: data.features[0].geometry.coordinates, zoom: 16.9, essential: true });
                    }
                });

                clearButton.addEventListener('click', () => {
                    searchInput.value = '';
                    districtSelect.value = '';
                    suggestions.style.display = 'none';
                    info.classList.add('card-hidden');
                    history.pushState({}, '', window.location.pathname);
                    map.getSource('football-fields').setData(filterData('', ''));
                    map.flyTo({ center: [114.17475, 22.337533], zoom: 11, essential: true });
                    document.title = '香港足球場地圖'; // 重置標題
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

            } catch (e) {
                console.error('地圖加載錯誤:', e);
            }    
        });

        map.on('error', (e) => {
            console.error('MapLibre 錯誤:', e);
        });

        map.on('tileerror', (e) => {
            console.error('圖磚加載錯誤:', e);
        });

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/HK_football_field_map/sw.js').then(() => {
                console.log('Service Worker 註冊成功');
            }).catch(err => {
                console.error('Service Worker 註冊失敗:', err);
            });
        }

    } catch (e) {
        console.error('初始化錯誤:', e);
    }
});