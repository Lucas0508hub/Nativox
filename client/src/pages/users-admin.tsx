import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { 
  Search, 
  Filter, 
  Trash2, 
  Edit,
  Key,
  UserPlus,
  MoreHorizontal,
  Users,
  Calendar,
  Activity
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useConfirmationDialog } from "@/contexts/ConfirmationContext";
import { UserWithLanguages, UserFormData, UserStats } from "@/types";
import { UserFormDialog } from "@/components/UserFormDialog";
import { ResetPasswordDialog } from "@/components/ResetPasswordDialog";

export default function UsersAdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const { confirm } = useConfirmationDialog();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithLanguages | null>(null);
  const [resettingUser, setResettingUser] = useState<UserWithLanguages | null>(null);

  // Check if user has admin access
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('accessDenied')}</h2>
            <p className="text-gray-600">{t('managerOnlyAccess')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: t('userDeactivated'),
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

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      await apiRequest("POST", `/api/users/${userId}/reset-password`, { newPassword });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: t('passwordReset'),
        description: t('success'),
      });
      setIsResetPasswordOpen(false);
      setResettingUser(null);
    },
    onError: (error: any) => {
      toast({
        title: t('error'),
        description: error.message || t('error'),
        variant: "destructive",
      });
    },
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users"],
    retry: false,
  });

  const { data: languages = [] } = useQuery({
    queryKey: ["/api/languages"],
    retry: false,
  });

  const handleDeleteUser = async (user: UserWithLanguages) => {
    const confirmed = await confirm(
      t('confirmDeleteUser', { userName: user.username }), 
      {
        title: t('deleteUser'),
        variant: 'destructive'
      }
    );
    
    if (confirmed) {
      deleteUserMutation.mutate(user.id);
    }
  };

  const handleEditUser = (user: UserWithLanguages) => {
    setEditingUser(user);
    setIsUserFormOpen(true);
  };

  const handleResetPassword = (user: UserWithLanguages) => {
    setResettingUser(user);
    setIsResetPasswordOpen(true);
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    setIsUserFormOpen(true);
  };

  const getRoleBadge = (role: string) => {
    const roleMap = {
      admin: { label: t('admin'), className: "bg-red-100 text-red-800" },
      manager: { label: t('manager'), className: "bg-blue-100 text-blue-800" },
      editor: { label: t('editor'), className: "bg-green-100 text-green-800" },
    };
    
    const roleInfo = roleMap[role as keyof typeof roleMap] || roleMap.editor;
    return (
      <Badge className={roleInfo.className}>
        {roleInfo.label}
      </Badge>
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    return (
      <Badge className={isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
        {isActive ? t('activeUser') : t('inactiveUser')}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Filter users
  const filteredUsers = Array.isArray(users) ? users.filter((user: UserWithLanguages) => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.lastName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && user.isActive) ||
                         (statusFilter === "inactive" && !user.isActive);
    
    return matchesSearch && matchesRole && matchesStatus;
  }) : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden bg-white border-b border-gray-200 p-4">
          <div className="space-y-3">
            <div>
              <h2 className="font-roboto font-bold text-xl text-gray-900">{t('userManagement')}</h2>
              <p className="text-sm text-gray-500 mt-1">{t('usersTitle')}</p>
            </div>
            <div className="flex flex-col space-y-2">
              <Button 
                onClick={handleCreateUser}
                className="w-full bg-primary hover:bg-primary-600 h-11"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                {t('createNewUser')}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Desktop Header */}
        <header className="hidden md:block bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-roboto font-bold text-2xl text-gray-900">{t('userManagement')}</h2>
              <p className="text-sm text-gray-500">
                {t('usersTitle')}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                onClick={handleCreateUser}
                className="bg-primary hover:bg-primary-600"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                {t('createNewUser')}
              </Button>
            </div>
          </div>
        </header>

        {/* Filters */}
        <div className="bg-white border-b border-gray-200 p-4 md:px-6 md:py-4">
          <div className="space-y-3 md:space-y-0 md:flex md:flex-row md:items-center md:gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder={t('searchUsers')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11 text-sm"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 md:flex md:gap-4">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full h-11">
                  <SelectValue placeholder={t('filterByRole')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allRoles')}</SelectItem>
                  <SelectItem value="admin">{t('admin')}</SelectItem>
                  <SelectItem value="manager">{t('manager')}</SelectItem>
                  <SelectItem value="editor">{t('editor')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full h-11">
                  <SelectValue placeholder={t('filterByStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allStatuses')}</SelectItem>
                  <SelectItem value="active">{t('activeUser')}</SelectItem>
                  <SelectItem value="inactive">{t('inactiveUser')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-3 md:p-6">
          {usersLoading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500">{t('loadingUsers')}</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <EmptyState
              icon={Users}
              title={searchTerm || roleFilter !== "all" || statusFilter !== "all"
                ? t('noUsersFound')
                : t('noUsersYet')
              }
              description={searchTerm || roleFilter !== "all" || statusFilter !== "all"
                ? t('adjustFilters')
                : t('createFirstUser')
              }
              action={!searchTerm && roleFilter === "all" && statusFilter === "all" ? {
                label: t('createNewUser'),
                onClick: handleCreateUser
              } : undefined}
            />
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((user: UserWithLanguages) => (
                <Card key={user.id} className="shadow-sm hover:shadow-md transition-shadow duration-300">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                          <Users className="w-6 h-6 text-primary" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {user.firstName && user.lastName 
                              ? `${user.firstName} ${user.lastName}` 
                              : user.username}
                          </h3>
                          <p className="text-sm text-gray-500 truncate">
                            {user.email || user.username}
                          </p>
                          <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                            <span className="flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              {user.createdAt ? formatDate(user.createdAt) : 'N/A'}
                            </span>
                            {user.userLanguages && user.userLanguages.length > 0 && (
                              <span>
                                {user.userLanguages.length} {t('assignedLanguages')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        {/* Role and Status Badges */}
                        <div className="flex flex-col space-y-1">
                          {getRoleBadge(user.role)}
                          {getStatusBadge(user.isActive)}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                <Edit className="w-4 h-4 mr-2" />
                                {t('editUser')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleResetPassword(user)}>
                                <Key className="w-4 h-4 mr-2" />
                                {t('resetPassword')}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => handleDeleteUser(user)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                {t('deleteUser')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>

                    {/* User Languages */}
                    {user.userLanguages && user.userLanguages.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex flex-wrap gap-2">
                          {user.userLanguages.map((lang) => (
                            <Badge key={lang.id} variant="outline" className="text-xs">
                              {lang.name}
                            </Badge>
                          ))}
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

      {/* User Form Dialog */}
      <UserFormDialog
        isOpen={isUserFormOpen}
        onClose={() => {
          setIsUserFormOpen(false);
          setEditingUser(null);
        }}
        user={editingUser}
        languages={languages}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/users"] });
          setIsUserFormOpen(false);
          setEditingUser(null);
        }}
      />

      {/* Reset Password Dialog */}
      <ResetPasswordDialog
        isOpen={isResetPasswordOpen}
        onClose={() => {
          setIsResetPasswordOpen(false);
          setResettingUser(null);
        }}
        user={resettingUser}
        onSuccess={(newPassword) => {
          if (resettingUser) {
            resetPasswordMutation.mutate({
              userId: resettingUser.id,
              newPassword
            });
          }
        }}
      />
    </div>
  );
}
