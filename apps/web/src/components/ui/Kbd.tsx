import React from 'react';
import { clsx } from 'clsx';

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {}

export function Kbd({ className, children, ...props }: KbdProps) {
  return (
    <kbd
      className={clsx(
        'inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-mono text-[#a5aa9b] bg-[#1b1e17] border border-[#2a2d24] rounded shadow-sm select-none',
        className
      )}
      {...props}
    >
      {children}
    </kbd>
  );
}
