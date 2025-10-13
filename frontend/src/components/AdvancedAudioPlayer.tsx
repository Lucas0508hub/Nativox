import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  RotateCcw,
  RotateCw,
  Maximize2,
  Settings
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

interface AdvancedAudioPlayerProps {
  src: string;
  title?: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  className?: string;
}

export default function AdvancedAudioPlayer({
  src,
  title,
  onTimeUpdate,
  onPlay,
  onPause,
  onEnded,
  className = ""
}: AdvancedAudioPlayerProps) {
  const { t } = useLanguage();
  const displayTitle = title || t('audioSegment');
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Format time helper
  const formatTime = (time: number): string => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Update time display
  const updateTime = useCallback(() => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const total = audioRef.current.duration;
      
      if (!isDragging) {
        setCurrentTime(current);
      }
      setDuration(total || 0);
      
      onTimeUpdate?.(current, total || 0);
    }
  }, [isDragging, onTimeUpdate]);

  // Handle play/pause
  const togglePlayPause = useCallback(async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        onPause?.();
      } else {
        setIsLoading(true);
        await audioRef.current.play();
        setIsPlaying(true);
        onPlay?.();
      }
    } catch (error) {
      console.error('Error playing audio:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isPlaying, onPlay, onPause]);

  // Handle seek
  const handleSeek = useCallback((newTime: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  }, []);

  // Handle volume change
  const handleVolumeChange = useCallback((newVolume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  }, []);

  // Handle mute toggle
  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume;
        setIsMuted(false);
      } else {
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  }, [isMuted, volume]);

  // Skip functions
  const skipBackward = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, currentTime - 10);
    }
  }, [currentTime]);

  const skipForward = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(duration, currentTime + 10);
    }
  }, [currentTime, duration]);

  // Playback rate change
  const handlePlaybackRateChange = useCallback((rate: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
  }, []);

  // Progress bar click handler
  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    handleSeek(newTime);
  }, [duration, handleSeek]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // Don't interfere with text input
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skipBackward();
          break;
        case 'ArrowRight':
          e.preventDefault();
          skipForward();
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
        case 'Digit1':
          e.preventDefault();
          handlePlaybackRateChange(0.5);
          break;
        case 'Digit2':
          e.preventDefault();
          handlePlaybackRateChange(1);
          break;
        case 'Digit3':
          e.preventDefault();
          handlePlaybackRateChange(1.25);
          break;
        case 'Digit4':
          e.preventDefault();
          handlePlaybackRateChange(1.5);
          break;
        case 'Digit5':
          e.preventDefault();
          handlePlaybackRateChange(2);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [togglePlayPause, skipBackward, skipForward, toggleMute, handlePlaybackRateChange]);

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      updateTime();
    };

    const handleEnded = () => {
      setIsPlaying(false);
      onEnded?.();
    };

    const handleError = () => {
      setIsLoading(false);
      console.error('Audio loading error');
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [updateTime, onEnded]);

  // Update audio source when src changes
  useEffect(() => {
    if (audioRef.current && src) {
      audioRef.current.load();
    }
  }, [src]);

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`bg-white rounded-lg shadow-lg border border-gray-200 p-4 md:p-6 ${className}`}>
      {/* Audio element */}
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        className="hidden"
      />

      {/* Title */}
      <div className="mb-4">
        <h3 className="text-base md:text-lg font-semibold text-gray-900 truncate" title={displayTitle}>
          {displayTitle}
        </h3>
        <div className="text-sm text-gray-500 mt-1">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div
          className="w-full h-2 bg-gray-200 rounded-full cursor-pointer hover:h-3 transition-all duration-200"
          onClick={handleProgressClick}
        >
          <div
            className="h-full bg-orange-600 rounded-full transition-all duration-100 relative"
            style={{ width: `${progressPercentage}%` }}
          >
            <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-orange-600 rounded-full shadow-md opacity-0 hover:opacity-100 transition-opacity duration-200" />
          </div>
        </div>
      </div>

      {/* Main Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 space-y-3 md:space-y-0">
        {/* Left Controls */}
        <div className="flex items-center justify-center md:justify-start space-x-2">
          <button
            onClick={skipBackward}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
            title="Skip backward 10s (←)"
          >
            <RotateCcw className="w-5 h-5 text-gray-600" />
          </button>
          
          <button
            onClick={togglePlayPause}
            disabled={isLoading}
            className="p-3 rounded-full bg-orange-600 hover:bg-orange-700 text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title={isPlaying ? "Pause (Space)" : "Play (Space)"}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </button>
          
          <button
            onClick={skipForward}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
            title="Skip forward 10s (→)"
          >
            <RotateCw className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Center - Time Display */}
        <div className="text-sm text-gray-600 font-mono text-center md:text-left">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>

        {/* Right Controls */}
        <div className="flex items-center justify-center md:justify-end space-x-2">
          <button
            onClick={toggleMute}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
            title={isMuted ? "Unmute (M)" : "Mute (M)"}
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5 text-gray-600" />
            ) : (
              <Volume2 className="w-5 h-5 text-gray-600" />
            )}
          </button>
          
          <div className="w-16 md:w-20">
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
          
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
            title="Settings"
          >
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Playback Speed:</span>
            <div className="flex space-x-2">
              {[0.5, 1, 1.25, 1.5, 2].map((rate) => (
                <button
                  key={rate}
                  onClick={() => handlePlaybackRateChange(rate)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors duration-200 ${
                    playbackRate === rate
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title={`${rate}x speed (${rate === 0.5 ? '1' : rate === 1 ? '2' : rate === 1.25 ? '3' : rate === 1.5 ? '4' : '5'})`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>
          
          <div className="mt-3 text-xs text-gray-500">
            <div>Keyboard Shortcuts:</div>
            <div className="mt-1 space-y-1">
              <div>Space: Play/Pause</div>
              <div>←/→: Skip 10s</div>
              <div>M: Mute/Unmute</div>
              <div>1-5: Change speed (0.5x, 1x, 1.25x, 1.5x, 2x)</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
