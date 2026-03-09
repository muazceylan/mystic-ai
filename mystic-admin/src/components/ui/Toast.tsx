'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Toast {
  id: string;
  type: 'success' | 'error';
  message: string;
}

interface ToastContextValue {
  success: (msg: string) => void;
  error: (msg: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const add = useCallback((type: Toast['type'], message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ success: (m) => add('success', m), error: (m) => add('error', m) }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium max-w-sm',
              t.type === 'success' ? 'bg-green-900 text-green-100 border border-green-700' : 'bg-red-900 text-red-100 border border-red-700'
            )}
          >
            {t.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {t.message}
            <button
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="ml-auto opacity-70 hover:opacity-100"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
}
