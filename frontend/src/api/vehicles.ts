import { api } from './client';
import type { Vehicle } from './types';

export const vehiclesApi = {
  list: () => api<Vehicle[]>('GET', '/vehicles'),
};
