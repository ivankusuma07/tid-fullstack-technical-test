interface Props {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

/** "Rows per page: 10 ▾   1-10 of 149   |< < > >|", like the mockup. */
export function Pagination({ page, limit, total, onPageChange, onLimitChange }: Props) {
  const lastPage = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(total, page * limit);

  const nav = (label: string, target: number, disabled: boolean, aria: string) => (
    <button
      type="button"
      aria-label={aria}
      disabled={disabled}
      onClick={() => onPageChange(target)}
      className="rounded px-2 py-1 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-wrap items-center justify-end gap-4 px-2 pt-4 text-sm text-slate-600">
      <label className="flex items-center gap-2">
        Rows per page:
        <select
          value={limit}
          onChange={(e) => onLimitChange(Number(e.target.value))}
          className="rounded border border-slate-200 bg-white px-1.5 py-0.5"
        >
          {[10, 20, 50].map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </label>
      <span>
        {from}-{to} of {total}
      </span>
      <div className="flex items-center">
        {nav('|<', 1, page <= 1, 'First page')}
        {nav('<', page - 1, page <= 1, 'Previous page')}
        {nav('>', page + 1, page >= lastPage, 'Next page')}
        {nav('>|', lastPage, page >= lastPage, 'Last page')}
      </div>
    </div>
  );
}
