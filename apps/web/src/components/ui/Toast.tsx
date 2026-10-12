import React, { useEffect } from 'react';
import { clsx } from 'clsx';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastProps {
  id?: string;
  type?: ToastType;
  message: string;
  description?: string;
  duration?: number;
  onClose?: () => void;
}

export function Toast({
  type = 'info',
  message,
  description,
  duration = 4000,
  onClose,
}: ToastProps) {
  useEffect(() => {
    if (!onClose || duration <= 0) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-[#62d49b] shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-[#f6c945] shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-[#ff6b6b] shrink-0" />,
    info: <Info className="w-4 h-4 text-[#a5aa9b] shrink-0" />,
  }[type];

  return (
    <div
      role="status"
      aria-live="polite"
      className={clsx(
        'flex items-start gap-3 p-3 rounded-lg bg-[#141611] border border-[#2a2d24] text-xs shadow-xl min-w-[280px] max-w-sm animate-in fade-in slide-in-from-bottom-2 duration-150'
      )}
    >
      {icons}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[#f6f7f2] leading-tight">{message}</div>
        {description && (
          <div className="text-[11px] text-[#a5aa9b] mt-0.5 leading-snug">{description}</div>
        )}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Dismiss toast"
          className="text-[#74796d] hover:text-[#f6f7f2] transition-colors p-0.5"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
