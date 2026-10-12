import React, { useState } from 'react';
import { clsx } from 'clsx';
import { Copy, Check, ExternalLink } from 'lucide-react';

export interface CodeBlockProps {
  code: string;
  language?: string;
  filePath?: string;
  startLine?: number;
  onOpenInEditor?: (filePath: string) => void;
  className?: string;
}

export function CodeBlock({
  code,
  language,
  filePath,
  startLine = 1,
  onOpenInEditor,
  className,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.trimEnd().split('\n');

  return (
    <div
      className={clsx(
        'rounded-lg border border-[#2a2d24] bg-[#0d0f0c] overflow-hidden text-xs font-mono select-text',
        className
      )}
    >
      {(filePath || onOpenInEditor || language) && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#141611] border-b border-[#2a2d24] text-[11px] text-[#a5aa9b] select-none">
          <div className="flex items-center gap-2 truncate min-w-0">
            {language && (
              <span className="uppercase text-[10px] px-1 py-0.2 rounded bg-[#1b1e17] text-[#f6c945]">
                {language}
              </span>
            )}
            {filePath && <span className="truncate text-[#f6f7f2]">{filePath}</span>}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {filePath && onOpenInEditor && (
              <button
                onClick={() => onOpenInEditor(filePath)}
                title="Open file in editor"
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[#a5aa9b] hover:text-[#f6c945] hover:bg-[#1b1e17] transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Editor</span>
              </button>
            )}
            <button
              onClick={handleCopy}
              title="Copy code"
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[#a5aa9b] hover:text-[#f6c945] hover:bg-[#1b1e17] transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-[#62d49b]" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>
      )}

      <div className="p-3 overflow-x-auto text-[11px] leading-relaxed text-[#f6f7f2]">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => {
              const lineNum = startLine + idx;
              return (
                <tr key={idx} className="hover:bg-[#141611]/50">
                  <td className="select-none text-right pr-3 text-[#74796d] w-8 align-top">
                    {lineNum}
                  </td>
                  <td className="whitespace-pre align-top text-[#f6f7f2]">{line || ' '}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
