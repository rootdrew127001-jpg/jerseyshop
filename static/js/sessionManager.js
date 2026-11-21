(function () {
    const memory = {
        session: null,
        promise: null
    };

    function parseCookies() {
        const out = {};
        const raw = document.cookie || '';
        raw.split(';').forEach(part => {
            const trimmed = part.trim();
            if (!trimmed) return;
            const idx = trimmed.indexOf('=');
            if (idx > 0) {
                out[trimmed.substring(0, idx)] = trimmed.substring(idx + 1);
            }
        });
        return out;
    }

    function decodeJwt(token) {
        if (!token || typeof token !== 'string') return null;
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        try {
            const base64Url = parts[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
            return JSON.parse(jsonPayload);
        } catch (e) {
            try {
                return JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
            } catch (err) {
                return null;
            }
        }
    }

    function isTokenExpired(payload) {
        if (!payload || !payload.exp) return false;
        return (Number(payload.exp) * 1000) < Date.now();
    }

    function extractQueryToken() {
        const urlParams = new URLSearchParams(window.location.search);
        const qToken = urlParams.get('token');
        if (qToken) {
            const payload = decodeJwt(qToken);
            if (payload && isTokenExpired(payload)) {
                clearAuthStorage();
                return null;
            }
            const storedEmail = localStorage.getItem('modelyx_user_email');
            if (payload && payload.email && storedEmail && storedEmail.toLowerCase() !== payload.email.toLowerCase()) {
                clearAuthStorage();
            }
            localStorage.setItem('modelyx_token', qToken);
            document.cookie = `modelyx_token=${qToken}; path=/; max-age=604800; SameSite=Lax`;
            if (payload && payload.role) {
                localStorage.setItem('modelyx_user_role', payload.role);
                document.cookie = `modelyx_role=${encodeURIComponent(payload.role)}; path=/; max-age=604800; SameSite=Lax`;
            }
            if (payload && payload.email) {
                localStorage.setItem('modelyx_user_email', payload.email);
                document.cookie = `modelyx_email=${encodeURIComponent(payload.email)}; path=/; max-age=604800; SameSite=Lax`;
            }
            urlParams.delete('token');
            const cleanSearch = urlParams.toString();
            const cleanUrl = window.location.pathname + (cleanSearch ? '?' + cleanSearch : '') + window.location.hash;
            window.history.replaceState({}, document.title, cleanUrl);
            return qToken;
        }
        return null;
    }

    function getToken() {
        const q = extractQueryToken();
        let tok = q || localStorage.getItem('modelyx_token');
        if (!tok) {
            const cookies = parseCookies();
            if (cookies.modelyx_token) {
                tok = cookies.modelyx_token;
                localStorage.setItem('modelyx_token', tok);
            }
        }
        if (!tok) return null;
        const payload = decodeJwt(tok);
        if (payload && isTokenExpired(payload)) {
            clearAuthStorage();
            return null;
        }
        if (payload && payload.role) {
            const curRole = localStorage.getItem('modelyx_user_role');
            if (curRole !== payload.role) {
                localStorage.setItem('modelyx_user_role', payload.role);
                document.cookie = `modelyx_role=${encodeURIComponent(payload.role)}; path=/; max-age=604800; SameSite=Lax`;
            }
        }
        return tok;
    }

    function getCachedProfile() {
        const token = getToken();
        if (!token) return null;
        const payload = decodeJwt(token);
        const cookies = parseCookies();
        const role = (payload && payload.role) || localStorage.getItem('modelyx_user_role') || cookies.modelyx_role || 'customer';
        const name = localStorage.getItem('modelyx_user_name') || (cookies.modelyx_name ? decodeURIComponent(cookies.modelyx_name) : '');
        const email = (payload && payload.email) || localStorage.getItem('modelyx_user_email') || (cookies.modelyx_email ? decodeURIComponent(cookies.modelyx_email) : '');
        const setup = localStorage.getItem('modelyx_shipping_setup') || cookies.modelyx_shipping_setup || '0';
        return {
            authenticated: true,
            user: {
                role: role,
                name: name,
                email: email,
                has_shipping_setup: setup === '1',
                shipping: {
                    address: localStorage.getItem('modelyx_shipping_address') || '',
                    city: localStorage.getItem('modelyx_shipping_city') || '',
                    state: localStorage.getItem('modelyx_shipping_state') || '',
                    zip_code: localStorage.getItem('modelyx_shipping_zip') || '',
                    country: localStorage.getItem('modelyx_shipping_country') || 'Philippines',
                    phone: localStorage.getItem('modelyx_shipping_phone') || localStorage.getItem('modelyx_user_phone') || '',
                    latitude: localStorage.getItem('modelyx_shipping_latitude'),
                    longitude: localStorage.getItem('modelyx_shipping_longitude')
                }
            }
        };
    }

    function syncUserToStorage(user) {
        if (!user) return;
        if (user.role) localStorage.setItem('modelyx_user_role', user.role);
        if (user.name) localStorage.setItem('modelyx_user_name', user.name);
        if (user.email) localStorage.setItem('modelyx_user_email', user.email);
        const hasSetup = user.has_shipping_setup ? '1' : '0';
        localStorage.setItem('modelyx_shipping_setup', hasSetup);
        document.cookie = `modelyx_shipping_setup=${hasSetup}; path=/; max-age=2592000; SameSite=Lax`;
        if (user.name) document.cookie = `modelyx_name=${encodeURIComponent(user.name)}; path=/; max-age=2592000; SameSite=Lax`;
        if (user.role) document.cookie = `modelyx_role=${encodeURIComponent(user.role)}; path=/; max-age=2592000; SameSite=Lax`;
        if (user.email) document.cookie = `modelyx_email=${encodeURIComponent(user.email)}; path=/; max-age=2592000; SameSite=Lax`;

        if (user.shipping) {
            const s = user.shipping;
            if (s.address) localStorage.setItem('modelyx_shipping_address', s.address);
            if (s.city) localStorage.setItem('modelyx_shipping_city', s.city);
            if (s.state) localStorage.setItem('modelyx_shipping_state', s.state);
            if (s.zip_code) localStorage.setItem('modelyx_shipping_zip', s.zip_code);
            if (s.country) localStorage.setItem('modelyx_shipping_country', s.country);
            if (s.phone) {
                localStorage.setItem('modelyx_shipping_phone', s.phone);
                localStorage.setItem('modelyx_user_phone', s.phone);
            }
            if (s.latitude !== null && s.latitude !== undefined) localStorage.setItem('modelyx_shipping_latitude', String(s.latitude));
            if (s.longitude !== null && s.longitude !== undefined) localStorage.setItem('modelyx_shipping_longitude', String(s.longitude));
        }
    }

    async function fetchSession() {
        const token = getToken();
        if (!token) {
            memory.session = { authenticated: false, user: null };
            return memory.session;
        }

        try {
            const res = await fetch('/auth/session', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (res.ok) {
                const data = await res.json();
                if (data && data.authenticated && data.user) {
                    memory.session = data;
                    syncUserToStorage(data.user);
                    return data;
                }
            }
            if (res.status === 401 || res.status === 403) {
                clearAuthStorage();
            }
        } catch (e) {}

        memory.session = { authenticated: false, user: null };
        return memory.session;
    }

    function getSession(forceRefresh) {
        if (!forceRefresh && memory.session) {
            return Promise.resolve(memory.session);
        }
        if (memory.promise && !forceRefresh) {
            return memory.promise;
        }
        memory.promise = fetchSession().finally(() => {
            memory.promise = null;
        });
        return memory.promise;
    }

    function clearAuthStorage() {
        [
            'modelyx_token', 'modelyx_role', 'modelyx_name', 'modelyx_email', 'modelyx_shipping_setup'
        ].forEach(name => {
            document.cookie = `${name}=; Max-Age=0; path=/;`;
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        });
        [
            'modelyx_token', 'modelyx_user_role', 'modelyx_user_name', 'modelyx_user_email', 'modelyx_user_phone',
            'modelyx_shipping_address', 'modelyx_shipping_city', 'modelyx_shipping_state',
            'modelyx_shipping_zip', 'modelyx_shipping_country', 'modelyx_shipping_phone',
            'modelyx_shipping_notes', 'modelyx_shipping_setup', 'modelyx_shipping_latitude',
            'modelyx_shipping_longitude'
        ].forEach(k => localStorage.removeItem(k));
        sessionStorage.clear();
        memory.session = null;
    }

    async function logout() {
        const token = getToken();
        if (token) {
            try {
                await fetch('/auth/logout', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + token }
                });
            } catch (e) {}
        }
        clearAuthStorage();
        window.location.replace('/index.html?logout=1');
    }

    function guard(rules) {
        rules = rules || {};
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('logout') || urlParams.has('error')) {
            clearAuthStorage();
            return;
        }
        const token = getToken();
        const cached = getCachedProfile();
        const currentPath = window.location.pathname;

        if (rules.publicOnly) {
            if (!token || !cached || !cached.user) return;
            const isMgr = cached.user.role === 'owner' || cached.user.role === 'admin';
            if (isMgr) {
                window.location.replace('/admin.html');
                return;
            }
            const redirectMap = {
                editor: '/editor.html',
                orders: '/orders.html',
                profile: '/profile.html'
            };
            const redirectTarget = redirectMap[urlParams.get('redirect')] || '/dashboard.html';
            if (cached.user.has_shipping_setup) {
                window.location.replace(redirectTarget);
                return;
            }
            getSession().then(s => {
                if (s && s.authenticated && s.user) {
                    const mgr = s.user.role === 'owner' || s.user.role === 'admin';
                    if (mgr) {
                        window.location.replace('/admin.html');
                    } else if (s.user.has_shipping_setup) {
                        window.location.replace(redirectTarget);
                    } else {
                        window.location.replace('/settings.html?setup=address&required=1');
                    }
                }
            });
            return;
        }

        if (rules.requireManager) {
            if (!token) {
                clearAuthStorage();
                window.location.replace('/index.html');
                return;
            }
            if (cached && cached.user && cached.user.role === 'customer') {
                window.location.replace('/dashboard.html');
                return;
            }
            getSession().then(s => {
                if (!s || !s.authenticated) {
                    clearAuthStorage();
                    window.location.replace('/index.html');
                } else if (s.user.role !== 'owner' && s.user.role !== 'admin') {
                    window.location.replace('/dashboard.html');
                }
            });
            return;
        }

        if (rules.requireCustomer) {
            if (!token) {
                if (rules.allowGuest) return;
                clearAuthStorage();
                window.location.replace('/index.html');
                return;
            }
            if (cached && cached.user) {
                if (cached.user.role === 'owner' || cached.user.role === 'admin') {
                    window.location.replace('/admin.html');
                    return;
                }
                if (!cached.user.has_shipping_setup && currentPath !== '/settings.html') {
                    window.location.replace('/settings.html?setup=address&required=1' + (currentPath === '/editor.html' ? '&from=editor' : ''));
                    return;
                }
            }
            getSession().then(s => {
                if (!s || !s.authenticated) {
                    if (rules.allowGuest) return;
                    clearAuthStorage();
                    window.location.replace('/index.html');
                } else if (s.user.role === 'owner' || s.user.role === 'admin') {
                    window.location.replace('/admin.html');
                } else if (!s.user.has_shipping_setup && currentPath !== '/settings.html') {
                    window.location.replace('/settings.html?setup=address&required=1' + (currentPath === '/editor.html' ? '&from=editor' : ''));
                }
            });
            return;
        }
    }

    window.ModelyxSession = {
        getToken: getToken,
        getCachedProfile: getCachedProfile,
        getSession: getSession,
        syncUserToStorage: syncUserToStorage,
        clearAuthStorage: clearAuthStorage,
        logout: logout,
        guard: guard,
        decodeJwt: decodeJwt
    };
})();
