import { ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, type LucideIcon } from 'lucide-react';

interface Props {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

/** "Rows per page: 10 ▾   1-10 of 149   |< < > >|", like the mockup (with icon buttons). */
export function Pagination({ page, limit, total, onPageChange, onLimitChange }: Props) {
  const lastPage = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(total, page * limit);

  const nav = (Icon: LucideIcon, target: number, disabled: boolean, aria: string) => (
    <button
      type="button"
      aria-label={aria}
      disabled={disabled}
      onClick={() => onPageChange(target)}
      className="rounded p-1 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
    >
      <Icon className="h-4 w-4" />
    </button>
  );

  return (
    <div className="flex flex-wrap items-center justify-end gap-4 px-2 pt-4 text-sm text-slate-600">
      <label className="flex items-center gap-2">
        Rows per page:
        <span className="relative">
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="cursor-pointer appearance-none rounded border border-slate-300 bg-white py-0.5 pr-6 pl-2 hover:border-emerald-400 focus:border-emerald-500 focus:outline-none"
          >
            {[10, 20, 50].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
          <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-1.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        </span>
      </label>
      <span>
        {from}-{to} of {total}
      </span>
      <div className="flex items-center">
        {nav(ChevronsLeft, 1, page <= 1, 'First page')}
        {nav(ChevronLeft, page - 1, page <= 1, 'Previous page')}
        {nav(ChevronRight, page + 1, page >= lastPage, 'Next page')}
        {nav(ChevronsRight, lastPage, page >= lastPage, 'Last page')}
      </div>
    </div>
  );
}
