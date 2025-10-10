import { useState, useRef, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { authenticatedFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import AdvancedAudioPlayer from "@/components/AdvancedAudioPlayer";
import GenreSelectionModal from "@/components/GenreSelectionModal";
import { getGenreDisplayName, getGenreBadgeStyle } from "@/utils/genreUtils";
import {
  ArrowLeft,
  FileAudio,
  Clock,
  Save,
  Loader2,
  List,
  Keyboard,
  Navigation,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Segment {
  id: number;
  folderId: number;
  projectId: number;
  originalFilename: string;
  filePath: string;
  duration: number;
  segmentNumber: number;
  transcription?: string;
  translation?: string;
  isTranscribed: boolean;
  isTranslated: boolean;
  genre?: string;
  createdAt: string;
}

interface Folder {
  id: number;
  projectId: number;
  name: string;
}

export default function TranscribeSegmentPage() {
  const { projectId, folderId, segmentId } = useParams<{
    projectId: string;
    folderId: string;
    segmentId: string;
  }>();
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [transcription, setTranscription] = useState("");
  const [translation, setTranslation] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [isGenreModalOpen, setIsGenreModalOpen] = useState(false);
  const [showSegmentSelector, setShowSegmentSelector] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const segmentIdNum = parseInt(segmentId || "0");
  const folderIdNum = parseInt(folderId || "0");
  const projectIdNum = parseInt(projectId || "0");

  const { data: segment, isLoading: segmentLoading } = useQuery<Segment>({
    queryKey: [`/api/segments/${segmentIdNum}`],
    enabled: !!segmentIdNum,
  });

  const { data: folder } = useQuery<Folder>({
    queryKey: [`/api/folders/${folderIdNum}`],
    enabled: !!folderIdNum,
  });

  const { data: allSegments = [] } = useQuery<Segment[]>({
    queryKey: [`/api/folders/${folderIdNum}/segments`],
    enabled: !!folderIdNum,
  });

  useEffect(() => {
    setTranscription(segment?.transcription ?? "");
    setTranslation(segment?.translation ?? "");
  }, [segment]);

  // Load audio as blob
  useEffect(() => {
    if (!segmentIdNum) return;

    let blobUrl: string | null = null;

    const loadAudio = async () => {
      try {
        const response = await authenticatedFetch(`/api/segments/${segmentIdNum}/audio`);
        if (!response.ok) throw new Error(t('failedToLoadAudio'));
        
        const blob = await response.blob();
        blobUrl = URL.createObjectURL(blob);
        setAudioBlobUrl(blobUrl);
        
      } catch (error) {
        console.error('Error loading audio:', error);
      }
    };

    loadAudio();

    // Cleanup: revoke the blob URL when component unmounts or segment changes
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [segmentIdNum]);



  const saveMutation = useMutation({
    mutationFn: async (genreOverride?: string) => {
      return await apiRequest("PATCH", `/api/segments/${segmentIdNum}`, {
        transcription,
        translation,
        isTranscribed: transcription.trim().length > 0, // Set to true if transcription has content
        isTranslated: translation.trim().length > 0, // Set to true if translation has content
        genre: genreOverride || segment?.genre, // Use provided genre or current segment genre
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/segments/${segmentIdNum}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/folders/${folderIdNum}/segments`] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] }); // Update projects list
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectIdNum}`] }); // Update project detail
      toast({
        title: t("success"),
        description: t("transcriptionSaved"),
      });
      
      // Navigate to next segment or back to folder
      const currentIndex = allSegments.findIndex(s => s.id === segmentIdNum);
      const hasNext = currentIndex < allSegments.length - 1;
      
      if (hasNext) {
        const nextSegment = allSegments[currentIndex + 1];
        setLocation(`/project/${projectIdNum}/folder/${folderIdNum}/segment/${nextSegment.id}`);
      } else {
        // Last segment, go back to folder view
        setLocation(`/project/${projectIdNum}/folder/${folderIdNum}`);
      }
    },
    onError: (error: any) => {
      toast({
        title: t("error"),
        description: error.message || t("error"),
        variant: "destructive",
      });
    },
  });


  const handleSaveClick = () => {
    if (!segment?.genre) {
      setIsGenreModalOpen(true);
      return;
    }
    saveMutation.mutate(undefined);
  };

  const handleGenreChange = (genre: string) => {
    // Save the segment with the new genre directly
    saveMutation.mutate(genre === 'none' ? '' : genre);
  };

  const handleGenreModalOpen = () => {
    setIsGenreModalOpen(true);
  };

  const handleGenreModalClose = () => {
    setIsGenreModalOpen(false);
  };

  const handleGenreConfirm = (genre: string) => {
    handleGenreChange(genre);
    setIsGenreModalOpen(false);
  };


  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSave = () => {
    saveMutation.mutate(undefined);
  };

  const currentIndex = allSegments.findIndex(s => s.id === segmentIdNum);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < allSegments.length - 1;

  const goToPrevious = () => {
    if (hasPrevious) {
      const prevSegment = allSegments[currentIndex - 1];
      setLocation(`/project/${projectIdNum}/folder/${folderIdNum}/segment/${prevSegment.id}`);
    }
  };

  const goToNext = () => {
    if (hasNext) {
      const nextSegment = allSegments[currentIndex + 1];
      setLocation(`/project/${projectIdNum}/folder/${folderIdNum}/segment/${nextSegment.id}`);
    }
  };

  const goToSegment = (targetSegmentId: number) => {
    setLocation(`/project/${projectIdNum}/folder/${folderIdNum}/segment/${targetSegmentId}`);
  };

  // Touch/swipe handlers
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && hasNext) {
      goToNext();
    }
    if (isRightSwipe && hasPrevious) {
      goToPrevious();
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when not typing in text areas
      if (event.target instanceof HTMLTextAreaElement) return;
      
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          goToPrevious();
          break;
        case 'ArrowRight':
          event.preventDefault();
          goToNext();
          break;
        case 'j': // Vim-style navigation
          if (event.ctrlKey) {
            event.preventDefault();
            goToPrevious();
          }
          break;
        case 'k': // Vim-style navigation
          if (event.ctrlKey) {
            event.preventDefault();
            goToNext();
          }
          break;
        case 'g': // Quick segment selector
          if (event.ctrlKey) {
            event.preventDefault();
            setShowSegmentSelector(true);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasPrevious, hasNext, currentIndex, allSegments]);

  if (segmentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">{t("loading")}</p>
      </div>
    );
  }

  if (!segment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">{t("error")}</h2>
          <p className="text-gray-500 mb-4">Segmento não encontrado</p>
          <Link href={`/project/${projectIdNum}/folder/${folderIdNum}`}>
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("backToFolder")}
            </Button>
          </Link>
        </div>
      </div>
    );
  }


  return (
    <div 
      className="min-h-screen bg-gray-50"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden bg-white border-b border-gray-200 p-3">
          <div className="flex items-center justify-between">
            <Link href={`/project/${projectIdNum}/folder/${folderIdNum}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-1" />
                {t("backToFolder")}
              </Button>
            </Link>
            <Badge variant="outline">
              Seg. {segment.segmentNumber}
            </Badge>
          </div>
        </div>

        {/* Desktop Header */}
        <header className="hidden md:block bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <Link href={`/project/${projectIdNum}/folder/${folderIdNum}`}>
              <Button variant="ghost">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t("backToFolder")}
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              {/* Segment Selector */}
              <div className="flex items-center gap-2">
                <List className="w-4 h-4 text-gray-500" />
                <Select
                  value={segmentIdNum.toString()}
                  onValueChange={(value) => goToSegment(parseInt(value))}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allSegments.map((seg) => (
                      <SelectItem key={seg.id} value={seg.id.toString()}>
                        Seg. {seg.segmentNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Progress Indicator */}
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>{currentIndex + 1}</span>
                <span>/</span>
                <span>{allSegments.length}</span>
              </div>
              
              {/* Keyboard Shortcuts Hint */}
              <div className="hidden lg:flex items-center gap-1 text-xs text-gray-400">
                <Keyboard className="w-3 h-3" />
                <span>← →</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <FileAudio className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="font-roboto font-bold text-2xl text-gray-900">
                {t("transcribeSegment")}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {segment.originalFilename} - {folder?.name}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline">
                <Clock className="w-3 h-3 mr-1" />
                {formatTime(segment.duration)}
              </Badge>
              <Badge variant="outline">
                Seg. {segment.segmentNumber}
              </Badge>
            </div>
          </div>
        </header>

        {/* Desktop Progress Bar */}
        <div className="hidden md:block bg-white border-b border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">{t("progressThroughSegments")}</span>
            <span className="text-sm text-gray-500">{currentIndex + 1} of {allSegments.length}</span>
          </div>
          <Progress 
            value={((currentIndex + 1) / allSegments.length) * 100} 
            className="h-2"
          />
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-3 md:p-6">
          <div className="w-full space-y-4">
            {/* Mobile Segment Info */}
            <div className="md:hidden">
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg mb-2">{segment.originalFilename}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    {formatTime(segment.duration)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Advanced Audio Player */}
            <AdvancedAudioPlayer
              src={audioBlobUrl || ""}
              title={segment?.originalFilename || t('audioSegment')}
              onTimeUpdate={(current, total) => {
                setCurrentTime(current);
                setDuration(total);
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              className="mb-6"
            />

            {/* Transcription and Translation Area */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("manualTranscription")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">
                        {t("transcription")}
                      </label>
                      <Badge className={segment?.isTranscribed ? "bg-green-100 text-green-800 border-green-200" : "bg-yellow-100 text-yellow-800 border-yellow-200"}>
                        {segment?.isTranscribed ? t("transcribed") : t("pending")}
                      </Badge>
                    </div>
                    <Textarea
                      value={transcription}
                      onChange={(e) => setTranscription(e.target.value)}
                      placeholder={t("enterTranscription")}
                      className="min-h-[200px] md:min-h-[300px] font-mono text-base"
                    />
                    <span className="text-xs text-gray-500">
                      {t("characterCount", { count: transcription.length })}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">
                        {t("translation")}
                      </label>
                      <Badge className={segment?.isTranslated ? "bg-blue-100 text-blue-800 border-blue-200" : "bg-gray-100 text-gray-600 border-gray-200"}>
                        {segment?.isTranslated ? t("translated") : t("notTranslated")}
                      </Badge>
                    </div>
                    <Textarea
                      value={translation}
                      onChange={(e) => setTranslation(e.target.value)}
                      placeholder={t("enterTranslation")}
                      className="min-h-[200px] md:min-h-[300px] font-mono text-base"
                    />
                    <span className="text-xs text-gray-500">
                      {t("characterCount", { count: translation.length })}
                    </span>
                  </div>
                </div>
                
                {/* Genre Section */}
                <div className="space-y-3 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      {t("genre")}
                    </label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenreModalOpen}
                      disabled={saveMutation.isPending}
                      className={`w-48 h-8 text-xs ${getGenreBadgeStyle(segment?.genre)}`}
                    >
                      {getGenreDisplayName(segment?.genre, t)}
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center justify-end pt-2">
                  <Button
                    onClick={handleSaveClick}
                    disabled={saveMutation.isPending}
                    className="bg-primary hover:bg-primary-600"
                  >
                    {saveMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t("saving")}
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {t("saveTranscription")}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Mobile Navigation */}
            <div className="md:hidden space-y-3">
              {/* Segment Selector - Mobile */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <List className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">{t("segmentSelector")}:</span>
                </div>
                <Select
                  value={segmentIdNum.toString()}
                  onValueChange={(value) => goToSegment(parseInt(value))}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allSegments.map((seg) => (
                      <SelectItem key={seg.id} value={seg.id.toString()}>
                        {seg.segmentNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Progress Bar - Mobile */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Progress</span>
                  <span>{currentIndex + 1} / {allSegments.length}</span>
                </div>
                <Progress 
                  value={((currentIndex + 1) / allSegments.length) * 100} 
                  className="h-2"
                />
              </div>
              
              {/* Swipe Hint */}
              <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                <Navigation className="w-3 h-3" />
                <span>{t("swipeHint")}</span>
              </div>
            </div>
          </div>
        </main>
      </div>
      
      {/* Genre Selection Modal */}
      <GenreSelectionModal
        isOpen={isGenreModalOpen}
        onClose={() => setIsGenreModalOpen(false)}
        onConfirm={handleGenreConfirm}
        currentGenre={segment?.genre}
      />
    </div>
  );
}
