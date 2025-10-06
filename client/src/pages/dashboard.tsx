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
import { 
  FolderOpen, 
  Clock, 
  CheckCircle, 
  Target, 
  Plus,
  Mic,
  CloudUpload,
  Eye,
  Download,
  FileAudio
} from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";
import { EmptyState } from "@/components/ui/empty-state";

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
            <Card className="relative overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 border-0">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full" />
              <CardContent className="p-3 md:p-6 relative">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-xs md:text-sm font-medium text-gray-500 mb-2">{t('activeProjectsLabel')}</p>
                    <p className="text-2xl md:text-4xl font-bold text-gray-900 mb-1">
                      {statsLoading ? "..." : stats?.activeProjects || 0}
                    </p>
                  </div>
                  <div className="w-10 h-10 md:w-14 md:h-14 bg-gradient-to-br from-primary to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
                    <FolderOpen className="text-white w-5 h-5 md:w-7 md:h-7" strokeWidth={2} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 border-0">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-success-500/10 to-transparent rounded-bl-full" />
              <CardContent className="p-3 md:p-6 relative">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-xs md:text-sm font-medium text-gray-500 mb-2">{t('processedHoursLabel')}</p>
                    <p className="text-2xl md:text-4xl font-bold text-gray-900 mb-1">
                      {statsLoading ? "..." : stats?.processedHours || 0}
                    </p>
                  </div>
                  <div className="w-10 h-10 md:w-14 md:h-14 bg-gradient-to-br from-success-500 to-success-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Clock className="text-white w-5 h-5 md:w-7 md:h-7" strokeWidth={2} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 border-0">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-warning-500/10 to-transparent rounded-bl-full" />
              <CardContent className="p-3 md:p-6 relative">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-xs md:text-sm font-medium text-gray-500 mb-2">{t('validatedSegmentsLabel')}</p>
                    <p className="text-2xl md:text-4xl font-bold text-gray-900 mb-1">
                      {statsLoading ? "..." : stats?.validatedSegments || 0}
                    </p>
                  </div>
                  <div className="w-10 h-10 md:w-14 md:h-14 bg-gradient-to-br from-warning-500 to-warning-600 rounded-xl flex items-center justify-center shadow-lg">
                    <CheckCircle className="text-white w-5 h-5 md:w-7 md:h-7" strokeWidth={2} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 border-0">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-error-500/10 to-transparent rounded-bl-full" />
              <CardContent className="p-3 md:p-6 relative">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-xs md:text-sm font-medium text-gray-500 mb-2">{t('accuracyRateLabel')}</p>
                    <p className="text-2xl md:text-4xl font-bold text-gray-900 mb-1">
                      {statsLoading ? "..." : `${stats?.accuracyRate || 0}%`}
                    </p>
                  </div>
                  <div className="w-10 h-10 md:w-14 md:h-14 bg-gradient-to-br from-error-500 to-error-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Target className="text-white w-5 h-5 md:w-7 md:h-7" strokeWidth={2} />
                  </div>
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
                    <EmptyState
                      icon={FileAudio}
                      title="Nenhum projeto encontrado"
                      description="Comece criando seu primeiro projeto de áudio. Carregue um arquivo e deixe a IA transcrever automaticamente para você."
                      action={{
                        label: "Carregar Primeiro Áudio",
                        onClick: () => window.location.href = '/upload'
                      }}
                    />
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
                      onClick={() => window.location.href = '/projects'}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Exportar Projetos Concluídos
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
