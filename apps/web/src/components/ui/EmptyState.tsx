import React from 'react';
import { clsx } from 'clsx';
import { Button } from './Button';

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
}

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto select-none',
        className
      )}
    >
      {icon && (
        <div className="w-12 h-12 rounded-xl bg-[#141611] border border-[#2a2d24] flex items-center justify-center text-[#f6c945] mb-4 shadow-sm">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-[#f6f7f2] mb-1.5">{title}</h3>
      <p className="text-xs text-[#a5aa9b] leading-relaxed mb-6">{description}</p>
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
        {primaryAction && (
          <Button
            variant="primary"
            size="md"
            onClick={primaryAction.onClick}
            leftIcon={primaryAction.icon}
          >
            {primaryAction.label}
          </Button>
        )}
        {secondaryAction && (
          <Button
            variant="secondary"
            size="md"
            onClick={secondaryAction.onClick}
            leftIcon={secondaryAction.icon}
          >
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );
}
