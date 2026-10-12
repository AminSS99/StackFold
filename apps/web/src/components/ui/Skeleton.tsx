import React from 'react';
import { clsx } from 'clsx';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'rectangular' | 'circular' | 'text';
}

export function Skeleton({ className, variant = 'rectangular', ...props }: SkeletonProps) {
  const variantStyles = {
    rectangular: 'rounded-md',
    circular: 'rounded-full',
    text: 'rounded h-3.5 w-full',
  }[variant];

  return (
    <div
      aria-hidden="true"
      className={clsx(
        'bg-[#1b1e17]/80 animate-pulse border border-[#2a2d24]/50',
        variantStyles,
        className
      )}
      {...props}
    />
  );
}
