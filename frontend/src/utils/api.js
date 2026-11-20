//centeralized API setup

import axios from 'axios';
import qs from 'qs';

const backendUrl = import.meta.env.VITE_BACKEND_URL;
const baseURL = backendUrl ? `${backendUrl.replace(/\/$/, '')}/api` : '/api';

const api = axios.create({
    baseURL,
    withCredentials: true,
    paramsSerializer: params => qs.stringify(params, { arrayFormat: 'repeat' }),
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;