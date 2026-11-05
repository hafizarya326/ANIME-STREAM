"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  Server,
  Settings,
  AlertCircle,
  ExternalLink,
  Loader2,
  Check,
} from "lucide-react";
import { getServerStream, type EpisodeQualityServer, type Source } from "../lib/api";

interface VideoPlayerProps {
  streamUrl: string | null;
  directUrl?: string | null;
  format?: "mp4" | "hls" | "embed" | "unknown";
  title?: string;
  source?: Source;
  servers?: EpisodeQualityServer[];
  onServerChange?: (serverId: string, quality: string) => void;
}

export function VideoPlayer({
  streamUrl,
  directUrl,
  format = "unknown",
  title = "Video Player",
  source = "otakudesu",
  servers = [],
}: VideoPlayerProps) {
  // Determine initial mode: prefer direct if available, else embed
  const initialMode = directUrl ? "direct" : streamUrl ? "embed" : "none";
  const [playerMode, setPlayerMode] = useState<"direct" | "embed" | "none">(initialMode);

  // Video playback states
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [activeDirectUrl, setActiveDirectUrl] = useState<string | null>(directUrl ?? null);
  const [activeEmbedUrl, setActiveEmbedUrl] = useState<string | null>(streamUrl ?? null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [bufferedPercent, setBufferedPercent] = useState(0);

  // Server selection states
  const [activeServerId, setActiveServerId] = useState<string | null>(null);
  const [isSwitchingServer, setIsSwitchingServer] = useState(false);
  const [showServerMenu, setShowServerMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  // Sync state when props change
  useEffect(() => {
    setActiveDirectUrl(directUrl ?? null);
    setActiveEmbedUrl(streamUrl ?? null);
    setPlayerError(null);
    if (directUrl) {
      setPlayerMode("direct");
    } else if (streamUrl) {
      setPlayerMode("embed");
    } else {
      setPlayerMode("none");
    }
  }, [directUrl, streamUrl]);

  // Format time (seconds to mm:ss or hh:mm:ss)
  const formatTime = (secs: number) => {
    if (!Number.isFinite(secs) || secs < 0) return "00:00";
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    const mm = m < 10 ? `0${m}` : `${m}`;
    const ss = s < 10 ? `0${s}` : `${s}`;
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  };

  // Initialize or re-attach video playback
  const initPlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video || !activeDirectUrl) return;

    setIsLoading(true);
    setPlayerError(null);

    // Destroy existing HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHls = activeDirectUrl.includes(".m3u8");

    if (isHls) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        });
        hls.loadSource(activeDirectUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false);
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                hls.destroy();
                setPlayerError("Gagal memuat HLS stream. Silakan beralih ke Embed Player atau ganti server.");
                break;
            }
          }
        });
        hlsRef.current = hls;
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Native Safari HLS
        video.src = activeDirectUrl;
      }
    } else {
      // Standard Direct MP4
      video.src = activeDirectUrl;
      video.load();
    }
  }, [activeDirectUrl]);

  useEffect(() => {
    if (playerMode === "direct" && activeDirectUrl) {
      initPlayback();
    }
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [playerMode, activeDirectUrl, initPlayback]);

  // Video event handlers
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsLoading(false);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      if (videoRef.current.buffered.length > 0 && videoRef.current.duration > 0) {
        const bufferedEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
        setBufferedPercent((bufferedEnd / videoRef.current.duration) * 100);
      }
    }
  };

  const handleVideoError = () => {
    setIsLoading(false);
    setIsPlaying(false);
    setPlayerError(
      "Gagal memutar video secara langsung (kebijakan CORS / link kedaluwarsa). Silakan klik 'Beralih ke Embed Player' untuk menonton secara normal."
    );
  };

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {
        setIsPlaying(false);
      });
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, []);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = Number(e.target.value);
    setCurrentTime(targetTime);
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
  };

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      const nextMuted = !isMuted;
      setIsMuted(nextMuted);
      videoRef.current.muted = nextMuted;
      if (!nextMuted && volume === 0) {
        setVolume(0.5);
        videoRef.current.volume = 0.5;
      }
    }
  }, [isMuted, volume]);

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setShowSettingsMenu(false);
  };

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere with form typing
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === " " || e.key === "k") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (videoRef.current) videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (videoRef.current) videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 5);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setVolume((v) => {
          const nv = Math.min(1, v + 0.1);
          if (videoRef.current) videoRef.current.volume = nv;
          return nv;
        });
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setVolume((v) => {
          const nv = Math.max(0, v - 0.1);
          if (videoRef.current) videoRef.current.volume = nv;
          return nv;
        });
      } else if (e.key === "f") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === "m") {
        e.preventDefault();
        toggleMute();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [duration, toggleFullscreen, toggleMute, togglePlay]);

  // Switch mirror server via BFF
  const handleSelectServer = async (serverId: string) => {
    try {
      setIsSwitchingServer(true);
      setActiveServerId(serverId);
      setShowServerMenu(false);
      setPlayerError(null);

      const res = await getServerStream(source, serverId);
      if (res.data?.url) {
        setActiveEmbedUrl(res.data.url);
        if (res.data.directUrl) {
          setActiveDirectUrl(res.data.directUrl);
          setPlayerMode("direct");
        } else {
          setActiveDirectUrl(null);
          setPlayerMode("embed");
        }
      } else {
        setPlayerError("Server yang dipilih tidak menyediakan link video yang valid. Coba server lain.");
      }
    } catch {
      setPlayerError("Gagal menghubungkan ke server mirror. Coba server lain.");
    } finally {
      setIsSwitchingServer(false);
    }
  };

  const handleRetry = () => {
    setPlayerError(null);
    if (playerMode === "direct") {
      initPlayback();
    } else {
      const current = activeEmbedUrl;
      setActiveEmbedUrl(null);
      setTimeout(() => setActiveEmbedUrl(current), 100);
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Theater Container with Neo-Brutalist styling */}
      <div
        ref={containerRef}
        className="group relative aspect-video w-full overflow-hidden rounded-3xl border-3 border-black bg-black shadow-brutal-xl select-none"
      >
        {/* DIRECT MP4 / HLS MODE */}
        {playerMode === "direct" && activeDirectUrl && !playerError && (
          <div className="relative h-full w-full">
            <video
              ref={videoRef}
              className="h-full w-full object-contain cursor-pointer"
              playsInline
              onClick={togglePlay}
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              onWaiting={() => setIsLoading(true)}
              onPlaying={() => {
                setIsLoading(false);
                setIsPlaying(true);
              }}
              onPause={() => setIsPlaying(false)}
              onError={handleVideoError}
            />

            {/* Centered Play Button when Paused */}
            {!isPlaying && !isLoading && (
              <div
                onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
              >
                <div className="grid h-20 w-20 place-items-center rounded-2xl border-3 border-black bg-brand-yellow text-black shadow-brutal-lg transition-transform hover:scale-110 active:scale-95">
                  <Play className="h-10 w-10 fill-black ml-1" />
                </div>
              </div>
            )}

            {/* Loading Spinner */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-none">
                <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-black bg-card px-4 py-3 shadow-brutal">
                  <Loader2 className="h-8 w-8 animate-spin text-brand-yellow" />
                  <span className="text-xs font-black uppercase tracking-wider text-white">
                    Memuat Aliran Video...
                  </span>
                </div>
              </div>
            )}

            {/* Custom Bottom Controls Bar */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100">
              {/* Progress Scrubber */}
              <div className="relative mb-3 flex items-center">
                {/* Buffered bar */}
                <div
                  className="absolute h-1.5 rounded-full bg-slate-700 pointer-events-none"
                  style={{ width: `${bufferedPercent}%` }}
                />
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  className="relative z-10 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-800/80 accent-brand-yellow outline-none"
                />
              </div>

              {/* Controls Row */}
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                  {/* Play/Pause */}
                  <button
                    onClick={togglePlay}
                    className="grid h-9 w-9 place-items-center rounded-lg border-2 border-black bg-brand-yellow text-black shadow-[2px_2px_0px_0px_#000] hover:bg-brand-yellowHover active:translate-x-0.5 active:translate-y-0.5"
                    title={isPlaying ? "Pause (Space)" : "Play (Space)"}
                  >
                    {isPlaying ? <Pause className="h-4 w-4 fill-black" /> : <Play className="h-4 w-4 fill-black ml-0.5" />}
                  </button>

                  {/* Volume Controls */}
                  <div className="flex items-center gap-2 group/volume">
                    <button
                      onClick={toggleMute}
                      className="p-1.5 text-slate-300 hover:text-white"
                      title={isMuted ? "Unmute (M)" : "Mute (M)"}
                    >
                      {isMuted || volume === 0 ? <VolumeX className="h-5 w-5 text-brand-coral" /> : <Volume2 className="h-5 w-5" />}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="h-1 w-16 cursor-pointer appearance-none rounded-full bg-slate-700 accent-brand-yellow"
                    />
                  </div>

                  {/* Time indicator */}
                  <div className="text-xs font-mono font-bold text-slate-300">
                    <span className="text-brand-yellow">{formatTime(currentTime)}</span>
                    <span className="mx-1 text-slate-500">/</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  {/* Speed Setting */}
                  <div className="relative">
                    <button
                      onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                      className="rounded-lg border-2 border-black bg-card px-2.5 py-1 text-xs font-black uppercase text-brand-cyan shadow-[2px_2px_0px_0px_#000] hover:text-white"
                    >
                      {playbackSpeed}x
                    </button>
                    {showSettingsMenu && (
                      <div className="absolute bottom-10 right-0 z-50 flex flex-col gap-1 rounded-xl border-2 border-black bg-card p-2 shadow-brutal w-28">
                        <span className="px-2 py-1 text-[10px] font-black uppercase text-slate-400">
                          Kecepatan
                        </span>
                        {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
                          <button
                            key={s}
                            onClick={() => handleSpeedChange(s)}
                            className={`flex items-center justify-between rounded-lg px-2 py-1 text-xs font-bold ${
                              playbackSpeed === s
                                ? "bg-brand-yellow text-black font-black"
                                : "text-slate-300 hover:bg-slate-800"
                            }`}
                          >
                            <span>{s}x</span>
                            {playbackSpeed === s && <Check className="h-3 w-3" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Fullscreen */}
                  <button
                    onClick={toggleFullscreen}
                    className="p-1.5 text-slate-300 hover:text-white"
                    title="Layar Penuh (F)"
                  >
                    {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* EMBED IFRAME MODE */}
        {playerMode === "embed" && activeEmbedUrl && !playerError && (
          <iframe
            src={activeEmbedUrl}
            title={title}
            className="h-full w-full border-0"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            sandbox="allow-same-origin allow-scripts allow-forms allow-presentation"
          />
        )}

        {/* ERROR OVERLAY */}
        {playerError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/95 p-6 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl border-2 border-black bg-brand-coral text-white shadow-brutal mb-4">
              <AlertCircle className="h-7 w-7" />
            </div>
            <h4 className="text-base font-black uppercase text-white sm:text-lg">
              Video Tidak Dapat Diputar Langsung
            </h4>
            <p className="mt-1 max-w-md text-xs font-medium text-slate-300 leading-relaxed">
              {playerError}
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {activeEmbedUrl && playerMode === "direct" && (
                <button
                  onClick={() => {
                    setPlayerError(null);
                    setPlayerMode("embed");
                  }}
                  className="btn-brutal inline-flex items-center gap-2 rounded-xl bg-brand-yellow px-4 py-2.5 text-xs font-black uppercase text-black"
                >
                  <Play className="h-3.5 w-3.5 fill-black" />
                  Beralih ke Embed Player
                </button>
              )}

              <button
                onClick={handleRetry}
                className="btn-brutal inline-flex items-center gap-2 rounded-xl bg-card border-black px-4 py-2.5 text-xs font-black uppercase text-white hover:text-brand-yellow"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Coba Ulang
              </button>

              {servers.length > 0 && (
                <button
                  onClick={() => setShowServerMenu(true)}
                  className="btn-brutal inline-flex items-center gap-2 rounded-xl bg-brand-cyan border-black px-4 py-2.5 text-xs font-black uppercase text-black"
                >
                  <Server className="h-3.5 w-3.5" />
                  Ganti Server Lain
                </button>
              )}
            </div>
          </div>
        )}

        {/* NO STREAM AVAILABLE */}
        {playerMode === "none" && !playerError && (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-card to-black p-6 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-xl border-2 border-black bg-brand-yellow text-black shadow-brutal mb-3">
              <Server className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-black uppercase text-white sm:text-base">
              Aliran Streaming Belum Tersedia
            </h4>
            <p className="mt-1 max-w-sm text-xs text-slate-400">
              Gunakan opsi download link di bawah untuk mengunduh episode ini.
            </p>
          </div>
        )}
      </div>

      {/* Control Actions & Server Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-black bg-card p-3 shadow-brutal sm:p-4">
        {/* Mode Indicator & Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
            Player Mode:
          </span>
          <span
            className={`rounded-md border-2 border-black px-2 py-0.5 text-xs font-black uppercase ${
              playerMode === "direct"
                ? "bg-brand-mint text-black shadow-[2px_2px_0px_0px_#000]"
                : "bg-brand-purple text-white shadow-[2px_2px_0px_0px_#000]"
            }`}
          >
            {playerMode === "direct" ? "HTML5 Direct Stream" : "Embed Player"}
          </span>

          {activeEmbedUrl && activeDirectUrl && (
            <button
              onClick={() => {
                setPlayerError(null);
                setPlayerMode(playerMode === "direct" ? "embed" : "direct");
              }}
              className="rounded-lg border border-card-border bg-[#0e121d] px-2.5 py-1 text-xs font-bold text-slate-300 hover:border-slate-500 hover:text-white transition-colors"
            >
              Ganti ke {playerMode === "direct" ? "Embed Player" : "Direct Player"}
            </button>
          )}

          <button
            onClick={handleRetry}
            className="rounded-lg border border-card-border bg-[#0e121d] p-1.5 text-slate-300 hover:text-brand-yellow transition-colors"
            title="Reload Video"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Server Selector Dropdown/Button */}
        {servers.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowServerMenu(!showServerMenu)}
              disabled={isSwitchingServer}
              className="btn-brutal inline-flex items-center gap-2 rounded-xl bg-brand-yellow px-3.5 py-2 text-xs font-black uppercase text-black"
            >
              {isSwitchingServer ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Server className="h-3.5 w-3.5" />
              )}
              <span>Pilih Server / Mirror ({servers.length})</span>
            </button>

            {/* Server Dropdown Drawer */}
            {showServerMenu && (
              <div className="absolute right-0 bottom-12 z-50 w-72 sm:w-80 rounded-2xl border-2 border-black bg-card p-4 shadow-brutal-lg max-h-96 overflow-y-auto">
                <div className="flex items-center justify-between border-b border-card-border pb-2.5 mb-3">
                  <h5 className="text-xs font-black uppercase tracking-wider text-white">
                    Pilih Server Mirror
                  </h5>
                  <button
                    onClick={() => setShowServerMenu(false)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Tutup
                  </button>
                </div>

                <div className="space-y-3">
                  {servers.map((q) => (
                    <div key={q.quality} className="space-y-1.5">
                      <span className="text-[10px] font-black uppercase tracking-widest text-brand-cyan">
                        {q.quality}
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {q.serverList.map((srv) => {
                          const isCurrent = activeServerId === srv.serverId;
                          return (
                            <button
                              key={srv.serverId}
                              onClick={() => handleSelectServer(srv.serverId)}
                              className={`rounded-lg border-2 px-2 py-1.5 text-xs font-bold transition-all text-left truncate ${
                                isCurrent
                                  ? "border-black bg-brand-yellow text-black font-black shadow-[2px_2px_0px_0px_#000]"
                                  : "border-card-border bg-[#0e121d] text-slate-300 hover:border-slate-500 hover:text-white"
                              }`}
                            >
                              {srv.title}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
