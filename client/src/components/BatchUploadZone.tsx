import { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  File, 
  CheckCircle, 
  AlertCircle, 
  X,
  Loader2,
  Play,
  Pause,
  RotateCcw,
  FileAudio,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import { authenticatedFetchFormData } from "@/lib/api";

export interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error' | 'paused';
  error?: string;
  uploadedAt?: Date;
  retryCount?: number;
}

interface BatchUploadZoneProps {
  onUploadComplete?: (results: UploadFile[], projectInfo?: { projectId: number; folderId: number }) => void;
  onUploadProgress?: (files: UploadFile[]) => void;
  accept?: string;
  maxSize?: number;
  maxFiles?: number;
  batchSize?: number;
  className?: string;
  projectId?: number;
  folderId?: number;
  projectName?: string;
  languageId?: number;
}

export function BatchUploadZone({
  onUploadComplete,
  onUploadProgress,
  accept = ".wav,.mp3,.m4a,audio/*",
  maxSize = 500 * 1024 * 1024,
  maxFiles = 1000,
  batchSize = 5,
  className = "",
  projectId,
  folderId,
  projectName,
  languageId
}: BatchUploadZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [uploadStats, setUploadStats] = useState({
    total: 0,
    completed: 0,
    failed: 0,
    pending: 0
  });
  const [createdProjectInfo, setCreatedProjectInfo] = useState<{ projectId: number; folderId: number } | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadQueueRef = useRef<UploadFile[]>([]);
  const activeUploadsRef = useRef<Set<string>>(new Set());
  const { toast } = useToast();
  const { t } = useLanguage();

  // Update stats when files change
  useEffect(() => {
    const stats = {
      total: uploadFiles.length,
      completed: uploadFiles.filter(f => f.status === 'completed').length,
      failed: uploadFiles.filter(f => f.status === 'error').length,
      pending: uploadFiles.filter(f => f.status === 'pending' || f.status === 'paused').length
    };
    setUploadStats(stats);
    onUploadProgress?.(uploadFiles);
  }, [uploadFiles, onUploadProgress]);

  const generateFileId = () => {
    return Math.random().toString(36).substr(2, 9);
  };

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSize) {
      return `File too large. Maximum size is ${formatFileSize(maxSize)}`;
    }

    // Check file type
    const validTypes = ['audio/wav', 'audio/mpeg', 'audio/mp4', 'audio/x-m4a'];
    const isValidType = validTypes.includes(file.type) || 
                       file.name.toLowerCase().endsWith('.wav') ||
                       file.name.toLowerCase().endsWith('.mp3') ||
                       file.name.toLowerCase().endsWith('.m4a');

    if (!isValidType) {
      return 'Invalid file type. Only WAV, MP3, and M4A files are supported.';
    }

    return null;
  };

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    const newFiles: UploadFile[] = [];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Check if we've reached the maximum number of files
      if (uploadFiles.length + newFiles.length >= maxFiles) {
        errors.push(`Maximum ${maxFiles} files allowed. Skipping remaining files.`);
        break;
      }

      // Check for duplicate files
      const isDuplicate = uploadFiles.some(uf => 
        uf.file.name === file.name && uf.file.size === file.size
      );
      
      if (isDuplicate) {
        errors.push(`File "${file.name}" is already in the queue.`);
        continue;
      }

      const validationError = validateFile(file);
      if (validationError) {
        errors.push(`${file.name}: ${validationError}`);
        continue;
      }

      newFiles.push({
        id: generateFileId(),
        file,
        progress: 0,
        status: 'pending',
        retryCount: 0
      });
    }

    if (errors.length > 0) {
      toast({
        title: "Some files were skipped",
        description: errors.slice(0, 3).join('\n') + (errors.length > 3 ? `\n... and ${errors.length - 3} more` : ''),
        variant: "destructive",
      });
    }

    if (newFiles.length > 0) {
      setUploadFiles(prev => [...prev, ...newFiles]);
      toast({
        title: "Files added",
        description: `${newFiles.length} file(s) added to upload queue.`,
      });
    }
  }, [uploadFiles, maxFiles, maxSize, toast]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
    // Reset input value to allow selecting the same files again
    if (e.target) {
      e.target.value = '';
    }
  };

  const removeFile = (fileId: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== fileId));
    activeUploadsRef.current.delete(fileId);
  };

  const clearAllFiles = () => {
    setUploadFiles([]);
    activeUploadsRef.current.clear();
    setIsUploading(false);
    setIsPaused(false);
    setCurrentBatch(0);
  };

  const retryFile = (fileId: string) => {
    setUploadFiles(prev => prev.map(f => 
      f.id === fileId 
        ? { ...f, status: 'pending', progress: 0, error: undefined, retryCount: (f.retryCount || 0) + 1 }
        : f
    ));
  };

  const retryFailedFiles = () => {
    setUploadFiles(prev => prev.map(f => 
      f.status === 'error' 
        ? { ...f, status: 'pending', progress: 0, error: undefined, retryCount: (f.retryCount || 0) + 1 }
        : f
    ));
  };

  const uploadSingleFile = async (uploadFile: UploadFile): Promise<void> => {
    const formData = new FormData();
    
    const endpoint = folderId 
      ? `/api/folders/${folderId}/upload-segments`
      : '/api/upload-batch';
    
    const fieldName = folderId ? 'audioFiles' : 'files';
    formData.append(fieldName, uploadFile.file);
    
    if (projectId) formData.append('projectId', projectId.toString());
    if (folderId) formData.append('folderId', folderId.toString());
    if (projectName) formData.append('projectName', projectName);
    if (languageId) formData.append('languageId', languageId.toString());

    let progressInterval: NodeJS.Timeout | undefined;

    try {
      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 0 } : f
      ));

      progressInterval = setInterval(() => {
        setUploadFiles(prev => prev.map(f => {
          if (f.id === uploadFile.id && f.status === 'uploading' && f.progress < 90) {
            return { ...f, progress: Math.min(f.progress + 10, 90) };
          }
          return f;
        }));
      }, 200);

      const response = await authenticatedFetchFormData(endpoint, formData, {
        method: 'POST',
      });

      if (progressInterval) {
        clearInterval(progressInterval);
      }

      if (response.ok) {
        setUploadFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, status: 'completed', progress: 100, uploadedAt: new Date() }
            : f
        ));
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Upload failed' }));
        setUploadFiles(prev => prev.map(f => 
          f.id === uploadFile.id ? { ...f, status: 'error', error: errorData.message || 'Upload failed' } : f
        ));
        throw new Error(errorData.message || 'Upload failed');
      }
    } catch (error) {
      // Clear progress interval if it exists
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      
      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { ...f, status: 'error', error: error instanceof Error ? error.message : 'Upload failed' } : f
      ));
      throw error;
    }
  };

  const processBatch = async (files: UploadFile[]) => {
    const pendingFiles = files.filter(f => f.status === 'pending' || f.status === 'paused');
    
    if (pendingFiles.length === 0) return;

    if (!folderId) {
      await uploadAllFilesAtOnce(pendingFiles);
    } else {
      const uploadPromises = pendingFiles.map(async (file) => {
        activeUploadsRef.current.add(file.id);
        try {
          await uploadSingleFile(file);
        } catch (error) {
          console.error(`Upload failed for ${file.file.name}:`, error);
        } finally {
          activeUploadsRef.current.delete(file.id);
        }
      });

      await Promise.allSettled(uploadPromises);
    }
  };

  const uploadAllFilesAtOnce = async (files: UploadFile[]) => {
    const formData = new FormData();
    
    files.forEach(file => {
      formData.append('files', file.file);
    });
    
    if (projectId) formData.append('projectId', projectId.toString());
    if (folderId) formData.append('folderId', folderId.toString());
    if (projectName) formData.append('projectName', projectName);
    if (languageId) formData.append('languageId', languageId.toString());

    try {
      setUploadFiles(prev => prev.map(f => 
        files.some(file => file.id === f.id) 
          ? { ...f, status: 'uploading', progress: 0 }
          : f
      ));

      const progressInterval = setInterval(() => {
        setUploadFiles(prev => prev.map(f => {
          if (files.some(file => file.id === f.id) && f.status === 'uploading' && f.progress < 90) {
            return { ...f, progress: Math.min(f.progress + 10, 90) };
          }
          return f;
        }));
      }, 200);

      const response = await authenticatedFetchFormData('/api/upload-batch', formData, {
        method: 'POST',
      });

      clearInterval(progressInterval);

      if (response.ok) {
        const result = await response.json();
        const updatedFiles = uploadFiles.map(f => 
          files.some(file => file.id === f.id)
            ? { ...f, status: 'completed' as const, progress: 100, uploadedAt: new Date() }
            : f
        );
        setUploadFiles(updatedFiles);
        
        if (result.projectId) {
          const projectInfo = {
            projectId: result.projectId,
            folderId: result.folderId
          };
          setCreatedProjectInfo(projectInfo);
          console.log('Created project info:', projectInfo);
        }
        
        onUploadComplete?.(updatedFiles, result.projectId ? {
          projectId: result.projectId,
          folderId: result.folderId
        } : undefined);
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Upload failed' }));
        setUploadFiles(prev => prev.map(f => 
          files.some(file => file.id === f.id)
            ? { ...f, status: 'error', error: errorData.message || 'Upload failed' }
            : f
        ));
        throw new Error(errorData.message || 'Upload failed');
      }
    } catch (error) {
      setUploadFiles(prev => prev.map(f => 
        files.some(file => file.id === f.id)
          ? { ...f, status: 'error', error: error instanceof Error ? error.message : 'Upload failed' }
          : f
      ));
      throw error;
    }
  };

  const startUpload = async () => {
    if (uploadFiles.length === 0) return;

    setIsUploading(true);
    setIsPaused(false);
    setCurrentBatch(0);

    const pendingFiles = uploadFiles.filter(f => f.status === 'pending' || f.status === 'paused');
    
    if (pendingFiles.length === 0) {
      setIsUploading(false);
      const completedFiles = uploadFiles.filter(f => f.status === 'completed');
      if (completedFiles.length > 0) {
        onUploadComplete?.(uploadFiles, createdProjectInfo || undefined);
      }
      return;
    }

    if (!folderId) {
      await processBatch(pendingFiles);
    } else {
      for (let i = 0; i < pendingFiles.length; i += batchSize) {
        if (isPaused) break;
        
        const batch = pendingFiles.slice(i, i + batchSize);
        setCurrentBatch(Math.floor(i / batchSize) + 1);
        
        await processBatch(batch);
      }
    }

    setIsUploading(false);
  };

  const pauseUpload = () => {
    setIsPaused(true);
    setIsUploading(false);
  };

  const resumeUpload = () => {
    setIsPaused(false);
    startUpload();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'uploading':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'paused':
        return <Pause className="w-4 h-4 text-yellow-500" />;
      default:
        return <FileAudio className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: UploadFile['status']) => {
    const variants = {
      completed: 'bg-green-100 text-green-800',
      error: 'bg-red-100 text-red-800',
      uploading: 'bg-blue-100 text-blue-800',
      paused: 'bg-yellow-100 text-yellow-800',
      pending: 'bg-gray-100 text-gray-800'
    };

    return (
      <Badge className={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const overallProgress = uploadStats.total > 0 
    ? Math.round((uploadStats.completed / uploadStats.total) * 100)
    : 0;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Upload Zone */}
      <Card>
        <CardContent className="p-6">
          <div
            className={cn(
              "upload-zone rounded-lg p-8 text-center border-2 border-dashed transition-all cursor-pointer",
              dragActive && "border-primary bg-primary/5",
              isUploading && "pointer-events-none opacity-50"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {t('dragDropFiles') || 'Drag & drop audio files here'}
            </h3>
            <p className="text-gray-500 mb-4">
              {t('orClickToSelect') || 'or click to select files'}
            </p>
            <p className="text-xs text-gray-400 mb-2">
              {t('supportedFormats') || 'Supported formats: WAV, MP3, M4A'}
            </p>
            <p className="text-xs text-gray-400 mb-2">
              {t('maxFileSize') || `Max file size: ${formatFileSize(maxSize)}`}
            </p>
            <p className="text-xs text-gray-400">
              {t('maxFiles') || `Max files: ${maxFiles}`}
            </p>
            
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept={accept}
              multiple
              onChange={handleFileInput}
              disabled={isUploading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Upload Stats */}
      {uploadFiles.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {t('uploadQueue') || 'Upload Queue'} ({uploadFiles.length})
              </h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFiles}
                  disabled={isUploading}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t('clearAll') || 'Clear All'}
                </Button>
                {uploadStats.failed > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={retryFailedFiles}
                    disabled={isUploading}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    {t('retryFailed') || 'Retry Failed'}
                  </Button>
                )}
              </div>
            </div>

            {/* Overall Progress */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span>{t('overallProgress') || 'Overall Progress'}</span>
                <span>{overallProgress}%</span>
              </div>
              <Progress value={overallProgress} className="h-2" />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{uploadStats.total}</div>
                <div className="text-xs text-gray-500">{t('total') || 'Total'}</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{uploadStats.completed}</div>
                <div className="text-xs text-gray-500">{t('completed') || 'Completed'}</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{uploadStats.failed}</div>
                <div className="text-xs text-gray-500">{t('failed') || 'Failed'}</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">{uploadStats.pending}</div>
                <div className="text-xs text-gray-500">{t('pending') || 'Pending'}</div>
              </div>
            </div>

            {/* Batch Info */}
            {isUploading && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-700">
                    {t('processingBatch') || 'Processing batch'} {currentBatch} of {Math.ceil(uploadStats.pending / batchSize)}
                  </span>
                  <span className="text-sm text-blue-600">
                    {t('batchSize') || 'Batch size'}: {batchSize}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* File List */}
      {uploadFiles.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold mb-4">
              {t('files') || 'Files'}
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {uploadFiles.map((uploadFile) => (
                <div key={uploadFile.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {getStatusIcon(uploadFile.status)}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{uploadFile.file.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-gray-500">{formatFileSize(uploadFile.file.size)}</p>
                        {getStatusBadge(uploadFile.status)}
                        {uploadFile.retryCount && uploadFile.retryCount > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {t('retry') || 'Retry'} {uploadFile.retryCount}
                          </Badge>
                        )}
                      </div>
                      {uploadFile.error && (
                        <p className="text-xs text-red-600 mt-1">{uploadFile.error}</p>
                      )}
                      {uploadFile.status === 'uploading' && (
                        <div className="mt-2">
                          <Progress value={uploadFile.progress} className="h-1" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {uploadFile.status === 'error' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => retryFile(uploadFile.id)}
                        disabled={isUploading}
                      >
                        <RotateCcw className="w-3 h-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(uploadFile.id)}
                      disabled={isUploading}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Controls */}
      {uploadFiles.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {!isUploading ? (
                  <Button
                    onClick={startUpload}
                    disabled={uploadStats.pending === 0}
                    className="flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    {t('startUpload') || 'Start Upload'}
                  </Button>
                ) : (
                  <Button
                    onClick={isPaused ? resumeUpload : pauseUpload}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    {isPaused ? (
                      <>
                        <Play className="w-4 h-4" />
                        {t('resume') || 'Resume'}
                      </>
                    ) : (
                      <>
                        <Pause className="w-4 h-4" />
                        {t('pause') || 'Pause'}
                      </>
                    )}
                  </Button>
                )}
              </div>
              
              <div className="text-sm text-gray-500">
                {uploadStats.pending > 0 && (
                  <span>
                    {uploadStats.pending} {t('filesPending') || 'files pending'}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
