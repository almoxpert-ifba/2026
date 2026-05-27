import { api } from './api';
import type { LoginCredentials } from '../types';

export interface LoginResponse {
  accessToken: string;
  mustChangePassword: boolean;
  user: {
    id: number;
    name: string;
    email: string;
    userType: 'admin' | 'student';
  };
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>('/auth/login', credentials);
    return data;
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    const { data } = await api.post('/auth/forgot-password', { email });
    return data;
  },

  async resetPassword(email: string, code: string): Promise<{ message: string }> {
    const { data } = await api.post('/auth/reset-password', { email, code });
    return data;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const { data } = await api.patch('/auth/change-password', { currentPassword, newPassword });
    return data;
  },
};
