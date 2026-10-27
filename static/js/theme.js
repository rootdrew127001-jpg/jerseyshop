// Modelyx Multi-Theme Architecture Engine
(function () {
    const THEME_KEY = 'modelyx_theme';

    const MODELYX_THEMES = [
        {
            id: 'light',
            name: 'Daylight',
            icon: '☀️',
            type: 'light',
            bg: '#f8fafc',
            surface: '#ffffff',
            border: '#e2e8f0',
            accent: '#4f46e5',
            threeBg: '#f1f5f9'
        },
        {
            id: 'dark',
            name: 'Obsidian',
            icon: '🌙',
            type: 'dark',
            bg: '#020617',
            surface: '#0f172a',
            border: '#1e293b',
            accent: '#6366f1',
            threeBg: '#0a071b'
        },
        {
            id: 'cyber',
            name: 'Cyberpunk',
            icon: '⚡',
            type: 'dark',
            bg: '#090314',
            surface: '#14092b',
            border: '#3b1464',
            accent: '#06b6d4',
            threeBg: '#080512'
        },
        {
            id: 'emerald',
            name: 'Stadium',
            icon: '🌿',
            type: 'dark',
            bg: '#03140c',
            surface: '#092316',
            border: '#164e32',
            accent: '#10b981',
            threeBg: '#04180e'
        },
        {
            id: 'cobalt',
            name: 'Cobalt',
            icon: '🌊',
            type: 'dark',
            bg: '#030d1a',
            surface: '#081d36',
            border: '#143e6d',
            accent: '#38bdf8',
            threeBg: '#041224'
        },
        {
            id: 'gold',
            name: 'Gold',
            icon: '🏆',
            type: 'dark',
            bg: '#0c0a08',
            surface: '#1a1612',
            border: '#3d3326',
            accent: '#facc15',
            threeBg: '#120e07'
        },
        {
            id: 'crimson',
            name: 'Crimson',
            icon: '🔥',
            type: 'dark',
            bg: '#120406',
            surface: '#240a0e',
            border: '#521520',
            accent: '#f43f5e',
            threeBg: '#180508'
        }
    ];

    function getStoredTheme() {
        return localStorage.getItem(THEME_KEY) || 'light';
    }

    function resolveThemeObj(themeId) {
        let id = themeId || 'light';
        if (id === 'system') {
            id = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
        }
        return MODELYX_THEMES.find(t => t.id === id) || MODELYX_THEMES[0];
    }

    function applyTheme(themeChoice, persist = false) {
        if (persist) {
            localStorage.setItem(THEME_KEY, themeChoice);
        }

        const themeObj = resolveThemeObj(themeChoice);
        const root = document.documentElement;

        // Set data-theme on html root for CSS selectors
        root.setAttribute('data-theme', themeObj.id);

        // Toggle Tailwind dark class
        if (themeObj.type === 'dark') {
            root.classList.add('dark');
            if (document.body) document.body.classList.add('dark');
        } else {
            root.classList.remove('dark');
            if (document.body) document.body.classList.remove('dark');
        }

        // Set CSS custom variables on root
        root.style.setProperty('--theme-bg', themeObj.bg);
        root.style.setProperty('--theme-surface', themeObj.surface);
        root.style.setProperty('--theme-border', themeObj.border);
        root.style.setProperty('--theme-accent', themeObj.accent);
        root.style.setProperty('--theme-three-bg', themeObj.threeBg);

        // Notify 3D engine if present
        if (window.setThreeStudioTheme) {
            window.setThreeStudioTheme(themeObj.threeBg || (themeObj.type === 'dark' ? '#0a071b' : '#f1f5f9'));
        }

        // Update known theme labels/icons across the page
        const themeName = themeChoice === 'system' ? 'System Auto' : themeObj.name;
        const themeIcon = themeChoice === 'system' ? '🖥️' : themeObj.icon;

        ['adminThemeIcon', 'customerNavThemeIcon', 'themeToggleIcon'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerText = themeIcon;
        });

        ['adminThemeName', 'customerNavThemeName', 'themeToggleText'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerText = themeName;
        });

        // Dispatch reactive event
        window.dispatchEvent(new CustomEvent('modelyx:theme:change', {
            detail: { theme: themeChoice, activeTheme: themeObj }
        }));
    }

    function renderThemeList(containerEl, onSelect) {
        if (!containerEl) return;
        const currentThemeId = getStoredTheme();
        const themes = MODELYX_THEMES;

        containerEl.innerHTML = themes.map(t => {
            const isActive = t.id === currentThemeId;
            return `
                <button type="button" data-theme-id="${t.id}"
                    class="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer mb-1 ${isActive ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-white/10 text-slate-200'}">
                    <div class="flex items-center gap-2">
                        <span class="text-sm">${t.icon}</span>
                        <span>${t.name}</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <div class="flex -space-x-1">
                            <span class="w-2.5 h-2.5 rounded-full border border-white/20" style="background:${t.bg}"></span>
                            <span class="w-2.5 h-2.5 rounded-full border border-white/20" style="background:${t.surface}"></span>
                            <span class="w-2.5 h-2.5 rounded-full border border-white/20" style="background:${t.accent}"></span>
                        </div>
                        ${isActive ? '<span class="text-xs">✓</span>' : ''}
                    </div>
                </button>
            `;
        }).join('') + `
            <div class="border-t border-slate-700/60 my-1 pt-1">
                <button type="button" data-theme-id="system"
                    class="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${currentThemeId === 'system' ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-white/10 text-slate-200'}">
                    <div class="flex items-center gap-2">
                        <span class="text-sm">🖥️</span>
                        <span>System Auto</span>
                    </div>
                    ${currentThemeId === 'system' ? '<span class="text-xs">✓</span>' : ''}
                </button>
            </div>
        `;

        containerEl.querySelectorAll('button[data-theme-id]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const tid = btn.getAttribute('data-theme-id');
                applyTheme(tid, true);
                renderThemeList(containerEl, onSelect);
                if (typeof onSelect === 'function') onSelect(tid);
            });
        });
    }

    function openThemeModal() {
        let modal = document.getElementById('modelyxUniversalThemeModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'modelyxUniversalThemeModal';
            modal.className = 'fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm';
            modal.innerHTML = `
                <div class="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 shadow-2xl border"
                     style="background: var(--theme-surface, #ffffff); border-color: var(--theme-border, #e2e8f0); color: var(--theme-text, #0f172a);">
                    <div class="flex items-center justify-between pb-4 border-b mb-6" style="border-color: var(--theme-border, #e2e8f0);">
                        <div>
                            <p class="text-[10px] uppercase tracking-widest font-black" style="color: var(--theme-accent, #4f46e5);">Appearance & Atmosphere</p>
                            <h2 class="text-2xl font-black mt-0.5">Theme Preferences</h2>
                            <p class="text-xs text-slate-400 mt-1">Select from 7 curated themes + OS auto mode. Updates across all pages live.</p>
                        </div>
                        <button id="closeUniversalThemeModal" class="w-9 h-9 rounded-2xl flex items-center justify-center text-lg font-bold transition cursor-pointer"
                                style="background: var(--theme-surface-sub, #f1f5f9); color: var(--theme-text, #0f172a);">
                            ✕
                        </button>
                    </div>
                    <div id="universalThemeModalGrid" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"></div>
                    <div class="mt-6 flex justify-end">
                        <button id="doneUniversalThemeModal" class="px-6 py-2.5 rounded-xl font-bold text-sm text-white transition shadow-lg cursor-pointer"
                                style="background: var(--theme-accent, #4f46e5);">
                            Done
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            const close = () => modal.classList.add('hidden');
            document.getElementById('closeUniversalThemeModal').onclick = close;
            document.getElementById('doneUniversalThemeModal').onclick = close;
            modal.onclick = (e) => { if (e.target === modal) close(); };
        }

        const renderModalCards = () => {
            const grid = document.getElementById('universalThemeModalGrid');
            if (!grid) return;
            const current = getStoredTheme();
            const themesWithSystem = [
                ...MODELYX_THEMES,
                { id: 'system', name: 'System Auto', icon: '🖥️', bg: '#ffffff', surface: '#0f172a', accent: '#6366f1' }
            ];

            grid.innerHTML = themesWithSystem.map(t => {
                const isSelected = t.id === current;
                const previewBg = t.id === 'system'
                    ? 'linear-gradient(90deg, #ffffff 50%, #020617 50%)'
                    : t.surface;
                return `
                    <div onclick="window.ModelyxTheme.setTheme('${t.id}')"
                         class="theme-option-card relative flex flex-col p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 group"
                         style="border-color: ${isSelected ? 'var(--theme-accent)' : 'var(--theme-border)'}; box-shadow: ${isSelected ? '0 0 0 2px var(--theme-accent)' : 'none'}; background: var(--theme-surface);">
                        <div class="h-20 w-full rounded-xl border p-2.5 shadow-sm mb-3 flex flex-col justify-between overflow-hidden"
                             style="background: ${previewBg}; border-color: var(--theme-border);">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-1.5">
                                    <div class="w-2.5 h-2.5 rounded-full" style="background: ${t.accent};"></div>
                                    <div class="w-10 h-1.5 rounded-full" style="background: var(--theme-border);"></div>
                                </div>
                                <div class="w-4 h-1.5 rounded-full" style="background: var(--theme-accent);"></div>
                            </div>
                            <div class="space-y-1">
                                <div class="w-3/4 h-2 rounded" style="background: ${t.accent}; opacity: 0.8;"></div>
                                <div class="w-1/2 h-1.5 rounded" style="background: var(--theme-border);"></div>
                            </div>
                            <div class="flex gap-1.5">
                                <div class="w-10 h-2.5 rounded" style="background: ${t.accent};"></div>
                            </div>
                        </div>
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <span class="text-base">${t.icon}</span>
                                <span class="font-bold text-sm" style="color: var(--theme-text);">${t.name}</span>
                            </div>
                            <span class="w-5 h-5 rounded-full text-white flex items-center justify-center text-xs font-bold transition-opacity"
                                  style="background: var(--theme-accent); opacity: ${isSelected ? '1' : '0'};">✓</span>
                        </div>
                    </div>
                `;
            }).join('');
        };

        window.addEventListener('modelyx:theme:change', renderModalCards);
        renderModalCards();
        modal.classList.remove('hidden');
    }

    // Apply immediately to prevent FOUC
    const initial = getStoredTheme();
    applyTheme(initial, false);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            applyTheme(getStoredTheme(), false);
        });
    }

    // OS preference listener
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (getStoredTheme() === 'system') {
                applyTheme('system', false);
            }
        });
    }

    // Global ModelyxTheme API
    window.ModelyxTheme = {
        THEMES: MODELYX_THEMES,
        getTheme: getStoredTheme,
        getActiveThemeObj: () => resolveThemeObj(getStoredTheme()),
        getEffectiveTheme: () => resolveThemeObj(getStoredTheme()).type,
        setTheme: (themeChoice) => applyTheme(themeChoice, true),
        renderThemeList: renderThemeList,
        openThemeModal: openThemeModal
    };
})();
