import { useEffect, type FormEvent, type ReactNode } from 'react';
import { Button } from './ui';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** When set, the body is a form and the footer gets Cancel + submit buttons. */
  onSubmit?: () => void;
  submitLabel?: string;
  submitVariant?: 'primary' | 'danger';
  submitting?: boolean;
  footer?: ReactNode;
}

export function Modal({ title, onClose, children, onSubmit, submitLabel = 'Save', submitVariant = 'primary', submitting, footer }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit?.();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <header className="border-b border-slate-100 px-5 py-4">
            <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          </header>
          <div className="space-y-4 px-5 py-4">{children}</div>
          <footer className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
            {footer ?? (
              <>
                <Button onClick={onClose} disabled={submitting}>
                  Cancel
                </Button>
                {onSubmit && (
                  <Button type="submit" variant={submitVariant} disabled={submitting}>
                    {submitting ? 'Saving…' : submitLabel}
                  </Button>
                )}
              </>
            )}
          </footer>
        </form>
      </div>
    </div>
  );
}
