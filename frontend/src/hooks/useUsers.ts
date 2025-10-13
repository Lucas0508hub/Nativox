import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useApi } from './useApi';
import { User, ApiResponse } from '@/types/shared';

export function useUsers() {
  const { queryClient, handleError, handleSuccess } = useApi();

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['/api/v1/users'],
    queryFn: () => apiRequest<User[]>('/api/v1/users'),
  });

  const createUserMutation = useMutation({
    mutationFn: (data: {
      username: string;
      email?: string;
      firstName?: string;
      lastName?: string;
      role: 'admin' | 'manager' | 'editor';
      password: string;
    }) =>
      apiRequest<User>('/api/v1/users', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/users'] });
      handleSuccess('User created successfully');
    },
    onError: handleError,
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: Partial<User> }) =>
      apiRequest<User>(`/api/v1/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/users'] });
      handleSuccess('User updated successfully');
    },
    onError: handleError,
  });

  const deactivateUserMutation = useMutation({
    mutationFn: (userId: string) =>
      apiRequest<User>(`/api/v1/users/${userId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/users'] });
      handleSuccess('User deactivated successfully');
    },
    onError: handleError,
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ userId, newPassword }: { userId: string; newPassword: string }) =>
      apiRequest<User>(`/api/v1/users/${userId}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ newPassword }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/users'] });
      handleSuccess('Password reset successfully');
    },
    onError: handleError,
  });

  return {
    users,
    isLoading,
    error,
    createUser: createUserMutation.mutate,
    updateUser: updateUserMutation.mutate,
    deactivateUser: deactivateUserMutation.mutate,
    resetPassword: resetPasswordMutation.mutate,
    isCreating: createUserMutation.isPending,
    isUpdating: updateUserMutation.isPending,
    isDeactivating: deactivateUserMutation.isPending,
    isResettingPassword: resetPasswordMutation.isPending,
  };
}
