import React, { useState } from 'react';
import { X, Share2, Copy, Check, ExternalLink, AlertCircle, HardDrive } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { isCloudEnabled } from '@/lib/cloud';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshotId?: string;
  onNeedSaveFirst?: () => void;
}

export function ShareModal({ isOpen, onClose, snapshotId, onNeedSaveFirst }: ShareModalProps) {
  const [expiresInDays, setExpiresInDays] = useState<number>(30);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  if (!isCloudEnabled()) {
    return (
      <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4 select-none">
        <div className="fixed inset-0 bg-[#070806]/80 backdrop-blur-sm" onClick={onClose} />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Sharing unavailable in local mode"
          className="relative bg-[#0d0f0c] border border-[#2a2d24] rounded-2xl shadow-2xl w-full max-w-md p-6 z-10 space-y-4 text-center"
        >
          <div className="mx-auto grid h-11 w-11 place-items-center rounded-xl border border-[#62d49b]/30 bg-[#62d49b]/10">
            <HardDrive className="h-5 w-5 text-[#62d49b]" />
          </div>
          <h2 className="text-sm font-bold text-[#f6f7f2]">Local mode — sharing disabled</h2>
          <p className="text-xs leading-relaxed text-[#a5aa9b]">
            Share links require cloud snapshots. Use Export for local Mermaid, Markdown, or JSON
            handoff instead.
          </p>
          <Button variant="secondary" size="sm" onClick={onClose} className="w-full">
            Back to Studio
          </Button>
        </div>
      </div>
    );
  }

  const handleCreateShare = async () => {
    if (!snapshotId) {
      if (onNeedSaveFirst) {
        onNeedSaveFirst();
      }
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/cloud/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snapshotId,
          expiresInDays: expiresInDays > 0 ? expiresInDays : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Please sign in with Clerk to generate shareable links.');
        }
        throw new Error(data.error || 'Failed to generate link.');
      }

      setShareUrl(data.shareUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate share link');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4 select-none">
      <div className="fixed inset-0 bg-[#070806]/80 backdrop-blur-sm" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Share Architecture Map"
        className="relative bg-[#0d0f0c] border border-[#2a2d24] rounded-2xl shadow-2xl w-full max-w-md p-6 z-10 space-y-4 animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between border-b border-[#2a2d24] pb-3">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-[#f6c945]" />
            <h2 className="text-sm font-bold text-[#f6f7f2]">Share Architecture Map</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#a5aa9b] hover:text-[#f6f7f2] hover:bg-[#1b1e17] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-[#ff6b6b]/10 border border-[#ff6b6b]/30 text-xs text-[#ff6b6b] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="leading-snug">{error}</div>
          </div>
        )}

        {!snapshotId ? (
          <div className="space-y-4 text-xs">
            <p className="text-[#a5aa9b] leading-relaxed">
              To share this architecture map with your team or clients, first save a cloud snapshot to your workspace.
            </p>
            <Button
              variant="primary"
              size="md"
              className="w-full"
              onClick={() => {
                onClose();
                if (onNeedSaveFirst) onNeedSaveFirst();
              }}
            >
              Save Snapshot &amp; Share
            </Button>
          </div>
        ) : shareUrl ? (
          <div className="space-y-4 text-xs">
            <p className="text-[#62d49b] font-medium">
              Shareable link generated! Anyone with this link can view the architecture map in their browser.
            </p>

            <div className="flex items-center gap-2 p-2 bg-[#141611] border border-[#2a2d24] rounded-lg">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="bg-transparent border-none outline-none text-xs text-[#f6f7f2] font-mono flex-1 select-all"
              />
              <Button
                variant="primary"
                size="sm"
                onClick={handleCopy}
                leftIcon={copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              >
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>

            <div className="flex justify-end pt-2">
              <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm" rightIcon={<ExternalLink className="w-3.5 h-3.5" />}>
                  Open Link
                </Button>
              </a>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            <p className="text-[#a5aa9b] leading-relaxed">
              Generate a public or team read-only link for this architecture snapshot.
            </p>

            <div>
              <label className="block text-[#a5aa9b] font-medium mb-1">Link Expiration</label>
              <select
                value={expiresInDays}
                onChange={e => setExpiresInDays(Number(e.target.value))}
                className="w-full bg-[#141611] border border-[#2a2d24] rounded-lg px-3 py-2 text-[#f6f7f2] focus:outline-none focus:border-[#f6c945]"
              >
                <option value={7}>Expires in 7 days</option>
                <option value={30}>Expires in 30 days</option>
                <option value={90}>Expires in 90 days</option>
                <option value={0}>Never expires</option>
              </select>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#2a2d24]">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCreateShare}
                isLoading={isLoading}
                leftIcon={<Share2 className="w-3.5 h-3.5" />}
              >
                Generate Link
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
