import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";
import { Sidebar } from "@/components/ui/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { 
  Search, 
  Filter, 
  Eye, 
  Download, 
  Trash2, 
  Mic,
  Clock,
  Calendar,
  MoreHorizontal,
  FolderOpen
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function ProjectsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [languageFilter, setLanguageFilter] = useState("all");

  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: number) => {
      await apiRequest("DELETE", `/api/projects/${projectId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: t('projectDeleted'),
        description: t('success'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('error'),
        description: error.message || t('error'),
        variant: "destructive",
      });
    },
  });

  const handleDeleteProject = (projectId: number, projectName: string) => {
    if (confirm(t('confirmDeleteProject', { projectName }))) {
      deleteProjectMutation.mutate(projectId);
    }
  };

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["/api/projects"],
    retry: false,
  });

  const { data: languages = [] } = useQuery({
    queryKey: ["/api/languages"],
    retry: false,
  });

  const getStatusBadge = (status: string) => {
    const statusMap = {
      processing: { label: t('processing'), className: "status-processing" },
      ready_for_transcription: { label: t('readyForValidation'), className: "status-ready" },
      in_transcription: { label: t('inValidation'), className: "status-validation" },
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
      return `${hours}h ${minutes}min`;
    }
    return `${minutes}min ${secs}s`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Filter projects
  const filteredProjects = Array.isArray(projects) ? projects.filter((project: any) => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.originalFilename.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;
    const matchesLanguage = languageFilter === "all" || project.languageId.toString() === languageFilter;
    
    return matchesSearch && matchesStatus && matchesLanguage;
  }) : [];

  const availableLanguages = (user && (user as any).role === 'manager') 
    ? (Array.isArray(languages) ? languages : [])
    : (user && Array.isArray((user as any).userLanguages) ? (user as any).userLanguages : []);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden bg-white border-b border-gray-200 p-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-roboto font-bold text-lg text-gray-900">{t('projects')}</h2>
              <p className="text-xs text-gray-500">{t('projectsDescription')}</p>
            </div>
            <Link href="/upload">
              <Button size="sm" className="bg-primary hover:bg-primary-600">
                <Mic className="w-3 h-3 mr-1" />
                {t('newProject')}
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Desktop Header */}
        <header className="hidden md:block bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-roboto font-bold text-2xl text-gray-900">{t('projects')}</h2>
              <p className="text-sm text-gray-500">
                {t('projectsDescription')}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/upload">
                <Button className="bg-primary hover:bg-primary-600">
                  <Mic className="w-4 h-4 mr-2" />
                  {t('newProject')}
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Filters */}
        <div className="bg-white border-b border-gray-200 p-3 md:px-6 md:py-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-4">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 md:w-4 md:h-4" />
                <Input
                  placeholder={t('searchProjects')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 md:pl-10 text-sm"
                />
              </div>
            </div>
            
            <div className="flex gap-2 md:gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder={t('filterByStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allStatuses')}</SelectItem>
                  <SelectItem value="processing">{t('processing')}</SelectItem>
                  <SelectItem value="ready_for_transcription">{t('readyForValidation')}</SelectItem>
                  <SelectItem value="in_transcription">{t('inValidation')}</SelectItem>
                  <SelectItem value="completed">{t('completed')}</SelectItem>
                  <SelectItem value="failed">{t('error')}</SelectItem>
                </SelectContent>
              </Select>

              {user && (user as any).role === 'manager' ? (
                <Select value={languageFilter} onValueChange={setLanguageFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder={t('filterByLanguage')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allLanguages')}</SelectItem>
                    {Array.isArray(availableLanguages) && availableLanguages.map((lang: any) => (
                      <SelectItem key={lang.id} value={lang.id.toString()}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-3 md:p-6">
          {projectsLoading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500">{t('loadingProjects')}</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title={searchTerm || statusFilter !== "all" || languageFilter !== "all" 
                ? t('noProjectsFound')
                : t('noProjectsYet')
              }
              description={searchTerm || statusFilter !== "all" || languageFilter !== "all"
                ? t('adjustFilters')
                : t('uploadFirstProject')
              }
              action={!searchTerm && statusFilter === "all" && languageFilter === "all" ? {
                label: "Criar Primeiro Projeto",
                onClick: () => window.location.href = '/upload'
              } : undefined}
            />
          ) : (
            <div className="space-y-4">
              {filteredProjects.map((project: any) => (
                <Card key={project.id} className="shadow-sm hover:shadow-md transition-shadow duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                          <Mic className="w-6 h-6 text-primary" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {project.name}
                          </h3>
                          <p className="text-sm text-gray-500 truncate">
                            {project.originalFilename}
                          </p>
                          <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                            <span className="flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {formatDuration(project.duration)}
                            </span>
                            <span className="flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              {formatDate(project.createdAt)}
                            </span>
                            {Array.isArray(languages) && (
                              <span>
                                {languages.find((l: any) => l.id === project.languageId)?.name || 'N/A'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-6">
                        {/* Progress */}
                        <div className="text-right min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {project.transcribedSegments || 0} / {project.totalSegments || 0} segmentos
                          </p>
                          <div className="w-24 mt-1">
                            <Progress 
                              value={project.totalSegments > 0 
                                ? (project.transcribedSegments / project.totalSegments) * 100 
                                : 0
                              } 
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {project.totalSegments > 0 
                              ? `${Math.round((project.transcribedSegments / project.totalSegments) * 100)}% ${t('validated')}`
                              : t('processing') + "..."
                            }
                          </p>
                        </div>

                        {/* Status */}
                        <div className="flex items-center space-x-3">
                          {getStatusBadge(project.status)}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-2">
                          {(project.status === 'ready_for_transcription' || project.status === 'in_transcription' || project.status === 'completed') && (
                            <Link href={`/project/${project.id}`}>
                              <Button size="sm" variant="outline">
                                <Eye className="w-4 h-4 mr-1" />
                                {project.status === 'completed' ? t('review') : t('validate')}
                              </Button>
                            </Link>
                          )}
                          
                          {project.status === 'completed' && (
                            <Button size="sm" variant="outline">
                              <Download className="w-4 h-4 mr-1" />
                              {t('export')}
                            </Button>
                          )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/project/${project.id}`} className="flex items-center">
                                  <FolderOpen className="w-4 h-4 mr-2" />
                                  {t('folders')}
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/validation/${project.id}`} className="flex items-center">
                                  <Eye className="w-4 h-4 mr-2" />
                                  {t('view')} {t('details')}
                                </Link>
                              </DropdownMenuItem>
                              {project.status === 'completed' && (
                                <DropdownMenuItem>
                                  <Download className="w-4 h-4 mr-2" />
                                  {t('export')}
                                </DropdownMenuItem>
                              )}
                              {user && (user as any).role === 'manager' ? (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    className="text-red-600"
                                    onClick={() => handleDeleteProject(project.id, project.name)}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    {t('deleteProject')}
                                  </DropdownMenuItem>
                                </>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>

                    {project.status === 'completed' && project.boundaryFScore && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">{t('boundaryFScore')}:</span>
                          <span className="font-medium text-success-600">
                            {(project.boundaryFScore * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
