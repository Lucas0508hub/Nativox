import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { Eye, EyeOff } from "lucide-react";
import { UserWithLanguages, UserFormData, Language } from "@/types";

interface UserFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user?: UserWithLanguages | null;
  languages: Language[];
  onSuccess: () => void;
}

export function UserFormDialog({ isOpen, onClose, user, languages, onSuccess }: UserFormDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    role: 'editor',
    password: '',
    confirmPassword: '',
    languageIds: []
  });

  const isEditing = !!user;

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username,
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        role: user.role as 'admin' | 'manager' | 'editor',
        password: '',
        confirmPassword: '',
        languageIds: user.userLanguages?.map(lang => lang.id) || []
      });
    } else {
      setFormData({
        username: '',
        email: '',
        firstName: '',
        lastName: '',
        role: 'editor',
        password: '',
        confirmPassword: '',
        languageIds: []
      });
    }
  }, [user, isOpen]);

  const createUserMutation = useMutation({
    mutationFn: async (userData: UserFormData) => {
      await apiRequest("POST", "/api/v1/users", userData);
    },
    onSuccess: () => {
      toast({
        title: t('userCreated'),
        description: t('success'),
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: t('error'),
        description: error.message || t('error'),
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async (userData: UserFormData) => {
      await apiRequest("PATCH", `/api/v1/users/${user?.id}`, userData);
    },
    onSuccess: () => {
      toast({
        title: t('userUpdated'),
        description: t('success'),
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: t('error'),
        description: error.message || t('error'),
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username || !formData.role) {
      toast({
        title: t('error'),
        description: "Username and role are required",
        variant: "destructive",
      });
      return;
    }

    if (!isEditing && !formData.password) {
      toast({
        title: t('error'),
        description: "Password is required for new users",
        variant: "destructive",
      });
      return;
    }

    if (!isEditing && formData.password !== formData.confirmPassword) {
      toast({
        title: t('error'),
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (isEditing && formData.password && formData.password !== formData.confirmPassword) {
      toast({
        title: t('error'),
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    const submitData = { ...formData };
    
    // Remove password fields if empty (for editing)
    if (isEditing && !submitData.password) {
      delete submitData.password;
      delete submitData.confirmPassword;
    } else {
      // Remove confirmPassword before sending to API
      delete submitData.confirmPassword;
    }

    if (isEditing) {
      updateUserMutation.mutate(submitData);
    } else {
      createUserMutation.mutate(submitData);
    }
  };

  const handleLanguageToggle = (languageId: number, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        languageIds: [...(prev.languageIds || []), languageId]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        languageIds: (prev.languageIds || []).filter(id => id !== languageId)
      }));
    }
  };

  const isLoading = createUserMutation.isPending || updateUserMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('editUser') : t('createUser')}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? t('editUserDescription') || 'Edit user information and permissions'
              : t('createUserDescription') || 'Create a new user account'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">{t('firstName')}</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                placeholder={t('firstName')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">{t('lastName')}</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                placeholder={t('lastName')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">{t('username')} *</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
              placeholder={t('username')}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t('email')}</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder={t('email')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">{t('userRole')} *</Label>
            <Select
              value={formData.role}
              onValueChange={(value: 'admin' | 'manager' | 'editor') => 
                setFormData(prev => ({ ...prev, role: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t('userRole')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">{t('admin')}</SelectItem>
                <SelectItem value="manager">{t('manager')}</SelectItem>
                <SelectItem value="editor">{t('editor')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              {isEditing ? t('newPassword') + ' (optional)' : t('newPassword') + ' *'}
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder={t('newPassword')}
                required={!isEditing}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">
              {isEditing ? t('confirmPassword') + ' (optional)' : t('confirmPassword') + ' *'}
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder={t('confirmPassword')}
                required={!isEditing}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </Button>
            </div>
          </div>

          {formData.role === 'editor' && (
            <div className="space-y-2">
              <Label>{t('assignedLanguages')}</Label>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded-md p-3">
                {languages.map((language) => (
                  <div key={language.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`lang-${language.id}`}
                      checked={formData.languageIds?.includes(language.id) || false}
                      onCheckedChange={(checked) => 
                        handleLanguageToggle(language.id, checked as boolean)
                      }
                    />
                    <Label 
                      htmlFor={`lang-${language.id}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {language.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t('loading') : (isEditing ? t('update') : t('create'))}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
