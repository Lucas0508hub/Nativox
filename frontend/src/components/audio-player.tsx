import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward,
  Volume2,
  VolumeX,
  RotateCcw
} from "lucide-react";

interface AudioPlayerProps {
  src?: string;
  duration: number;
  currentTime?: number;
  onTimeUpdate?: (time: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onSeek?: (time: number) => void;
  segments?: Array<{
    id: number;
    startTime: number;
    endTime: number;
  }>;
  currentSegment?: number;
  className?: string;
}

export function AudioPlayer({
  src,
  duration,
  currentTime = 0,
  onTimeUpdate,
  onPlay,
  onPause,
  onSeek,
  segments = [],
  currentSegment,
  className = ""
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
      onPause?.();
    } else {
      setIsPlaying(true);
      onPlay?.();
    }
  };

  const handleSeek = (value: number[]) => {
    const newTime = value[0];
    onSeek?.(newTime);
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
    }
  };

  const skipToSegment = (segmentIndex: number) => {
    if (segments[segmentIndex]) {
      onSeek?.(segments[segmentIndex].startTime);
    }
  };

  const skipBackward = () => {
    const newTime = Math.max(0, currentTime - 10);
    onSeek?.(newTime);
  };

  const skipForward = () => {
    const newTime = Math.min(duration, currentTime + 10);
    onSeek?.(newTime);
  };

  const resetToStart = () => {
    onSeek?.(0);
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Main Controls */}
          <div className="flex items-center justify-center space-x-4">
            <Button
              size="sm"
              variant="outline"
              onClick={resetToStart}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={skipBackward}
            >
              <SkipBack className="w-4 h-4" />
            </Button>
            
            <Button
              size="lg"
              onClick={handlePlayPause}
              className="w-12 h-12 rounded-full bg-orange-600 hover:bg-orange-700"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6" />
              )}
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={skipForward}
            >
              <SkipForward className="w-4 h-4" />
            </Button>

            {/* Segment Navigation */}
            {segments.length > 0 && currentSegment !== undefined && (
              <div className="flex items-center space-x-2 ml-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => skipToSegment(Math.max(0, currentSegment - 1))}
                  disabled={currentSegment === 0}
                >
                  Seg. Anterior
                </Button>
                <span className="text-sm text-gray-500">
                  {currentSegment + 1}/{segments.length}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => skipToSegment(Math.min(segments.length - 1, currentSegment + 1))}
                  disabled={currentSegment >= segments.length - 1}
                >
                  Próx. Seg.
                </Button>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Slider
              value={[currentTime]}
              max={duration}
              step={0.1}
              onValueChange={handleSeek}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-gray-500">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Volume and Playback Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleMuteToggle}
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </Button>
              <div className="w-24">
                <Slider
                  value={[isMuted ? 0 : volume]}
                  max={1}
                  step={0.01}
                  onValueChange={handleVolumeChange}
                />
              </div>
            </div>

            {/* Playback Rate */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Velocidade:</span>
              <select
                value={playbackRate}
                onChange={(e) => setPlaybackRate(Number(e.target.value))}
                className="text-sm border rounded px-2 py-1"
              >
                <option value={0.5}>0.5x</option>
                <option value={0.75}>0.75x</option>
                <option value={1}>1x</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2x</option>
              </select>
            </div>
          </div>

          {/* Current Segment Info */}
          {segments.length > 0 && currentSegment !== undefined && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  Segmento {currentSegment + 1}: {formatTime(segments[currentSegment].startTime)} - {formatTime(segments[currentSegment].endTime)}
                </span>
                <span className="text-gray-500">
                  Duração: {formatTime(segments[currentSegment].endTime - segments[currentSegment].startTime)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Hidden audio element for actual playback */}
        {src && (
          <audio
            ref={audioRef}
            src={src}
            onTimeUpdate={() => onTimeUpdate?.(audioRef.current?.currentTime || 0)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            style={{ display: 'none' }}
          />
        )}
      </CardContent>
    </Card>
  );
}
