(function () {
    if (!window.ModelyxTheme && !document.querySelector('script[src*="theme.js"]')) {
        const script = document.createElement('script');
        script.src = '/static/js/theme.js';
        document.head.appendChild(script);
    }

    const links = [
        { href: '/dashboard.html', label: 'Dashboard', icon: 'M4 6h16M4 12h16M4 18h16' },
        { href: '/editor.html', label: '3D Designer', icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
        { href: '/orders.html', label: 'Orders', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
        { href: '/profile.html', label: 'Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
        { href: '/settings.html', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' }
    ];

    const currentPath = window.location.pathname;
    let role = localStorage.getItem('modelyx_user_role');
    if (!role) {
        const cr = document.cookie.split(';').find(c => c.trim().startsWith('modelyx_role='));
        if (cr) role = cr.split('=')[1];
    }
    let setup = localStorage.getItem('modelyx_shipping_setup');
    if (!setup) {
        const cs = document.cookie.split(';').find(c => c.trim().startsWith('modelyx_shipping_setup='));
        if (cs) setup = cs.split('=')[1];
    }
    const shipping = localStorage.getItem('modelyx_shipping_address');
    const urlParams = new URLSearchParams(window.location.search);
    const isSetupMode = urlParams.get('setup') === 'address' || urlParams.get('required') === '1';

    if (role === 'customer' && (!shipping || setup === '0') && currentPath !== '/settings.html') {
        window.location.replace('/settings.html?setup=address&required=1');
        return;
    }

    const icon = path => `
        <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="${path}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
        </svg>
    `;

    const buildNav = () => {
        const collapsed = localStorage.getItem('modelyx_customer_nav_hidden') === '1';
        const nav = document.createElement('aside');
        nav.id = 'customerNav';
        nav.className = `customer-nav ${collapsed ? 'is-collapsed' : ''}`;
        nav.innerHTML = `
            <div class="customer-nav-top">
                <div class="customer-brand">
                    <div class="customer-brand-mark">M</div>
                    <div class="customer-label">
                        <p class="customer-brand-name">Modelyx</p>
                        <p class="customer-brand-sub">Customer</p>
                    </div>
                </div>
                <button id="customerNavToggle" class="customer-icon-button" aria-label="Collapse navigation">
                    ${icon('M15 19l-7-7 7-7')}
                </button>
            </div>
            <nav class="customer-link-list">
                ${isSetupMode ? `
                    <div class="px-4 py-3 text-xs text-amber-500 font-bold flex items-center gap-2">
                        <span>📍</span>
                        <span class="customer-label">Complete Delivery Setup</span>
                    </div>
                ` : links.map(link => {
                    const active = currentPath === link.href || (currentPath === '/' && link.href === '/dashboard.html');
                    return `
                        <a href="${link.href}" title="${link.label}" class="customer-link ${active ? 'is-active' : ''}">
                            ${icon(link.icon)}
                            <span class="customer-label">${link.label}</span>
                        </a>
                    `;
                }).join('')}
            </nav>
            <div class="customer-nav-bottom">
                <div class="relative mb-2">
                    <button id="customerNavThemeBtn" type="button" class="customer-link w-full flex items-center justify-between cursor-pointer" title="Switch Theme">
                        <div class="flex items-center gap-2">
                            <span id="customerNavThemeIcon" class="text-base shrink-0">☀️</span>
                            <span id="customerNavThemeName" class="customer-label text-xs font-bold">Theme</span>
                        </div>
                        <span class="customer-label text-[10px] opacity-60">▾</span>
                    </button>
                    <div id="customerNavThemeMenu" class="hidden absolute left-0 bottom-12 w-60 rounded-2xl p-2 shadow-2xl border z-50"></div>
                </div>
                <button id="customerNavLogout" class="customer-link customer-logout" title="Sign Out">
                    ${icon('M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1')}
                    <span class="customer-label">Sign Out</span>
                </button>
            </div>
        `;

        document.body.appendChild(nav);

        const applyState = value => {
            localStorage.setItem('modelyx_customer_nav_hidden', value ? '1' : '0');
            nav.classList.toggle('is-collapsed', value);
            document.body.classList.toggle('customer-nav-collapsed', value);
            document.body.classList.toggle('customer-nav-open', !value);
        };

        document.getElementById('customerNavToggle').addEventListener('click', () => {
            applyState(!nav.classList.contains('is-collapsed'));
        });

        const performLogout = async () => {
            const token = localStorage.getItem('modelyx_token');
            if (token) {
                try {
                    await fetch('/auth/logout', {
                        method: 'POST',
                        headers: { 'Authorization': 'Bearer ' + token }
                    });
                } catch (e) {
                    console.warn('Backend logout warning:', e);
                }
            }
            ['modelyx_token', 'modelyx_role', 'modelyx_name'].forEach(name => {
                document.cookie = `${name}=; Max-Age=0; path=/;`;
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            });
            localStorage.clear();
            sessionStorage.clear();
            location.href = '/index.html?logout=1';
        };

        const logoutBtn = document.getElementById('customerNavLogout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                performLogout();
            });
        }

        // Theme Toggle Controller
        const themeBtn = document.getElementById('customerNavThemeBtn');
        const themeMenu = document.getElementById('customerNavThemeMenu');
        if (themeBtn && themeMenu) {
            const syncThemeLabels = () => {
                if (!window.ModelyxTheme) return;
                const active = window.ModelyxTheme.getActiveThemeObj();
                const cur = window.ModelyxTheme.getTheme();
                const iconEl = document.getElementById('customerNavThemeIcon');
                const nameEl = document.getElementById('customerNavThemeName');
                if (iconEl) iconEl.innerText = cur === 'system' ? '🖥️' : (active?.icon || '☀️');
                if (nameEl) nameEl.innerText = cur === 'system' ? 'System Auto' : (active?.name || 'Theme');
            };

            themeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                themeMenu.classList.toggle('hidden');
                if (!themeMenu.classList.contains('hidden') && window.ModelyxTheme) {
                    window.ModelyxTheme.renderThemeList(themeMenu, () => {
                        themeMenu.classList.add('hidden');
                        syncThemeLabels();
                    });
                }
            });

            document.addEventListener('click', (e) => {
                if (!themeBtn.contains(e.target) && !themeMenu.contains(e.target)) {
                    themeMenu.classList.add('hidden');
                }
            });

            window.addEventListener('modelyx:theme:change', syncThemeLabels);
            syncThemeLabels();
        }

        document.body.classList.toggle('customer-nav-collapsed', collapsed);
        document.body.classList.toggle('customer-nav-open', !collapsed);
    };

    const style = document.createElement('style');
    style.textContent = `
        .customer-nav {
            position: fixed;
            inset: 0 auto 0 0;
            z-index: 90;
            width: 16rem;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            background: #1f1238;
            color: #c4b5fd;
            border-right: 1px solid rgba(255,255,255,0.08);
            box-shadow: 0 24px 60px rgba(15,23,42,0.28);
            transition: width .25s ease;
        }
        .customer-nav.is-collapsed { width: 4.75rem; }
        .customer-nav-top {
            height: 4.5rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: .75rem;
            padding: 1rem;
        }
        .customer-brand { min-width: 0; display: flex; align-items: center; gap: .75rem; }
        .customer-brand-mark {
            width: 2.25rem;
            height: 2.25rem;
            border-radius: .85rem;
            display: grid;
            place-items: center;
            background: #6d28d9;
            color: #fff;
            font-weight: 900;
        }
        .customer-brand-name { color: #fff; font-size: .85rem; font-weight: 900; line-height: 1; }
        .customer-brand-sub { color: #a78bfa; font-size: .65rem; font-weight: 700; margin-top: .25rem; }
        .customer-icon-button {
            width: 2.25rem;
            height: 2.25rem;
            display: grid;
            place-items: center;
            border-radius: .85rem;
            color: #c4b5fd;
            background: rgba(255,255,255,0.06);
            transition: .2s ease;
        }
        .customer-icon-button:hover { background: rgba(255,255,255,0.12); color: #fff; }
        .customer-nav.is-collapsed .customer-icon-button svg { transform: rotate(180deg); }
        .customer-link-list { flex: 1; padding: .5rem .75rem 0; display: flex; flex-direction: column; gap: .35rem; }
        .customer-link {
            min-height: 2.55rem;
            display: flex;
            align-items: center;
            gap: .8rem;
            border-radius: .9rem;
            padding: 0 .8rem;
            color: #c4b5fd;
            font-size: .78rem;
            font-weight: 800;
            white-space: nowrap;
            transition: .18s ease;
        }
        .customer-link:hover { background: rgba(255,255,255,0.08); color: #fff; }
        .customer-link.is-active {
            background: #4c1d95;
            color: #fff;
            box-shadow: inset 3px 0 0 #a78bfa;
        }
        .customer-nav-bottom { padding: .75rem; border-top: 1px solid rgba(255,255,255,0.08); }
        .customer-logout { width: 100%; color: #fca5a5; }
        .customer-label { overflow: hidden; text-overflow: ellipsis; transition: opacity .18s ease, width .18s ease; }
        .customer-nav.is-collapsed .customer-label { width: 0; opacity: 0; pointer-events: none; }
        .customer-nav.is-collapsed .customer-link,
        .customer-nav.is-collapsed .customer-icon-button,
        .customer-nav.is-collapsed .customer-brand { justify-content: center; }
        @media (min-width: 1024px) {
            body.customer-nav-open { padding-left: 16rem; }
            body.customer-nav-collapsed { padding-left: 4.75rem; }
        }
        @media (max-width: 1023px) {
            .customer-nav { transform: translateX(0); width: 4.75rem; }
            .customer-nav .customer-label { width: 0; opacity: 0; pointer-events: none; }
            body { padding-left: 4.75rem; }
        }
    `;
    document.head.appendChild(style);

    window.addEventListener('DOMContentLoaded', buildNav);
})();
