(function () {
    if (window.__modelyxAdminNavLoaded) return;
    window.__modelyxAdminNavLoaded = true;

    if (!window.ModelyxTheme && !document.querySelector('script[src*="theme.js"]')) {
        const themeScript = document.createElement('script');
        themeScript.src = '/static/js/theme.js';
        document.head.appendChild(themeScript);
    }

    const currentPath = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);
    let activeTab = urlParams.get('tab') || 'orders';

    let token = localStorage.getItem('modelyx_token');
    if (!token) {
        const ct = document.cookie.split(';').find(c => c.trim().startsWith('modelyx_token='));
        if (ct) token = ct.split('=')[1];
    }

    let role = localStorage.getItem('modelyx_user_role');
    if (!role) {
        const cr = document.cookie.split(';').find(c => c.trim().startsWith('modelyx_role='));
        if (cr) role = cr.split('=')[1];
    }

    if (!token || (role !== 'owner' && role !== 'admin')) {
        window.location.replace('/index.html');
        return;
    }

    if (currentPath === '/staff.html' && role !== 'owner') {
        window.location.replace('/admin.html');
        return;
    }

    window.adminLogout = async function () {
        const t = localStorage.getItem('modelyx_token');
        if (t) {
            try {
                await fetch('/auth/logout', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + t }
                });
            } catch (e) {}
        }
        ['modelyx_token', 'modelyx_role', 'modelyx_name', 'modelyx_email', 'modelyx_shipping_setup'].forEach(name => {
            document.cookie = `${name}=; Max-Age=0; path=/;`;
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        });
        localStorage.clear();
        sessionStorage.clear();
        window.location.replace('/index.html?logout=1');
    };

    window.logout = window.adminLogout;

    const buildSidebar = () => {
        const isOrdersPage = currentPath === '/admin.html' || currentPath === '/admin' || currentPath === '/';
        const isCancelledPage = currentPath === '/cancelled.html' || currentPath === '/cancelled';
        const isStaffPage = currentPath === '/staff.html' || currentPath === '/staff';

        const isOrdersTabActive = isOrdersPage && activeTab !== 'pricing';
        const isPricingTabActive = isOrdersPage && activeTab === 'pricing';

        const activeIndigoClass = 'w-full flex items-center space-x-3 p-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 text-left cursor-pointer transition';
        const activeRedClass = 'w-full flex items-center space-x-3 p-3 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-500/20 text-left cursor-pointer transition';
        const inactiveClass = 'w-full flex items-center space-x-3 p-3 hover:bg-white/5 hover:text-white rounded-xl font-bold transition text-left cursor-pointer text-slate-400';
        const themeBtnClass = 'w-full flex items-center space-x-3 p-3 hover:bg-white/10 hover:text-white rounded-xl font-bold transition text-left cursor-pointer text-slate-300';

        const aside = document.createElement('aside');
        aside.id = 'adminNavSidebar';
        aside.className = 'w-64 shrink-0 bg-slate-900 text-slate-400 flex flex-col p-6 shadow-2xl h-screen select-none';

        aside.innerHTML = `
            <div class="mb-10">
                <h1 class="text-xl font-black text-white italic tracking-tighter">ADMIN <span class="text-indigo-500">PORTAL</span></h1>
            </div>
            <nav class="flex-1 space-y-2">
                <button type="button" id="navOrdersBtn" class="${isOrdersTabActive ? activeIndigoClass : inactiveClass}">
                    <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke-width="2" />
                    </svg>
                    <span>Orders</span>
                </button>
                <button type="button" id="navPricingBtn" class="${isPricingTabActive ? activeIndigoClass : inactiveClass}">
                    <span class="text-base shrink-0">🏷️</span>
                    <span>Pricing & Team Tiers</span>
                </button>
                <button type="button" id="navCancelledLink" class="${isCancelledPage ? activeRedClass : inactiveClass}">
                    <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M18.364 18.364A9 9 0 115.636 5.636m12.728 12.728L5.636 5.636" stroke-width="2" stroke-linecap="round" />
                    </svg>
                    <span>Cancelled Orders</span>
                </button>
                <button type="button" id="navStaffLink" class="${isStaffPage ? activeIndigoClass : inactiveClass}" style="${role !== 'owner' ? 'display: none;' : ''}">
                    <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span>Staff & Sub-Admins</span>
                </button>
                <button type="button" id="navThemeBtn" class="${themeBtnClass}">
                    <span class="text-base shrink-0">🎨</span>
                    <span>Theme & Settings</span>
                </button>
            </nav>
            <button type="button" id="navLogoutBtn" class="mt-auto p-3 text-red-400 hover:bg-red-500/10 rounded-xl transition font-bold text-sm text-center cursor-pointer">
                Logout
            </button>
        `;

        aside.querySelector('#navOrdersBtn').addEventListener('click', () => {
            if (isOrdersPage) {
                activeTab = 'orders';
                if (typeof window.switchAdminTab === 'function') {
                    window.switchAdminTab('orders');
                }
                history.replaceState(null, '', '/admin.html');
                updateTabButtonStyles();
            } else {
                window.location.href = '/admin.html';
            }
        });

        aside.querySelector('#navPricingBtn').addEventListener('click', () => {
            if (isOrdersPage) {
                activeTab = 'pricing';
                if (typeof window.switchAdminTab === 'function') {
                    window.switchAdminTab('pricing');
                }
                history.replaceState(null, '', '/admin.html?tab=pricing');
                updateTabButtonStyles();
            } else {
                window.location.href = '/admin.html?tab=pricing';
            }
        });

        aside.querySelector('#navCancelledLink').addEventListener('click', () => {
            if (!isCancelledPage) {
                window.location.href = '/cancelled.html';
            }
        });

        aside.querySelector('#navStaffLink').addEventListener('click', () => {
            if (!isStaffPage) {
                window.location.href = '/staff.html';
            }
        });

        aside.querySelector('#navThemeBtn').addEventListener('click', () => {
            if (window.ModelyxTheme && typeof window.ModelyxTheme.openThemeModal === 'function') {
                window.ModelyxTheme.openThemeModal();
            }
        });

        aside.querySelector('#navLogoutBtn').addEventListener('click', window.adminLogout);

        function updateTabButtonStyles() {
            if (!isOrdersPage) return;
            const btnOrders = aside.querySelector('#navOrdersBtn');
            const btnPricing = aside.querySelector('#navPricingBtn');
            if (btnOrders) {
                btnOrders.className = (activeTab !== 'pricing') ? activeIndigoClass : inactiveClass;
            }
            if (btnPricing) {
                btnPricing.className = (activeTab === 'pricing') ? activeIndigoClass : inactiveClass;
            }
        }

        const mount = document.getElementById('adminNavMount');
        if (mount) {
            mount.replaceWith(aside);
        } else {
            const existing = document.getElementById('adminNavSidebar');
            if (existing) {
                existing.replaceWith(aside);
            } else {
                const main = document.querySelector('main');
                if (main && main.parentNode) {
                    main.parentNode.insertBefore(aside, main);
                } else {
                    document.body.insertAdjacentElement('afterbegin', aside);
                }
            }
        }

        if (isOrdersPage) {
            const hookSwitch = () => {
                if (typeof window.switchAdminTab === 'function' && !window._adminNavSwitchHooked) {
                    const origSwitch = window.switchAdminTab;
                    window.switchAdminTab = function(tab) {
                        activeTab = tab;
                        const res = origSwitch.apply(this, arguments);
                        updateTabButtonStyles();
                        return res;
                    };
                    window._adminNavSwitchHooked = true;
                }
            };
            hookSwitch();
            window.addEventListener('load', hookSwitch);

            if (activeTab === 'pricing') {
                const checkAndSwitch = () => {
                    if (typeof window.switchAdminTab === 'function') {
                        window.switchAdminTab('pricing');
                        updateTabButtonStyles();
                    } else {
                        setTimeout(checkAndSwitch, 50);
                    }
                };
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', checkAndSwitch);
                } else {
                    checkAndSwitch();
                }
            }
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', buildSidebar);
    } else {
        buildSidebar();
    }
})();
