import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  show: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  const success = (msg: string) => show(msg, 'success');
  const error = (msg: string) => show(msg, 'error');
  const warning = (msg: string) => show(msg, 'warning');

  return (
    <ToastContext.Provider value={{ show, success, error, warning }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              pointer-events-auto px-6 py-3 rounded-xl shadow-2xl text-white font-bold
              animate-in slide-in-from-right duration-300 flex items-center gap-3
              ${toast.type === 'success' ? 'bg-green-600' : 
                toast.type === 'error' ? 'bg-red-600' : 
                toast.type === 'warning' ? 'bg-amber-500' : 'bg-blue-600'}
            `}
          >
            <span>
              {toast.type === 'success' ? '✅' : 
               toast.type === 'error' ? '❌' : 
               toast.type === 'warning' ? '⚠️' : 'ℹ️'}
            </span>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};
