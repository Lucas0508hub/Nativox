import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useConfirmationDialog } from "@/contexts/ConfirmationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  FolderPlus,
  Folder,
  MoreHorizontal,
  Edit,
  Trash2,
  ChevronRight,
  Mic,
  Clock,
  Calendar,
  RefreshCw,
} from "lucide-react";

interface Folder {
  id: number;
  projectId: number;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { confirm } = useConfirmationDialog();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [folderName, setFolderName] = useState("");
  const [folderDescription, setFolderDescription] = useState("");
  
  // Edit project name state
  const [isEditingProjectName, setIsEditingProjectName] = useState(false);
  const [editedProjectName, setEditedProjectName] = useState("");

  const projectId = parseInt(id || "0");

  const { data: project, isLoading: projectLoading } = useQuery<any>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });

  const { data: folders = [], isLoading: foldersLoading } = useQuery<Folder[]>({
    queryKey: [`/api/projects/${projectId}/folders`],
    enabled: !!projectId,
  });

  const { data: languages = [] } = useQuery<any[]>({
    queryKey: ["/api/languages"],
    retry: false,
  });

  const createFolderMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      return await apiRequest("POST", `/api/projects/${projectId}/folders`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/folders`] });
      setIsCreateDialogOpen(false);
      setFolderName("");
      setFolderDescription("");
      toast({
        title: t("folderCreated"),
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

  const updateFolderMutation = useMutation({
    mutationFn: async (data: { id: number; name: string; description?: string }) => {
      return await apiRequest("PUT", `/api/folders/${data.id}`, {
        name: data.name,
        description: data.description,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/folders`] });
      setIsEditDialogOpen(false);
      setEditingFolder(null);
      toast({
        title: t("folderUpdated"),
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

  const deleteFolderMutation = useMutation({
    mutationFn: async (folderId: number) => {
      return await apiRequest("DELETE", `/api/folders/${folderId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/folders`] });
      toast({
        title: t("folderDeleted"),
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

  const updateProjectMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      return await apiRequest("PATCH", `/api/projects/${projectId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsEditingProjectName(false);
      toast({
        title: t("projectUpdated"),
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

  const recalculateStatsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/projects/${projectId}/recalculate-stats`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: t("statsRecalculated"),
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

  const handleCreateFolder = () => {
    if (!folderName.trim()) {
      toast({
        title: t("error"),
        description: t("requiredFields"),
        variant: "destructive",
      });
      return;
    }

    createFolderMutation.mutate({
      name: folderName,
      description: folderDescription || undefined,
    });
  };

  const handleEditFolder = () => {
    if (!editingFolder || !folderName.trim()) {
      return;
    }

    updateFolderMutation.mutate({
      id: editingFolder.id,
      name: folderName,
      description: folderDescription || undefined,
    });
  };

  const handleDeleteFolder = async (folder: Folder) => {
    const confirmed = await confirm(t("confirmDeleteFolder", { folderName: folder.name }), {
      title: t('delete'),
      variant: 'destructive'
    });
    
    if (confirmed) {
      deleteFolderMutation.mutate(folder.id);
    }
  };

  const handleEditProjectName = () => {
    if (project) {
      setEditedProjectName(project.name);
      setIsEditingProjectName(true);
    }
  };

  const handleSaveProjectName = () => {
    if (editedProjectName.trim() && editedProjectName !== project?.name) {
      updateProjectMutation.mutate({ name: editedProjectName.trim() });
    } else {
      setIsEditingProjectName(false);
    }
  };

  const handleCancelEditProjectName = () => {
    setIsEditingProjectName(false);
    setEditedProjectName("");
  };

  const handleRecalculateStats = async () => {
    const confirmed = await confirm(t('confirmRecalculateStats'), {
      title: t('recalculateStats'),
      variant: 'default'
    });
    
    if (confirmed) {
      recalculateStatsMutation.mutate();
    }
  };

  const openEditDialog = (folder: Folder) => {
    setEditingFolder(folder);
    setFolderName(folder.name);
    setFolderDescription(folder.description || "");
    setIsEditDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
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

  const getStatusBadge = (status: string) => {
    const statusMap = {
      processing: { label: t("processing"), className: "status-processing" },
      ready_for_transcription: { label: t("readyForValidation"), className: "status-ready" },
      in_transcription: { label: t("inValidation"), className: "status-validation" },
      completed: { label: t("completed"), className: "status-completed" },
      failed: { label: t("error"), className: "status-failed" },
    };

    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.processing;
    return <Badge className={statusInfo.className}>{statusInfo.label}</Badge>;
  };

  if (projectLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">{t("loading")}</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">{t("error")}</h2>
          <p className="text-gray-500 mb-4">Projeto não encontrado</p>
          <Link href="/projects">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("backToProjects")}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const projectLanguage = Array.isArray(languages)
    ? languages.find((l: any) => l.id === project.languageId)
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden bg-white border-b border-gray-200 p-3">
          <div className="flex items-center justify-between">
            <Link href="/projects">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-1" />
                {t("backToProjects")}
              </Button>
            </Link>
            <Button
              size="sm"
              className="bg-primary hover:bg-primary-600"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <FolderPlus className="w-3 h-3 mr-1" />
              {t("createFolder")}
            </Button>
          </div>
        </div>

        {/* Desktop Header */}
        <header className="hidden md:block bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <Link href="/projects">
              <Button variant="ghost">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t("backToProjects")}
              </Button>
            </Link>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={handleRecalculateStats}
                disabled={recalculateStatsMutation.isPending}
                title={t("recalculateStats")}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${recalculateStatsMutation.isPending ? 'animate-spin' : ''}`} />
                {t("recalculateStats")}
              </Button>
              <Button className="bg-primary hover:bg-primary-600" onClick={() => setIsCreateDialogOpen(true)}>
                <FolderPlus className="w-4 h-4 mr-2" />
                {t("createFolder")}
              </Button>
            </div>
          </div>

          <div className="flex items-center space-x-4 group">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <Mic className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              {isEditingProjectName ? (
                <div className="flex items-center space-x-2">
                  <Input
                    value={editedProjectName}
                    onChange={(e) => setEditedProjectName(e.target.value)}
                    className="text-2xl font-bold border-2 border-primary"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveProjectName();
                      } else if (e.key === 'Escape') {
                        handleCancelEditProjectName();
                      }
                    }}
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveProjectName}
                    disabled={!editedProjectName.trim()}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    ✓
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancelEditProjectName}
                  >
                    ✕
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <h2 className="font-roboto font-bold text-2xl text-gray-900">{project.name}</h2>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleEditProjectName}
                    className="opacity-50 hover:opacity-100 transition-opacity"
                    title={t('editProjectName')}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              )}
              <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                <span className="flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  {formatDuration(project.duration)}
                </span>
                <span className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  {formatDate(project.createdAt)}
                </span>
                {projectLanguage && <span>{projectLanguage.name}</span>}
              </div>
            </div>
            {getStatusBadge(project.status)}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-3 md:p-6">
          {/* Mobile Project Info */}
          <div className="md:hidden mb-4">
            <Card>
              <CardContent className="p-4 group">
                {isEditingProjectName ? (
                  <div className="flex items-center space-x-2 mb-2">
                    <Input
                      value={editedProjectName}
                      onChange={(e) => setEditedProjectName(e.target.value)}
                      className="text-lg font-semibold border-2 border-primary"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveProjectName();
                        } else if (e.key === 'Escape') {
                          handleCancelEditProjectName();
                        }
                      }}
                      autoFocus
                    />
                    <Button
                      size="sm"
                      onClick={handleSaveProjectName}
                      disabled={!editedProjectName.trim()}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      ✓
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCancelEditProjectName}
                    >
                      ✕
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="font-semibold text-lg">{project.name}</h3>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleEditProjectName}
                      className="opacity-50 hover:opacity-100 transition-opacity"
                      title={t('editProjectName')}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>{formatDuration(project.duration)}</span>
                  {getStatusBadge(project.status)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Folders List */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {t("folders")} ({folders.length})
            </h3>

            {foldersLoading ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-gray-500">{t("loadingFolders")}</p>
              </div>
            ) : folders.length === 0 ? (
              <EmptyState
                icon={Folder}
                title={t("noFoldersYet")}
                description={t("createFirstFolder")}
                action={{
                  label: t("createFolder"),
                  onClick: () => setIsCreateDialogOpen(true),
                }}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {folders.map((folder) => (
                  <Link key={folder.id} href={`/project/${projectId}/folder/${folder.id}`}>
                    <Card
                      className="shadow-sm hover:shadow-md transition-shadow duration-300 cursor-pointer"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3 flex-1">
                            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                              <Folder className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base font-semibold truncate">
                                {folder.name}
                              </CardTitle>
                              {folder.description && (
                                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                  {folder.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => {
                                e.preventDefault();
                                openEditDialog(folder);
                              }}>
                                <Edit className="w-4 h-4 mr-2" />
                                {t("editFolder")}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleDeleteFolder(folder);
                                }}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                {t("deleteFolder")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{formatDate(folder.createdAt)}</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Create Folder Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("createFolder")}</DialogTitle>
            <DialogDescription>
              Crie uma nova pasta para organizar os segmentos do projeto.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name">{t("folderName")}</Label>
              <Input
                id="folder-name"
                placeholder={t("folderNamePlaceholder")}
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="folder-description">{t("folderDescription")}</Label>
              <Textarea
                id="folder-description"
                placeholder={t("folderDescriptionPlaceholder")}
                value={folderDescription}
                onChange={(e) => setFolderDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateFolder}
              disabled={createFolderMutation.isPending}
              className="bg-primary hover:bg-primary-600"
            >
              {createFolderMutation.isPending ? t("loading") : t("createFolder")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Folder Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("editFolder")}</DialogTitle>
            <DialogDescription>
              Edite o nome e a descrição da pasta.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-folder-name">{t("folderName")}</Label>
              <Input
                id="edit-folder-name"
                placeholder={t("folderNamePlaceholder")}
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-folder-description">{t("folderDescription")}</Label>
              <Textarea
                id="edit-folder-description"
                placeholder={t("folderDescriptionPlaceholder")}
                value={folderDescription}
                onChange={(e) => setFolderDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleEditFolder}
              disabled={updateFolderMutation.isPending}
              className="bg-primary hover:bg-primary-600"
            >
              {updateFolderMutation.isPending ? t("loading") : t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
