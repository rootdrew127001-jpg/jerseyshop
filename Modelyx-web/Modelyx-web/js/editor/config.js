const CONFIG = {
    API_URL: (() => {
        const hostname = window.location.hostname;
        const isDev = hostname === 'localhost' || hostname === '127.0.0.1';
        
        const DEV_PORT = '9000';
        
        return isDev
            ? `http://${hostname}:${DEV_PORT}`
            : `${window.location.protocol}//${hostname}`;
    })()
};

export default CONFIG;