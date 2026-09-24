import React, { useState } from 'react';
import { X, CloudUpload, Check, AlertCircle, Loader2, HardDrive } from 'lucide-react';
import { useStackfoldStore } from '@/store/useStackfoldStore';
import { Button } from '@/components/ui/Button';
import { isCloudEnabled } from '@/lib/cloud';

interface SaveProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (projectId: string, snapshotId: string) => void;
}

export function SaveProjectModal({ isOpen, onClose, onSaved }: SaveProjectModalProps) {
  const rawGraph = useStackfoldStore(s => s.rawGraph);
  const scanStats = useStackfoldStore(s => s.scanStats);

  const [name, setName] = useState(rawGraph?.metadata.projectName || '');
  const [description, setDescription] = useState('');
  const [versionLabel, setVersionLabel] = useState('v1.0.0');
  const [isPublic, setIsPublic] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen || !rawGraph) return null;

  if (!isCloudEnabled()) {
    return (
      <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4 select-none">
        <div className="fixed inset-0 bg-[#070806]/80 backdrop-blur-sm" onClick={onClose} />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Cloud unavailable in local mode"
          className="relative bg-[#0d0f0c] border border-[#2a2d24] rounded-2xl shadow-2xl w-full max-w-md p-6 z-10 space-y-4 text-center"
        >
          <div className="mx-auto grid h-11 w-11 place-items-center rounded-xl border border-[#62d49b]/30 bg-[#62d49b]/10">
            <HardDrive className="h-5 w-5 text-[#62d49b]" />
          </div>
          <h2 className="text-sm font-bold text-[#f6f7f2]">Local mode — cloud sync disabled</h2>
          <p className="text-xs leading-relaxed text-[#a5aa9b]">
            Configure Clerk and a database URL to enable cloud snapshots. Local scanning,
            fixtures, graph inspection, Security Lab, and exports remain fully functional.
          </p>
          <Button variant="secondary" size="sm" onClick={onClose} className="w-full">
            Back to Studio
          </Button>
        </div>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        versionLabel: versionLabel.trim() || 'v1.0.0',
        isPublic,
        nodeCount: rawGraph.nodes.length,
        edgeCount: rawGraph.edges.length,
        graphData: rawGraph,
        scanStats: scanStats || undefined,
      };

      const res = await fetch('/api/cloud/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('You must be signed in with Clerk to save projects to the cloud.');
        }
        throw new Error(data.error || 'Failed to save project.');
      }

      setSuccessMessage('Architecture snapshot saved to Neon successfully!');
      if (onSaved && data.project?.id && data.snapshot?.id) {
        onSaved(data.project.id, data.snapshot.id);
      }
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred while saving.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4 select-none">
      <div className="fixed inset-0 bg-[#070806]/80 backdrop-blur-sm" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Save Project to Cloud"
        className="relative bg-[#0d0f0c] border border-[#2a2d24] rounded-2xl shadow-2xl w-full max-w-md p-6 z-10 space-y-4 animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between border-b border-[#2a2d24] pb-3">
          <div className="flex items-center gap-2">
            <CloudUpload className="w-5 h-5 text-[#f6c945]" />
            <h2 className="text-sm font-bold text-[#f6f7f2]">Save to Stackfold Cloud</h2>
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

        {successMessage && (
          <div className="p-3 rounded-lg bg-[#62d49b]/10 border border-[#62d49b]/30 text-xs text-[#62d49b] flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-[#a5aa9b] font-medium mb-1">Project Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. My Monorepo Platform"
              className="w-full bg-[#141611] border border-[#2a2d24] rounded-lg px-3 py-2 text-[#f6f7f2] placeholder-[#74796d] focus:outline-none focus:border-[#f6c945]"
            />
          </div>

          <div>
            <label className="block text-[#a5aa9b] font-medium mb-1">Description (optional)</label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief summary of this architecture snapshot..."
              className="w-full bg-[#141611] border border-[#2a2d24] rounded-lg px-3 py-2 text-[#f6f7f2] placeholder-[#74796d] focus:outline-none focus:border-[#f6c945] resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#a5aa9b] font-medium mb-1">Version Label</label>
              <input
                type="text"
                value={versionLabel}
                onChange={e => setVersionLabel(e.target.value)}
                placeholder="v1.0.0"
                className="w-full bg-[#141611] border border-[#2a2d24] rounded-lg px-3 py-2 text-[#f6f7f2] placeholder-[#74796d] font-mono focus:outline-none focus:border-[#f6c945]"
              />
            </div>
            <div>
              <label className="block text-[#a5aa9b] font-medium mb-1">Graph Stats</label>
              <div className="w-full bg-[#141611] border border-[#2a2d24] rounded-lg px-3 py-2 text-[#a5aa9b] font-mono">
                {rawGraph.nodes.length} nodes / {rawGraph.edges.length} edges
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#2a2d24]">
            <Button variant="ghost" size="sm" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              isLoading={isLoading}
              leftIcon={<CloudUpload className="w-3.5 h-3.5" />}
            >
              Save Snapshot
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
