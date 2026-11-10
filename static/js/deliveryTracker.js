(function () {
    if (window.DeliveryTracker) return;

    let activeMap = null;
    let activeRiderMarker = null;
    let activeHubMarker = null;
    let activeDestMarker = null;
    let activePolyline = null;
    let activePathCoordinates = [];
    let activeOrder = null;
    let activeRouteDistanceKm = 6.8;
    let activeRouteDurationMins = 18;

    let animProgress = 0.20;
    let animSpeedMultiplier = 1;
    let isPaused = false;
    let animFrameId = null;
    let lastTimestamp = 0;

    const DEFAULT_HUB = {
        name: "Modelyx Production & Outfitter Hub",
        address: "EDSA / Ortigas Center, Mandaluyong, Metro Manila",
        lat: 14.5866,
        lng: 121.0592
    };

    function calculateDistanceKm(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    function calculateBearing(lat1, lon1, lat2, lon2) {
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
        const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
            Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
        const brng = Math.atan2(y, x) * 180 / Math.PI;
        return (brng + 360) % 360;
    }

    async function fetchRealStreetRoute(start, end) {
        try {
            const localUrl = `/geo/route?start_lat=${start.lat}&start_lng=${start.lng}&end_lat=${end.lat}&end_lng=${end.lng}`;
            const localRes = await fetch(localUrl);
            if (localRes.ok) {
                const localData = await localRes.json();
                if (localData && Array.isArray(localData.coordinates) && localData.coordinates.length > 2) {
                    if (localData.distance_km) activeRouteDistanceKm = Number(localData.distance_km);
                    if (localData.duration_mins) activeRouteDurationMins = Number(localData.duration_mins);
                    return localData.coordinates;
                }
            }
        } catch (e) {}

        try {
            const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                if (data.routes && data.routes[0] && data.routes[0].geometry && data.routes[0].geometry.coordinates) {
                    const coords = data.routes[0].geometry.coordinates;
                    if (coords.length > 2) {
                        if (data.routes[0].distance) activeRouteDistanceKm = Number((data.routes[0].distance / 1000).toFixed(2));
                        if (data.routes[0].duration) activeRouteDurationMins = Number((data.routes[0].duration / 60).toFixed(1));
                        return coords.map(pt => ({ lat: pt[1], lng: pt[0] }));
                    }
                }
            }
        } catch (e) {}

        const points = [];
        const numSegments = 24;
        for (let i = 0; i <= numSegments; i++) {
            const t = i / numSegments;
            points.push({
                lat: start.lat + (end.lat - start.lat) * t,
                lng: start.lng + (end.lng - start.lng) * t
            });
        }
        return points;
    }

    function interpolatePosition(path, progress) {
        if (!path || path.length === 0) return { lat: 0, lng: 0, bearing: 0 };
        if (path.length === 1 || progress <= 0) return { lat: path[0].lat, lng: path[0].lng, bearing: 0 };
        if (progress >= 1) return { lat: path[path.length - 1].lat, lng: path[path.length - 1].lng, bearing: 0 };

        const totalSegments = path.length - 1;
        const segmentProgress = progress * totalSegments;
        const index = Math.floor(segmentProgress);
        const fraction = segmentProgress - index;

        const p1 = path[index];
        const p2 = path[Math.min(index + 1, totalSegments)];

        const lat = p1.lat + (p2.lat - p1.lat) * fraction;
        const lng = p1.lng + (p2.lng - p1.lng) * fraction;
        const bearing = calculateBearing(p1.lat, p1.lng, p2.lat, p2.lng);

        return { lat, lng, bearing };
    }

    function ensureModalDOM() {
        let modal = document.getElementById('deliveryTrackingModal');
        if (modal) return modal;

        modal = document.createElement('div');
        modal.id = 'deliveryTrackingModal';
        modal.className = 'fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 transition-opacity duration-200 hidden select-none';
        modal.innerHTML = `
            <div class="bg-white dark:bg-slate-900 w-full max-w-5xl h-[92vh] max-h-[880px] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
                <header class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur z-10">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-xl shrink-0">
                            🛵
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <h3 id="dtModalTitle" class="text-base font-black text-slate-900 dark:text-white">Live Delivery Route</h3>
                                <span id="dtStatusPill" class="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                                    Dispatched
                                </span>
                            </div>
                            <p id="dtOrderSubtitle" class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Tracking Order</p>
                        </div>
                    </div>
                    <button id="dtCloseBtn" type="button" class="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center text-lg font-bold transition cursor-pointer">
                        ✕
                    </button>
                </header>

                <div class="flex-1 flex flex-col lg:flex-row min-h-0 relative">
                    <div class="flex-1 relative h-64 lg:h-auto min-h-0 bg-slate-100 dark:bg-slate-950">
                        <div id="deliveryMapCanvas" class="w-full h-full min-h-[300px]"></div>

                        <div class="absolute top-4 left-4 z-[400] bg-white/95 dark:bg-slate-900/95 backdrop-blur border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-lg max-w-xs pointer-events-auto">
                            <div class="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                                <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span>Road Street Navigation</span>
                            </div>
                            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Real Street Road Network to Destination</p>
                        </div>

                        <div class="absolute bottom-4 left-4 right-4 sm:right-auto z-[400] flex flex-wrap items-center gap-2 bg-slate-900/90 text-white backdrop-blur px-3 py-2 rounded-2xl shadow-xl border border-slate-800 pointer-events-auto">
                            <span class="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Defense Demo:</span>
                            <button id="dtPlayPauseBtn" type="button" class="px-2.5 py-1 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 rounded-lg transition cursor-pointer">
                                ⏸️ Pause
                            </button>
                            <div class="flex items-center bg-slate-800 rounded-lg p-0.5 text-xs font-bold">
                                <button id="dtSpeed1x" type="button" class="px-2 py-0.5 rounded-md bg-indigo-600 text-white cursor-pointer">1x</button>
                                <button id="dtSpeed2x" type="button" class="px-2 py-0.5 rounded-md text-slate-400 hover:text-white cursor-pointer">2x</button>
                                <button id="dtSpeed5x" type="button" class="px-2 py-0.5 rounded-md text-slate-400 hover:text-white cursor-pointer">5x</button>
                            </div>
                            <div class="h-4 w-px bg-slate-700"></div>
                            <button id="dtJumpDispatched" type="button" class="px-2 py-1 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 rounded-lg transition cursor-pointer">Dispatched</button>
                            <button id="dtJumpMidway" type="button" class="px-2 py-1 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 rounded-lg transition cursor-pointer">Highway</button>
                            <button id="dtJumpNear" type="button" class="px-2 py-1 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 rounded-lg transition cursor-pointer">Nearby</button>
                            <button id="dtJumpDelivered" type="button" class="px-2 py-1 text-[11px] font-semibold bg-emerald-600/80 hover:bg-emerald-600 rounded-lg transition cursor-pointer">Delivered</button>
                        </div>
                    </div>

                    <div class="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 flex flex-col shrink-0 bg-white dark:bg-slate-900 overflow-y-auto">
                        <div class="p-6 space-y-6">
                            <div class="bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/20 rounded-3xl p-5">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Estimated Arrival</span>
                                    <span id="dtEtaClock" class="text-xs font-bold text-slate-500 dark:text-slate-400">--:-- PM</span>
                                </div>
                                <div class="flex items-baseline gap-2">
                                    <span id="dtEtaMinutes" class="text-3xl font-black text-slate-900 dark:text-white">18 mins</span>
                                    <span class="text-xs text-slate-500">remaining</span>
                                </div>
                                <div class="mt-4 grid grid-cols-2 gap-2 text-xs pt-3 border-t border-indigo-500/10">
                                    <div>
                                        <p class="text-slate-400 text-[10px] uppercase font-bold">Distance</p>
                                        <p id="dtRemainingDistance" class="font-extrabold text-slate-800 dark:text-slate-200 text-sm mt-0.5">3.2 km left</p>
                                    </div>
                                    <div>
                                        <p class="text-slate-400 text-[10px] uppercase font-bold">Rider Speed</p>
                                        <p id="dtSpeedKmH" class="font-extrabold text-slate-800 dark:text-slate-200 text-sm mt-0.5">36 km/h</p>
                                    </div>
                                </div>
                            </div>

                            <div class="border border-slate-200 dark:border-slate-800 rounded-3xl p-4 bg-slate-50/50 dark:bg-slate-800/40">
                                <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Assigned Courier</p>
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-3">
                                        <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 text-white font-black flex items-center justify-center text-base shadow-sm">
                                            DS
                                        </div>
                                        <div>
                                            <h4 class="font-extrabold text-sm text-slate-900 dark:text-white">Danilo "Kuya Danny" Santos</h4>
                                            <p class="text-xs text-amber-500 font-bold flex items-center gap-1 mt-0.5">
                                                <span>★ 4.9</span>
                                                <span class="text-slate-400 font-normal">(680+ deliveries)</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div class="mt-3 bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-700/60 text-xs flex justify-between items-center">
                                    <div>
                                        <p class="text-[10px] text-slate-400 font-semibold uppercase">Vehicle Model</p>
                                        <p class="font-bold text-slate-800 dark:text-slate-200">Honda Click 125i (Red)</p>
                                    </div>
                                    <div class="text-right">
                                        <p class="text-[10px] text-slate-400 font-semibold uppercase">Plate Number</p>
                                        <p class="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-lg">NDL-8421</p>
                                    </div>
                                </div>
                                <div class="mt-3 grid grid-cols-2 gap-2">
                                    <button id="dtCallDriverBtn" type="button" class="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm">
                                        <span>📞</span>
                                        <span>Call Driver</span>
                                    </button>
                                    <button id="dtMsgDriverBtn" type="button" class="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer">
                                        <span>💬</span>
                                        <span>Message</span>
                                    </button>
                                </div>
                            </div>

                            <div class="space-y-4">
                                <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">Delivery Milestones</p>
                                <div class="relative pl-6 space-y-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                                    <div class="relative">
                                        <span class="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900"></span>
                                        <p class="text-xs font-bold text-slate-900 dark:text-white">Order Confirmed & Prepared</p>
                                        <p class="text-[11px] text-slate-400">Modelyx Sublimation Facility</p>
                                    </div>
                                    <div class="relative">
                                        <span class="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900"></span>
                                        <p class="text-xs font-bold text-slate-900 dark:text-white">Dispatched from Fulfillment Hub</p>
                                        <p class="text-[11px] text-slate-400">Courier picked up package</p>
                                    </div>
                                    <div class="relative">
                                        <span class="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-indigo-500 animate-pulse border-2 border-white dark:border-slate-900"></span>
                                        <p class="text-xs font-bold text-slate-900 dark:text-white">En Route to Destination</p>
                                        <p class="text-[11px] text-slate-400">Active real-time road navigation</p>
                                    </div>
                                    <div class="relative">
                                        <span class="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-700 border-2 border-white dark:border-slate-900"></span>
                                        <p class="text-xs font-bold text-slate-900 dark:text-white">Delivered & Signed</p>
                                        <p id="dtDestAddressText" class="text-[11px] text-slate-400">Customer destination address</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('#dtCloseBtn').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        modal.querySelector('#dtPlayPauseBtn').addEventListener('click', () => {
            isPaused = !isPaused;
            modal.querySelector('#dtPlayPauseBtn').textContent = isPaused ? '▶️ Resume' : '⏸️ Pause';
        });

        const setSpeed = (spd) => {
            animSpeedMultiplier = spd;
            ['dtSpeed1x', 'dtSpeed2x', 'dtSpeed5x'].forEach(id => {
                const b = modal.querySelector('#' + id);
                if (b) {
                    b.className = 'px-2 py-0.5 rounded-md text-slate-400 hover:text-white cursor-pointer';
                }
            });
            const activeB = modal.querySelector('#dtSpeed' + spd + 'x');
            if (activeB) {
                activeB.className = 'px-2 py-0.5 rounded-md bg-indigo-600 text-white cursor-pointer';
            }
        };

        modal.querySelector('#dtSpeed1x').addEventListener('click', () => setSpeed(1));
        modal.querySelector('#dtSpeed2x').addEventListener('click', () => setSpeed(2));
        modal.querySelector('#dtSpeed5x').addEventListener('click', () => setSpeed(5));

        modal.querySelector('#dtJumpDispatched').addEventListener('click', () => { animProgress = 0.05; updateSimulationUI(); });
        modal.querySelector('#dtJumpMidway').addEventListener('click', () => { animProgress = 0.45; updateSimulationUI(); });
        modal.querySelector('#dtJumpNear').addEventListener('click', () => { animProgress = 0.85; updateSimulationUI(); });
        modal.querySelector('#dtJumpDelivered').addEventListener('click', () => { animProgress = 1.0; updateSimulationUI(); });

        modal.querySelector('#dtCallDriverBtn').addEventListener('click', () => {
            showDeliveryToast('📞 Connecting to Kuya Danilo (0917-884-2190)... "Hello po! On delivery transit na po."');
        });

        modal.querySelector('#dtMsgDriverBtn').addEventListener('click', () => {
            showDeliveryToast('💬 Message Sent to Driver: "Please leave package with building reception if unavailable."');
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
                closeModal();
            }
        });

        return modal;
    }

    function showDeliveryToast(msg) {
        let toast = document.getElementById('dtInteractiveToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'dtInteractiveToast';
            toast.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 z-[99999] bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 text-xs font-bold transition duration-200 pointer-events-none opacity-0';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.style.opacity = '1';
        toast.style.transform = 'translate(-50%, -8px)';
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translate(-50%, 0)';
        }, 3200);
    }

    function updateSimulationUI() {
        const modal = ensureModalDOM();
        const curPos = interpolatePosition(activePathCoordinates, animProgress);

        if (activeRiderMarker && activeRiderMarker.setLatLng) {
            activeRiderMarker.setLatLng([curPos.lat, curPos.lng]);
        }

        const totalDist = activeRouteDistanceKm || (activePathCoordinates.length > 1
            ? calculateDistanceKm(
                activePathCoordinates[0].lat, activePathCoordinates[0].lng,
                activePathCoordinates[activePathCoordinates.length - 1].lat, activePathCoordinates[activePathCoordinates.length - 1].lng
            ) * 1.35
            : 8.5);

        const remainingDist = Math.max(0.1, totalDist * (1 - animProgress));
        const factor = (activeRouteDurationMins && totalDist) ? (activeRouteDurationMins / totalDist) : 2.5;
        const remainingMinutes = animProgress >= 1 ? 0 : Math.max(1, Math.round(remainingDist * factor));

        const now = new Date();
        now.setMinutes(now.getMinutes() + remainingMinutes);
        const etaClockStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const elMinutes = modal.querySelector('#dtEtaMinutes');
        const elClock = modal.querySelector('#dtEtaClock');
        const elDist = modal.querySelector('#dtRemainingDistance');
        const elSpeed = modal.querySelector('#dtSpeedKmH');
        const elStatusPill = modal.querySelector('#dtStatusPill');

        if (elClock) elClock.textContent = `Estimated: ${etaClockStr}`;

        if (animProgress >= 0.99) {
            if (elMinutes) elMinutes.textContent = 'Arrived!';
            if (elDist) elDist.textContent = '0.0 km • Delivered';
            if (elSpeed) elSpeed.textContent = '0 km/h';
            if (elStatusPill) {
                elStatusPill.textContent = 'Delivered';
                elStatusPill.className = 'text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700';
            }
        } else if (animProgress >= 0.75) {
            if (elMinutes) elMinutes.textContent = `${remainingMinutes} mins`;
            if (elDist) elDist.textContent = `${remainingDist.toFixed(1)} km left`;
            if (elSpeed) elSpeed.textContent = `${Math.round(28 * animSpeedMultiplier)} km/h`;
            if (elStatusPill) {
                elStatusPill.textContent = 'Nearby Destination';
                elStatusPill.className = 'text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700';
            }
        } else {
            if (elMinutes) elMinutes.textContent = `${remainingMinutes} mins`;
            if (elDist) elDist.textContent = `${remainingDist.toFixed(1)} km left`;
            const baseSpd = 36 + Math.round(Math.sin(animProgress * 10) * 6);
            if (elSpeed) elSpeed.textContent = `${baseSpd} km/h`;
            if (elStatusPill) {
                elStatusPill.textContent = 'In Transit';
                elStatusPill.className = 'text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700';
            }
        }
    }

    function runAnimationLoop(timestamp) {
        if (!lastTimestamp) lastTimestamp = timestamp;
        const delta = (timestamp - lastTimestamp) / 1000;
        lastTimestamp = timestamp;

        if (!isPaused && activePathCoordinates.length > 1) {
            const stepRate = 0.015 * animSpeedMultiplier;
            animProgress += stepRate * delta;
            if (animProgress > 1) animProgress = 0.05;
            updateSimulationUI();
        }

        const modal = document.getElementById('deliveryTrackingModal');
        if (modal && !modal.classList.contains('hidden')) {
            animFrameId = requestAnimationFrame(runAnimationLoop);
        }
    }

    function ensureLeafletLoaded() {
        if (window.L && window.L.map) return Promise.resolve();

        return new Promise((resolve) => {
            if (!document.getElementById('leafletCssTag')) {
                const link = document.createElement('link');
                link.id = 'leafletCssTag';
                link.rel = 'stylesheet';
                link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                document.head.appendChild(link);
            }

            if (document.getElementById('leafletJsTag')) {
                const checkL = setInterval(() => {
                    if (window.L && window.L.map) {
                        clearInterval(checkL);
                        resolve();
                    }
                }, 50);
                return;
            }

            const script = document.createElement('script');
            script.id = 'leafletJsTag';
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = () => resolve();
            document.head.appendChild(script);
        });
    }

    async function buildLeafletMap(container, start, end, order) {
        await ensureLeafletLoaded();

        if (activeMap && activeMap.remove) {
            try { activeMap.remove(); } catch (e) {}
        }
        container.innerHTML = '';

        const primaryTileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        const fallbackTileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';

        const centerLat = (start.lat + end.lat) / 2;
        const centerLng = (start.lng + end.lng) / 2;

        activeMap = window.L.map(container, {
            zoomControl: false,
            attributionControl: false
        }).setView([centerLat, centerLng], 13);

        window.L.control.zoom({ position: 'topright' }).addTo(activeMap);

        const baseLayer = window.L.tileLayer(primaryTileUrl, { maxZoom: 19 }).addTo(activeMap);
        let switchedToFallback = false;
        baseLayer.on('tileerror', () => {
            if (!switchedToFallback) {
                switchedToFallback = true;
                baseLayer.setUrl(fallbackTileUrl);
            }
        });

        activePathCoordinates = await fetchRealStreetRoute(start, end);
        const polylineCoords = activePathCoordinates.map(p => [p.lat, p.lng]);

        activePolyline = window.L.polyline(polylineCoords, {
            color: '#4f46e5',
            weight: 6,
            opacity: 0.9,
            lineJoin: 'round',
            lineCap: 'round'
        }).addTo(activeMap);

        activeMap.fitBounds(polylineCoords, { paddingTopLeft: [60, 80], paddingBottomRight: [60, 80] });

        const hubHtml = `
            <div style="background: #1e1b4b; border: 2px solid #818cf8; color: white; border-radius: 12px; padding: 4px 10px; font-size: 14px; box-shadow: 0 10px 20px rgba(0,0,0,0.3); display: inline-flex; align-items: center; gap: 5px; font-weight: 800; white-space: nowrap; width: max-content; transform: translate(-50%, -50%);">
                <span>🏭</span>
                <span style="font-size: 11px; font-family: sans-serif;">Hub</span>
            </div>
        `;
        const hubIcon = window.L.divIcon({ html: hubHtml, className: 'dt-hub-icon', iconSize: [0, 0], iconAnchor: [0, 0] });
        activeHubMarker = window.L.marker([start.lat, start.lng], { icon: hubIcon }).addTo(activeMap);

        const destHtml = `
            <div style="background: #064e3b; border: 2px solid #34d399; color: white; border-radius: 12px; padding: 4px 10px; font-size: 14px; box-shadow: 0 10px 20px rgba(0,0,0,0.3); display: inline-flex; align-items: center; gap: 5px; font-weight: 800; white-space: nowrap; width: max-content; transform: translate(-50%, -50%);">
                <span>📍</span>
                <span style="font-size: 11px; font-family: sans-serif;">Destination</span>
            </div>
        `;
        const destIcon = window.L.divIcon({ html: destHtml, className: 'dt-dest-icon', iconSize: [0, 0], iconAnchor: [0, 0] });
        activeDestMarker = window.L.marker([end.lat, end.lng], { icon: destIcon }).addTo(activeMap);

        const riderHtml = `
            <div style="background: #4f46e5; border: 3px solid #ffffff; color: white; border-radius: 9999px; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; font-size: 22px; box-shadow: 0 12px 24px rgba(79, 70, 229, 0.45); transform: translate(-50%, -50%);">
                🛵
            </div>
        `;
        const riderIcon = window.L.divIcon({ html: riderHtml, className: 'dt-rider-icon', iconSize: [0, 0], iconAnchor: [0, 0] });
        const initial = interpolatePosition(activePathCoordinates, animProgress);
        activeRiderMarker = window.L.marker([initial.lat, initial.lng], { icon: riderIcon, zIndexOffset: 1000 }).addTo(activeMap);
        updateSimulationUI();

        setTimeout(() => {
            if (activeMap) activeMap.invalidateSize();
        }, 200);

        lastTimestamp = 0;
        if (animFrameId) cancelAnimationFrame(animFrameId);
        animFrameId = requestAnimationFrame(runAnimationLoop);
    }

    async function openModal(orderOrId) {
        const modal = ensureModalDOM();
        modal.classList.remove('hidden');

        let order = null;
        if (orderOrId && typeof orderOrId === 'object') {
            order = orderOrId;
        } else if (orderOrId !== undefined && orderOrId !== null && String(orderOrId) !== 'undefined') {
            const idStr = String(orderOrId);
            if (window.cachedOrders && Array.isArray(window.cachedOrders)) {
                order = window.cachedOrders.find(o => String(o.id) === idStr);
            }
            if (!order && window.allData && Array.isArray(window.allData)) {
                order = window.allData.find(o => String(o.id) === idStr);
            }
        }

        if (!order) {
            const first = (window.cachedOrders && window.cachedOrders[0]) || (window.allData && window.allData[0]);
            order = {
                id: (first && first.id) || (orderOrId && String(orderOrId) !== 'undefined' ? orderOrId : 101),
                team_name: (first && first.team_name) || 'Custom Jersey',
                player_number: (first && first.player_number) || '23',
                shipping_name: (first && first.shipping_name) || localStorage.getItem('modelyx_user_name') || 'Customer',
                shipping_address: (first && first.shipping_address) || localStorage.getItem('modelyx_shipping_address') || 'Delivery Address',
                latitude: (first && first.latitude) || localStorage.getItem('modelyx_shipping_latitude') || 14.5547,
                longitude: (first && first.longitude) || localStorage.getItem('modelyx_shipping_longitude') || 121.0244
            };
        }

        activeOrder = order;

        const elTitle = modal.querySelector('#dtModalTitle');
        const elSub = modal.querySelector('#dtOrderSubtitle');
        const elDest = modal.querySelector('#dtDestAddressText');

        const resolvedId = order.id || 101;
        if (elTitle) elTitle.textContent = `Live Route: Order #${resolvedId}`;
        if (elSub) elSub.textContent = `${order.team_name || 'Modelyx Jersey'} #${order.player_number || '00'} • Recipient: ${order.shipping_name || 'Customer'}`;
        const fullAddr = [order.shipping_address, order.shipping_city, order.shipping_state].filter(Boolean).join(', ');
        if (elDest) elDest.textContent = fullAddr || 'Saved Delivery Pin Destination';

        const start = DEFAULT_HUB;
        const end = {
            lat: Number(order.latitude) || 14.5547,
            lng: Number(order.longitude) || 121.0244
        };

        animProgress = 0.20;
        isPaused = false;
        animSpeedMultiplier = 1;

        const container = document.getElementById('deliveryMapCanvas');
        if (container) {
            await buildLeafletMap(container, start, end, order);
        }
    }

    function closeModal() {
        const modal = document.getElementById('deliveryTrackingModal');
        if (modal) modal.classList.add('hidden');
        if (animFrameId) cancelAnimationFrame(animFrameId);
        animFrameId = null;
    }

    window.DeliveryTracker = {
        openModal: openModal,
        closeModal: closeModal
    };
})();
