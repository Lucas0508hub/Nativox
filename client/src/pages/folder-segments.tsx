import { useState, useRef } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Sidebar } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Upload,
  FileAudio,
  Clock,
  FileText,
  X,
  CheckCircle,
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

export default function FolderSegmentsPage() {
  const { projectId, folderId } = useParams<{ projectId: string; folderId: string }>();
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
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
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTranscriptionBadge = (segment: Segment) => {
    if (segment.transcription) {
      return <Badge variant="default">{t("transcribed")}</Badge>;
    }
    return <Badge variant="secondary">{t("notTranscribed")}</Badge>;
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
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      <div className="hidden md:block">
        <Sidebar />
      </div>

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {segments.map((segment) => (
                <Link
                  key={segment.id}
                  href={`/project/${projectIdNum}/folder/${folderIdNum}/segment/${segment.id}`}
                >
                  <Card className="shadow-sm hover:shadow-md transition-shadow duration-300 cursor-pointer h-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
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
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between">
                        {getTranscriptionBadge(segment)}
                        {segment.isTranscribed && (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
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
