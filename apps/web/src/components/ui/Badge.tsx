import React from 'react';
import { clsx } from 'clsx';

export type BadgeVariant = 'neutral' | 'yellow' | 'success' | 'danger' | 'warning' | 'taxonomy';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
}

export function Badge({
  className,
  variant = 'neutral',
  size = 'sm',
  children,
  ...props
}: BadgeProps) {
  const baseStyles = 'inline-flex items-center font-mono font-medium rounded border select-none';

  const sizeStyles = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2 py-0.5 gap-1.5',
  }[size];

  const variantStyles = {
    neutral: 'bg-[#1b1e17] text-[#a5aa9b] border-[#2a2d24]',
    yellow: 'bg-[rgba(246,201,69,0.12)] text-[#f6c945] border-[#f6c945]/30',
    success: 'bg-[#62d49b]/15 text-[#62d49b] border-[#62d49b]/30',
    danger: 'bg-[#ff6b6b]/15 text-[#ff6b6b] border-[#ff6b6b]/30',
    warning: 'bg-[#f6c945]/15 text-[#f6c945] border-[#f6c945]/30',
    taxonomy: 'bg-[#141611] text-[#f6f7f2] border-[#3b3f31]',
  }[variant];

  return (
    <span className={clsx(baseStyles, sizeStyles, variantStyles, className)} {...props}>
      {children}
    </span>
  );
}
