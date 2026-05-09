/**
 * MODELYX UTILITIES
 * Shared functions across all pages
 */

// Toast notification system
function showToast(message, type = 'success', duration = 3000) {
    const toast = document.createElement('div');
    const bgColor = type === 'error' ? 'bg-red-500' : type === 'warning' ? 'bg-yellow-500' : 'bg-green-500';
    toast.className = `fixed top-6 right-6 px-6 py-4 rounded-2xl text-white font-bold shadow-xl z-[200] ${bgColor}`;
    toast.textContent = message;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Validation functions
const Validators = {
    email: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    password: (pwd) => pwd.length >= 6,
    phone: (phone) => phone.length >= 10 || phone.trim() === '',
    name: (name) => name.trim().length >= 2,
    number: (num) => {
        const n = parseInt(num);
        return !isNaN(n) && n >= 0 && n <= 99;
    }
};

// Storage management with encryption awareness
const StorageManager = {
    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Storage error:', e);
            return false;
        }
    },
    get: (key, defaultValue = null) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error('Storage error:', e);
            return defaultValue;
        }
    },
    remove: (key) => {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error('Storage error:', e);
            return false;
        }
    },
    clear: () => {
        try {
            localStorage.clear();
            sessionStorage.clear();
            return true;
        } catch (e) {
            console.error('Storage error:', e);
            return false;
        }
    }
};

// Authentication helper
const Auth = {
    isLoggedIn: () => {
        return localStorage.getItem('modelyx_user_email') !== null;
    },
    getUser: () => {
        return {
            email: localStorage.getItem('modelyx_user_email'),
            name: localStorage.getItem('modelyx_user_name'),
            role: localStorage.getItem('modelyx_user_role'),
            phone: localStorage.getItem('modelyx_user_phone')
        };
    },
    isAdmin: () => {
        return localStorage.getItem('modelyx_user_role') === 'owner';
    },
    isCustomer: () => {
        return localStorage.getItem('modelyx_user_role') === 'customer';
    },
    logout: () => {
        StorageManager.clear();
        window.location.href = 'index.html';
    },
    requireLogin: () => {
        if (!Auth.isLoggedIn()) {
            window.location.href = 'index.html';
        }
    },
    requireAdmin: () => {
        if (!Auth.isAdmin()) {
            window.location.href = 'index.html';
        }
    }
};

// Color utilities
const ColorUtils = {
    isValidHex: (hex) => /^#[0-9A-F]{6}$/i.test(hex),
    hexToRgb: (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    },
    rgbToHex: (r, g, b) => {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
    },
    getLuminance: (hex) => {
        const rgb = ColorUtils.hexToRgb(hex);
        if (!rgb) return 0;
        const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
        return luminance > 0.5 ? 'light' : 'dark';
    }
};

// Order management
const OrderManager = {
    getAll: () => {
        return StorageManager.get('modelyx_orders', []);
    },
    add: (order) => {
        const orders = OrderManager.getAll();
        orders.push({
            ...order,
            id: order.id || `ORD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            createdAt: new Date().toISOString()
        });
        return StorageManager.set('modelyx_orders', orders);
    },
    update: (orderId, updates) => {
        const orders = OrderManager.getAll();
        const index = orders.findIndex(o => o.id === orderId);
        if (index !== -1) {
            orders[index] = { ...orders[index], ...updates };
            return StorageManager.set('modelyx_orders', orders);
        }
        return false;
    },
    delete: (orderId) => {
        const orders = OrderManager.getAll().filter(o => o.id !== orderId);
        return StorageManager.set('modelyx_orders', orders);
    },
    getById: (orderId) => {
        return OrderManager.getAll().find(o => o.id === orderId);
    },
    getStats: () => {
        const orders = OrderManager.getAll();
        return {
            total: orders.length,
            pending: orders.filter(o => o.status === 'Pending Review').length,
            approved: orders.filter(o => o.status === 'Approved').length,
            production: orders.filter(o => o.status === 'In Production').length,
            completed: orders.filter(o => o.status === 'Completed').length,
            totalRevenue: orders.reduce((sum, o) => sum + (parseFloat(o.price?.replace('$', '') || 0)), 0)
        };
    }
};

// Add fade out animation to document
function initializeAnimations() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeOut { 
            from { opacity: 1; } 
            to { opacity: 0; } 
        }
        @keyframes slideInUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
    `;
    document.head.appendChild(style);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initializeAnimations);

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { showToast, Validators, StorageManager, Auth, ColorUtils, OrderManager };
}
