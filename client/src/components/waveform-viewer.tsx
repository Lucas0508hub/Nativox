import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Minus, ZoomIn, RotateCcw } from "lucide-react";

interface CutPoint {
  id: string;
  time: number; // in seconds
  position: number; // percentage 0-100
}

interface WaveformViewerProps {
  duration: number;
  segments?: Array<{
    id: number;
    startTime: number;
    endTime: number;
    confidence: number;
  }>;
  currentTime?: number;
  onCutPointAdd?: (time: number) => void;
  onCutPointRemove?: (id: string) => void;
  onCutPointMove?: (id: string, time: number) => void;
  className?: string;
}

export function WaveformViewer({ 
  duration, 
  segments = [], 
  currentTime = 0,
  onCutPointAdd,
  onCutPointRemove,
  onCutPointMove,
  className = ""
}: WaveformViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggedCutPoint, setDraggedCutPoint] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    if (!containerRef.current || !onCutPointAdd) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = (clickX / rect.width) * 100;
    const time = (percentage / 100) * duration;
    
    onCutPointAdd(time);
  };

  const handleCutPointDrag = (cutPointId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!containerRef.current || !onCutPointMove) return;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const rect = containerRef.current!.getBoundingClientRect();
      const moveX = moveEvent.clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (moveX / rect.width) * 100));
      const time = (percentage / 100) * duration;
      
      onCutPointMove(cutPointId, time);
    };
    
    const handleMouseUp = () => {
      setDraggedCutPoint(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    setDraggedCutPoint(cutPointId);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Generate cut points from segments
  const cutPoints: CutPoint[] = segments.reduce((points, segment, index) => {
    if (index > 0) { // Skip the first segment's start time
      points.push({
        id: `segment-${segment.id}`,
        time: segment.startTime,
        position: (segment.startTime / duration) * 100
      });
    }
    return points;
  }, [] as CutPoint[]);

  // Generate mock waveform data
  const waveformBars = Array.from({ length: 100 }, (_, i) => ({
    id: i,
    height: Math.random() * 60 + 10,
    position: i
  }));

  return (
    <Card className={className}>
      <CardContent className="p-6">
        {/* Controls */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setZoom(Math.min(5, zoom * 1.5))}
            >
              <ZoomIn className="w-4 h-4 mr-1" />
              Zoom In
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setZoom(Math.max(0.5, zoom / 1.5))}
            >
              <Minus className="w-4 h-4 mr-1" />
              Zoom Out
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setZoom(1)}
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Reset
            </Button>
          </div>
          
          <div className="text-sm text-gray-500">
            Clique para adicionar pontos de corte • Arraste para mover
          </div>
        </div>

        {/* Waveform Container */}
        <div 
          ref={containerRef}
          className="waveform-container relative cursor-crosshair"
          onClick={handleContainerClick}
          style={{ transform: `scaleX(${zoom})`, transformOrigin: 'left' }}
        >
          {/* Waveform Bars */}
          {waveformBars.map((bar) => (
            <div
              key={bar.id}
              className="waveform-bar"
              style={{
                left: `${bar.position}%`,
                height: `${bar.height}px`,
              }}
            />
          ))}
          
          {/* Current Position Indicator */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10 pointer-events-none"
            style={{ left: `${(currentTime / duration) * 100}%` }}
          />
          
          {/* Cut Points */}
          {cutPoints.map((cutPoint) => (
            <div
              key={cutPoint.id}
              className={`cut-point ${draggedCutPoint === cutPoint.id ? 'opacity-75' : ''}`}
              style={{ left: `${cutPoint.position}%` }}
              title={`Corte: ${formatTime(cutPoint.time)}`}
              onMouseDown={(e) => handleCutPointDrag(cutPoint.id, e)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                onCutPointRemove?.(cutPoint.id);
              }}
            />
          ))}
          
          {/* Segment Indicators */}
          {segments.map((segment, index) => (
            <div
              key={`segment-${segment.id}`}
              className="absolute top-2 h-2 bg-blue-200 opacity-60 z-5 pointer-events-none"
              style={{
                left: `${(segment.startTime / duration) * 100}%`,
                width: `${((segment.endTime - segment.startTime) / duration) * 100}%`,
              }}
              title={`Segmento ${index + 1}: ${formatTime(segment.startTime)} - ${formatTime(segment.endTime)}`}
            />
          ))}
        </div>
        
        {/* Timeline */}
        <div className="flex items-center justify-between text-sm text-gray-500 mt-4">
          <span>00:00</span>
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-primary"
              onClick={() => onCutPointAdd?.(currentTime)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Adicionar Corte
            </Button>
          </div>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Segment Statistics */}
        {segments.length > 0 && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                {segments.length} segmentos detectados
              </span>
              <span className="text-gray-600">
                Confiança média: {(segments.reduce((sum, s) => sum + s.confidence, 0) / segments.length * 100).toFixed(1)}%
              </span>
              <span className="text-gray-600">
                Zoom: {(zoom * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
