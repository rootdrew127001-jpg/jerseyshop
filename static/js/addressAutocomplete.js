(function () {
    const cache = new Map();
    const activeControllers = new WeakMap();

    const debounce = (fn, delay = 500) => {
        let timeout = null;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn(...args), delay);
        };
    };

    const createDropdown = (input, dark) => {
        const dropdown = document.createElement('div');
        dropdown.className = [
            'hidden fixed z-[9999] max-h-72 overflow-y-auto rounded-2xl border shadow-2xl text-sm',
            dark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-900'
        ].join(' ');
        dropdown.setAttribute('role', 'listbox');
        document.body.appendChild(dropdown);

        const position = () => {
            const rect = input.getBoundingClientRect();
            dropdown.style.left = `${rect.left}px`;
            dropdown.style.top = `${rect.bottom + 6}px`;
            dropdown.style.width = `${rect.width}px`;
        };

        window.addEventListener('resize', position);
        window.addEventListener('scroll', position, true);

        return { dropdown, position };
    };

    const addressPart = (address, keys) => keys.map(key => address[key]).find(Boolean) || '';

    const normalizePlace = place => {
        const address = place.address || {};
        const street = [
            address.house_number,
            address.road || address.pedestrian || address.footway || address.residential,
            address.neighbourhood || address.suburb || address.quarter || address.village
        ].filter(Boolean).join(', ');

        return {
            display: place.display_name,
            address: street || place.display_name,
            city: addressPart(address, ['city', 'town', 'municipality', 'village', 'city_district', 'county']),
            state: addressPart(address, ['state', 'region', 'province']),
            zip: address.postcode || '',
            country: address.country || '',
            lat: Number(place.lat),
            lng: Number(place.lon)
        };
    };

    const setText = (dropdown, message, muted = true) => {
        dropdown.innerHTML = `
            <div class="px-4 py-3 ${muted ? 'text-slate-400' : ''}">
                ${message}
            </div>
        `;
        dropdown.classList.remove('hidden');
    };

    const searchAddresses = async (query, input) => {
        const normalized = query.trim().toLowerCase();
        if (cache.has(normalized)) return cache.get(normalized);

        const previous = activeControllers.get(input);
        if (previous) previous.abort();

        const controller = new AbortController();
        activeControllers.set(input, controller);

        const params = new URLSearchParams({ q: query });

        const response = await fetch(`/geo/search?${params.toString()}`, {
            signal: controller.signal,
            headers: { 'Accept': 'application/json' }
        });
        if (!response.ok) throw new Error('Address search failed');

        const data = await response.json();
        const places = data.map(normalizePlace);
        cache.set(normalized, places);
        return places;
    };

    const fillFields = (place, mapping) => {
        const set = (id, value, dispatchInput = true) => {
            const field = document.getElementById(id);
            if (field && value) {
                field.value = value;
                if (dispatchInput) {
                    field.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
        };

        set(mapping.address, place.address, false);
        set(mapping.city, place.city);
        set(mapping.state, place.state);
        set(mapping.zip, place.zip);
        set(mapping.country, place.country);
        set(mapping.lat, Number.isFinite(place.lat) ? place.lat.toFixed(8) : '');
        set(mapping.lng, Number.isFinite(place.lng) ? place.lng.toFixed(8) : '');

        const input = document.getElementById(mapping.address);
        if (input) {
            input.dispatchEvent(new CustomEvent('address:selected', {
                bubbles: true,
                detail: place
            }));
        }
    };

    const renderResults = (places, dropdown, mapping, dark, hide) => {
        if (!places.length) {
            setText(dropdown, 'No address suggestions found.');
            return;
        }

        dropdown.innerHTML = places.map((place, index) => `
            <button type="button" data-index="${index}"
                class="block w-full px-4 py-3 text-left transition ${dark ? 'hover:bg-slate-700 border-b border-slate-700' : 'hover:bg-slate-50 border-b border-slate-100'}">
                <span class="block font-bold">${place.address}</span>
                <span class="block text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}">${place.display}</span>
            </button>
        `).join('') + `
            <div class="px-4 py-2 text-[10px] ${dark ? 'text-slate-500' : 'text-slate-400'}">
                Suggestions by OpenStreetMap
            </div>
        `;

        dropdown.querySelectorAll('button[data-index]').forEach(button => {
            button.addEventListener('mousedown', event => {
                event.preventDefault();
                const place = places[Number(button.dataset.index)];
                fillFields(place, mapping);
                hide();
            });
        });

        dropdown.classList.remove('hidden');
    };

    const init = (options) => {
        const input = document.getElementById(options.inputId);
        if (!input || input.dataset.addressAutocomplete === 'ready') return;

        input.dataset.addressAutocomplete = 'ready';
        input.setAttribute('autocomplete', 'off');

        const dark = options.theme === 'dark';
        const mapping = {
            address: options.inputId,
            city: options.cityId,
            state: options.stateId,
            zip: options.zipId,
            country: options.countryId,
            lat: options.latId,
            lng: options.lngId
        };
        const { dropdown, position } = createDropdown(input, dark);

        const hide = () => dropdown.classList.add('hidden');
        const runSearch = debounce(async () => {
            const query = input.value.trim();
            if (query.length < 3) {
                hide();
                return;
            }

            position();
            setText(dropdown, 'Searching address suggestions...');

            try {
                const places = await searchAddresses(query, input);
                position();
                renderResults(places, dropdown, mapping, dark, hide);
            } catch (error) {
                if (error.name !== 'AbortError') {
                    setText(dropdown, 'Address suggestions are unavailable right now.');
                }
            }
        });

        input.addEventListener('input', runSearch);
        input.addEventListener('focus', () => {
            if (input.value.trim().length >= 3) runSearch();
        });
        input.addEventListener('blur', () => setTimeout(hide, 150));
    };

    window.AddressAutocomplete = { init };
})();
