import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  ZoomIn,
  ZoomOut,
  Scissors,
  Trash2,
  Save,
  RotateCcw,
  Settings,
  Move,
  MousePointer,
  Hand,
  Target
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Segment {
  id: number;
  startTime: number;
  endTime: number;
  transcription?: string;
  isTranscribed: boolean;
  isApproved?: boolean;
}

interface AdvancedSegmentEditorProps {
  segments: Segment[];
  audioRef: React.RefObject<HTMLAudioElement>;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  onSegmentUpdate: (segmentId: number, updates: Partial<Segment>) => void;
  onSegmentCreate: (startTime: number, endTime?: number) => void;
  onSegmentDelete: (segmentId: number) => void;
  onPlaySegment: (segment: Segment) => void;
  onSeek: (time: number) => void;
  onTogglePlay: () => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
}

type EditMode = 'select' | 'cut' | 'move' | 'zoom';

export default function AdvancedSegmentEditor({
  segments,
  audioRef,
  currentTime,
  duration,
  isPlaying,
  volume,
  isMuted,
  onSegmentUpdate,
  onSegmentCreate,
  onSegmentDelete,
  onPlaySegment,
  onSeek,
  onTogglePlay,
  onVolumeChange,
  onToggleMute
}: AdvancedSegmentEditorProps) {
  const { toast } = useToast();
  const timelineRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [editMode, setEditMode] = useState<EditMode>('select');
  const [selectedSegmentId, setSelectedSegmentId] = useState<number | null>(null);
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    segmentId: number | null;
    dragType: 'move' | 'resize-start' | 'resize-end' | null;
    startX: number;
    startTime: number;
  }>({
    isDragging: false,
    segmentId: null,
    dragType: null,
    startX: 0,
    startTime: 0
  });
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState(1); // seconds
  const [showTimecodes, setShowTimecodes] = useState(true);
  const [precisionMode, setPrecisionMode] = useState(false);

  // Constants for timeline rendering
  const TIMELINE_HEIGHT = 120;
  const WAVEFORM_HEIGHT = 60;
  const SEGMENT_HEIGHT = 40;
  const HANDLE_WIDTH = 8;

  const formatTime = (seconds: number, precise = false) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (precise) {
      return `${mins.toString().padStart(2, '0')}:${secs.toFixed(3).padStart(6, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${Math.floor(secs).toString().padStart(2, '0')}`;
  };

  const snapToGridValue = useCallback((time: number) => {
    if (!snapToGrid) return time;
    return Math.round(time / gridSize) * gridSize;
  }, [snapToGrid, gridSize]);

  const getTimeFromPosition = useCallback((x: number) => {
    if (!timelineRef.current) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    const relativeX = (x - rect.left + scrollPosition) / zoomLevel;
    const percentage = relativeX / rect.width;
    return Math.max(0, Math.min(duration, percentage * duration));
  }, [scrollPosition, zoomLevel, duration]);

  const getPositionFromTime = useCallback((time: number) => {
    if (!timelineRef.current) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    const percentage = time / duration;
    return (percentage * rect.width * zoomLevel) - scrollPosition;
  }, [scrollPosition, zoomLevel, duration]);

  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (editMode === 'zoom') return;
    
    const clickTime = getTimeFromPosition(e.clientX);
    const snappedTime = snapToGridValue(clickTime);
    
    if (editMode === 'cut') {
      // Create a new segment at click position
      const existingSegment = segments.find(s => 
        snappedTime >= s.startTime && snappedTime <= s.endTime
      );
      
      if (existingSegment) {
        // Split existing segment
        onSegmentUpdate(existingSegment.id, { endTime: snappedTime });
        onSegmentCreate(snappedTime, existingSegment.endTime);
        toast({
          title: "Segmento dividido",
          description: `Novo corte criado em ${formatTime(snappedTime)}`,
        });
      } else {
        // Create new segment
        const nextTime = snappedTime + gridSize;
        onSegmentCreate(snappedTime, Math.min(nextTime, duration));
        toast({
          title: "Novo segmento",
          description: `Segmento criado: ${formatTime(snappedTime)} - ${formatTime(Math.min(nextTime, duration))}`,
        });
      }
    } else if (editMode === 'select') {
      // Seek to position
      onSeek(snappedTime);
    }
  }, [editMode, getTimeFromPosition, snapToGridValue, segments, onSegmentUpdate, onSegmentCreate, onSeek, duration, gridSize, toast]);

  const handleSegmentMouseDown = useCallback((e: React.MouseEvent, segment: Segment, dragType: 'move' | 'resize-start' | 'resize-end') => {
    if (editMode !== 'move' && editMode !== 'select') return;
    
    e.stopPropagation();
    setSelectedSegmentId(segment.id);
    setDragState({
      isDragging: true,
      segmentId: segment.id,
      dragType,
      startX: e.clientX,
      startTime: dragType === 'resize-end' ? segment.endTime : segment.startTime
    });
  }, [editMode]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState.isDragging || !dragState.segmentId) return;
    
    const deltaX = e.clientX - dragState.startX;
    const deltaTime = (deltaX / zoomLevel) * (duration / (timelineRef.current?.getBoundingClientRect().width || 1));
    const newTime = snapToGridValue(dragState.startTime + deltaTime);
    
    const segment = segments.find(s => s.id === dragState.segmentId);
    if (!segment) return;
    
    let updates: Partial<Segment> = {};
    
    if (dragState.dragType === 'move') {
      const segmentDuration = segment.endTime - segment.startTime;
      const newStartTime = Math.max(0, Math.min(duration - segmentDuration, newTime));
      const newEndTime = newStartTime + segmentDuration;
      updates = { startTime: newStartTime, endTime: newEndTime };
    } else if (dragState.dragType === 'resize-start') {
      const newStartTime = Math.max(0, Math.min(segment.endTime - 0.1, newTime));
      updates = { startTime: newStartTime };
    } else if (dragState.dragType === 'resize-end') {
      const newEndTime = Math.max(segment.startTime + 0.1, Math.min(duration, newTime));
      updates = { endTime: newEndTime };
    }
    
    onSegmentUpdate(dragState.segmentId, updates);
  }, [dragState, zoomLevel, duration, snapToGridValue, segments, onSegmentUpdate]);

  const handleMouseUp = useCallback(() => {
    if (dragState.isDragging) {
      setDragState({
        isDragging: false,
        segmentId: null,
        dragType: null,
        startX: 0,
        startTime: 0
      });
      
      toast({
        title: "Segmento atualizado",
        description: "Alterações salvas automaticamente",
      });
    }
  }, [dragState, toast]);

  useEffect(() => {
    if (dragState.isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState.isDragging, handleMouseMove, handleMouseUp]);

  const renderTimeline = () => {
    const timeMarkers = [];
    const markerInterval = Math.max(1, Math.floor(10 / zoomLevel));
    
    for (let i = 0; i <= duration; i += markerInterval) {
      const position = getPositionFromTime(i);
      if (position >= -50 && position <= (timelineRef.current?.getBoundingClientRect().width || 0) + 50) {
        timeMarkers.push(
          <div
            key={i}
            className="absolute top-0 bottom-0 border-l border-gray-300"
            style={{ left: `${position}px` }}
          >
            {showTimecodes && (
              <span className="absolute -top-5 -left-8 text-xs text-gray-500 bg-white px-1 rounded">
                {formatTime(i)}
              </span>
            )}
          </div>
        );
      }
    }
    
    return timeMarkers;
  };

  const renderWaveform = () => {
    // Generate mock waveform bars
    const bars = [];
    const barCount = Math.floor(duration * 20 * zoomLevel);
    const barWidth = 2;
    const spacing = 1;
    
    for (let i = 0; i < barCount; i++) {
      const time = (i / barCount) * duration;
      const position = getPositionFromTime(time);
      const height = Math.random() * WAVEFORM_HEIGHT * 0.8 + WAVEFORM_HEIGHT * 0.1;
      
      if (position >= -10 && position <= (timelineRef.current?.getBoundingClientRect().width || 0) + 10) {
        bars.push(
          <div
            key={i}
            className="absolute bg-orange-400 rounded-sm"
            style={{
              left: `${position}px`,
              top: `${(WAVEFORM_HEIGHT - height) / 2}px`,
              width: `${barWidth}px`,
              height: `${height}px`,
            }}
          />
        );
      }
    }
    
    return bars;
  };

  const renderSegments = () => {
    return segments.map((segment) => {
      const startPos = getPositionFromTime(segment.startTime);
      const endPos = getPositionFromTime(segment.endTime);
      const width = endPos - startPos;
      const isSelected = selectedSegmentId === segment.id;
      
      if (startPos > (timelineRef.current?.getBoundingClientRect().width || 0) + 50 || endPos < -50) {
        return null;
      }
      
      return (
        <div
          key={segment.id}
          className={`absolute cursor-pointer transition-all ${
            isSelected 
              ? 'bg-orange-200 border-2 border-orange-500 shadow-lg' 
              : segment.isTranscribed 
                ? (segment.isApproved ? 'bg-green-100 border border-green-400' : 'bg-red-100 border border-red-400')
                : 'bg-gray-100 border border-gray-400'
          }`}
          style={{
            left: `${startPos}px`,
            top: `${WAVEFORM_HEIGHT + 10}px`,
            width: `${Math.max(width, 20)}px`,
            height: `${SEGMENT_HEIGHT}px`,
          }}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedSegmentId(segment.id);
            if (editMode === 'select') {
              onPlaySegment(segment);
            }
          }}
        >
          {/* Resize handle - start */}
          <div
            className="absolute left-0 top-0 bottom-0 w-2 bg-orange-600 cursor-ew-resize opacity-0 hover:opacity-100 transition-opacity"
            onMouseDown={(e) => handleSegmentMouseDown(e, segment, 'resize-start')}
          />
          
          {/* Segment content */}
          <div
            className="h-full px-2 flex items-center justify-between text-xs font-medium"
            onMouseDown={(e) => handleSegmentMouseDown(e, segment, 'move')}
          >
            <span className="truncate">
              {formatTime(segment.startTime, precisionMode)}
            </span>
            <span className="text-gray-500">
              {formatTime(segment.endTime - segment.startTime, precisionMode)}
            </span>
          </div>
          
          {/* Resize handle - end */}
          <div
            className="absolute right-0 top-0 bottom-0 w-2 bg-orange-600 cursor-ew-resize opacity-0 hover:opacity-100 transition-opacity"
            onMouseDown={(e) => handleSegmentMouseDown(e, segment, 'resize-end')}
          />
          
          {/* Delete button */}
          {isSelected && (
            <Button
              size="sm"
              variant="destructive"
              className="absolute -top-8 right-0 h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onSegmentDelete(segment.id);
                setSelectedSegmentId(null);
              }}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      );
    });
  };

  const renderPlayhead = () => {
    const position = getPositionFromTime(currentTime);
    return (
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-50 pointer-events-none"
        style={{ left: `${position}px` }}
      >
        <div className="absolute -top-2 -left-2 w-4 h-4 bg-red-500 rounded-full" />
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Editor Avançado de Segmentação</span>
          <div className="flex items-center space-x-2">
            <Badge variant={editMode === 'select' ? 'default' : 'secondary'}>
              {editMode === 'select' ? 'Seleção' : editMode === 'cut' ? 'Corte' : editMode === 'move' ? 'Movimento' : 'Zoom'}
            </Badge>
            <span className="text-sm text-gray-500">
              {segments.length} segmentos • {formatTime(duration)}
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Modo:</span>
            <Button
              size="sm"
              variant={editMode === 'select' ? 'default' : 'ghost'}
              onClick={() => setEditMode('select')}
            >
              <MousePointer className="w-4 h-4 mr-1" />
              Selecionar
            </Button>
            <Button
              size="sm"
              variant={editMode === 'cut' ? 'default' : 'ghost'}
              onClick={() => setEditMode('cut')}
            >
              <Scissors className="w-4 h-4 mr-1" />
              Cortar
            </Button>
            <Button
              size="sm"
              variant={editMode === 'move' ? 'default' : 'ghost'}
              onClick={() => setEditMode('move')}
            >
              <Move className="w-4 h-4 mr-1" />
              Mover
            </Button>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm">Grade:</span>
              <Input
                type="number"
                value={gridSize}
                onChange={(e) => setGridSize(Math.max(0.1, parseFloat(e.target.value) || 1))}
                className="w-16 h-8"
                step="0.1"
                min="0.1"
              />
              <span className="text-xs text-gray-500">s</span>
              <Button
                size="sm"
                variant={snapToGrid ? 'default' : 'ghost'}
                onClick={() => setSnapToGrid(!snapToGrid)}
                className="h-8"
              >
                <Target className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setZoomLevel(Math.max(0.25, zoomLevel - 0.25))}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm w-12 text-center">{zoomLevel}x</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setZoomLevel(Math.min(8, zoomLevel + 0.25))}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Timeline Container */}
        <div className="border rounded-lg bg-white overflow-hidden">
          <div 
            ref={timelineRef}
            className="relative h-32 overflow-x-auto cursor-crosshair select-none"
            onClick={handleTimelineClick}
            style={{ 
              width: '100%',
              overflowX: zoomLevel > 1 ? 'scroll' : 'hidden',
            }}
          >
            <div 
              className="relative h-full"
              style={{ 
                width: `${Math.max(100, 100 * zoomLevel)}%`,
                minWidth: '100%',
              }}
            >
              {/* Time markers */}
              {renderTimeline()}
              
              {/* Waveform */}
              <div className="absolute top-6 left-0 right-0" style={{ height: WAVEFORM_HEIGHT }}>
                {renderWaveform()}
              </div>
              
              {/* Segments */}
              {renderSegments()}
              
              {/* Playhead */}
              {renderPlayhead()}
              
              {/* Grid lines */}
              {snapToGrid && (
                <div className="absolute top-0 bottom-0 left-0 right-0 pointer-events-none">
                  {Array.from({ length: Math.floor(duration / gridSize) + 1 }, (_, i) => {
                    const time = i * gridSize;
                    const position = getPositionFromTime(time);
                    return (
                      <div
                        key={i}
                        className="absolute top-0 bottom-0 border-l border-gray-200 opacity-50"
                        style={{ left: `${position}px` }}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Audio Controls */}
        <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center space-x-3">
            <Button
              size="sm"
              onClick={onTogglePlay}
              className="w-10 h-10 rounded-full"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </Button>
            
            <div className="text-sm font-mono">
              {formatTime(currentTime, precisionMode)} / {formatTime(duration, precisionMode)}
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setPrecisionMode(!precisionMode)}
              title="Alternar modo de precisão"
            >
              <Settings className="w-4 h-4" />
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowTimecodes(!showTimecodes)}
              title="Mostrar/ocultar códigos de tempo"
            >
              ⏱️
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={onToggleMute}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
            
            <div className="flex items-center space-x-2">
              <Slider
                value={[isMuted ? 0 : volume]}
                onValueChange={([value]) => onVolumeChange(value)}
                max={100}
                step={1}
                className="w-20"
              />
              <span className="text-xs text-gray-500 w-8">
                {isMuted ? 0 : volume}%
              </span>
            </div>
          </div>
        </div>

        {/* Selected Segment Info */}
        {selectedSegmentId && (
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-3">
              {(() => {
                const segment = segments.find(s => s.id === selectedSegmentId);
                if (!segment) return null;
                
                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Segmento Selecionado</h4>
                      <Badge variant={segment.isTranscribed ? (segment.isApproved ? 'default' : 'destructive') : 'secondary'}>
                        {segment.isTranscribed ? (segment.isApproved ? 'Aprovado' : 'Rejeitado') : 'Pendente'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Início:</span>
                        <p className="font-mono">{formatTime(segment.startTime, true)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Fim:</span>
                        <p className="font-mono">{formatTime(segment.endTime, true)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Duração:</span>
                        <p className="font-mono">{formatTime(segment.endTime - segment.startTime, true)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        onClick={() => onPlaySegment(segment)}
                        className="bg-orange-600 hover:bg-orange-700"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Reproduzir
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onSeek(segment.startTime)}
                      >
                        Ir para início
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          onSegmentDelete(segment.id);
                          setSelectedSegmentId(null);
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}