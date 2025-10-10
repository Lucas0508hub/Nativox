import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, X, FileAudio } from 'lucide-react';
import { authenticatedFetchFormData } from '@/lib/api';
import { useLanguage } from '@/lib/i18n';

export default function BatchUpload() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [projectName, setProjectName] = useState<string>('');

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });
      formData.append('projectName', projectName);

      const res = await authenticatedFetchFormData('/api/upload-batch', formData, {
        method: 'POST',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || t('uploadErrorMessage'));
      }

      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Sucesso!',
        description: data.message,
      });
      setSelectedFiles([]);
      setProjectName('');
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      if (data.folderId) {
        queryClient.invalidateQueries({ queryKey: [`/api/folders/${data.folderId}/segments`] });
      }
    },
    onError: (error: Error) => {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...filesArray]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const filesArray = Array.from(e.dataTransfer.files);
      setSelectedFiles(prev => [...prev, ...filesArray]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = () => {
    if (selectedFiles.length === 0) {
      toast({
        title: t('error'),
        description: t('selectAtLeastOneFile'),
        variant: 'destructive',
      });
      return;
    }
    if (!projectName.trim()) {
      toast({
        title: t('error'),
        description: t('enterProjectName'),
        variant: 'destructive',
      });
      return;
    }
    uploadMutation.mutate(selectedFiles);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full p-3 md:p-6">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">{t('uploadTitle')}</h1>
          <p className="text-slate-600 text-sm md:text-base">{t('uploadDescription')}</p>
        </div>

        <Card className="p-4 md:p-6 mb-6">
          <div className="mb-4 md:mb-6">
            <label className="block text-sm font-medium mb-2">{t('projectNameLabel')}</label>
            <Input
              type="text"
              placeholder={t('projectNamePlaceholder')}
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
          </div>

          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-slate-300 rounded-lg p-6 md:p-12 text-center hover:border-slate-400 transition-colors cursor-pointer"
          >
            <input
              type="file"
              id="file-upload"
              multiple
              accept="audio/*,.wav,.mp3,.m4a"
              onChange={handleFileSelect}
              className="hidden"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-3 md:mb-4 text-slate-400" />
              <p className="text-base md:text-lg font-medium mb-2">{t('dragDropFiles')}</p>
              <p className="text-xs md:text-sm text-slate-500">{t('supportedFormats')}</p>
            </label>
          </div>
        </Card>

        {selectedFiles.length > 0 && (
          <Card className="p-4 md:p-6 mb-6">
            <h2 className="text-base md:text-lg font-semibold mb-4">{t('selectedFiles')} ({selectedFiles.length})</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 md:p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                    <FileAudio className="w-4 h-4 md:w-5 md:h-5 text-slate-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-xs md:text-sm truncate">{file.name}</p>
                      <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    disabled={uploadMutation.isPending}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
          <Button
            onClick={handleUpload}
            disabled={uploadMutation.isPending || selectedFiles.length === 0}
            className="flex-1"
          >
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <span className="hidden sm:inline">{t('uploading')}</span>
                <span className="sm:hidden">{t('upload')}...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">{t('doUpload')} ({selectedFiles.length} {t('files')})</span>
                <span className="sm:hidden">{t('upload')} ({selectedFiles.length})</span>
              </>
            )}
          </Button>
          <Button variant="outline" onClick={() => setLocation('/')} className="w-full sm:w-auto">
            {t('cancel')}
          </Button>
        </div>
      </div>
    </div>
  );
}
