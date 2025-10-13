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
import { BatchUploadZone, UploadFile } from '@/components/BatchUploadZone';

export default function BatchUpload() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [projectName, setProjectName] = useState<string>('');
  const [uploadResults, setUploadResults] = useState<UploadFile[]>([]);

  const handleUploadComplete = (results: UploadFile[], projectInfo?: { projectId: number; folderId: number }) => {
    setUploadResults(results);
    const completed = results.filter(f => f.status === 'completed').length;
    const failed = results.filter(f => f.status === 'error').length;
    const total = results.length;
    
    toast({
      title: 'Upload Complete!',
      description: `${completed} files uploaded successfully${failed > 0 ? `, ${failed} failed` : ''}`,
    });
    
    queryClient.invalidateQueries({ queryKey: ['/api/v1/projects'] });
    
    if (completed > 0 || (total > 0 && failed === 0)) {
      setTimeout(() => {
        setLocation('/projects');
      }, 500);
    }
  };

  const handleUploadProgress = (files: UploadFile[]) => {
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full p-3 md:p-6">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">{t('uploadTitle') || 'Batch Audio Upload'}</h1>
          <p className="text-slate-600 text-sm md:text-base">
            {t('uploadDescription') || 'Upload multiple audio files at once with progress tracking and batch processing.'}
          </p>
        </div>

        <Card className="p-4 md:p-6 mb-6">
          <div className="mb-4 md:mb-6">
            <label className="block text-sm font-medium mb-2">{t('projectNameLabel') || 'Project Name'}</label>
            <Input
              type="text"
              placeholder={t('projectNamePlaceholder') || 'Enter project name...'}
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
          </div>
        </Card>

        <BatchUploadZone
          onUploadComplete={handleUploadComplete}
          onUploadProgress={handleUploadProgress}
          projectName={projectName}
          maxFiles={1000}
          batchSize={5}
          className="mb-6"
        />

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => setLocation('/')} className="w-full sm:w-auto">
            {t('cancel') || 'Cancel'}
          </Button>
        </div>
      </div>
    </div>
  );
}
