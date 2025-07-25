import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  UserPlus, 
  Settings,
  Languages,
  UserCheck,
  UserX,
  Shield,
  User,
  Trash2,
  Plus
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function UsersPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showLanguageDialog, setShowLanguageDialog] = useState(false);

  // Fetch users
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users"],
    retry: false,
  });

  // Fetch languages
  const { data: languages = [], isLoading: languagesLoading } = useQuery({
    queryKey: ["/api/languages"],
    retry: false,
  });

  // Update user role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return await apiRequest('PATCH', `/api/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: t('roleUpdated'),
        description: t('roleUpdatedSuccess')
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o papel do usuário.",
        variant: "destructive"
      });
    }
  });

  // Update user status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      return await apiRequest('PATCH', `/api/users/${userId}/status`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Status atualizado",
        description: "O status do usuário foi atualizado com sucesso."
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status do usuário.",
        variant: "destructive"
      });
    }
  });

  // Assign language mutation
  const assignLanguageMutation = useMutation({
    mutationFn: async ({ userId, languageId }: { userId: string; languageId: number }) => {
      return await apiRequest('POST', `/api/users/${userId}/languages`, { languageId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setShowLanguageDialog(false);
      toast({
        title: "Idioma atribuído",
        description: "O idioma foi atribuído ao usuário com sucesso."
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Não foi possível atribuir o idioma ao usuário.",
        variant: "destructive"
      });
    }
  });

  // Remove language mutation
  const removeLanguageMutation = useMutation({
    mutationFn: async ({ userId, languageId }: { userId: string; languageId: number }) => {
      return await apiRequest('DELETE', `/api/users/${userId}/languages/${languageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Idioma removido",
        description: "O idioma foi removido do usuário com sucesso."
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Não foi possível remover o idioma do usuário.",
        variant: "destructive"
      });
    }
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <p>{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'manager') {
    return (
      <div className="min-h-screen flex bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <p>Acesso negado. Apenas managers podem acessar esta página.</p>
        </div>
      </div>
    );
  }

  const getRoleBadge = (role: string) => {
    if (role === 'manager') {
      return <Badge className="bg-purple-100 text-purple-800"><Shield className="w-3 h-3 mr-1" />Manager</Badge>;
    }
    return <Badge className="bg-blue-100 text-blue-800"><User className="w-3 h-3 mr-1" />Editor</Badge>;
  };

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return <Badge className="bg-green-100 text-green-800"><UserCheck className="w-3 h-3 mr-1" />Ativo</Badge>;
    }
    return <Badge className="bg-red-100 text-red-800"><UserX className="w-3 h-3 mr-1" />Inativo</Badge>;
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-roboto font-bold text-2xl text-gray-900">
                {t('usersTitle')}
              </h2>
              <p className="text-sm text-gray-500">
                Gerencie usuários, atribua idiomas e defina papéis
              </p>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                {t('usersList')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <p>{t('loadingUsers')}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Papel</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>{t('assignedLanguages')}</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.isArray(users) && users.map((userData: any) => (
                      <TableRow key={userData.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {userData.profileImageUrl ? (
                              <img 
                                src={userData.profileImageUrl} 
                                alt={userData.firstName || userData.email}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                                <User className="w-4 h-4 text-gray-600" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">
                                {userData.firstName && userData.lastName 
                                  ? `${userData.firstName} ${userData.lastName}`
                                  : userData.email}
                              </p>
                              {userData.firstName && userData.lastName && (
                                <p className="text-sm text-gray-500">{userData.email}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{userData.email}</TableCell>
                        <TableCell>
                          <Select
                            value={userData.role}
                            onValueChange={(role) => updateRoleMutation.mutate({ userId: userData.id, role })}
                            disabled={updateRoleMutation.isPending}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="editor">Editor</SelectItem>
                              <SelectItem value="manager">Manager</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateStatusMutation.mutate({ 
                              userId: userData.id, 
                              isActive: !userData.isActive 
                            })}
                            disabled={updateStatusMutation.isPending}
                          >
                            {getStatusBadge(userData.isActive)}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {userData.assignedLanguages?.map((lang: any) => (
                              <Badge 
                                key={lang.languageId} 
                                variant="outline"
                                className="text-xs flex items-center gap-1"
                              >
                                {lang.languageName}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-auto p-0 w-4 h-4"
                                  onClick={() => removeLanguageMutation.mutate({ 
                                    userId: userData.id, 
                                    languageId: lang.languageId 
                                  })}
                                  disabled={removeLanguageMutation.isPending}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Dialog 
                            open={showLanguageDialog && selectedUserId === userData.id}
                            onOpenChange={(open) => {
                              setShowLanguageDialog(open);
                              if (open) setSelectedUserId(userData.id);
                              else setSelectedUserId(null);
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Plus className="w-4 h-4 mr-1" />
                                Atribuir Idioma
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Atribuir Idioma</DialogTitle>
                                <DialogDescription>
                                  Selecione um idioma para atribuir ao usuário {userData.firstName} {userData.lastName || userData.email}.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="grid gap-4 py-4">
                                {Array.isArray(languages) && languages.map((language: any) => (
                                  <Button
                                    key={language.id}
                                    variant="outline"
                                    onClick={() => assignLanguageMutation.mutate({ 
                                      userId: userData.id, 
                                      languageId: language.id 
                                    })}
                                    disabled={assignLanguageMutation.isPending}
                                    className="justify-start"
                                  >
                                    <Languages className="w-4 h-4 mr-2" />
                                    {language.name}
                                  </Button>
                                ))}
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}