import { ChevronDown, type LucideIcon } from 'lucide-react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

/** Small shared primitives so every screen looks the same. */

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const variants: Record<Variant, string> = {
  primary: 'bg-emerald-500 text-white hover:bg-emerald-600 disabled:bg-emerald-300',
  secondary: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:text-slate-400',
  danger: 'bg-red-500 text-white hover:bg-red-600 disabled:bg-red-300',
  ghost: 'text-slate-600 hover:bg-slate-100',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' }) {
  const sizing = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-4 py-2 text-sm';
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed ${sizing} ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

const control =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:outline-none disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400';

/** Leading icon inside a control; the control gets extra left padding to make room. */
function LeadingIcon({ icon: IconCmp }: { icon: LucideIcon }) {
  return <IconCmp aria-hidden className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />;
}

type WithIcon = { icon?: LucideIcon };

/** With an icon, `className` goes on the wrapper (so layout classes like max-w-xs still apply). */
export function Input({ icon, className = '', ...props }: InputHTMLAttributes<HTMLInputElement> & WithIcon) {
  if (!icon) return <input {...props} className={`${control} ${className}`} />;
  return (
    <div className={`relative ${className}`}>
      <LeadingIcon icon={icon} />
      <input {...props} className={`${control} pl-9`} />
    </div>
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={`${control} ${props.className ?? ''}`} />;
}

/** Native select with a consistent chevron (and optional leading icon). `className` goes on the wrapper. */
export function Select({ icon, className = '', ...props }: SelectHTMLAttributes<HTMLSelectElement> & WithIcon) {
  return (
    <div className={`relative ${className}`}>
      {icon && <LeadingIcon icon={icon} />}
      <select {...props} className={`${control} cursor-pointer appearance-none pr-9 ${icon ? 'pl-9' : ''}`} />
      <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

export function Card({ title, actions, children }: { title?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
          {title && <h2 className="font-semibold text-slate-800">{title}</h2>}
          {actions}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      {label}
    </div>
  );
}
