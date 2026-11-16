(function () {
    if (window.__modelyxAdminNavLoaded) return;
    window.__modelyxAdminNavLoaded = true;

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
            regs.forEach((reg) => reg.unregister());
        }).catch(() => {});
    }
    if ('caches' in window) {
        caches.keys().then((names) => {
            names.forEach((name) => caches.delete(name));
        }).catch(() => {});
    }

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

    if (window.ModelyxSession) {
        ModelyxSession.guard({ requireManager: true });
    } else if (!token || (role !== 'owner' && role !== 'admin')) {
        window.location.replace('/index.html');
        return;
    }

    if (currentPath === '/staff.html' && role !== 'owner') {
        window.location.replace('/admin.html');
        return;
    }

    if ((currentPath === '/admin.html' || currentPath === '/admin' || currentPath === '/') && activeTab === 'pricing' && role !== 'owner') {
        window.location.replace('/admin.html');
        return;
    }

    window.adminLogout = async function () {
        if (window.ModelyxSession) {
            await ModelyxSession.logout();
            return;
        }
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
        const isDeletedPage = currentPath === '/deleted.html' || currentPath === '/deleted';
        const isStaffPage = currentPath === '/staff.html' || currentPath === '/staff';
        const isChatPage = currentPath === '/chat.html' || currentPath === '/chat';

        const isOrdersTabActive = isOrdersPage && activeTab !== 'pricing';
        const isPricingTabActive = isOrdersPage && activeTab === 'pricing' && role === 'owner';

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
                <button type="button" id="navPricingBtn" class="${isPricingTabActive ? activeIndigoClass : inactiveClass}" style="${role !== 'owner' ? 'display: none;' : ''}">
                    <span class="text-base shrink-0">🏷️</span>
                    <span>Pricing & Team Tiers</span>
                </button>
                <button type="button" id="navCancelledLink" class="${isCancelledPage ? activeRedClass : inactiveClass}">
                    <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M18.364 18.364A9 9 0 115.636 5.636m12.728 12.728L5.636 5.636" stroke-width="2" stroke-linecap="round" />
                    </svg>
                    <span>Cancelled Orders</span>
                </button>
                <button type="button" id="navDeletedLink" class="${isDeletedPage ? activeRedClass : inactiveClass}">
                    <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Rejected / Deleted</span>
                </button>
                <button type="button" id="navStaffLink" class="${isStaffPage ? activeIndigoClass : inactiveClass}" style="${role !== 'owner' ? 'display: none;' : ''}">
                    <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span>Staff & Sub-Admins</span>
                </button>
                <button type="button" id="navChatLink" class="${isChatPage ? activeIndigoClass : inactiveClass}">
                    <span class="text-base shrink-0">💬</span>
                    <span class="flex-1 text-left">Live Support</span>
                    <span id="adminNavChatBadge" class="hidden px-2 py-0.5 text-[11px] font-black bg-rose-500 text-white rounded-full">0</span>
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
            if (role !== 'owner') return;
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

        aside.querySelector('#navDeletedLink').addEventListener('click', () => {
            if (!isDeletedPage) {
                window.location.href = '/deleted.html';
            }
        });

        aside.querySelector('#navStaffLink').addEventListener('click', () => {
            if (!isStaffPage) {
                window.location.href = '/staff.html';
            }
        });

        const chatBtn = aside.querySelector('#navChatLink');
        if (chatBtn) {
            chatBtn.addEventListener('click', () => {
                if (!isChatPage) {
                    window.location.href = '/chat.html';
                }
            });
        }

        const originalDocTitle = document.title;
        function updateDocumentTitle(unreadCount) {
            if (unreadCount > 0) {
                document.title = '(' + unreadCount + ') ' + originalDocTitle.replace(/^\(\d+\)\s*/, '');
            } else {
                document.title = originalDocTitle.replace(/^\(\d+\)\s*/, '');
            }
        }

        function applyChatBadge(count) {
            const badge = aside.querySelector('#adminNavChatBadge');
            if (badge) {
                if (count > 0) {
                    badge.textContent = count > 99 ? '99+' : count;
                    badge.classList.remove('hidden');
                } else {
                    badge.classList.add('hidden');
                }
            }
            updateDocumentTitle(count);
        }

        function playNavChime() {
            try {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (!AudioCtx) return;
                const ctx = new AudioCtx();
                const now = ctx.currentTime;
                const osc1 = ctx.createOscillator();
                const osc2 = ctx.createOscillator();
                const gain = ctx.createGain();
                osc1.type = 'sine';
                osc1.frequency.setValueAtTime(587.33, now);
                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(880, now + 0.12);
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
                osc1.connect(gain);
                osc2.connect(gain);
                gain.connect(ctx.destination);
                osc1.start(now);
                osc1.stop(now + 0.12);
                osc2.start(now + 0.12);
                osc2.stop(now + 0.35);
            } catch (e) {}
        }

        function showLiveChatToast(customerName, messageSnippet) {
            if (isChatPage) return;
            let toastContainer = document.getElementById('adminChatToastContainer');
            if (!toastContainer) {
                toastContainer = document.createElement('div');
                toastContainer.id = 'adminChatToastContainer';
                toastContainer.className = 'fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4';
                document.body.appendChild(toastContainer);
            }

            const toast = document.createElement('div');
            toast.className = 'pointer-events-auto bg-slate-900/95 border border-indigo-500/50 text-white p-4 rounded-2xl shadow-2xl backdrop-blur-md flex items-start gap-3 transition-all duration-300 transform translate-y-4 opacity-0 cursor-pointer hover:border-indigo-400';
            toast.innerHTML = `
                <div class="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 text-base shadow-md shadow-indigo-600/30">
                    💬
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between gap-1">
                        <span class="text-xs font-black text-indigo-300 truncate">${customerName || 'Customer'}</span>
                        <span class="text-[10px] text-slate-400 font-bold">Just now</span>
                    </div>
                    <p class="text-xs text-slate-200 truncate mt-0.5">${messageSnippet || 'Sent a new message'}</p>
                    <div class="mt-2 flex items-center justify-between">
                        <span class="text-[10px] font-black uppercase tracking-wider text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                            Reply in Live Support &rarr;
                        </span>
                    </div>
                </div>
                <button type="button" class="text-slate-400 hover:text-white text-base leading-none p-1 font-bold ml-1">&times;</button>
            `;

            toast.addEventListener('click', (e) => {
                if (e.target.tagName && e.target.tagName.toLowerCase() === 'button') {
                    toast.remove();
                    return;
                }
                window.location.href = '/chat.html';
            });

            const closeBtn = toast.querySelector('button');
            if (closeBtn) {
                closeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toast.remove();
                });
            }

            toastContainer.appendChild(toast);
            requestAnimationFrame(() => {
                toast.classList.remove('translate-y-4', 'opacity-0');
                toast.classList.add('translate-y-0', 'opacity-100');
            });

            setTimeout(() => {
                if (toast.parentNode) {
                    toast.classList.add('opacity-0', 'translate-y-2');
                    setTimeout(() => toast.remove(), 300);
                }
            }, 6500);
        }

        let adminWs = null;
        let adminWsPingTimer = null;

        function connectAdminNavWebSocket() {
            const t = localStorage.getItem('modelyx_token');
            if (!t) return;
            const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${proto}//${window.location.host}/chat/ws?token=${encodeURIComponent(t)}`;

            try {
                adminWs = new WebSocket(wsUrl);
                adminWs.onopen = () => {
                    clearInterval(adminWsPingTimer);
                    adminWsPingTimer = setInterval(() => {
                        if (adminWs && adminWs.readyState === WebSocket.OPEN) {
                            adminWs.send(JSON.stringify({ action: 'ping' }));
                        }
                    }, 25000);
                };

                adminWs.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.type === 'new_message') {
                            const isFromCustomer = data.customer_id || (data.message && data.message.sender_role === 'customer');
                            const unreadVal = data.unread_customers !== undefined ? data.unread_customers : (data.unread_total || 0);
                            if (isFromCustomer) {
                                applyChatBadge(unreadVal > 0 ? unreadVal : 1);
                                playNavChime();
                                const sender = data.customer_name || (data.message && data.message.sender_name) || 'Customer';
                                const text = (data.message && data.message.message) || 'Sent a new message';
                                showLiveChatToast(sender, text);
                            } else if (data.unread_customers !== undefined || data.unread_total !== undefined) {
                                applyChatBadge(unreadVal);
                            }
                        } else if (data.type === 'read_ack') {
                            const unreadVal = data.unread_customers !== undefined ? data.unread_customers : (data.unread_total || 0);
                            applyChatBadge(unreadVal);
                        }
                    } catch (e) {}
                };

                adminWs.onclose = () => {
                    clearInterval(adminWsPingTimer);
                    setTimeout(connectAdminNavWebSocket, 4000);
                };

                adminWs.onerror = () => {
                    if (adminWs) adminWs.close();
                };
            } catch (e) {
                setTimeout(connectAdminNavWebSocket, 5000);
            }
        }

        async function updateNavChatBadge() {
            try {
                const t = localStorage.getItem('modelyx_token');
                if (!t) return;
                const res = await fetch('/chat/admin/conversations', {
                    headers: { 'Authorization': 'Bearer ' + t }
                });
                if (res.ok) {
                    const data = await res.json();
                    const count = data.unread_customers !== undefined ? data.unread_customers : (data.unread_total || 0);
                    applyChatBadge(count);
                }
            } catch (e) {}
        }
        updateNavChatBadge();
        setInterval(updateNavChatBadge, 6000);
        connectAdminNavWebSocket();

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
                        activeTab = (tab === 'pricing' && role !== 'owner') ? 'orders' : tab;
                        const res = origSwitch.apply(this, [activeTab]);
                        updateTabButtonStyles();
                        return res;
                    };
                    window._adminNavSwitchHooked = true;
                }
            };
            hookSwitch();
            window.addEventListener('load', hookSwitch);

            if (activeTab === 'pricing' && role === 'owner') {
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
