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
export const forgotPassword = (email: string) =>
  api.post('/auth/forgot-password', { email });
export const resetPassword = (data: { token: string; new_password: string }) =>
  api.post('/auth/reset-password', data);

// ─── Complaints (Employee) ───
export const createComplaint = (data: {
  title: string;
  description: string;
  employee_department?: string | null;
  employee_category?: string | null;
  employee_subcategory?: string | null;
  is_anonymous?: boolean;
  visibility_settings?: string | null;
}) => api.post('/complaints', data);
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
export const closeComplaint = (id: string) =>
  api.post(`/complaints/${id}/close`);
export const waitForEmployee = (id: string, note?: string) =>
  api.post(`/complaints/${id}/wait-for-employee`, { note: note || null });
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
export const deleteAttachment = (attachmentId: string) =>
  api.delete(`/complaints/attachments/${attachmentId}`);

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

// ─── Employee Management & Profiles ───
export const getEmployees = (params?: Record<string, any>) =>
  api.get('/employees', { params });
export const createEmployee = (data: any) =>
  api.post('/employees', data);
export const getEmployee = (id: string) =>
  api.get(`/employees/${id}`);
export const updateEmployee = (id: string, data: any) =>
  api.put(`/employees/${id}`, data);
export const toggleEmployeeStatus = (id: string) =>
  api.patch(`/employees/${id}/deactivate`);
export const bulkDeactivateEmployees = (userIds: string[]) =>
  api.post('/employees/bulk-deactivate', { user_ids: userIds });
export const bulkUploadEmployees = (file: File) => {
  const fd = new FormData();
  fd.append('file', file);
  return api.post('/employees/bulk-upload', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
export const getProfile = () =>
  api.get('/profile');
export const createProfileRequest = (data: { field: string; old_value?: string; new_value: string; reason?: string }) =>
  api.post('/profile-update-request', data);
export const getMyProfileRequests = () =>
  api.get('/profile-update-requests/my');
export const getAllProfileRequests = (status?: string) =>
  api.get('/profile-update-requests', { params: status ? { status } : {} });
export const reviewProfileRequest = (id: string, status: string, reviewNotes?: string) =>
  api.post(`/profile-update-requests/${id}/review`, { status, review_notes: reviewNotes });

// ─── Multi-Tenant Organization & Setup ───
export const signupOrg = (data: {
  name: string;
  admin_name: string;
  admin_email: string;
  admin_password: string;
}) => api.post('/public/signup-org', data);

export const acceptInvitation = (data: {
  token: string;
  password?: string;
}) => api.post('/public/invitations/accept', data);

export const getOrgSetupStatus = () =>
  api.get('/org/setup-status');

export const updateOrgProfile = (data: {
  name: string;
  timezone: string;
  working_hours?: any;
  industry?: string | null;
  website?: string | null;
  address?: string | null;
  logo_url?: string | null;
}) => api.put('/org/profile', data);

export const getDepartments = () =>
  api.get('/org/departments');

export const createDepartment = (data: {
  name: string;
  type: 'HR' | 'CMD' | 'NORMAL';
}) => api.post('/org/departments', data);

export const updateDepartment = (id: string, data: {
  name?: string;
  type?: 'HR' | 'CMD' | 'NORMAL';
  head_user_id?: string | null;
  status?: string;
}) => api.put(`/org/departments/${id}`, data);

export const setupKeyRoles = (data: {
  hr_head: { email: string; department_id: string };
  cmd_head: { email: string; department_id: string };
}) => api.post('/org/key-roles', data);

export const inviteMember = (data: {
  email: string;
  role: 'ORG_ADMIN' | 'HR' | 'CMD' | 'DEPT_HEAD' | 'EMPLOYEE';
  department_id?: string | null;
}) => api.post('/org/invitations/invite', data);

export const getInvitations = () =>
  api.get('/org/invitations');

// ─── Org Privacy & Settings ───
export const getOrgSettings = () =>
  api.get('/org/settings');

export const updateOrgSettings = (data: {
  allow_cmd_view_hr_sensitive: boolean;
  allow_cmd_view_hr_sensitive_anonymized: boolean;
  allow_dept_head_view_hr_sensitive: boolean;
}) => api.put('/org/settings', data);

