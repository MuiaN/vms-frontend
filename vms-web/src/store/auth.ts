import { create } from 'zustand';
import { User } from '@workspace/api-client-react';

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('vms_token'),
  user: null,
  setAuth: (token, user) => {
    localStorage.setItem('vms_token', token);
    set({ token, user });
  },
  clearAuth: () => {
    localStorage.removeItem('vms_token');
    set({ token: null, user: null });
  },
}));
