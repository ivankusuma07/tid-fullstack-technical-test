import { useQuery } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { authApi, type Session } from '../api/auth';
import { setApiToken, setUnauthorizedHandler } from '../api/client';
import type { UserSummary } from '../api/types';
import { usersApi } from '../api/users';

const SESSION_KEY = 'wo.session';

interface ActorContextValue {
  /** The logged-in user; null until the first login finishes. */
  actor: UserSummary | null;
  users: UserSummary[];
  /** Switching user = logging in as that user (no password, per the brief). */
  setActorId: (id: string) => void;
  isLoading: boolean;
  error: Error | null;
}

const ActorContext = createContext<ActorContextValue | null>(null);

function readStoredSession(): Session | null {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null');
  } catch {
    return null;
  }
}

/**
 * Holds the current session (JWT + user). Picking a user in the selector calls
 * POST /auth/login and stores the token; every API call then sends it as a Bearer token.
 * Query keys include the actor id, so switching user refetches with the new permissions.
 */
export function ActorProvider({ children }: { children: ReactNode }) {
  const usersQuery = useQuery({ queryKey: ['users'], queryFn: () => usersApi.list() });
  const users = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);

  const [session, setSession] = useState<Session | null>(readStoredSession);
  const [selectedId, setSelectedId] = useState<string | null>(() => readStoredSession()?.user.id ?? null);
  const [loginError, setLoginError] = useState<Error | null>(null);

  // Set synchronously during render so child queries in the same render already send the token.
  setApiToken(session?.accessToken ?? null);

  const target = users.find((u) => u.id === selectedId) ?? users.find((u) => u.role === 'ADMIN') ?? users[0];

  const login = useCallback(async (userId: string) => {
    const s = await authApi.login(userId);
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    setApiToken(s.accessToken);
    setSession(s);
    setLoginError(null);
    return s;
  }, []);

  // Log in whenever the selected user differs from the session's user.
  useEffect(() => {
    if (!target || session?.user.id === target.id) return;
    login(target.id).catch((e: Error) => setLoginError(e));
  }, [target, session?.user.id, login]);

  // Expired or invalid stored token: log in again as the same user and retry the request.
  const targetId = useRef<string | undefined>(undefined);
  targetId.current = target?.id;
  useEffect(() => {
    setUnauthorizedHandler(async () => {
      if (!targetId.current) return null;
      try {
        return (await login(targetId.current)).accessToken;
      } catch {
        return null;
      }
    });
    return () => setUnauthorizedHandler(null);
  }, [login]);

  // While switching, keep the previous user until the new login finishes, so pages don't unmount.
  const actor = session?.user ?? null;

  const value = useMemo<ActorContextValue>(
    () => ({
      actor,
      users,
      setActorId: setSelectedId,
      isLoading: usersQuery.isLoading || (!session && !loginError && !usersQuery.error),
      error: (usersQuery.error as Error | null) ?? loginError,
    }),
    [actor, session, users, usersQuery.isLoading, usersQuery.error, loginError],
  );

  return <ActorContext.Provider value={value}>{children}</ActorContext.Provider>;
}

export function useActor() {
  const ctx = useContext(ActorContext);
  if (!ctx) throw new Error('useActor must be used inside ActorProvider');
  return ctx;
}
