import React, { useState, useRef } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useConfirmationDialog } from "@/contexts/ConfirmationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getGenreDisplayName, getGenreBadgeStyle } from "@/utils/genreUtils";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowLeft,
  Upload,
  FileAudio,
  Clock,
  FileText,
  X,
  CheckCircle,
  Trash2,
  GripVertical,
  ArrowUp,
  ArrowDown,
  SortAsc,
  Check,
  Globe,
  SortDesc,
  Download,
} from "lucide-react";

interface Segment {
  id: number;
  folderId: number;
  projectId: number;
  originalFilename: string;
  filePath: string;
  duration: number;
  transcription?: string;
  isTranscribed: boolean;
  createdAt: string;
  segmentNumber: number;
}

interface Folder {
  id: number;
  projectId: number;
  name: string;
  description?: string;
  createdAt: string;
}

interface UploadFile {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
}

// Sortable Segment Component
function SortableSegment({ 
  segment, 
  onDelete, 
  onMoveUp, 
  onMoveDown, 
  canMoveUp, 
  canMoveDown,
  user,
  t
}: {
  segment: Segment;
  onDelete: (id: number, name: string) => void;
  onMoveUp: (id: number) => void;
  onMoveDown: (id: number) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  user: any;
  t: (key: string) => string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: segment.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      className={`shadow-sm hover:shadow-md transition-shadow duration-300 h-full relative ${
        isDragging ? 'shadow-lg' : ''
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            {/* Drag Handle */}
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded relative z-20"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <GripVertical className="w-4 h-4 text-gray-400" />
            </div>
            
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <FileAudio className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm font-semibold truncate">
                {segment.originalFilename}
              </CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                <Clock className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-500">
                  {formatDuration(segment.duration)}
                </span>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-500">
                  #{segment.segmentNumber}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* Transcription Status */}
            {segment.isTranscribed ? (
              <Badge className="bg-green-100 text-green-800 border-green-200">
                <Check className="w-3 h-3 mr-1" />
                {t("transcribed")}
              </Badge>
            ) : (
              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                <FileText className="w-3 h-3 mr-1" />
                {t("pending")}
              </Badge>
            )}
            
            {/* Translation Status */}
            {segment.isTranslated ? (
              <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                <Globe className="w-3 h-3 mr-1" />
                {t("translated")}
              </Badge>
            ) : (
              <Badge className="bg-gray-100 text-gray-600 border-gray-200">
                <Globe className="w-3 h-3 mr-1" />
                {t("notTranslated")}
              </Badge>
            )}
            
            {/* Genre Status */}
            <Badge className={`w-auto h-6 px-2 py-0 text-xs ${getGenreBadgeStyle(segment.genre)}`}>
              {getGenreDisplayName(segment.genre, t)}
            </Badge>
          </div>

          <div className="flex items-center space-x-1 relative z-10">
            {/* Move Up Button */}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 relative z-20 hover:bg-orange-50 hover:text-orange-600"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onMoveUp(segment.id);
              }}
              disabled={!canMoveUp}
              title={t('moveUp')}
            >
              <ArrowUp className="w-3 h-3" />
            </Button>
            
            {/* Move Down Button */}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 relative z-20 hover:bg-orange-50 hover:text-orange-600"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onMoveDown(segment.id);
              }}
              disabled={!canMoveDown}
              title={t('moveDown')}
            >
              <ArrowDown className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Delete button - only show for admin/manager */}
      {user && ((user as any).role === 'admin' || (user as any).role === 'manager') && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 z-20"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(segment.id, segment.originalFilename);
          }}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      )}

      {/* Clickable overlay for navigation */}
      <Link href={`/project/${segment.projectId}/folder/${segment.folderId}/segment/${segment.id}`}>
        <div className="absolute inset-0 cursor-pointer z-0" />
      </Link>
    </Card>
  );
}

export default function FolderSegmentsPage() {
  const { projectId, folderId } = useParams<{ projectId: string; folderId: string }>();
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { confirm } = useConfirmationDialog();
  
  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // Sort state
  const [sortBy, setSortBy] = useState<'segmentNumber' | 'name' | 'duration' | 'date' | 'genre'>('segmentNumber');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const folderIdNum = parseInt(folderId || "0");
  const projectIdNum = parseInt(projectId || "0");

  const { data: folder, isLoading: folderLoading } = useQuery<Folder>({
    queryKey: [`/api/folders/${folderIdNum}`],
    enabled: !!folderIdNum,
  });

  const { data: segments = [], isLoading: segmentsLoading } = useQuery<Segment[]>({
    queryKey: [`/api/folders/${folderIdNum}/segments`],
    enabled: !!folderIdNum,
  });

  const uploadSegmentsMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('audioFiles', file);
      });

      return await apiRequest("POST", `/api/folders/${folderIdNum}/upload-segments`, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/folders/${folderIdNum}/segments`] });
      setIsUploadDialogOpen(false);
      setUploadFiles([]);
      toast({
        title: t("filesUploaded"),
        description: t("success"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("error"),
        description: error.message || t("uploadError"),
        variant: "destructive",
      });
    },
  });

  const deleteSegmentMutation = useMutation({
    mutationFn: async (segmentId: number) => {
      await apiRequest("DELETE", `/api/segments/${segmentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/folders/${folderIdNum}/segments`] });
      toast({
        title: t("segmentDeleted"),
        description: t("success"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("error"),
        description: error.message || t("error"),
        variant: "destructive",
      });
    },
  });

  const reorderSegmentsMutation = useMutation({
    mutationFn: async (segmentIds: number[]) => {
      await apiRequest("PATCH", `/api/folders/${folderIdNum}/reorder-segments`, {
        segmentIds
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/folders/${folderIdNum}/segments`] });
      toast({
        title: t("segmentsReordered"),
        description: t("orderUpdatedSuccess"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("error"),
        description: error.message || t("error"),
        variant: "destructive",
      });
    },
  });


  const handleDeleteSegment = async (segmentId: number, segmentName: string) => {
    const confirmed = await confirm(t('confirmDeleteSegment', { segmentName }), {
      title: t('delete'),
      variant: 'destructive'
    });
    
    if (confirmed) {
      deleteSegmentMutation.mutate(segmentId);
    }
  };


  // Drag and drop handler
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const segmentsList = segments || [];
      const oldIndex = segmentsList.findIndex((segment: Segment) => segment.id === active.id);
      const newIndex = segmentsList.findIndex((segment: Segment) => segment.id === over.id);

      const newOrder = arrayMove(segmentsList, oldIndex, newIndex);
      const segmentIds = newOrder.map((segment: Segment) => segment.id);
      
      reorderSegmentsMutation.mutate(segmentIds);
    }
  };

  // Export folder data as CSV
  const handleExportCSV = async () => {
    try {
      const response = await apiRequest('GET', `/api/folders/${folderId}/export`);

      // Get filename from Content-Disposition header or create default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'folder_export.csv';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: t('exportSuccess'),
        description: t('exportSuccessDescription'),
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: t('exportError'),
        description: t('exportErrorDescription'),
        variant: 'destructive',
      });
    }
  };

  // Manual reorder functions
  const handleMoveUp = (segmentId: number) => {
    const segmentsList = segments || [];
    const currentIndex = segmentsList.findIndex((segment: Segment) => segment.id === segmentId);
    
    if (currentIndex > 0) {
      const newOrder = arrayMove(segmentsList, currentIndex, currentIndex - 1);
      const segmentIds = newOrder.map((segment: Segment) => segment.id);
      reorderSegmentsMutation.mutate(segmentIds);
    }
  };

  const handleMoveDown = (segmentId: number) => {
    const segmentsList = segments || [];
    const currentIndex = segmentsList.findIndex((segment: Segment) => segment.id === segmentId);
    
    if (currentIndex < segmentsList.length - 1) {
      const newOrder = arrayMove(segmentsList, currentIndex, currentIndex + 1);
      const segmentIds = newOrder.map((segment: Segment) => segment.id);
      reorderSegmentsMutation.mutate(segmentIds);
    }
  };

  // Sort segments
  const sortedSegments = React.useMemo(() => {
    if (!segments) return [];
    
    const segmentsList = [...segments];
    
    segmentsList.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.originalFilename.localeCompare(b.originalFilename);
          break;
        case 'duration':
          comparison = a.duration - b.duration;
          break;
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'genre':
          // Sort by genre, with segments without genre at the end
          const genreA = a.genre || '';
          const genreB = b.genre || '';
          if (genreA === '' && genreB !== '') return 1;
          if (genreA !== '' && genreB === '') return -1;
          comparison = genreA.localeCompare(genreB);
          break;
        case 'segmentNumber':
        default:
          comparison = a.segmentNumber - b.segmentNumber;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return segmentsList;
  }, [segments, sortBy, sortOrder]);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const newFiles: UploadFile[] = [];
    const validTypes = ['audio/wav', 'audio/mpeg', 'audio/mp4', 'audio/x-m4a'];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isValidType = validTypes.includes(file.type) ||
        file.name.toLowerCase().endsWith('.wav') ||
        file.name.toLowerCase().endsWith('.mp3') ||
        file.name.toLowerCase().endsWith('.m4a');

      if (isValidType) {
        newFiles.push({
          file,
          progress: 0,
          status: 'pending',
        });
      }
    }

    setUploadFiles((prev) => [...prev, ...newFiles]);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removeFile = (index: number) => {
    setUploadFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = () => {
    if (uploadFiles.length === 0) return;
    const files = uploadFiles.map((uf) => uf.file);
    uploadSegmentsMutation.mutate(files);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = [t('bytes'), t('kb'), t('mb'), t('gb')];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTranscriptionBadge = (segment: Segment) => {
    if (segment.isTranscribed) {
      return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
        <Check className="w-3 h-3 mr-1" />
        {t("transcribed")}
      </Badge>;
    }
    return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
      <FileText className="w-3 h-3 mr-1" />
      {t("pending")}
    </Badge>;
  };

  const getTranslationBadge = (segment: Segment) => {
    if (segment.isTranslated) {
      return <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">
        <Globe className="w-3 h-3 mr-1" />
        {t("translated")}
      </Badge>;
    }
    return <Badge variant="secondary" className="bg-gray-100 text-gray-600 border-gray-200">
      <Globe className="w-3 h-3 mr-1" />
      {t("notTranslated")}
    </Badge>;
  };

  if (folderLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">{t("loading")}</p>
      </div>
    );
  }

  if (!folder) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">{t("error")}</h2>
          <p className="text-gray-500 mb-4">Pasta não encontrada</p>
          <Link href={`/project/${projectIdNum}`}>
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("backToProjects")}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden bg-white border-b border-gray-200 p-3">
          <div className="flex items-center justify-between">
            <Link href={`/project/${projectIdNum}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Voltar
              </Button>
            </Link>
            <Button
              size="sm"
              className="bg-primary hover:bg-primary-600"
              onClick={() => setIsUploadDialogOpen(true)}
            >
              <Upload className="w-3 h-3 mr-1" />
              {t("uploadSegments")}
            </Button>
          </div>
        </div>

        {/* Desktop Header */}
        <header className="hidden md:block bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <Link href={`/project/${projectIdNum}`}>
              <Button variant="ghost">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t("backToProjects")}
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={handleExportCSV}
              disabled={!segments || segments.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              {t("exportCSV")}
            </Button>
            <Button
              className="bg-primary hover:bg-primary-600"
              onClick={() => setIsUploadDialogOpen(true)}
            >
              <Upload className="w-4 h-4 mr-2" />
              {t("uploadSegments")}
            </Button>
          </div>

          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <FileAudio className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="font-roboto font-bold text-2xl text-gray-900">{folder.name}</h2>
              {folder.description && (
                <p className="text-sm text-gray-500 mt-1">{folder.description}</p>
              )}
            </div>
            <Badge variant="outline">{t("segmentsCount", { count: segments.length })}</Badge>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-3 md:p-6">
          {/* Mobile Folder Info */}
          <div className="md:hidden mb-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg mb-2">{folder.name}</h3>
                {folder.description && (
                  <p className="text-sm text-gray-600 mb-2">{folder.description}</p>
                )}
                <Badge variant="outline">{t("segmentsCount", { count: segments.length })}</Badge>
              </CardContent>
            </Card>
          </div>

          {/* Segments List */}
          {segmentsLoading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-gray-500">{t("loadingSegments")}</p>
            </div>
          ) : segments.length === 0 ? (
            <EmptyState
              icon={FileAudio}
              title={t("noSegmentsYet")}
              description={t("createFirstSegment")}
              action={{
                label: t("uploadSegments"),
                onClick: () => setIsUploadDialogOpen(true),
              }}
            />
          ) : (
            <div className="space-y-4">
              {/* Sort Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-lg border space-y-3 sm:space-y-0">
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                  <span className="text-sm font-medium text-gray-700">{t('sortBy')}:</span>
                  <div className="flex items-center space-x-2">
                    <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                      <SelectTrigger className="w-32 sm:w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="segmentNumber">{t('order')}</SelectItem>
                        <SelectItem value="name">{t('name')}</SelectItem>
                        <SelectItem value="duration">{t('duration')}</SelectItem>
                        <SelectItem value="date">{t('date')}</SelectItem>
                        <SelectItem value="genre">{t('genre')}</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="flex items-center space-x-1"
                    >
                      {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                      <span className="text-sm hidden sm:inline">{sortOrder === 'asc' ? t('ascending') : t('descending')}</span>
                    </Button>
                  </div>
                </div>
                
                <div className="text-sm text-gray-500">
                  {sortedSegments.length} segment{sortedSegments.length !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Sortable Segments */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={sortedSegments.map(s => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sortedSegments.map((segment, index) => (
                      <SortableSegment
                        key={segment.id}
                        segment={segment}
                        onDelete={handleDeleteSegment}
                        onMoveUp={handleMoveUp}
                        onMoveDown={handleMoveDown}
                        canMoveUp={index > 0}
                        canMoveDown={index < sortedSegments.length - 1}
                        user={user}
                        t={t}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}
        </main>
      </div>

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("uploadSegments")}</DialogTitle>
            <DialogDescription>
              {t("selectAudioFiles")} (WAV, MP3, M4A)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Drop Zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging ? 'border-primary bg-primary-50' : 'border-gray-300'
                }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">{t("dragDropFiles")}</p>
              <p className="text-xs text-gray-500">WAV, MP3, M4A</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".wav,.mp3,.m4a,audio/*"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files)}
              />
            </div>

            {/* File List */}
            {uploadFiles.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {uploadFiles.map((uploadFile, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <FileAudio className="w-5 h-5 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {uploadFile.file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(uploadFile.file.size)}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFile(index)}
                      disabled={uploadSegmentsMutation.isPending}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Progress */}
            {uploadSegmentsMutation.isPending && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">{t("uploadingFiles")}</p>
                <Progress value={50} className="w-full" />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsUploadDialogOpen(false);
                setUploadFiles([]);
              }}
              disabled={uploadSegmentsMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploadFiles.length === 0 || uploadSegmentsMutation.isPending}
              className="bg-primary hover:bg-primary-600"
            >
              {uploadSegmentsMutation.isPending ? t("uploadingFiles") : t("uploadSegments")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
