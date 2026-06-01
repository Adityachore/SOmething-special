import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// ─── Auth ───
export const login = (email: string, password: string) =>
  api.post('/auth/login', { email, password });
export const refreshToken = (refresh_token: string) =>
  api.post('/auth/refresh', { refresh_token });
export const logout = (refresh_token: string) =>
  api.post('/auth/logout', { refresh_token });

// ─── Complaints (Employee) ───
export const createComplaint = (data: { title: string; description: string }) =>
  api.post('/complaints', data);
export const getMyComplaints = (params?: Record<string, any>) =>
  api.get('/complaints/my', { params });
export const withdrawComplaint = (id: string) =>
  api.post(`/complaints/${id}/withdraw`);
export const rateComplaint = (id: string, data: { rating: number; feedback?: string }) =>
  api.post(`/complaints/${id}/rate`, data);
export const updateComplaint = (id: string, data: { title?: string; description?: string }) =>
  api.patch(`/complaints/${id}`, data);

// ─── Complaints (Handler/Admin) ───
export const getAllComplaints = (params?: Record<string, any>) =>
  api.get('/complaints', { params });
export const searchComplaints = (params?: Record<string, any>) =>
  api.get('/complaints/search', { params });
export const getComplaint = (id: string) =>
  api.get(`/complaints/${id}`);
export const startComplaint = (id: string) =>
  api.post(`/complaints/${id}/start`);
export const assignComplaint = (id: string, data: { assigned_to_user_id: string }) =>
  api.post(`/complaints/${id}/assign`, data);
export const resolveComplaint = (id: string, data: { resolution_note: string; root_cause?: string; visible_to_employee?: boolean }) =>
  api.post(`/complaints/${id}/resolve`, data);
export const rejectComplaint = (id: string, data: { reason: string; category?: string }) =>
  api.post(`/complaints/${id}/reject`, data);
export const reopenComplaint = (id: string) =>
  api.post(`/complaints/${id}/reopen`);
export const overrideComplaint = (id: string, data: { primary_department?: string; sub_category?: string; priority_level?: string; is_hr_sensitive?: boolean }) =>
  api.post(`/complaints/${id}/override`, data);

// ─── Internal Notes ───
export const getNotes = (complaintId: string) =>
  api.get(`/complaints/${complaintId}/internal-notes`);
export const addNote = (complaintId: string, data: { content: string; is_visible_to_employee?: boolean }) =>
  api.post(`/complaints/${complaintId}/internal-notes`, data);

// ─── Audit Logs ───
export const getComplaintAuditLogs = (complaintId: string) =>
  api.get(`/complaints/${complaintId}/audit-logs`);
export const getAdminAuditLogs = (params?: Record<string, any>) =>
  api.get('/admin/audit-logs', { params });

// ─── Attachments ───
export const uploadAttachment = (complaintId: string, file: File) => {
  const fd = new FormData();
  fd.append('file', file);
  return api.post(`/complaints/${complaintId}/attachments`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// ─── Admin ───
export const getAnalytics = () => api.get('/admin/analytics/overview');
export const getUsers = () => api.get('/admin/users');
export const createUser = (data: { name: string; email: string; password: string; role?: string; department?: string }) =>
  api.post('/admin/users', data);
export const updateUser = (userId: string, data: { name?: string; department?: string; role?: string }) =>
  api.patch(`/admin/users/${userId}`, data);

// ─── Notifications ───
export const getNotifications = (params?: Record<string, any>) =>
  api.get('/notifications', { params });
export const markNotificationRead = (id: string) =>
  api.patch(`/notifications/${id}/read`);
