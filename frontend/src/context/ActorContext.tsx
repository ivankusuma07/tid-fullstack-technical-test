import { useQuery } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { setApiActor } from '../api/client';
import type { UserSummary } from '../api/types';
import { usersApi } from '../api/users';

const STORAGE_KEY = 'wo.actorId';

interface ActorContextValue {
  actor: UserSummary | null;
  users: UserSummary[];
  setActorId: (id: string) => void;
  isLoading: boolean;
  error: Error | null;
}

const ActorContext = createContext<ActorContextValue | null>(null);

/**
 * "Who am I acting as" (no auth, per the brief). The selection is kept in localStorage
 * and sent to the API as X-User-Id. Query keys include the actor id, so switching
 * actor refetches everything with the new permissions.
 */
export function ActorProvider({ children }: { children: ReactNode }) {
  const { data: users = [], isLoading, error } = useQuery({ queryKey: ['users'], queryFn: () => usersApi.list() });
  const [actorId, setActorIdState] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));

  const actor = useMemo(() => {
    const found = users.find((u) => u.id === actorId);
    return found ?? users.find((u) => u.role === 'ADMIN') ?? users[0] ?? null;
  }, [users, actorId]);

  // Set synchronously during render so child queries in the same render already send the header.
  setApiActor(actor?.id ?? null);

  useEffect(() => {
    if (actor) localStorage.setItem(STORAGE_KEY, actor.id);
  }, [actor]);

  const value = useMemo<ActorContextValue>(
    () => ({ actor, users, setActorId: setActorIdState, isLoading, error: error as Error | null }),
    [actor, users, isLoading, error],
  );

  return <ActorContext.Provider value={value}>{children}</ActorContext.Provider>;
}

export function useActor() {
  const ctx = useContext(ActorContext);
  if (!ctx) throw new Error('useActor must be used inside ActorProvider');
  return ctx;
}
