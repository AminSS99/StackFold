import React from 'react';
import { clsx } from 'clsx';
import { Copy, Check } from 'lucide-react';

export interface PropertyItem {
  key: string;
  label: string;
  value: React.ReactNode;
  rawText?: string;
  copyable?: boolean;
}

export interface PropertyListProps {
  items: PropertyItem[];
  className?: string;
}

export function PropertyList({ items, className }: PropertyListProps) {
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (!items || items.length === 0) return null;

  return (
    <dl className={clsx('divide-y divide-[#2a2d24] text-xs', className)}>
      {items.map(item => (
        <div key={item.key} className="py-2 flex items-start justify-between gap-4">
          <dt className="text-[#a5aa9b] font-medium shrink-0 max-w-[130px] truncate">
            {item.label}
          </dt>
          <dd className="text-[#f6f7f2] font-mono text-[11px] text-right break-all flex items-center justify-end gap-1.5 min-w-0">
            <span className="truncate">{item.value}</span>
            {item.copyable && item.rawText && (
              <button
                onClick={() => handleCopy(item.key, item.rawText!)}
                title="Copy value"
                className="p-1 rounded text-[#74796d] hover:text-[#f6c945] hover:bg-[#1b1e17] transition-colors shrink-0"
              >
                {copiedKey === item.key ? (
                  <Check className="w-3 h-3 text-[#62d49b]" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
