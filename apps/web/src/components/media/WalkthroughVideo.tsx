'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Maximize2, Minimize2, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { asset } from '@/lib/demo';
import { useReducedMotion } from '@/lib/media';

interface Chapter {
  id: string;
  num: string;
  label: string;
  time: number;
  timeLabel: string;
}

// Exact scene starts from promo/src/Promo.tsx (30fps, 12-frame crossfade).
const CHAPTERS: Chapter[] = [
  { id: 'map', num: '01', label: 'Architecture map', time: 4.1, timeLabel: '0:04' },
  { id: 'impact', num: '02', label: 'Blast radius', time: 11.7, timeLabel: '0:12' },
  { id: 'queue', num: '03', label: 'Queue replay', time: 20.3, timeLabel: '0:20' },
  { id: 'probes', num: '04', label: 'Security probes', time: 30.9, timeLabel: '0:31' },
  { id: 'cli', num: '05', label: 'CI gate', time: 36.8, timeLabel: '0:37' },
];

const FALLBACK_DURATION = 49.4;

function formatTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, '0')}`;
}

interface WalkthroughVideoProps {
  compact?: boolean;
}

export function WalkthroughVideo({ compact = false }: WalkthroughVideoProps) {
  const isDesktop = process.env.NEXT_PUBLIC_STACKFOLD_DESKTOP === 'true';
  const reducedMotion = useReducedMotion();

  const frameRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const userPausedRef = useRef(false);
  const scrubbingRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(FALLBACK_DURATION);
  const [hoverTime, setHoverTime] = useState<{ label: string; pct: number } | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  // Autoplay muted and loop as visitors scroll into view; pause off-screen.
  useEffect(() => {
    const frame = frameRef.current;
    const video = videoRef.current;
    if (!frame || !video || reducedMotion || isDesktop || loadFailed) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting) {
          if (!userPausedRef.current && video.paused) {
            video.muted = true;
            setIsMuted(true);
            void video.play().catch(() => undefined);
          }
        } else if (!video.paused) {
          video.pause();
        }
      },
      { threshold: 0.35 }
    );

    observer.observe(frame);
    return () => observer.disconnect();
  }, [reducedMotion, isDesktop, loadFailed]);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(document.fullscreenElement === frameRef.current);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused || video.ended) {
      userPausedRef.current = false;
      void video.play().catch(() => undefined);
    } else {
      userPausedRef.current = true;
      video.pause();
    }
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
    if (!nextMuted && video.paused) {
      userPausedRef.current = false;
      void video.play().catch(() => undefined);
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    const frame = frameRef.current;
    const video = videoRef.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (!frame) return;
    if (document.fullscreenElement === frame) {
      void document.exitFullscreen?.();
    } else if (frame.requestFullscreen) {
      void frame.requestFullscreen().catch(() => undefined);
    } else {
      video?.webkitEnterFullscreen?.();
    }
  }, []);

  const seekTo = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    const max = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : FALLBACK_DURATION;
    const clamped = Math.min(max, Math.max(0, seconds));
    video.currentTime = clamped;
    setCurrentTime(clamped);
  }, []);

  const seekFromClientX = useCallback(
    (clientX: number) => {
      const bar = progressRef.current;
      if (!bar) return;
      const rect = bar.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / Math.max(1, rect.width)));
      seekTo(ratio * duration);
    },
    [duration, seekTo]
  );

  if (isDesktop || loadFailed) return null;

  const progressPct = Math.min(100, Math.max(0, (currentTime / Math.max(1, duration)) * 100));
  let activeChapterIdx = -1;
  for (let i = 0; i < CHAPTERS.length; i++) {
    if (currentTime + 0.15 >= CHAPTERS[i]!.time) activeChapterIdx = i;
  }

  return (
    <section
      id={compact ? 'walkthrough-inline' : 'walkthrough'}
      className={compact ? 'w-full max-w-4xl mx-auto pt-4 space-y-4 text-left scroll-mt-6' : 'space-y-6 scroll-mt-24'}
      aria-label="Stackfold 50-second product walkthrough"
    >
      <div className={compact ? 'flex flex-col sm:flex-row sm:items-end justify-between gap-2' : 'text-center space-y-2'}>
        <div>
          {compact && (
            <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-[#f6c945] mb-1">
              Live 50-second tour
            </p>
          )}
          <h2 className={compact ? 'text-xl sm:text-2xl font-bold text-[#f6f7f2] tracking-tight' : 'text-2xl sm:text-3xl font-bold text-[#f6f7f2]'}>
            See it in 50 seconds
          </h2>
        </div>
        <p className={compact ? 'text-xs text-[#a5aa9b] max-w-md' : 'text-xs sm:text-sm text-[#a5aa9b] max-w-2xl mx-auto'}>
          Map a repo, trace blast radius, replay queue payloads against a new worker, and gate it in CI. Every frame is the real app.
        </p>
      </div>

      <div
        ref={frameRef}
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.target as HTMLElement).tagName === 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) return;
          if (e.key === ' ' || e.key.toLowerCase() === 'k') {
            e.preventDefault();
            togglePlay();
          } else if (e.key.toLowerCase() === 'm') {
            e.preventDefault();
            toggleMute();
          } else if (e.key.toLowerCase() === 'f') {
            e.preventDefault();
            toggleFullscreen();
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            seekTo(currentTime - 5);
          } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            seekTo(currentTime + 5);
          }
        }}
        className="max-w-5xl mx-auto rounded-2xl overflow-hidden border border-[#2f3428] bg-[#0a0c09] shadow-[0_24px_80px_rgba(0,0,0,0.65),0_0_0_1px_rgba(246,201,69,0.08)] focus-visible:outline-2 focus-visible:outline-[#f6c945]"
      >
        {/* Top showcase chrome */}
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-[#0f120d] border-b border-[#25291f] text-[10px] font-mono tracking-wider text-[#a5aa9b]">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex items-center gap-1.5 shrink-0" aria-hidden="true">
              <span className="w-2 h-2 rounded-full bg-[#ff6b6b]/80" />
              <span className="w-2 h-2 rounded-full bg-[#f6c945]/80" />
              <span className="w-2 h-2 rounded-full bg-[#62d49b]/80" />
            </span>
            <Image
              src={asset('/logo.png')}
              alt=""
              width={18}
              height={18}
              className="w-4 h-4 rounded shrink-0 border border-[#f6c945]/30"
            />
            <span className="truncate text-[#d9ddd0]">STACKFOLD · ARCHITECTURE &amp; SEAM VERIFICATION</span>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border ${
                isPlaying
                  ? 'border-[#f6c945]/40 bg-[#f6c945]/10 text-[#f6c945]'
                  : 'border-[#2a2d24] bg-[#141611] text-[#8d9283]'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isPlaying ? 'bg-[#f6c945] animate-pulse' : 'bg-[#6b7062]'
                }`}
              />
              <span>{!isPlaying ? 'PAUSED' : isMuted ? 'AUTOPLAY · MUTED' : 'SOUND ON'}</span>
            </span>
            <span className="hidden sm:inline text-[#74796d]">00:50</span>
          </div>
        </div>

        {/* Video stage */}
        <div
          className="relative bg-[#070806] cursor-pointer group"
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('button')) return;
            togglePlay();
          }}
        >
          <video
            ref={videoRef}
            muted
            loop
            playsInline
            preload="metadata"
            poster={asset('/demo-data/media/stackfold-poster.png')}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onVolumeChange={(e) => setIsMuted(e.currentTarget.muted)}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => {
              const d = e.currentTarget.duration;
              if (Number.isFinite(d) && d > 0) setDuration(d);
            }}
            onError={() => setLoadFailed(true)}
            className="block w-full aspect-video bg-[#070806]"
            aria-label="Stackfold product walkthrough"
          >
            <source src={asset('/demo-data/media/stackfold-walkthrough.mp4')} type="video/mp4" />
            Your browser does not support embedded video.
          </video>

          {/* Floating sound CTA pill */}
          <button
            type="button"
            onClick={toggleMute}
            aria-label={isMuted ? 'Unmute walkthrough video' : 'Mute walkthrough video'}
            className={`absolute top-3.5 right-3.5 z-10 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-mono backdrop-blur-md transition-all ${
              isMuted
                ? 'bg-[#0d0f0c]/85 border-[#f6c945]/45 text-[#f6f7f2] hover:border-[#f6c945] hover:bg-[#141611]'
                : 'bg-[#f6c945] border-[#f6c945] text-[#070806] font-semibold'
            }`}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-[#f6c945]" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span>{isMuted ? 'Muted · click for sound' : 'Sound on'}</span>
          </button>

          {/* Center play button when paused */}
          {!isPlaying && (
            <button
              type="button"
              onClick={togglePlay}
              aria-label="Play walkthrough video"
              className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-[#0d0f0c]/90 border border-[#f6c945]/50 text-[#f6c945] grid place-items-center shadow-2xl hover:scale-105 hover:bg-[#141611] transition-transform"
            >
              <Play className="w-6 h-6 fill-current ml-0.5" />
            </button>
          )}
        </div>

        {/* Custom control bar */}
        <div className="flex items-center gap-3 px-3.5 py-2.5 bg-[#0f120d] border-t border-[#25291f]">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause walkthrough' : 'Play walkthrough'}
            className="w-8 h-8 rounded-lg border border-[#2a2d24] bg-[#141611] hover:border-[#f6c945]/50 hover:text-[#f6c945] text-[#f6f7f2] grid place-items-center shrink-0 transition-colors"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
          </button>

          <div
            ref={progressRef}
            role="slider"
            tabIndex={0}
            aria-label="Seek walkthrough video"
            aria-valuemin={0}
            aria-valuemax={Math.round(duration)}
            aria-valuenow={Math.round(currentTime)}
            onPointerDown={(e) => {
              scrubbingRef.current = true;
              e.currentTarget.setPointerCapture?.(e.pointerId);
              seekFromClientX(e.clientX);
            }}
            onPointerMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / Math.max(1, rect.width)));
              setHoverTime({ label: formatTime(ratio * duration), pct: ratio * 100 });
              if (scrubbingRef.current) seekFromClientX(e.clientX);
            }}
            onPointerLeave={() => setHoverTime(null)}
            onPointerUp={() => {
              scrubbingRef.current = false;
            }}
            onPointerCancel={() => {
              scrubbingRef.current = false;
            }}
            className="relative flex-1 py-2.5 cursor-pointer touch-none group/bar"
          >
            <div className="h-1.5 rounded-full bg-[#24281e] overflow-hidden">
              <div
                className="h-full bg-[#f6c945] transition-[width] duration-75"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {hoverTime && (
              <span
                className="absolute -top-6 -translate-x-1/2 px-1.5 py-0.5 rounded bg-[#141611] border border-[#2a2d24] text-[10px] font-mono text-[#f6f7f2] pointer-events-none"
                style={{ left: `${hoverTime.pct}%` }}
              >
                {hoverTime.label}
              </span>
            )}
          </div>

          <span className="font-mono text-[11px] text-[#a5aa9b] tabular-nums shrink-0">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <button
            type="button"
            onClick={toggleMute}
            aria-label={isMuted ? 'Unmute walkthrough' : 'Mute walkthrough'}
            className="w-8 h-8 rounded-lg border border-[#2a2d24] bg-[#141611] hover:border-[#f6c945]/50 hover:text-[#f6c945] text-[#f6f7f2] grid place-items-center shrink-0 transition-colors"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-[#f6c945]" />}
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            className="w-8 h-8 rounded-lg border border-[#2a2d24] bg-[#141611] hover:border-[#f6c945]/50 hover:text-[#f6c945] text-[#f6f7f2] grid place-items-center shrink-0 transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Clickable scene chapters */}
        <div className="grid grid-cols-2 sm:grid-cols-5 border-t border-[#25291f] bg-[#0c0e0a]">
          {CHAPTERS.map((ch, idx) => {
            const active = idx === activeChapterIdx;
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => {
                  seekTo(ch.time);
                  userPausedRef.current = false;
                  void videoRef.current?.play().catch(() => undefined);
                }}
                className={`flex items-center gap-2 px-3 py-2.5 text-[11px] font-mono text-left border-b sm:border-b-0 sm:border-r last:border-r-0 border-[#20241b] transition-colors ${
                  active
                    ? 'bg-[#171a12] text-[#f6f7f2] shadow-[inset_0_2px_0_#f6c945]'
                    : 'text-[#8d9283] hover:bg-[#131610] hover:text-[#d9ddd0]'
                }`}
              >
                <span className={active ? 'text-[#f6c945] font-bold' : 'text-[#6c7063]'}>{ch.num}</span>
                <span className="truncate">{ch.label}</span>
                <span className="ml-auto text-[10px] text-[#6c7063]">{ch.timeLabel}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
