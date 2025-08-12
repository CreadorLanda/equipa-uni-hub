const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

// Interface para response padrão
interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
}

// Configuração da API
export const api = {
  baseURL: API_BASE_URL,
  
  // Helper para fazer requests autenticados
  request: async <T = any>(endpoint: string, options: RequestInit = {}): Promise<T> => {
    const token = localStorage.getItem('auth_token');
    
    console.log(`API Request: ${options.method || 'GET'} ${endpoint}`, {
      hasToken: !!token,
      tokenPreview: token ? `${token.substring(0, 10)}...` : 'none'
    });
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error Details:', {
          status: response.status,
          statusText: response.statusText,
          url: `${API_BASE_URL}${endpoint}`,
          method: config.method || 'GET',
          errorData
        });
        throw new Error(errorData.error || errorData.message || JSON.stringify(errorData) || `HTTP error! status: ${response.status}`);
      }
      
      // Se não há conteúdo, retorna objeto vazio
      if (response.status === 204) {
        return {} as T;
      }
      
      return response.json();
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  },

  // Métodos específicos
  get: <T = any>(endpoint: string): Promise<T> => 
    api.request<T>(endpoint),
    
  post: <T = any>(endpoint: string, data?: any): Promise<T> => 
    api.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),
    
  put: <T = any>(endpoint: string, data?: any): Promise<T> => 
    api.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),
    
  patch: <T = any>(endpoint: string, data?: any): Promise<T> => 
    api.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),
    
  delete: <T = any>(endpoint: string): Promise<T> => 
    api.request<T>(endpoint, {
      method: 'DELETE',
    }),
};

// Serviços específicos para cada módulo
export const authAPI = {
  login: (email: string, password: string) => 
    api.post('/auth/login/', { email, password }),
    
  logout: () => 
    api.post('/auth/logout/', {}),
    
  me: () => 
    api.get('/auth/me/'),
    
  changePassword: (oldPassword: string, newPassword: string) => 
    api.post('/auth/change_password/', { 
      old_password: oldPassword, 
      new_password: newPassword 
    }),
};

export const usersAPI = {
  list: (params?: Record<string, any>) => {
    const queryParams = params ? new URLSearchParams(params).toString() : '';
    return api.get(`/users/${queryParams ? '?' + queryParams : ''}`);
  },
  
  get: (id: string) => 
    api.get(`/users/${id}/`),
    
  create: (data: any) => 
    api.post('/users/', data),
    
  update: (id: string, data: any) => 
    api.put(`/users/${id}/`, data),
    
  delete: (id: string) => 
    api.delete(`/users/${id}/`),
    
  activate: (id: string) => 
    api.post(`/users/${id}/activate/`),
    
  deactivate: (id: string) => 
    api.post(`/users/${id}/deactivate/`),
};

export const equipmentAPI = {
  list: (params?: Record<string, any>) => {
    const queryParams = params ? new URLSearchParams(params).toString() : '';
    return api.get(`/equipment/${queryParams ? '?' + queryParams : ''}`);
  },
  
  get: (id: string) => 
    api.get(`/equipment/${id}/`),
    
  create: (data: any) => 
    api.post('/equipment/', data),
    
  update: (id: string, data: any) => 
    api.put(`/equipment/${id}/`, data),
  
  partialUpdate: (id: string, data: any) => 
    api.patch(`/equipment/${id}/`, data),
    
  delete: (id: string) => 
    api.delete(`/equipment/${id}/`),
    
  available: (params?: Record<string, any>) => {
    const queryParams = params ? new URLSearchParams(params).toString() : '';
    return api.get(`/equipment/available/${queryParams ? '?' + queryParams : ''}`);
  },
  
  stats: () => 
    api.get('/equipment/stats/'),
    
  setMaintenance: (id: string) => 
    api.post(`/equipment/${id}/set_maintenance/`),
    
  setAvailable: (id: string) => 
    api.post(`/equipment/${id}/set_available/`),
};

export const loansAPI = {
  list: (params?: Record<string, any>) => {
    const queryParams = params ? new URLSearchParams(params).toString() : '';
    return api.get(`/loans/${queryParams ? '?' + queryParams : ''}`);
  },
  
  get: (id: string) => 
    api.get(`/loans/${id}/`),
    
  create: (data: any) => 
    api.post('/loans/', data),
    
  update: (id: string, data: any) => 
    api.put(`/loans/${id}/`, data),
    
  delete: (id: string) => 
    api.delete(`/loans/${id}/`),
    
  active: () => 
    api.get('/loans/active/'),
    
  overdue: () => 
    api.get('/loans/overdue/'),
    
  myLoans: () => 
    api.get('/loans/my_loans/'),
    
  returnEquipment: (id: string, data?: any) => 
    api.post(`/loans/${id}/return_equipment/`, data),
    
  stats: () => 
    api.get('/loans/stats/'),
};

export const reservationsAPI = {
  list: (params?: Record<string, any>) => {
    const queryParams = params ? new URLSearchParams(params).toString() : '';
    return api.get(`/reservations/${queryParams ? '?' + queryParams : ''}`);
  },
  
  get: (id: string) => 
    api.get(`/reservations/${id}/`),
    
  create: (data: any) => 
    api.post('/reservations/', data),
    
  update: (id: string, data: any) => 
    api.put(`/reservations/${id}/`, data),
    
  delete: (id: string) => 
    api.delete(`/reservations/${id}/`),
    
  active: () => 
    api.get('/reservations/active/'),
    
  expiringSoon: () => 
    api.get('/reservations/expiring_soon/'),
    
  myReservations: () => 
    api.get('/reservations/my_reservations/'),
    
  confirm: (id: string, data?: any) => 
    api.post(`/reservations/${id}/confirm/`, data),
    
  cancel: (id: string, data?: any) => 
    api.post(`/reservations/${id}/cancel/`, data),
    
  convertToLoan: (id: string, data: any) => 
    api.post(`/reservations/${id}/convert_to_loan/`, data),
    
  stats: () => 
    api.get('/reservations/stats/'),
};

export const dashboardAPI = {
  stats: () => 
    api.get('/dashboard/stats/'),
};

// Export default para compatibilidade
export default api; 