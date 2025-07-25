import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { 
  Languages, 
  Plus, 
  Edit, 
  Globe,
  Search,
  MoreHorizontal,
  CheckCircle,
  XCircle
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function LanguagesPage() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const { user, isLoading, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newLanguage, setNewLanguage] = useState({ name: "", code: "" });

  // Redirect if not authenticated or not manager
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: t('unauthorized'),
        description: t('loginRequired'),
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
    
    if (!isLoading && isAuthenticated && user && user.role !== 'manager') {
      toast({
        title: t('accessDenied'),
        description: t('managerOnlyAccess'),
        variant: "destructive",
      });
      window.location.href = "/dashboard";
      return;
    }
  }, [isAuthenticated, isLoading, user, toast]);

  const { data: languages = [], isLoading: languagesLoading } = useQuery({
    queryKey: ["/api/languages"],
    retry: false,
    enabled: user && user.role === 'manager',
  });

  const createLanguageMutation = useMutation({
    mutationFn: async (languageData: { name: string; code: string }) => {
      const response = await apiRequest("POST", "/api/languages", languageData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/languages"] });
      setIsCreateDialogOpen(false);
      setNewLanguage({ name: "", code: "" });
      toast({
        title: "Idioma criado",
        description: "O novo idioma foi adicionado ao sistema.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Não autorizado",
          description: "Você foi deslogado. Redirecionando...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro ao criar idioma",
        description: error.message || "Erro ao adicionar novo idioma",
        variant: "destructive",
      });
    },
  });

  if (isLoading || !isAuthenticated || user?.role !== 'manager') {
    return <div>{t('loading')}</div>;
  }

  const handleCreateLanguage = () => {
    if (!newLanguage.name || !newLanguage.code) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha nome e código do idioma.",
        variant: "destructive",
      });
      return;
    }

    createLanguageMutation.mutate({
      name: newLanguage.name,
      code: newLanguage.code.toLowerCase()
    });
  };

  // Mock languages data for demonstration
  const mockLanguages = [
    {
      id: 1,
      name: "Português",
      code: "pt",
      isActive: true,
      createdAt: "2024-01-15T10:00:00Z",
      _count: { projects: 8, userLanguages: 5 }
    },
    {
      id: 2,
      name: "Inglês", 
      code: "en",
      isActive: true,
      createdAt: "2024-01-15T10:00:00Z",
      _count: { projects: 12, userLanguages: 7 }
    },
    {
      id: 3,
      name: "Espanhol",
      code: "es", 
      isActive: true,
      createdAt: "2024-01-20T14:30:00Z",
      _count: { projects: 6, userLanguages: 3 }
    },
    {
      id: 4,
      name: "Francês",
      code: "fr",
      isActive: false,
      createdAt: "2024-01-25T09:15:00Z", 
      _count: { projects: 2, userLanguages: 1 }
    }
  ];

  const displayLanguages = languages || mockLanguages;
  
  const filteredLanguages = Array.isArray(displayLanguages) ? displayLanguages.filter((language: any) =>
    language.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    language.code.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge className="bg-success-100 text-success-800">
        <CheckCircle className="w-3 h-3 mr-1" />
        Ativo
      </Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-800">
        <XCircle className="w-3 h-3 mr-1" />
        Inativo
      </Badge>
    );
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-roboto font-bold text-2xl text-gray-900">{t('languageManagement')}</h2>
              <p className="text-sm text-gray-500">
                Configure os idiomas disponíveis no sistema para segmentação
              </p>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Idioma
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Novo Idioma</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="language-name">Nome do Idioma *</Label>
                    <Input
                      id="language-name"
                      value={newLanguage.name}
                      onChange={(e) => setNewLanguage({ ...newLanguage, name: e.target.value })}
                      placeholder="Ex: Português"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="language-code">Código do Idioma *</Label>
                    <Input
                      id="language-code"
                      value={newLanguage.code}
                      onChange={(e) => setNewLanguage({ ...newLanguage, code: e.target.value })}
                      placeholder="Ex: pt"
                      maxLength={10}
                    />
                    <p className="text-xs text-gray-500">
                      Use códigos padrão como: pt, en, es, fr, de, etc.
                    </p>
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleCreateLanguage}
                      disabled={createLanguageMutation.isPending}
                      className="bg-primary hover:bg-primary-600"
                    >
                      {createLanguageMutation.isPending ? "Criando..." : "Criar Idioma"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {/* Search */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar idiomas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Languages List */}
            <div className="lg:col-span-3">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Idiomas do Sistema</CardTitle>
                </CardHeader>
                <CardContent>
                  {languagesLoading ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">{t('loadingLanguages')}</p>
                    </div>
                  ) : filteredLanguages.length === 0 ? (
                    <div className="text-center py-8">
                      <Languages className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {searchTerm ? "Nenhum idioma encontrado" : "Nenhum idioma cadastrado"}
                      </h3>
                      <p className="text-gray-500">
                        {searchTerm 
                          ? "Tente ajustar o termo de busca."
                          : "Adicione idiomas para permitir segmentação de áudio."
                        }
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredLanguages.map((language: any) => (
                        <div 
                          key={language.id} 
                          className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                                <Globe className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900">{language.name}</h4>
                                <p className="text-sm text-gray-500">Código: {language.code.toUpperCase()}</p>
                              </div>
                            </div>

                            <div className="flex items-center space-x-4">
                              <div className="text-right">
                                <p className="text-sm font-medium text-gray-900">
                                  {language._count?.projects || 0} projetos
                                </p>
                                <p className="text-xs text-gray-500">
                                  {language._count?.userLanguages || 0} editores
                                </p>
                              </div>
                              
                              {getStatusBadge(language.isActive)}
                              
                              <Button size="sm" variant="ghost">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Statistics */}
            <div className="space-y-6">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Estatísticas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Idiomas Ativos</span>
                    <span className="text-sm font-medium text-gray-900">
                      {filteredLanguages.filter((l: any) => l.isActive).length}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total de Projetos</span>
                    <span className="text-sm font-medium text-gray-900">
                      {filteredLanguages.reduce((total: number, lang: any) => total + (lang._count?.projects || 0), 0)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Editores Atribuídos</span>
                    <span className="text-sm font-medium text-gray-900">
                      {filteredLanguages.reduce((total: number, lang: any) => total + (lang._count?.userLanguages || 0), 0)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Idiomas Mais Utilizados</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {filteredLanguages
                    .sort((a: any, b: any) => (b._count?.projects || 0) - (a._count?.projects || 0))
                    .slice(0, 5)
                    .map((language: any) => (
                      <div key={language.id} className="flex items-center justify-between">
                        <span className="text-sm text-gray-900">{language.name}</span>
                        <span className="text-sm text-gray-500">
                          {language._count?.projects || 0} proj.
                        </span>
                      </div>
                    ))}
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Configurações Prosódicas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-gray-600">
                  <div>
                    <p className="font-medium text-gray-900 mb-2">Parâmetros Universais</p>
                    <ul className="space-y-1">
                      <li>• Pausa mín.: 200-300ms</li>
                      <li>• Alongamento: ~30%</li>
                      <li>• F-score alvo: &gt;0.90</li>
                    </ul>
                  </div>
                  
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      Os parâmetros prosódicos são ajustados automaticamente
                      com base no feedback de validação humana.
                    </p>
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
