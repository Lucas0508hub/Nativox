import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";
import { Sidebar } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Upload, File, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useLocation } from "wouter";

export default function UploadPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [projectName, setProjectName] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const { data: languages } = useQuery({
    queryKey: ["/api/languages"],
    retry: false,
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await apiRequest("POST", "/api/upload", formData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: t('uploadSuccess'),
        description: t('uploadSuccess'),
      });
      setSelectedFile(null);
      setProjectName("");
      setSelectedLanguage("");
      
      // Redirect to projects page after 2 seconds
      setTimeout(() => {
        setLocation("/projects");
      }, 2000);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: t('unauthorized'),
          description: t('unauthorized'),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: t('uploadError'),
        description: error.message || t('uploadError'),
        variant: "destructive",
      });
    },
  });

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
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (isValidAudioFile(file)) {
        setSelectedFile(file);
        if (!projectName) {
          setProjectName(file.name.replace(/\.[^/.]+$/, ""));
        }
      } else {
        toast({
          title: t('invalidFormat'),
          description: t('selectValidAudio'),
          variant: "destructive",
        });
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (isValidAudioFile(file)) {
        setSelectedFile(file);
        if (!projectName) {
          setProjectName(file.name.replace(/\.[^/.]+$/, ""));
        }
      } else {
        toast({
          title: t('invalidFormat'),
          description: t('selectValidAudio'),
          variant: "destructive",
        });
      }
    }
  };

  const isValidAudioFile = (file: File) => {
    const validTypes = ['audio/wav', 'audio/mpeg', 'audio/mp4', 'audio/x-m4a'];
    return validTypes.includes(file.type) || 
           file.name.toLowerCase().endsWith('.wav') ||
           file.name.toLowerCase().endsWith('.mp3') ||
           file.name.toLowerCase().endsWith('.m4a');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile || !projectName) {
      toast({
        title: t('requiredFields'),
        description: t('selectFileAndName'),
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('audio', selectedFile);
    formData.append('name', projectName);
    // Use a default language ID or make it optional
    formData.append('languageId', '1'); // Default to first language or make server handle this

    uploadMutation.mutate(formData);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Filter languages based on user role
  const availableLanguages = user?.role === 'manager' 
    ? languages 
    : user?.userLanguages || [];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden bg-white border-b border-gray-200 p-3">
          <h2 className="font-roboto font-bold text-lg text-gray-900">{t('uploadTitle')}</h2>
          <p className="text-xs text-gray-500">{t('uploadDescription')}</p>
        </div>
        
        {/* Desktop Header */}
        <header className="hidden md:block bg-white border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="font-roboto font-bold text-2xl text-gray-900">{t('uploadTitle')}</h2>
            <p className="text-sm text-gray-500">
              {t('uploadDescription')}
            </p>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-3 md:p-6">
          <div className="max-w-4xl mx-auto">
            {/* Upload Form */}
            <Card className="mb-4 md:mb-8">
              <CardHeader className="p-3 md:p-6">
                <CardTitle className="flex items-center space-x-2 text-base md:text-lg">
                  <Upload className="w-4 h-4 md:w-5 md:h-5" />
                  <span>{t('newSegmentationProject')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 md:p-6">
                <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
                  {/* File Upload Zone */}
                  <div className="space-y-2">
                    <Label>{t('audioFile')} *</Label>
                    <div
                      className={`upload-zone rounded-lg p-4 md:p-8 text-center border-2 border-dashed transition-all ${
                        dragActive ? 'dragover' : ''
                      }`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById('file-upload')?.click()}
                    >
                      {selectedFile ? (
                        <div className="flex items-center justify-center space-x-3">
                          <File className="w-8 h-8 text-primary" />
                          <div className="text-left">
                            <p className="font-medium text-gray-900">{selectedFile.name}</p>
                            <p className="text-sm text-gray-500">
                              {formatFileSize(selectedFile.size)}
                            </p>
                          </div>
                          <CheckCircle className="w-6 h-6 text-success-500" />
                        </div>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 md:w-12 md:h-12 text-primary mx-auto mb-2 md:mb-4" />
                          <p className="text-base md:text-lg font-medium text-gray-900 mb-1 md:mb-2">
                            {t('dragAudioFile')}
                          </p>
                          <p className="text-xs md:text-sm text-gray-500 mb-2 md:mb-4">
                            {t('clickToSelect')}
                          </p>
                          <p className="text-xs text-gray-400">
                            {t('supportedFormats')}
                          </p>
                        </>
                      )}
                      <input
                        id="file-upload"
                        type="file"
                        className="hidden"
                        accept=".wav,.mp3,.m4a,audio/*"
                        onChange={handleFileChange}
                      />
                    </div>
                  </div>

                  {/* Project Details */}
                  <div className="space-y-2">
                    <Label htmlFor="project-name">{t('projectNameLabel')} *</Label>
                    <Input
                      id="project-name"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder={t('projectNamePlaceholder')}
                      required
                    />
                    <p className="text-sm text-gray-500">
                      {t('projectWillBeProcessed')}
                    </p>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={uploadMutation.isPending || !selectedFile || !projectName}
                      className="bg-primary hover:bg-primary-600"
                    >
                      {uploadMutation.isPending ? (
                        <>
                          <Clock className="w-4 h-4 mr-2 animate-spin" />
                          {t('uploading')}
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Iniciar Processamento
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Processing Information */}
            <Card>
              <CardHeader>
                <CardTitle>Como Funciona o Processamento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <span className="text-primary font-bold">1</span>
                    </div>
                    <h4 className="font-semibold mb-2">Pré-processamento</h4>
                    <p className="text-sm text-gray-600">
                      Isolamento de regiões de fala, normalização de nível sonoro e 
                      extração de curvas de energia e frequência fundamental (F0)
                    </p>
                  </div>

                  <div className="text-center">
                    <div className="w-12 h-12 bg-warning-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <span className="text-warning-600 font-bold">2</span>
                    </div>
                    <h4 className="font-semibold mb-2">Detecção de Limites</h4>
                    <p className="text-sm text-gray-600">
                      Análise prosódica baseada em pausas longas, alongamento silábico 
                      e mudanças de tom para identificar fronteiras de sentença
                    </p>
                  </div>

                  <div className="text-center">
                    <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <span className="text-success-600 font-bold">3</span>
                    </div>
                    <h4 className="font-semibold mb-2">Validação Humana</h4>
                    <p className="text-sm text-gray-600">
                      Interface de revisão permite ajustar cortes incorretos e 
                      adicionar transcrições para cada segmento validado
                    </p>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h5 className="font-medium text-blue-900 mb-2">Critérios de Detecção Automática</h5>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• <strong>Pausas vocálicas:</strong> Silêncios {'>'} 200-300ms são indicadores de fronteira</li>
                    <li>• <strong>Alongamento silábico:</strong> Duração da vogal final aumenta ~30%</li>
                    <li>• <strong>Reset de tom (F0):</strong> Queda ou salto abrupto após a fronteira</li>
                    <li>• <strong>Boundary F-score:</strong> Métrica de qualidade típica {'>'} 0.90</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
