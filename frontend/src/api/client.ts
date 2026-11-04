/**
 * Thin fetch wrapper. Calls relative /api URLs: in Docker nginx proxies them to the backend,
 * in dev Vite does. The current session's JWT is sent as `Authorization: Bearer`.
 */

let accessToken: string | null = null;
let refreshSession: (() => Promise<string | null>) | null = null;

export function setApiToken(token: string | null) {
  accessToken = token;
}

/** Called once on a 401 (e.g. expired token) to log in again; the request is then retried. */
export function setUnauthorizedHandler(handler: (() => Promise<string | null>) | null) {
  refreshSession = handler;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

async function send(method: Method, path: string, body: unknown, token: string | null) {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(`/api${path}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
}

export async function api<T>(method: Method, path: string, body?: unknown): Promise<T> {
  let res = await send(method, path, body, accessToken);

  if (res.status === 401 && refreshSession && !path.startsWith('/auth/')) {
    const fresh = await refreshSession();
    if (fresh) res = await send(method, path, body, fresh);
  }

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = data?.message;
    throw new ApiError(
      res.status,
      Array.isArray(message) ? message.join(', ') : (message ?? `Request failed (${res.status})`),
    );
  }
  return data as T;
}

export function toQueryString(params: object): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') qs.set(key, String(value));
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}
