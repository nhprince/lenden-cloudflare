import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import toast from 'react-hot-toast';

// Extend InternalAxiosRequestConfig to include _retryCount
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
    _retryCount?: number;
    _retry?: boolean;
}

// Create an instance of axios
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'https://api.lenden.nhprince.dpdns.org',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        // Force /api prefix for relative URLs if not already present
        if (config.url && !config.url.startsWith('http') && !config.url.startsWith('/api')) {
            config.url = `/api${config.url.startsWith('/') ? '' : '/'}${config.url}`;
        }

        const token = localStorage.getItem('token');
        const shop = localStorage.getItem('currentShop');

        if (token) {
            config.headers.set('Authorization', `Bearer ${token}`);
        }

        if (shop) {
            try {
                const shopData = JSON.parse(shop);
                if (shopData && shopData.id) {
                    config.headers.set('Shop-Id', shopData.id);
                }
            } catch (e) {
                console.error("Error parsing shop data", e);
            }
        }

        return config;
    },
    (error: AxiosError) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor
api.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as CustomAxiosRequestConfig;

        // Bug #34: Retry Logic
        if (!originalRequest) {
            return Promise.reject(error);
        }

        if (!originalRequest._retryCount) {
            originalRequest._retryCount = 0;
        }

        if (
            originalRequest._retryCount < 3 &&
            error.response &&
            (error.response.status >= 500 || error.code === 'ERR_NETWORK') &&
            !originalRequest._retry
        ) {
            originalRequest._retryCount++;
            originalRequest._retry = true;

            // Exponential backoff: 1s, 2s, 4s
            const delay = Math.pow(2, originalRequest._retryCount - 1) * 1000;
            console.log(`Retrying request attempt ${originalRequest._retryCount} for ${originalRequest.url} after ${delay}ms`);

            await new Promise(resolve => setTimeout(resolve, delay));
            return api(originalRequest);
        }

        if (error.response && error.response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('currentShop');
            // Check if it's already on the login page to avoid infinite loop
            if (window.location.hash !== '#/' && window.location.pathname !== '/') {
                window.location.href = '/';
            }
        } else if (error.response && error.response.status === 403) {
            // Check if it's specialized login verification error
            const data = error.response.data as any;
            if (!data?.needsVerification) {
                toast.error(data?.message || "Access denied: You don't have permission for this action.");
            }
        } else if (error.response && (error.response.status === 400 || error.response.status === 429)) {
            const data = error.response.data as any;
            if (error.response.status === 429) {
                toast.error(typeof data === 'string' ? data : "Too many requests. Please slow down.");
            }
        }
        return Promise.reject(error);
    }
);

export default api;
