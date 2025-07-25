import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";
import { Sidebar } from "@/components/ui/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { 
  FolderOpen, 
  Clock, 
  CheckCircle, 
  Target, 
  ArrowUp, 
  Plus,
  Mic,
  CloudUpload,
  Eye,
  Download,
  Play,
  Pause,
  Volume2,
  Brain
} from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const { t } = useLanguage();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    retry: false,
  });

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["/api/projects"],
    retry: false,
  });

  const { data: languages } = useQuery({
    queryKey: ["/api/languages"],
    retry: false,
  });

  if (isLoading || !isAuthenticated) {
    return <div>{t('loading')}</div>;
  }

  const getStatusBadge = (status: string) => {
    const statusMap = {
      processing: { label: t('processing'), className: "status-processing" },
      ready_for_validation: { label: t('readyForValidation'), className: "status-ready" },
      in_validation: { label: t('inValidation'), className: "status-validation" },
      completed: { label: t('completed'), className: "status-completed" },
      failed: { label: t('error'), className: "status-failed" },
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.processing;
    return (
      <Badge className={statusInfo.className}>
        {statusInfo.label}
      </Badge>
    );
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}min ${secs}s`;
    }
    return `${minutes}min ${secs}s`;
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Navigation */}
        <div className="md:hidden bg-white border-b border-gray-200 p-3">
          <div className="flex items-center justify-between">
            <h2 className="font-roboto font-bold text-lg text-gray-900">{t('dashboard')}</h2>
            <Button 
              size="sm" 
              className="bg-primary hover:bg-primary-600"
              onClick={() => window.location.href = '/upload'}
            >
              <Plus className="w-4 h-4 mr-1" />
              {t('newProject')}
            </Button>
          </div>
        </div>
        
        {/* Desktop Header */}
        <header className="hidden md:block bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-roboto font-bold text-2xl text-gray-900">{t('dashboard')}</h2>
              <p className="text-sm text-gray-500">{t('dashboardOverview')}</p>
            </div>
            <div className="flex items-center space-x-4">
              {user?.role === 'manager' && (
                <Select>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder={t('allLanguages')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allLanguages')}</SelectItem>
                    {languages?.map((lang: any) => (
                      <SelectItem key={lang.id} value={lang.id.toString()}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              <Button 
                className="bg-primary hover:bg-primary-600"
                onClick={() => window.location.href = '/upload'}
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('newProject')}
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-3 md:p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
            <Card className="shadow-sm">
              <CardContent className="p-3 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm font-medium text-gray-500">{t('activeProjectsLabel')}</p>
                    <p className="text-xl md:text-3xl font-bold text-gray-900">
                      {statsLoading ? "..." : stats?.activeProjects || 0}
                    </p>
                  </div>
                  <div className="w-8 h-8 md:w-12 md:h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                    <FolderOpen className="text-primary w-4 h-4 md:w-6 md:h-6" />
                  </div>
                </div>
                <div className="mt-2 md:mt-4 flex items-center">
                  <span className="text-success-500 text-xs md:text-sm font-medium flex items-center">
                    <ArrowUp className="w-3 h-3 mr-1" />
                    8.2%
                  </span>
                  <span className="text-gray-500 text-xs md:text-sm ml-2 hidden md:block">{t('vsPreviousMonth')}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="p-3 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm font-medium text-gray-500">{t('processedHoursLabel')}</p>
                    <p className="text-xl md:text-3xl font-bold text-gray-900">
                      {statsLoading ? "..." : stats?.processedHours || 0}
                    </p>
                  </div>
                  <div className="w-8 h-8 md:w-12 md:h-12 bg-success-100 rounded-lg flex items-center justify-center">
                    <Clock className="text-success-500 w-4 h-4 md:w-6 md:h-6" />
                  </div>
                </div>
                <div className="mt-2 md:mt-4 flex items-center">
                  <span className="text-success-500 text-xs md:text-sm font-medium flex items-center">
                    <ArrowUp className="w-3 h-3 mr-1" />
                    12.5%
                  </span>
                  <span className="text-gray-500 text-xs md:text-sm ml-2 hidden md:block">{t('vsPreviousMonth')}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="p-3 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm font-medium text-gray-500">{t('validatedSegmentsLabel')}</p>
                    <p className="text-xl md:text-3xl font-bold text-gray-900">
                      {statsLoading ? "..." : stats?.validatedSegments || 0}
                    </p>
                  </div>
                  <div className="w-8 h-8 md:w-12 md:h-12 bg-warning-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="text-warning-500 w-4 h-4 md:w-6 md:h-6" />
                  </div>
                </div>
                <div className="mt-2 md:mt-4 flex items-center">
                  <span className="text-success-500 text-xs md:text-sm font-medium flex items-center">
                    <ArrowUp className="w-3 h-3 mr-1" />
                    15.3%
                  </span>
                  <span className="text-gray-500 text-xs md:text-sm ml-2 hidden md:block">{t('vsPreviousMonth')}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">{t('accuracyRateLabel')}</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {statsLoading ? "..." : `${stats?.accuracyRate || 0}%`}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-error-100 rounded-lg flex items-center justify-center">
                    <Target className="text-error-500 text-xl" />
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <span className="text-success-500 text-sm font-medium flex items-center">
                    <ArrowUp className="text-xs mr-1" />
                    2.1%
                  </span>
                  <span className="text-gray-500 text-sm ml-2">{t('vsPreviousMonth')}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Recent Projects */}
            <div className="lg:col-span-2">
              <Card className="shadow-sm">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="font-roboto font-semibold text-lg text-gray-900">{t('recentProjects')}</h3>
                    <Button 
                      variant="ghost" 
                      className="text-primary hover:text-primary-600"
                      onClick={() => window.location.href = '/projects'}
                    >
                      {t('viewAll')}
                    </Button>
                  </div>
                </div>
                
                <div className="divide-y divide-gray-100">
                  {projectsLoading ? (
                    <div className="p-6 text-center text-gray-500">{t('loadingProjects')}</div>
                  ) : projects?.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">{t('noProjectsFound')}</div>
                  ) : (
                    projects?.slice(0, 3).map((project: any) => (
                      <div key={project.id} className="p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                              <Mic className="text-primary" />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">{project.name}</h4>
                              <p className="text-sm text-gray-500">
                                {formatDuration(project.duration)} • {new Date(project.createdAt).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-900">
                                {project.validatedSegments || 0}/{project.totalSegments || 0} segmentos
                              </p>
                              <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                                <div 
                                  className="bg-primary h-2 rounded-full" 
                                  style={{ 
                                    width: `${project.totalSegments > 0 ? 
                                      (project.validatedSegments / project.totalSegments) * 100 : 0}%` 
                                  }}
                                />
                              </div>
                            </div>
                            {getStatusBadge(project.status)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="space-y-6">
              <Card className="shadow-sm">
                <CardContent className="p-6">
                  <h3 className="font-roboto font-semibold text-lg text-gray-900 mb-4">Ações Rápidas</h3>
                  
                  <div 
                    className="upload-zone rounded-lg p-6 text-center mb-4 cursor-pointer"
                    onClick={() => window.location.href = '/upload'}
                  >
                    <CloudUpload className="text-3xl text-primary mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-900 mb-1">Carregar Novo Áudio</p>
                    <p className="text-xs text-gray-500">Arraste um arquivo ou clique para selecionar</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => window.location.href = '/validation'}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Revisar Validações Pendentes
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => window.location.href = '/transcription-learning'}
                    >
                      <Brain className="w-4 h-4 mr-2" />
                      Aprendizado Contextual
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => window.location.href = '/projects'}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Exportar Projetos Concluídos
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* System Status */}
              <Card className="shadow-sm">
                <CardContent className="p-6">
                  <h3 className="font-roboto font-semibold text-lg text-gray-900 mb-4">Status do Sistema</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Fila de Processamento</span>
                      <span className="text-sm font-medium text-gray-900">3 arquivos</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Tempo Médio de Processamento</span>
                      <span className="text-sm font-medium text-gray-900">2.3 min/h</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Precisão Boundary F-score</span>
                      <span className="text-sm font-medium text-success-600">0.94</span>
                    </div>
                    
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                      <span className="text-sm text-gray-600">Status Geral</span>
                      <span className="inline-flex items-center text-success-600">
                        <div className="w-2 h-2 bg-success-500 rounded-full mr-2"></div>
                        <span className="text-sm font-medium">Operacional</span>
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Audio Validation Preview */}
          <Card className="shadow-sm mb-8">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-roboto font-semibold text-lg text-gray-900">Interface de Validação</h3>
                  <p className="text-sm text-gray-500">Prévia da ferramenta de revisão e correção de segmentos</p>
                </div>
                <Button 
                  className="bg-primary hover:bg-primary-600"
                  onClick={() => window.location.href = '/validation'}
                >
                  Abrir Validação Completa
                </Button>
              </div>
            </div>
            
            <CardContent className="p-6">
              {/* Audio File Info */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                    <Mic className="text-primary text-sm" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">entrevista_podcast_ep15.wav</h4>
                    <p className="text-sm text-gray-500">45:32 • Português • 15 cortes propostos</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button size="sm" variant="ghost">
                    <Play className="text-sm" />
                  </Button>
                  <Button size="sm" variant="ghost">
                    <Pause className="text-sm" />
                  </Button>
                  <Button size="sm" variant="ghost">
                    <Volume2 className="text-sm" />
                  </Button>
                </div>
              </div>
              
              {/* Mock Waveform */}
              <div className="waveform-container mb-4 relative">
                {Array.from({ length: 50 }).map((_, i) => (
                  <div 
                    key={i}
                    className="waveform-bar" 
                    style={{ 
                      left: `${(i + 1) * 2}%`, 
                      height: `${Math.random() * 60 + 10}px` 
                    }}
                  />
                ))}
                
                <div className="cut-point" style={{ left: "15%" }} title="Corte 1: 00:23" />
                <div className="cut-point" style={{ left: "35%" }} title="Corte 2: 01:15" />
                <div className="cut-point" style={{ left: "65%" }} title="Corte 3: 02:45" />
                <div className="cut-point" style={{ left: "85%" }} title="Corte 4: 03:28" />
              </div>
              
              {/* Segment Controls */}
              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <span>00:00</span>
                <div className="flex items-center space-x-4">
                  <Button variant="ghost" size="sm" className="text-primary">
                    Adicionar Corte
                  </Button>
                  <Button variant="ghost" size="sm" className="text-error-500">
                    Remover Corte
                  </Button>
                  <Button variant="ghost" size="sm">
                    Zoom
                  </Button>
                </div>
                <span>45:32</span>
              </div>
              
              {/* Current Segment Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-medium text-gray-900">Segmento Atual: #3</h5>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">01:15 - 02:45 (1:30)</span>
                    <Badge className="status-ready">Pendente Validação</Badge>
                  </div>
                </div>
                
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Transcrição</label>
                  <Textarea 
                    className="resize-none" 
                    rows={2} 
                    placeholder="Digite a transcrição deste segmento..."
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Button size="sm" className="bg-success-500 hover:bg-success-600">
                      Aprovar Segmento
                    </Button>
                    <Button size="sm" variant="destructive">
                      Rejeitar Segmento
                    </Button>
                  </div>
                  <div className="flex items-center text-xs text-gray-500">
                    <span>Confiança do algoritmo: </span>
                    <span className="ml-1 font-medium text-success-600">0.87</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
