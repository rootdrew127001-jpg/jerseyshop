(function () {
    if (window.__modelyxChatWidgetLoaded) return;
    window.__modelyxChatWidgetLoaded = true;

    function getStoredToken() {
        let t = localStorage.getItem('modelyx_token');
        if (!t) {
            const match = document.cookie.split(';').find(c => c.trim().startsWith('modelyx_token='));
            if (match) t = match.split('=')[1];
        }
        return t;
    }

    function getStoredRole() {
        let r = localStorage.getItem('modelyx_user_role');
        if (!r) {
            const match = document.cookie.split(';').find(c => c.trim().startsWith('modelyx_role='));
            if (match) r = match.split('=')[1];
        }
        return r;
    }

    const token = getStoredToken();
    const role = getStoredRole();

    if (role === 'owner' || role === 'admin') {
        return;
    }

    let isOpen = false;
    let socket = null;
    let conversationId = null;
    let nextCursor = null;
    let hasMore = false;
    let isLoadingOlder = false;
    let typingTimer = null;
    let isLiveEnabled = true;
    let unreadCount = 0;
    let maxMessageId = 0;
    let pingInterval = null;
    let deltaInterval = null;

    function playSoftChime() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(784, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1046, ctx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.06, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.25);
        } catch (e) {}
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function formatTime(iso) {
        if (!iso) return '';
        try {
            const d = new Date(iso);
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return '';
        }
    }

    function injectWidgetHtml() {
        const wrapper = document.createElement('div');
        wrapper.id = 'modelyxChatWidgetRoot';
        wrapper.className = 'fixed bottom-6 right-6 z-50 flex flex-col items-end select-none font-sans';

        wrapper.innerHTML = `
            <div id="modelyxChatPanel" class="hidden mb-3 w-[360px] sm:w-[380px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[82vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden transition-all duration-300">
                <div class="bg-gradient-to-r from-slate-900 to-indigo-950 text-white px-5 py-4 flex items-center justify-between shrink-0 shadow-sm">
                    <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center font-black text-sm text-white shadow-md">
                            M
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <h3 class="text-sm font-black tracking-tight">MODELYX Support</h3>
                                <span id="widgetOnlineBadge" class="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300">
                                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                    Live
                                </span>
                            </div>
                            <p class="text-[11px] text-slate-300">ATWU Jersey Outfitters</p>
                        </div>
                    </div>
                    <button type="button" id="widgetCloseBtn" class="text-slate-400 hover:text-white transition p-1.5 rounded-xl hover:bg-white/10 cursor-pointer">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div id="widgetOfflineBanner" class="hidden bg-amber-50 border-b border-amber-200 px-4 py-2 text-[11px] text-amber-800 font-semibold flex items-center gap-2">
                    <span class="text-xs">ℹ️</span>
                    <span>Support is currently away. Leave a message and we'll reply shortly!</span>
                </div>

                <div id="widgetMessagesContainer" class="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/70">
                    <div id="widgetLoadingOlder" class="text-center py-1 text-[11px] font-bold text-slate-400 hidden">
                        Loading older messages...
                    </div>
                    <div id="widgetBubbleList" class="space-y-3">
                        <div class="p-6 text-center text-slate-400 text-xs">
                            Connecting with a support outfitter...
                        </div>
                    </div>
                </div>

                <div id="widgetTypingNotice" class="hidden px-4 py-1 text-[11px] text-indigo-600 font-bold bg-white animate-pulse">
                    Agent is typing...
                </div>

                <div class="p-3 bg-white border-t border-slate-200 shrink-0">
                    <div id="widgetOrderPickerContainer" class="hidden mb-2 p-2.5 bg-slate-100 border border-slate-200 rounded-2xl max-h-48 overflow-y-auto">
                        <div class="flex items-center justify-between mb-2 px-1">
                            <span class="text-[11px] font-black text-slate-700">Select an order to discuss:</span>
                            <button type="button" id="widgetOrderPickerClose" class="text-slate-400 hover:text-slate-600 text-xs font-bold p-1 cursor-pointer">&times;</button>
                        </div>
                        <div id="widgetOrderPickerList" class="space-y-1.5 text-xs">
                            <div class="p-2 text-center text-slate-400 text-[11px]">Loading your orders...</div>
                        </div>
                    </div>
                    <form id="widgetChatForm" class="flex items-center gap-2">
                        <button type="button" id="widgetAttachOrderBtn" title="Reference an order" class="bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 border border-slate-200 hover:border-indigo-300 rounded-2xl px-2.5 py-2 text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0">
                            <span>📦</span>
                            <span class="hidden sm:inline text-[10px] font-black">Order</span>
                        </button>
                        <input type="text" id="widgetChatInput" maxlength="1000" placeholder="Ask about design, sizing, or orders..." class="flex-1 bg-slate-100 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition" autocomplete="off" />
                        <button type="submit" id="widgetSendBtn" class="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl p-2.5 shadow-md shadow-indigo-600/20 transition cursor-pointer shrink-0">
                            <svg class="w-4 h-4 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </button>
                    </form>
                </div>
            </div>

            <button type="button" id="modelyxChatTrigger" class="relative group bg-slate-900 hover:bg-indigo-600 text-white p-3.5 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer flex items-center justify-center">
                <span id="widgetTriggerUnread" class="hidden absolute -top-1 -right-1 px-2 py-0.5 text-[10px] font-black bg-rose-500 text-white rounded-full border-2 border-white shadow-md">
                    0
                </span>
                <svg id="triggerIconChat" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <svg id="triggerIconClose" class="w-6 h-6 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        `;

        document.body.appendChild(wrapper);

        document.getElementById('modelyxChatTrigger').addEventListener('click', toggleWidget);
        document.getElementById('widgetCloseBtn').addEventListener('click', toggleWidget);

        const form = document.getElementById('widgetChatForm');
        form.addEventListener('submit', handleWidgetSend);

        const attachBtn = document.getElementById('widgetAttachOrderBtn');
        if (attachBtn) attachBtn.addEventListener('click', toggleOrderPicker);

        const pickerClose = document.getElementById('widgetOrderPickerClose');
        if (pickerClose) pickerClose.addEventListener('click', toggleOrderPicker);

        const input = document.getElementById('widgetChatInput');
        input.addEventListener('input', handleCustomerTyping);

        const container = document.getElementById('widgetMessagesContainer');
        container.addEventListener('scroll', handleCustomerScroll);
    }

    function toggleWidget() {
        if (!token) {
            window.location.href = '/index.html?login=1';
            return;
        }

        isOpen = !isOpen;
        const panel = document.getElementById('modelyxChatPanel');
        const iconChat = document.getElementById('triggerIconChat');
        const iconClose = document.getElementById('triggerIconClose');

        if (isOpen) {
            panel.classList.remove('hidden');
            iconChat.classList.add('hidden');
            iconClose.classList.remove('hidden');
            unreadCount = 0;
            updateUnreadBadge();
            markCustomerRead();
            pollDelta();

            const input = document.getElementById('widgetChatInput');
            if (input) input.focus();

            const container = document.getElementById('widgetMessagesContainer');
            if (container) container.scrollTop = container.scrollHeight;
        } else {
            panel.classList.add('hidden');
            iconChat.classList.remove('hidden');
            iconClose.classList.add('hidden');
        }
    }

    function updateUnreadBadge() {
        const badge = document.getElementById('widgetTriggerUnread');
        if (!badge) return;
        if (unreadCount > 0 && !isOpen) {
            badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    async function markCustomerRead() {
        if (!token) return;
        try {
            await fetch('/chat/customer/read', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    action: 'read_ack'
                }));
            }
        } catch (e) {}
    }

    async function loadInitialHistory() {
        if (!token) return;
        try {
            const res = await fetch('/chat/history?limit=30', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (res.ok) {
                const data = await res.json();
                conversationId = data.conversation_id;
                hasMore = data.has_more;
                nextCursor = data.next_cursor;
                isLiveEnabled = data.chat_enabled;

                updateLiveStatusUI(isLiveEnabled);

                const bubbleList = document.getElementById('widgetBubbleList');
                const container = document.getElementById('widgetMessagesContainer');

                if (data.messages && data.messages.length > 0) {
                    bubbleList.innerHTML = data.messages.map(m => {
                        if (typeof m.id === 'number') {
                            maxMessageId = Math.max(maxMessageId, m.id);
                        }
                        return renderBubble(m);
                    }).join('');
                } else {
                    bubbleList.innerHTML = `
                        <div class="p-6 text-center text-slate-400 text-xs">
                            <span class="text-2xl block mb-2">👋</span>
                            Welcome to ATWU MODELYX Support! How can we assist with your jersey design today?
                        </div>
                    `;
                }

                if (container) {
                    container.scrollTop = container.scrollHeight;
                }
            }
        } catch (e) {}
    }

    async function loadOlderMessages() {
        if (isLoadingOlder || !hasMore || !nextCursor || !token) return;
        isLoadingOlder = true;

        const spinner = document.getElementById('widgetLoadingOlder');
        if (spinner) spinner.classList.remove('hidden');

        try {
            const res = await fetch(`/chat/history?limit=30&before_id=${nextCursor}`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (res.ok) {
                const data = await res.json();
                hasMore = data.has_more;
                nextCursor = data.next_cursor;

                const container = document.getElementById('widgetMessagesContainer');
                const bubbleList = document.getElementById('widgetBubbleList');
                const oldHeight = container.scrollHeight;

                const olderHtml = data.messages.map(m => {
                    if (typeof m.id === 'number') {
                        maxMessageId = Math.max(maxMessageId, m.id);
                    }
                    return renderBubble(m);
                }).join('');
                bubbleList.insertAdjacentHTML('afterbegin', olderHtml);

                container.scrollTop = container.scrollHeight - oldHeight;
            }
        } catch (e) {
        } finally {
            isLoadingOlder = false;
            if (spinner) spinner.classList.add('hidden');
        }
    }

    function handleCustomerScroll(e) {
        const c = e.target;
        if (c.scrollTop < 30 && hasMore && nextCursor && !isLoadingOlder) {
            loadOlderMessages();
        }
    }

    function getOrderStatusBadgeHtml(status) {
        const s = (status || 'Pending Review').toLowerCase();
        if (s.includes('cancel') || s.includes('reject')) {
            return '<span class="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-100 text-rose-700 border border-rose-200">' + escapeHtml(status) + '</span>';
        }
        if (s.includes('complete')) {
            return '<span class="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-700 border border-emerald-200">' + escapeHtml(status) + '</span>';
        }
        if (s.includes('production')) {
            return '<span class="px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-100 text-indigo-700 border border-indigo-200">' + escapeHtml(status) + '</span>';
        }
        if (s.includes('ship')) {
            return '<span class="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-100 text-blue-700 border border-blue-200">' + escapeHtml(status) + '</span>';
        }
        return '<span class="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-200">' + escapeHtml(status) + '</span>';
    }

    function renderOrderSnippet(order) {
        if (!order || !order.id) return '';
        return `
            <div class="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-left select-text">
                <div class="flex items-center justify-between gap-1 mb-1">
                    <span class="text-[11px] font-black text-slate-900">📦 Order #${order.id}</span>
                    ${getOrderStatusBadgeHtml(order.status)}
                </div>
                <div class="text-[10px] text-slate-600 flex items-center justify-between gap-1">
                    <span class="truncate font-semibold">${escapeHtml(order.team_name || 'Jersey Order')}</span>
                    <span class="font-black text-slate-900">₱${Number(order.total || 0).toLocaleString()}</span>
                </div>
                <a href="/orders.html" target="_blank" class="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition">
                    View in My Orders &rarr;
                </a>
            </div>
        `;
    }

    async function toggleOrderPicker() {
        const picker = document.getElementById('widgetOrderPickerContainer');
        if (!picker) return;
        const isHidden = picker.classList.contains('hidden');
        if (isHidden) {
            picker.classList.remove('hidden');
            await loadCustomerOrdersForPicker();
        } else {
            picker.classList.add('hidden');
        }
    }

    async function loadCustomerOrdersForPicker() {
        const list = document.getElementById('widgetOrderPickerList');
        if (!list) return;
        if (!token) {
            list.innerHTML = '<div class="p-2 text-center text-slate-400 text-[11px]">Please log in to reference orders.</div>';
            return;
        }
        list.innerHTML = '<div class="p-2 text-center text-slate-400 text-[11px]">Loading your orders...</div>';
        try {
            const res = await fetch('/orders/my', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (res.ok) {
                const orders = await res.json();
                if (!orders || orders.length === 0) {
                    list.innerHTML = '<div class="p-3 text-center text-slate-400 text-[11px]">You have no orders yet.</div>';
                    return;
                }
                list.innerHTML = orders.map(o => `
                    <div data-order-id="${o.id}" class="chat-order-option p-2 bg-white hover:bg-indigo-50 border border-slate-200 rounded-xl cursor-pointer transition flex items-center justify-between gap-2">
                        <div class="min-w-0">
                            <div class="flex items-center gap-1.5">
                                <span class="font-black text-slate-900 text-xs">Order #${o.id}</span>
                                ${getOrderStatusBadgeHtml(o.status)}
                            </div>
                            <div class="text-[10px] text-slate-500 truncate mt-0.5">${escapeHtml(o.team_name || 'Jersey')} · ₱${Number(o.price || 0).toLocaleString()}</div>
                        </div>
                        <span class="text-[10px] text-indigo-600 font-bold shrink-0">Tag &rarr;</span>
                    </div>
                `).join('');

                list.querySelectorAll('.chat-order-option').forEach(el => {
                    el.addEventListener('click', () => {
                        const oid = parseInt(el.getAttribute('data-order-id'), 10);
                        const found = orders.find(o => o.id === oid);
                        if (found) {
                            referenceOrderInChat(found);
                        }
                    });
                });
            } else {
                list.innerHTML = '<div class="p-2 text-center text-rose-500 text-[11px]">Failed to load orders.</div>';
            }
        } catch (e) {
            list.innerHTML = '<div class="p-2 text-center text-rose-500 text-[11px]">Network error loading orders.</div>';
        }
    }

    async function referenceOrderInChat(order) {
        const picker = document.getElementById('widgetOrderPickerContainer');
        if (picker) picker.classList.add('hidden');

        const tempId = 'opt_' + Date.now();
        const msgText = `Referenced Order #${order.id} (${order.status} - ₱${Number(order.price || 0).toLocaleString()})`;
        appendMessage({
            id: tempId,
            sender_role: 'customer',
            message: msgText,
            order: {
                id: order.id,
                status: order.status,
                total: order.price,
                team_name: order.team_name
            },
            created_at: new Date().toISOString()
        });

        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                action: 'send_message',
                message: msgText,
                order_id: order.id
            }));
        } else {
            try {
                await fetch('/chat/customer/reference-order', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify({
                        order_id: order.id,
                        message: msgText
                    })
                });
            } catch (e) {}
        }

        const input = document.getElementById('widgetChatInput');
        if (input) {
            input.placeholder = `Ask a question about Order #${order.id}...`;
            input.focus();
        }
    }

    function renderBubble(m) {
        const isMe = m.sender_role === 'customer';
        const time = formatTime(m.created_at);
        const msgIdAttr = m.id ? `data-msg-id="${m.id}"` : '';
        const orderCard = m.order ? renderOrderSnippet(m.order) : '';

        if (isMe) {
            return `
                <div ${msgIdAttr} class="chat-bubble-row flex items-start justify-end gap-1.5 max-w-[85%] ml-auto">
                    <div>
                        <div class="bg-indigo-600 text-white text-xs px-3.5 py-2.5 rounded-2xl rounded-tr-sm shadow-md shadow-indigo-600/20 break-words">
                            ${escapeHtml(m.message)}
                            ${orderCard}
                        </div>
                        <div class="text-[9px] text-slate-400 text-right mt-1 mr-1">
                            ${time}
                        </div>
                    </div>
                </div>
            `;
        } else {
            return `
                <div ${msgIdAttr} class="chat-bubble-row flex items-start gap-2 max-w-[85%]">
                    <div class="w-6 h-6 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        M
                    </div>
                    <div>
                        <div class="bg-white border border-slate-200 text-slate-800 text-xs px-3.5 py-2.5 rounded-2xl rounded-tl-sm shadow-sm break-words">
                            ${escapeHtml(m.message)}
                            ${orderCard}
                        </div>
                        <div class="flex items-center gap-1.5 text-[9px] text-slate-400 mt-1 ml-1">
                            <span class="font-bold text-slate-600">${escapeHtml(m.sender_name || 'Support')}</span>
                            <span>·</span>
                            <span>${time}</span>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    function appendMessage(m) {
        const bubbleList = document.getElementById('widgetBubbleList');
        const container = document.getElementById('widgetMessagesContainer');
        if (!bubbleList || !container) return;

        if (m.id && typeof m.id === 'number') {
            const existing = bubbleList.querySelector(`[data-msg-id="${m.id}"]`);
            if (existing) return;
            maxMessageId = Math.max(maxMessageId, m.id);
        }

        if (m.sender_role === 'customer') {
            const optBubble = bubbleList.querySelector('[data-msg-id^="opt_"]');
            if (optBubble && m.id && typeof m.id === 'number') {
                optBubble.setAttribute('data-msg-id', m.id);
                return;
            }
        }

        bubbleList.insertAdjacentHTML('beforeend', renderBubble(m));
        container.scrollTop = container.scrollHeight;
    }

    async function pollDelta() {
        if (!token || !conversationId) return;
        try {
            const res = await fetch(`/chat/delta?conversation_id=${conversationId}&after_id=${maxMessageId}`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.chat_enabled !== undefined) {
                    updateLiveStatusUI(data.chat_enabled);
                }
                if (data.messages && data.messages.length > 0) {
                    data.messages.forEach(m => {
                        appendMessage(m);
                        if (m.sender_role !== 'customer') {
                            if (!isOpen) {
                                unreadCount++;
                                updateUnreadBadge();
                                playSoftChime();
                            } else {
                                markCustomerRead();
                            }
                        }
                    });
                }
            }
        } catch (e) {}
    }

    function updateLiveStatusUI(enabled) {
        isLiveEnabled = Boolean(enabled);
        const badge = document.getElementById('widgetOnlineBadge');
        const banner = document.getElementById('widgetOfflineBanner');

        if (badge) {
            if (isLiveEnabled) {
                badge.className = 'inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300';
                badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Live';
            } else {
                badge.className = 'inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300';
                badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span> Offline';
            }
        }

        if (banner) {
            if (isLiveEnabled) {
                banner.classList.add('hidden');
            } else {
                banner.classList.remove('hidden');
            }
        }
    }

    function handleCustomerTyping() {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                action: 'typing',
                is_typing: true
            }));

            clearTimeout(typingTimer);
            typingTimer = setTimeout(() => {
                if (socket && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({
                        action: 'typing',
                        is_typing: false
                    }));
                }
            }, 1500);
        }
    }

    async function handleWidgetSend(e) {
        e.preventDefault();
        const input = document.getElementById('widgetChatInput');
        const text = (input?.value || '').trim();
        if (!text) return;

        input.value = '';

        const tempId = 'opt_' + Date.now();
        appendMessage({
            id: tempId,
            sender_role: 'customer',
            message: text,
            created_at: new Date().toISOString()
        });

        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                action: 'send_message',
                message: text
            }));
        } else {
            try {
                const res = await fetch('/chat/send', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify({ message: text })
                });
                if (res.ok) {
                    const saved = await res.json();
                    appendMessage(saved);
                }
            } catch (err) {}
        }
    }

    function connectWebSocket() {
        if (!token) return;
        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${proto}//${window.location.host}/chat/ws?token=${encodeURIComponent(token)}`;

        try {
            socket = new WebSocket(wsUrl);

            socket.onopen = () => {
                updateLiveStatusUI(isLiveEnabled);
                clearInterval(pingInterval);
                pingInterval = setInterval(() => {
                    if (socket && socket.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify({ action: 'ping' }));
                    }
                }, 20000);
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.type === 'system_status') {
                        updateLiveStatusUI(data.enabled);
                    } else if (data.type === 'new_message') {
                        const m = data.message;
                        appendMessage(m);

                        if (m.sender_role !== 'customer') {
                            playSoftChime();
                            if (!isOpen) {
                                unreadCount++;
                                updateUnreadBadge();
                            } else {
                                markCustomerRead();
                            }
                        }
                    } else if (data.type === 'typing') {
                        const notice = document.getElementById('widgetTypingNotice');
                        if (notice) {
                            if (data.is_typing) {
                                notice.classList.remove('hidden');
                            } else {
                                notice.classList.add('hidden');
                            }
                        }
                    }
                } catch (e) {}
            };

            socket.onclose = () => {
                clearInterval(pingInterval);
                setTimeout(connectWebSocket, 3000);
            };

            socket.onerror = () => {
                socket.close();
            };
        } catch (e) {
            setTimeout(connectWebSocket, 4000);
        }
    }

    function init() {
        injectWidgetHtml();
        if (token) {
            loadInitialHistory();
            connectWebSocket();
            clearInterval(deltaInterval);
            deltaInterval = setInterval(pollDelta, 3500);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
