import React, { useEffect } from 'react';
import { clsx } from 'clsx';
import { X } from 'lucide-react';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  side?: 'left' | 'right' | 'bottom';
  children: React.ReactNode;
  className?: string;
  width?: string;
}

export function Drawer({
  isOpen,
  onClose,
  title,
  side = 'right',
  children,
  className,
  width = 'w-full sm:w-[420px]',
}: DrawerProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sideAnimations = {
    right: 'top-0 right-0 h-full animate-in slide-in-from-right duration-200 border-l border-[#2a2d24]',
    left: 'top-0 left-0 h-full animate-in slide-in-from-left duration-200 border-r border-[#2a2d24]',
    bottom: 'bottom-0 left-0 w-full max-h-[85vh] animate-in slide-in-from-bottom duration-200 border-t border-[#2a2d24]',
  }[side];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#070806]/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer surface */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Panel'}
        className={clsx(
          'fixed bg-[#0d0f0c] shadow-2xl flex flex-col z-50 focus:outline-none',
          sideAnimations,
          side !== 'bottom' && width,
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2d24]">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#f6f7f2]">
              {title}
            </h2>
            <button
              onClick={onClose}
              aria-label="Close drawer"
              className="p-1 rounded-md text-[#a5aa9b] hover:text-[#f6f7f2] hover:bg-[#1b1e17] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </aside>
    </div>
  );
}
