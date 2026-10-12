import React from 'react';
import { clsx } from 'clsx';

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

export interface TabsProps<T extends string = string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onChange: (id: T) => void;
  variant?: 'segmented' | 'underline';
  className?: string;
}

export function Tabs<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  variant = 'segmented',
  className,
}: TabsProps<T>) {
  if (variant === 'segmented') {
    return (
      <div
        role="tablist"
        className={clsx(
          'flex items-center gap-1 p-1 bg-[#11130f] rounded-lg border border-[#2a2d24]',
          className
        )}
      >
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all select-none',
                isActive
                  ? 'bg-[#f6c945] text-[#070806] font-semibold shadow-sm'
                  : 'text-[#a5aa9b] hover:text-[#f6f7f2] hover:bg-[#1b1e17]'
              )}
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={clsx(
                    'ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono',
                    isActive ? 'bg-[#070806]/20 text-[#070806]' : 'bg-[#1b1e17] text-[#a5aa9b]'
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="tablist"
      className={clsx('flex items-center border-b border-[#2a2d24] px-2 gap-2', className)}
    >
      {tabs.map(tab => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px select-none',
              isActive
                ? 'border-[#f6c945] text-[#f6c945] font-semibold'
                : 'border-transparent text-[#a5aa9b] hover:text-[#f6f7f2] hover:border-[#3b3f31]'
            )}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className="ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#1b1e17] text-[#a5aa9b]">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
