import React from 'react';
import { clsx } from 'clsx';

type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
};

export function IconButton({ label, className, children, ...props }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      title={label}
      className={clsx(
        'grid h-10 w-10 place-items-center rounded-lg border border-[#34382e] text-[#a5aa9b] transition-colors hover:border-[#676d58] hover:bg-[#1b1e17] hover:text-[#f6c945] disabled:pointer-events-none disabled:opacity-40',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
