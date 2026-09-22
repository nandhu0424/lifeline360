import { useState, createContext, useContext, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api/superadmin';

export const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [admin, setAdmin] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('sa_token') || null);
    const [loading, setLoading] = useState(true);

    // Setup Axios interceptor to always attach token
    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            localStorage.setItem('sa_token', token);

            // If we have token but no admin info, normally we'd fetch profile. 
            // For simplicity, we just trust the token until an API call fails.
            if (!admin) {
                setAdmin({ username: 'superadmin' }); // placeholder
            }
        } else {
            delete axios.defaults.headers.common['Authorization'];
            localStorage.removeItem('sa_token');
            setAdmin(null);
        }
        setLoading(false);
    }, [token]);

    // Intercept 401s to logout
    useEffect(() => {
        const interceptor = axios.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response?.status === 401 || error.response?.status === 403) {
                    logout();
                }
                return Promise.reject(error);
            }
        );
        return () => axios.interceptors.response.eject(interceptor);
    }, []);

    const login = async (email, password) => {
        try {
            const { data } = await axios.post(`${API_URL}/login`, { email, password });
            if (data.success) {
                setToken(data.token);
                setAdmin(data.admin);
                return { success: true };
            }
        } catch (err) {
            return { success: false, message: err.response?.data?.message || err.message };
        }
    };

    const logout = () => {
        setToken(null);
        setAdmin(null);
    };

    return (
        <AuthContext.Provider value={{ admin, token, login, logout, loading, API_URL }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
