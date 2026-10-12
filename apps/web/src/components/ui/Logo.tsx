import React from 'react';
import Image from 'next/image';
import { clsx } from 'clsx';

export interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  versionBadge?: string;
  className?: string;
}

export function Logo({
  size = 'md',
  showText = true,
  versionBadge,
  className,
}: LogoProps) {
  const dimensions = {
    sm: { px: 24, text: 'text-xs', badge: 'text-[9px]' },
    md: { px: 32, text: 'text-sm', badge: 'text-[10px]' },
    lg: { px: 40, text: 'text-base', badge: 'text-xs' },
  }[size];

  return (
    <div className={clsx('flex items-center gap-2.5 select-none', className)}>
      <div
        className={clsx(
          'relative rounded-lg overflow-hidden shrink-0 border border-[#f6c945]/30 shadow-sm bg-[#070806]'
        )}
        style={{ width: dimensions.px, height: dimensions.px }}
      >
        <Image
          src="/logo.png"
          alt="Stackfold Logo"
          width={dimensions.px}
          height={dimensions.px}
          className="w-full h-full object-contain"
          priority
        />
      </div>

      {showText && (
        <div className="flex items-center gap-2">
          <span className={clsx('font-bold tracking-wider text-[#f6f7f2]', dimensions.text)}>
            STACKFOLD
          </span>
          {versionBadge && (
            <span
              className={clsx(
                'px-1.5 py-0.2 rounded font-mono bg-[rgba(246,201,69,0.12)] text-[#f6c945] border border-[#f6c945]/30',
                dimensions.badge
              )}
            >
              {versionBadge}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
