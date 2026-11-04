import { api, toQueryString } from './client';
import type { Role, UserSummary } from './types';

export const usersApi = {
  list: (role?: Role) => api<UserSummary[]>('GET', `/users${toQueryString({ role })}`),
};
