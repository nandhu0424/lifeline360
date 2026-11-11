import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const API_BASE_URL = BACKEND_URL.endsWith('/api') ? BACKEND_URL : `${BACKEND_URL.replace(/\/+$/, '')}/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle unauthorized errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // Check if the request was either the standard login or the PHC login
    const isLoginRequest = error.config?.url?.includes('/login');

    if (error.response?.status === 401 && !isLoginRequest) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      window.location.href = '/'; // Redirect to landing page instead of /login
    }
    return Promise.reject(error.response?.data || error.message);
  }
);

export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  phcLogin: (credentials) => api.post('/auth/phc/login', credentials),
  verify: () => api.get('/auth/verify'),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  verifyOTP: (data) => api.post('/auth/verify-otp', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

export const phcService = {
  getNameByCode: (code) => api.get(`/phc/name/${code}`),
  getStats: () => api.get('/phc/stats'),
  getAttendance: (date) => api.get(`/phc/attendance${date ? `?date=${date}` : ''}`),
  getProfile: () => api.get('/phc/profile'),
  getDoctorAvailability: () => api.get('/phc/doctors'),
  getOPDTrend: (days = 7) => api.get(`/phc/opd-trend?days=${days}`),
  getRecentActivity: () => api.get('/phc/recent-activity'),
};

export const dashboardService = {
  getStats: () => api.get('/dashboard/stats'),
  getChart: () => api.get('/dashboard/chart'),
  getMap: () => api.get('/dashboard/map'),
};

export const hospitalService = {
  getAll: (type) => api.get(`/hospitals${type ? `?type=${type}` : ''}`),
  getDetails: (id, range) => api.get(`/hospitals/${id}${range ? `?range=${range}` : ''}`),
  sendAlert: (data) => api.post('/hospitals/alert', data),
  create: (data) => api.post('/hospitals', data),
  update: (id, data) => api.put(`/hospitals/${id}`, data),
};

export const attendanceService = {
  getToday: () => api.get('/attendance/today'),
  getSummary: (period) => api.get(`/attendance/summary?period=${period}`),
  getHospital: (id, date) => api.get(`/attendance/hospital/${id}?date=${date}`),
  getStaffHistory: (id) => api.get(`/attendance/staff/${id}`),
  getHabitual: () => api.get('/attendance/habitual'),
};

export const stockService = {
  getAll: (hospital_id) => api.get(`/stocks${hospital_id ? `?hospital_id=${hospital_id}` : ''}`),
  getLow: () => api.get('/stocks/low'),
  add: (data) => api.post('/stocks', data),
  update: (id, data) => api.put(`/stocks/${id}`, data),
  bulkUpload: (data) => api.post('/stocks/bulk', data),
  sendAlert: (data) => api.post('/stocks/alert', data),
  updateRequestStatus: (id, data) => api.post(`/stocks/${id}/request-status`, data),
};

export const patientService = {
  getTotal: (period) => api.get(`/patients/total?period=${period}`),
  getTrend: (days) => api.get(`/patients/trend?days=${days}`),
  getAll: (params) => api.get('/patients', { params }),
  lookup: (identifier) => api.get(`/patients/lookup/${identifier}`),
  getHistory: (patient_id) => api.get(`/patients/history/${patient_id}`),
  add: (data) => api.post('/patients', data),
  update: (id, data) => api.put(`/patients/${id}`, data),
  bulkUpload: (data) => api.post('/patients/bulk', data),
};

export const alertService = {
  getAll: (params) => api.get('/alerts', { params }),
  getUnresolved: () => api.get('/alerts/unresolved'),
  resolve: (id) => api.put(`/alerts/${id}/resolve`),
};

export const staffService = {
  getAll: () => api.get('/staff'),
  add: (data) => api.post('/staff', data),
  update: (id, data) => api.put(`/staff/${id}`, data),
  delete: (id) => api.delete(`/staff/${id}`),
};

export const programService = {
  getAll: () => api.get('/programs'),
  add: (data) => api.post('/programs', data),
  report: (id, data) => api.post(`/programs/${id}/report`, data),
};

export const workService = {
  getAll: () => api.get('/work'),
  report: (id, data) => api.post(`/work/${id}/report`, data),
  verify: (id, data) => api.post(`/work/${id}/verify`, data),
};

export const leaveService = {
  getAll: (params) => api.get('/leave', { params }),
  getSummary: () => api.get('/leave/summary'),
  apply: (data) => api.post('/leave', data),
  review: (id, data) => api.put(`/leave/${id}/review`, data),
  cancel: (id) => api.put(`/leave/${id}/cancel`),
  getStaffLeaves: (id) => api.get(`/leave/staff/${id}`),
};

export default api;
