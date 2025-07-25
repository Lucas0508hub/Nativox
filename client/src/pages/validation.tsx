import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import AdvancedSegmentEditor from "@/components/AdvancedSegmentEditor";
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX,
  SkipBack, 
  SkipForward,
  CheckCircle,
  XCircle,
  Plus,
  Minus,
  ZoomIn,
  ZoomOut,
  Save,
  Download,
  FileText,
  Settings,
  Wand2,
  MessageSquare,
  RotateCcw,
  Sparkles,
  Trash2
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function ValidationPage() {
  const { id } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [transcription, setTranscription] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(50);
  const [currentTime, setCurrentTime] = useState(0);
  const [useAdvancedEditor, setUseAdvancedEditor] = useState(true);
  const [playingSegmentId, setPlayingSegmentId] = useState<number | null>(null);
  const playingSegmentRef = useRef<number | null>(null);
  const [useWhisper, setUseWhisper] = useState(true);
  const [useVAD, setUseVAD] = useState(false);

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ["/api/projects", id],
    enabled: !!id,
    retry: false,
  });

  const { data: segments, isLoading: segmentsLoading } = useQuery({
    queryKey: ["/api/projects", id, "segments"],
    enabled: !!id,
    retry: false,
  });

  const updateSegmentMutation = useMutation({
    mutationFn: async ({ segmentId, data }: { segmentId: number; data: any }) => {
      const response = await apiRequest("PATCH", `/api/segments/${segmentId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "segments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      toast({
        title: t('success'),
        description: t('success'),
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Não autorizado",
          description: "Você foi deslogado. Redirecionando...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro ao atualizar",
        description: error.message || "Erro ao salvar alterações",
        variant: "destructive",
      });
    },
  });

  // Mutation to save transcription corrections for learning
  const saveTranscriptionCorrectionMutation = useMutation({
    mutationFn: async ({ segmentId, originalTranscription, correctedTranscription }: { 
      segmentId: number; 
      originalTranscription: string; 
      correctedTranscription: string; 
    }) => {
      return await apiRequest('POST', `/api/segments/${segmentId}/corrections`, {
        originalTranscription,
        correctedTranscription,
      });
    },
    onSuccess: () => {
      // Silent success - this is background learning
    },
    onError: (error) => {
      console.error("Error saving transcription correction:", error);
      // Silent error - don't interrupt user workflow
    },
  });

  const reprocessSegmentsMutation = useMutation({
    mutationFn: async (options?: { method?: string }) => {
      const method = options?.method || 'whisper';
      
      let endpoint;
      switch (method) {
        case 'vad-enhanced':
          endpoint = `/api/projects/${id}/reprocess-with-vad`;
          break;
        case 'vad-only':
          endpoint = `/api/projects/${id}/reprocess-vad-only`;
          break;
        case 'whisper':
        default:
          endpoint = `/api/projects/${id}/reprocess-segments`;
          break;
      }
      
      console.log(`Making segmentation request to: ${endpoint}`);
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout: Segmentation took too long')), 120000); // 2 minutes
      });
      
      const requestPromise = apiRequest("POST", endpoint, {}).then(response => response.json());
      
      return Promise.race([requestPromise, timeoutPromise]);
    },
    onSuccess: (data: any) => {
      console.log('Segmentation completed successfully:', data);
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "segments"] });
      toast({
        title: "Segmentação concluída",
        description: data.message || "Novas segmentações criadas",
      });
      setCurrentSegmentIndex(0);
    },
    onError: (error) => {
      console.error('Segmentation error:', error);
      if (isUnauthorizedError(error)) {
        toast({
          title: "Não autorizado",
          description: "Você foi deslogado. Redirecionando...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro na segmentação",
        description: error.message || "Falha na segmentação. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const generateTranscriptionsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/projects/${id}/generate-transcriptions`, {});
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "segments"] });
      toast({
        title: "Transcrições geradas",
        description: data.message || "Transcrições adicionadas aos segmentos",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Não autorizado",
          description: "Você foi deslogado. Redirecionando...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro na transcrição",
        description: error.message || "Falha ao gerar transcrições com Whisper",
        variant: "destructive",
      });
    },
  });

  const deleteAllSegmentsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/projects/${id}/segments/all`, {});
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "segments"] });
      toast({
        title: "Segmentos removidos",
        description: data.message || "Todos os segmentos foram removidos com sucesso",
      });
      setCurrentSegmentIndex(0);
      setTranscription("");
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Não autorizado",
          description: "Você foi deslogado. Redirecionando...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro ao remover segmentos",
        description: error.message || "Falha ao remover todos os segmentos",
        variant: "destructive",
      });
    },
  });

  const updateProjectDurationMutation = useMutation({
    mutationFn: async (duration: number) => {
      const response = await apiRequest("PATCH", `/api/projects/${id}`, { duration });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
    },
  });

  const updateProjectDuration = (newDuration: number) => {
    if (project && Math.abs(newDuration - project.duration) > 1) {
      // Round to integer for database storage
      updateProjectDurationMutation.mutate(Math.round(newDuration));
    }
  };

  const currentSegment = segments?.[currentSegmentIndex];

  useEffect(() => {
    if (currentSegment) {
      setTranscription(currentSegment.transcription || "");
    }
  }, [currentSegment]);

  const handleSegmentChange = (newIndex: number) => {
    setCurrentSegmentIndex(newIndex);
    const newSegment = segments?.[newIndex];
    if (newSegment) {
      setTranscription(newSegment.transcription || "");
    }
  };

  const handleAudioLoad = () => {
    if (audioRef.current) {
      const audio = audioRef.current;
      const actualDuration = audio.duration;
      console.log("Audio loaded, actual duration:", actualDuration);
      
      if (project && Math.abs(actualDuration - project.duration) > 1) {
        console.log("Duration mismatch detected. DB:", project.duration, "Actual:", actualDuration);
        updateProjectDuration(actualDuration);
        toast({
          title: "Duração corrigida",
          description: `Duração real: ${Math.round(actualDuration)}s (era ${Math.round(project.duration)}s)`,
        });
      }
      setCurrentTime(0);
      console.log("Audio can play");
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      
      // Debug logging for segment playback
      if (playingSegmentRef.current) {
        const currentSegment = segments?.find((s: any) => s.id === playingSegmentRef.current);
        if (currentSegment) {
          console.log(`Segment playing: ${audioRef.current.currentTime.toFixed(1)}s / ${currentSegment.endTime}s`);
        }
      }
    }
  };

  const togglePlayPause = () => {
    if (audioRef.current) {
      // If a specific segment is playing, stop it first
      if (playingSegmentId) {
        setPlayingSegmentId(null);
        playingSegmentRef.current = null;
      }
      
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handlePrevious = () => {
    if (currentSegmentIndex > 0) {
      handleSegmentChange(currentSegmentIndex - 1);
      if (audioRef.current && currentSegment) {
        audioRef.current.currentTime = segments[currentSegmentIndex - 1].startTime;
      }
    }
  };

  const handleNext = () => {
    if (currentSegmentIndex < (segments?.length || 0) - 1) {
      handleSegmentChange(currentSegmentIndex + 1);
      if (audioRef.current && segments) {
        audioRef.current.currentTime = segments[currentSegmentIndex + 1].startTime;
      }
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
    }
  };

  const handleSeekChange = (value: number[]) => {
    const newTime = value[0];
    if (audioRef.current && project) {
      audioRef.current.currentTime = (newTime / 100) * project.duration;
      setCurrentTime(audioRef.current.currentTime);
    }
  };



  const handlePreviousSegment = () => {
    if (currentSegmentIndex > 0) {
      handleSegmentChange(currentSegmentIndex - 1);
      if (audioRef.current && segments) {
        audioRef.current.currentTime = segments[currentSegmentIndex - 1].startTime;
      }
    }
  };

  const handleNextSegment = () => {
    if (currentSegmentIndex < (segments?.length || 0) - 1) {
      handleSegmentChange(currentSegmentIndex + 1);
      if (audioRef.current && segments) {
        audioRef.current.currentTime = segments[currentSegmentIndex + 1].startTime;
      }
    }
  };

  const handleApproveSegment = () => {
    if (!currentSegment) return;
    
    // Check if transcription was corrected and record for learning
    if (currentSegment.transcription && currentSegment.transcription !== transcription) {
      // Save correction for contextual learning
      saveTranscriptionCorrectionMutation.mutate({
        segmentId: currentSegment.id,
        originalTranscription: currentSegment.transcription,
        correctedTranscription: transcription,
      });
    }
    
    updateSegmentMutation.mutate({
      segmentId: currentSegment.id,
      data: {
        transcription,
        isValidated: true,
        isApproved: true,
      },
    });
  };

  const handleRejectSegment = () => {
    if (!currentSegment) return;
    
    updateSegmentMutation.mutate({
      segmentId: currentSegment.id,
      data: {
        transcription,
        isValidated: true,
        isApproved: false,
      },
    });
  };

  const handleSaveTranscription = () => {
    if (!currentSegment) return;
    
    // Check if transcription was corrected and record for learning
    if (currentSegment.transcription && currentSegment.transcription !== transcription) {
      // Save correction for contextual learning
      saveTranscriptionCorrectionMutation.mutate({
        segmentId: currentSegment.id,
        originalTranscription: currentSegment.transcription,
        correctedTranscription: transcription,
      });
    }
    
    updateSegmentMutation.mutate({
      segmentId: currentSegment.id,
      data: {
        transcription,
      },
    });
  };

  const handleAddCut = async () => {
    if (!project || !audioRef.current) return;
    
    const cutTime = audioRef.current.currentTime;
    
    try {
      // Create new segment at current time
      const response = await apiRequest("POST", `/api/projects/${id}/segments/split`, {
        splitTime: cutTime,
        currentSegmentId: currentSegment?.id 
      });
      
      // Refresh segments data
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "segments"] });
      
      const result = await response.json();
      
      toast({
        title: "Corte adicionado",
        description: result.message || `Novo segmento criado em ${formatTime(cutTime)}`
      });
    } catch (error) {
      console.error('Cut error:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível adicionar o corte",
        variant: "destructive"
      });
    }
  };

  const handleReprocessSegments = () => {
    reprocessSegmentsMutation.mutate();
  };

  const handleReprocessWithVAD = async () => {
    try {
      toast({
        title: "Iniciando segmentação VAD",
        description: "Processando áudio com análise avançada de atividade vocal...",
      });

      await apiRequest("POST", `/api/projects/${id}/reprocess-with-vad`, {});
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "segments"] });
      
      toast({
        title: "Segmentação VAD concluída",
        description: "O áudio foi segmentado com tecnologia VAD melhorada para cortes mais naturais.",
      });
    } catch (error) {
      toast({
        title: "Erro na segmentação VAD",
        description: "Não foi possível processar com VAD. Tente a segmentação normal.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateTranscriptions = () => {
    generateTranscriptionsMutation.mutate();
  };

  const handleDeleteAllSegments = () => {
    if (confirm("Tem certeza que deseja apagar TODOS os segmentos? Esta ação não pode ser desfeita.")) {
      deleteAllSegmentsMutation.mutate();
    }
  };

  const handleUnifiedSegmentation = async () => {
    if (!useWhisper && !useVAD) {
      toast({
        title: "Selecione uma opção",
        description: "Escolha pelo menos uma opção: Whisper ou VAD",
        variant: "destructive",
      });
      return;
    }

    try {
      if (useWhisper && useVAD) {
        // Use VAD-enhanced (combination of both)
        toast({
          title: "Segmentação Combinada",
          description: "Processando com Whisper + VAD para melhor precisão",
        });
        await reprocessSegmentsMutation.mutateAsync({ method: 'vad-enhanced' });
      } else if (useWhisper) {
        // Use only Whisper
        toast({
          title: "Segmentação Whisper",
          description: "Processando apenas com Whisper AI",
        });
        await reprocessSegmentsMutation.mutateAsync({ method: 'whisper' });
      } else if (useVAD) {
        // Use only VAD
        toast({
          title: "Segmentação VAD",
          description: "Processando com Voice Activity Detection",
        });
        await reprocessSegmentsMutation.mutateAsync({ method: 'vad-only' });
      }
    } catch (error) {
      console.error('Segmentation error:', error);
      toast({
        title: "Erro na segmentação",
        description: error?.message || "Falha no processamento. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handlePlaySegment = (segment: any) => {
    if (!audioRef.current) return;

    console.log(`Playing segment: ${segment.startTime}s - ${segment.endTime}s`);

    // If this segment is already playing, stop it
    if (playingSegmentId === segment.id) {
      audioRef.current.pause();
      setPlayingSegmentId(null);
      playingSegmentRef.current = null;
      setIsPlaying(false);
      return;
    }

    // Stop current playback and any main player
    audioRef.current.pause();
    setIsPlaying(false);
    setPlayingSegmentId(segment.id);
    playingSegmentRef.current = segment.id;
    
    // Set the current time to the start of the segment
    audioRef.current.currentTime = segment.startTime;
    
    // Calculate segment duration for timeout
    const segmentDuration = (segment.endTime - segment.startTime) * 1000; // Convert to milliseconds
    
    // Set up a timeout to stop playback at the exact end time
    const segmentTimeoutId = setTimeout(() => {
      console.log(`Timeout triggered for segment ${segment.id} after ${segmentDuration}ms`);
      if (audioRef.current && playingSegmentRef.current === segment.id) {
        console.log(`Stopping segment at: ${audioRef.current.currentTime}s (target: ${segment.endTime}s)`);
        audioRef.current.pause();
        setPlayingSegmentId(null);
        playingSegmentRef.current = null;
        setIsPlaying(false);
        
        toast({
          title: "Segmento concluído",
          description: `Reprodução do segmento ${segments?.findIndex((s: any) => s.id === segment.id) + 1} finalizada`,
        });
      } else {
        console.log(`Timeout triggered but segment ${segment.id} is no longer playing (current: ${playingSegmentRef.current})`);
      }
    }, segmentDuration + 100); // Add small buffer for precision
    
    // Also monitor with timeupdate as backup
    const segmentEndHandler = () => {
      if (!audioRef.current || playingSegmentRef.current !== segment.id) {
        audioRef.current?.removeEventListener('timeupdate', segmentEndHandler);
        clearTimeout(segmentTimeoutId);
        return;
      }
      
      // Check if we've reached the end of the segment
      if (audioRef.current.currentTime >= segment.endTime) {
        console.log(`Backup stop at: ${audioRef.current.currentTime}s (target: ${segment.endTime}s)`);
        audioRef.current.pause();
        audioRef.current.removeEventListener('timeupdate', segmentEndHandler);
        clearTimeout(segmentTimeoutId);
        setPlayingSegmentId(null);
        playingSegmentRef.current = null;
        setIsPlaying(false);
        
        toast({
          title: "Segmento concluído",
          description: `Reprodução do segmento ${segments?.findIndex((s: any) => s.id === segment.id) + 1} finalizada`,
        });
      }
    };
    
    // Add the event listener
    audioRef.current.addEventListener('timeupdate', segmentEndHandler);
    
    // Play the audio
    audioRef.current.play().then(() => {
      setIsPlaying(true);
      
      toast({
        title: "Reproduzindo segmento",
        description: `Segmento ${segments?.findIndex((s: any) => s.id === segment.id) + 1} (${formatTime(segment.startTime)} - ${formatTime(segment.endTime)})`,
      });
    }).catch((error) => {
      console.error('Error playing segment:', error);
      audioRef.current?.removeEventListener('timeupdate', segmentEndHandler);
      clearTimeout(segmentTimeoutId);
      setPlayingSegmentId(null);
      playingSegmentRef.current = null;
      setIsPlaying(false);
      toast({
        title: "Erro na reprodução",
        description: "Não foi possível reproduzir o segmento",
        variant: "destructive",
      });
    });
  };

  const handleExportSegments = async () => {
    try {
      const response = await fetch(`/api/projects/${id}/export/segments`, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Erro ao exportar segmentações');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `segmentacao_${project?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'projeto'}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Exportação concluída",
        description: "As segmentações foram exportadas com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar as segmentações.",
        variant: "destructive",
      });
    }
  }

  const handleExportAudioSegments = async () => {
    try {
      toast({
        title: "Exportando segmentos de áudio",
        description: "Iniciando processamento dos segmentos de áudio... Isso pode levar alguns minutos.",
      });

      const response = await fetch(`/api/projects/${id}/export/audio-segments`, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Erro ao exportar segmentos de áudio');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `segmentos_audio_${project?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'projeto'}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Segmentos de áudio exportados",
        description: "O arquivo ZIP com todos os segmentos de áudio foi gerado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar os segmentos de áudio.",
        variant: "destructive",
      });
    }
  };

  const handleExportTranscriptions = async () => {
    try {
      const response = await fetch(`/api/projects/${id}/export/transcriptions`, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Erro ao exportar transcrições');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `transcricao_${project?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'projeto'}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Planilha exportada",
        description: "A planilha CSV com nomes de arquivos e transcrições foi gerada com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro na exportação",
        description: "Não foi possível gerar a planilha de transcrições.",
        variant: "destructive",
      });
    }
  };

  // Advanced Editor Functions
  const handleAdvancedSegmentUpdate = async (segmentId: number, updates: any) => {
    try {
      await updateSegmentMutation.mutateAsync({ segmentId, data: updates });
    } catch (error) {
      console.error('Error updating segment:', error);
    }
  };

  const handleAdvancedSegmentCreate = async (startTime: number, endTime?: number) => {
    try {
      const response = await apiRequest("POST", `/api/projects/${id}/segments`, {
        startTime,
        endTime: endTime || Math.min(startTime + 5, project?.duration || 0),
        segmentNumber: (segments?.length || 0) + 1
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "segments"] });
      
      toast({
        title: "Novo segmento criado",
        description: `Segmento: ${formatTime(startTime)} - ${formatTime(endTime || startTime + 5)}`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível criar o segmento",
        variant: "destructive"
      });
    }
  };

  const handleAdvancedSegmentDelete = async (segmentId: number) => {
    try {
      await apiRequest("DELETE", `/api/segments/${segmentId}`);
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "segments"] });
      
      toast({
        title: "Segmento excluído",
        description: "Segmento removido com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível excluir o segmento",
        variant: "destructive"
      });
    }
  };

  const handleAdvancedSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleRemoveCut = () => {
    if (!currentSegment) return;
    
    toast({
      title: "Removendo corte", 
      description: `Corte do segmento ${currentSegmentIndex + 1} removido`
    });
    
    // This would merge the current segment with adjacent ones
    // For now, just show feedback
  };



  const seekToTime = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (start: number, end: number) => {
    const duration = end - start;
    return formatTime(duration);
  };

  const getStatusBadge = (segment: any) => {
    if (!segment.isValidated) {
      return <Badge className="status-ready">Pendente Validação</Badge>;
    }
    if (segment.isApproved) {
      return <Badge className="status-completed">Aprovado</Badge>;
    }
    return <Badge className="status-failed">Rejeitado</Badge>;
  };

  const progressPercent = segments?.length > 0 
    ? (segments.filter((s: any) => s.isValidated).length / segments.length) * 100 
    : 0;

  if (projectLoading || segmentsLoading) {
    return (
      <div className="min-h-screen flex bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <p>{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <p>{t('notFound')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-roboto font-bold text-2xl text-gray-900">
                {t('validation')}: {project.name}
              </h2>
              <p className="text-sm text-gray-500">
                {project.originalFilename} • {formatTime(project.duration)}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {segments?.filter((s: any) => s.isValidated).length || 0} / {segments?.length || 0} {t('validated')}
                </p>
                <Progress value={progressPercent} className="w-32" />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Hidden Audio Element */}
            <audio
              ref={audioRef}
              className="hidden"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleAudioLoad}
              onCanPlay={() => console.log("Audio can play")}
              onError={(e) => console.error("Audio error:", e)}
            >
              <source src={`/api/projects/${id}/audio`} type="audio/mpeg" />
              Seu navegador não suporta o elemento de áudio.
            </audio>

            {/* Player de Áudio */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{t('segmentEditor')}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">{t('mode')}:</span>
                    <Button
                      size="sm"
                      variant={useAdvancedEditor ? "default" : "outline"}
                      onClick={() => setUseAdvancedEditor(!useAdvancedEditor)}
                    >
                      {useAdvancedEditor ? t('advanced') : t('basic')}
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Toolbar de Ações - Reorganizada em duas linhas */}
                <div className="space-y-3">
                  {/* Primeira linha: Segmentação */}
                  <div className="flex items-center justify-center">
                    <div className="flex items-center space-x-3 bg-gradient-to-r from-blue-50 to-green-50 p-3 rounded-lg border border-blue-200">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-gray-700">{t('method')}:</span>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="use-whisper"
                            checked={useWhisper}
                            onChange={(e) => setUseWhisper(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label htmlFor="use-whisper" className="text-sm font-medium text-blue-700">
                            {t('whisperAI')}
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="use-vad"
                            checked={useVAD}
                            onChange={(e) => setUseVAD(e.target.checked)}
                            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                          />
                          <label htmlFor="use-vad" className="text-sm font-medium text-green-700">
                            {t('vadDetection')}
                          </label>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleUnifiedSegmentation}
                        disabled={reprocessSegmentsMutation.isPending || (!useWhisper && !useVAD)}
                        className="bg-white hover:bg-blue-50 border-blue-300 font-medium"
                      >
                        <Wand2 className="w-4 h-4 mr-2" />
                        {reprocessSegmentsMutation.isPending ? t('processing') : t('segment')}
                      </Button>
                    </div>
                  </div>

                  {/* Segunda linha: Ações e Exportação */}
                  <div className="flex items-center justify-center space-x-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleGenerateTranscriptions()}
                      disabled={generateTranscriptionsMutation.isPending}
                    >
                      <MessageSquare className="w-4 h-4 mr-1" />
                      {generateTranscriptionsMutation.isPending ? t('processing') : t('transcribe')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleExportSegments()}
                    >
                      <Settings className="w-4 h-4 mr-1" />
                      {t('exportConfig')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleExportTranscriptions()}
                    >
                      <FileText className="w-4 h-4 mr-1" />
                      {t('spreadsheet')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleExportAudioSegments()}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      {t('audioZip')}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleDeleteAllSegments}
                      disabled={deleteAllSegmentsMutation.isPending}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      {deleteAllSegmentsMutation.isPending ? t('deleting') : t('deleteAll')}
                    </Button>
                  </div>
                </div>
                {/* Editor de Segmentação Avançado */}
                {useAdvancedEditor ? (
                  <AdvancedSegmentEditor
                    segments={segments || []}
                    audioRef={audioRef}
                    currentTime={currentTime}
                    duration={project?.duration || 0}
                    isPlaying={isPlaying}
                    volume={volume}
                    isMuted={isMuted}
                    onSegmentUpdate={handleAdvancedSegmentUpdate}
                    onSegmentCreate={handleAdvancedSegmentCreate}
                    onSegmentDelete={handleAdvancedSegmentDelete}
                    onPlaySegment={handlePlaySegment}
                    onSeek={handleAdvancedSeek}
                    onTogglePlay={togglePlayPause}
                    onVolumeChange={(volume) => handleVolumeChange([volume])}
                    onToggleMute={toggleMute}
                  />
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <p className="text-gray-500 mb-4">{t('basicInterfaceDisabled')}</p>
                    <Button
                      onClick={() => setUseAdvancedEditor(true)}
                      variant="outline"
                    >
                      {t('enableAdvancedEditor')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Current Segment */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>
                        Segmento {currentSegmentIndex + 1} de {segments?.length || 0}
                      </span>
                      {currentSegment && getStatusBadge(currentSegment)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {currentSegment && (
                      <>
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <span>
                            {formatTime(currentSegment.startTime)} - {formatTime(currentSegment.endTime)}
                          </span>
                          <span>
                            Duração: {formatDuration(currentSegment.startTime, currentSegment.endTime)}
                          </span>
                          <span>
                            Confiança: {(currentSegment.confidence * 100).toFixed(1)}%
                          </span>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Transcrição
                          </label>
                          <Textarea
                            value={transcription}
                            onChange={(e) => setTranscription(e.target.value)}
                            placeholder="Digite a transcrição deste segmento..."
                            rows={4}
                            className="resize-none"
                          />
                        </div>

                        <div className="flex items-center justify-between pt-4">
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePlaySegment(currentSegment)}
                              className={`${playingSegmentId === currentSegment?.id 
                                ? 'bg-red-50 hover:bg-red-100 border-red-200' 
                                : 'bg-blue-50 hover:bg-blue-100 border-blue-200'
                              }`}
                            >
                              {playingSegmentId === currentSegment?.id ? (
                                <>
                                  <Pause className="w-4 h-4 mr-1" />
                                  Parar Segmento
                                </>
                              ) : (
                                <>
                                  <Play className="w-4 h-4 mr-1" />
                                  Tocar Segmento
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleSaveTranscription}
                              disabled={updateSegmentMutation.isPending}
                            >
                              <Save className="w-4 h-4 mr-1" />
                              Salvar
                            </Button>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              className="bg-success-500 hover:bg-success-600"
                              onClick={handleApproveSegment}
                              disabled={updateSegmentMutation.isPending}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={handleRejectSegment}
                              disabled={updateSegmentMutation.isPending}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Rejeitar
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Segment Navigation */}
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Navegação</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handlePreviousSegment}
                        disabled={currentSegmentIndex === 0}
                        className="flex-1"
                      >
                        <SkipBack className="w-4 h-4 mr-1" />
                        Anterior
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleNextSegment}
                        disabled={currentSegmentIndex >= (segments?.length || 0) - 1}
                        className="flex-1"
                      >
                        Próximo
                        <SkipForward className="w-4 h-4 ml-1" />
                      </Button>
                    </div>

                    {/* Segment List */}
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      <h4 className="text-sm font-medium text-gray-700">Todos os Segmentos</h4>
                      {segments?.map((segment: any, index: number) => (
                        <div
                          key={segment.id}
                          className={`p-2 rounded border text-sm transition-colors ${
                            index === currentSegmentIndex 
                              ? 'border-primary bg-primary-50' 
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div 
                              className="flex items-center space-x-2 flex-1 cursor-pointer"
                              onClick={() => setCurrentSegmentIndex(index)}
                            >
                              <span className="font-medium">#{index + 1}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePlaySegment(segment);
                                }}
                                className={`h-6 w-6 p-0 ${
                                  playingSegmentId === segment.id 
                                    ? 'hover:bg-red-100 text-red-600' 
                                    : 'hover:bg-blue-100 text-blue-600'
                                }`}
                                title={
                                  playingSegmentId === segment.id 
                                    ? `Parar segmento ${index + 1}` 
                                    : `Reproduzir segmento ${index + 1}`
                                }
                              >
                                {playingSegmentId === segment.id ? (
                                  <Pause className="w-3 h-3" />
                                ) : (
                                  <Play className="w-3 h-3" />
                                )}
                              </Button>
                            </div>
                            {segment.isValidated ? (
                              segment.isApproved ? (
                                <CheckCircle className="w-4 h-4 text-success-500" />
                              ) : (
                                <XCircle className="w-4 h-4 text-error-500" />
                              )
                            ) : (
                              <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
