import { api } from './client';
import type { UserSummary } from './types';

export interface Session {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
  user: UserSummary;
}

export const authApi = {
  login: (userId: string) => api<Session>('POST', '/auth/login', { userId }),
};
