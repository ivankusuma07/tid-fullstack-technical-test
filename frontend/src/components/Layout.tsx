import { NavLink, Outlet } from 'react-router-dom';
import { useActor } from '../context/ActorContext';
import { ActorSelector } from './ActorSelector';
import { Icon, Spinner } from './ui';

export function Layout() {
  const { isLoading, error, actor } = useActor();

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="hidden w-60 shrink-0 flex-col bg-gradient-to-b from-emerald-600 to-teal-400 text-white md:flex">
        <div className="flex items-center gap-2 px-5 py-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
            <Icon name="wrench" className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="font-semibold">Work Order</div>
            <div className="text-xs text-white/80">Maintenance System</div>
          </div>
        </div>
        <nav className="px-3">
          <NavLink
            to="/work-orders"
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                isActive ? 'bg-white text-emerald-700 shadow-sm' : 'text-white/90 hover:bg-white/10'
              }`
            }
          >
            <Icon name="box" /> Work Order
          </NavLink>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3">
          <h1 className="text-lg font-semibold text-slate-800">Work Order System</h1>
          <ActorSelector />
        </header>
        <main className="flex-1 p-4 md:p-6">
          {isLoading ? (
            <Spinner label="Connecting to API…" />
          ) : error || !actor ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
              Cannot load users from the API. Is the backend running? ({error?.message ?? 'no users found'})
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}
