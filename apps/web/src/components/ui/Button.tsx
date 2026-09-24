import React from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'secondary',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      leftIcon,
      rightIcon,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all select-none rounded-lg focus-visible:outline-2 focus-visible:outline-[var(--sf-focus)] focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-45 active:scale-[0.98]';

    const sizeStyles = {
      sm: 'text-xs px-2.5 py-1.5 gap-1.5 min-h-[32px]',
      md: 'text-xs px-3.5 py-2 gap-2 min-h-[38px]',
      lg: 'text-sm px-5 py-2.5 gap-2.5 min-h-[44px]',
    }[size];

    const variantStyles = {
      primary:
        'bg-[#f6c945] hover:bg-[#ffda67] active:bg-[#d9aa22] text-[#070806] font-semibold shadow-sm hover:shadow-[0_0_18px_rgba(246,201,69,0.25)] border border-[#f6c945]',
      secondary:
        'bg-[#141611] hover:bg-[#1b1e17] text-[#f6f7f2] border border-[#2a2d24] hover:border-[#3b3f31]',
      ghost:
        'bg-transparent hover:bg-[#141611] text-[#a5aa9b] hover:text-[#f6f7f2] border border-transparent',
      danger:
        'bg-[#ff6b6b]/15 hover:bg-[#ff6b6b]/25 text-[#ff6b6b] border border-[#ff6b6b]/40',
      outline:
        'bg-transparent hover:bg-[#141611] text-[#f6f7f2] border border-[#2a2d24] hover:border-[#f6c945]/50',
    }[variant];

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={clsx(baseStyles, sizeStyles, variantStyles, className)}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
