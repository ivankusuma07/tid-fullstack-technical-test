import { ChevronDown, ClipboardCheck, ShieldUser, UserRound, Wrench, type LucideIcon } from 'lucide-react';
import type { Role } from '../api/types';
import { useActor } from '../context/ActorContext';

const ROLES: { value: Role; label: string; icon: LucideIcon }[] = [
  { value: 'ADMIN', label: 'Admin', icon: ShieldUser },
  { value: 'SPV', label: 'SPV', icon: ClipboardCheck },
  { value: 'MECHANIC', label: 'Mechanic', icon: Wrench },
];

/** Pick a role, then a user with that role (needed to tell the two mechanics apart). */
export function ActorSelector() {
  const { actor, users, setActorId } = useActor();
  if (!actor) return null;

  const usersOfRole = users.filter((u) => u.role === actor.role);

  const changeRole = (role: Role) => {
    const first = users.find((u) => u.role === role);
    if (first) setActorId(first.id);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs font-medium tracking-wide text-slate-500 uppercase sm:inline">Acting as</span>
      <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5" role="radiogroup" aria-label="Role">
        {ROLES.map((r) => (
          <button
            key={r.value}
            type="button"
            role="radio"
            aria-checked={actor.role === r.value}
            onClick={() => changeRole(r.value)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium transition-colors ${
              actor.role === r.value ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <r.icon aria-hidden className="h-4 w-4" />
            {r.label}
          </button>
        ))}
      </div>
      <div className="relative">
        <UserRound aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <select
          aria-label="User"
          value={actor.id}
          onChange={(e) => setActorId(e.target.value)}
          disabled={usersOfRole.length < 2}
          title={usersOfRole.length < 2 ? 'Only one user has this role' : 'Switch user'}
          className="cursor-pointer appearance-none rounded-lg border border-slate-300 bg-white py-1.5 pr-8 pl-8 text-sm font-medium text-slate-800 shadow-sm hover:border-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:outline-none disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:font-normal disabled:text-slate-400 disabled:shadow-none"
        >
          {usersOfRole.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
    </div>
  );
}
