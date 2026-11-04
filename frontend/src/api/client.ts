/**
 * Thin fetch wrapper. Calls relative /api URLs: in Docker nginx proxies them to the backend,
 * in dev Vite does. The selected actor is sent as X-User-Id on every request.
 */

let currentActorId: string | null = null;

export function setApiActor(id: string | null) {
  currentActorId = id;
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

export async function api<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (currentActorId) headers['X-User-Id'] = currentActorId;

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

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
