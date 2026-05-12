import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

type ToastVariant = 'success' | 'error';

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 300);
    }, 3200);
    return () => {
      cancelAnimationFrame(raf);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast.id, onDismiss]);

  const isSuccess = toast.variant === 'success';

  return (
    <div
      className="flex items-start gap-3 rounded-xl px-4 py-3.5 w-full sm:w-auto sm:min-w-[240px] sm:max-w-[320px] transition-all duration-300"
      style={{
        background: 'var(--ds-bg-overlay)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)',
        borderLeft: isSuccess ? '2px solid rgba(139,175,148,0.55)' : '2px solid rgba(200,110,110,0.45)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.97)',
      }}
      role="alert"
      aria-live="assertive"
    >
      <span className="shrink-0 mt-0.5">
        {isSuccess
          ? <CheckCircle size={15} style={{ color: '#6ee7b7' }} />
          : <XCircle size={15} style={{ color: '#f87171' }} />
        }
      </span>
      <p className="text-sm flex-1 leading-snug" style={{ color: 'var(--ds-text-primary)' }}>
        {toast.message}
      </p>
      <button
        onClick={() => { setVisible(false); setTimeout(() => onDismiss(toast.id), 300); }}
        className="shrink-0 transition-colors duration-150 -mr-1"
        style={{ color: 'var(--ds-text-tertiary)' }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--ds-text-secondary)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--ds-text-tertiary)')}
        aria-label="Dismiss"
      >
        <X size={13} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, variant: ToastVariant = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts(prev => [...prev, { id, message, variant }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Bottom-right desktop / bottom-center mobile */}
      <div className="fixed z-[200] bottom-4 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 flex flex-col gap-2.5 items-stretch sm:items-end pointer-events-none">
        <div className="pointer-events-auto flex flex-col gap-2.5 items-stretch sm:items-end">
          {toasts.map(t => (
            <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}
