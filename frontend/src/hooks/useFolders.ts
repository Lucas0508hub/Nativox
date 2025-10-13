import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useApi } from './useApi';
import { Folder, ApiResponse } from '@/types/shared';

export function useProjectFolders(projectId: number) {
  const { queryClient, handleError, handleSuccess } = useApi();

  const { data: folders = [], isLoading, error } = useQuery({
    queryKey: [`/api/v1/folders/project/${projectId}`],
    queryFn: () => apiRequest<Folder[]>(`/api/v1/folders/project/${projectId}`),
    enabled: !!projectId,
  });

  const createFolderMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      apiRequest<Folder>(`/api/v1/folders/project/${projectId}`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/v1/folders/project/${projectId}`] });
      handleSuccess('Folder created successfully');
    },
    onError: handleError,
  });

  const updateFolderMutation = useMutation({
    mutationFn: ({ folderId, data }: { folderId: number; data: Partial<Folder> }) =>
      apiRequest<Folder>(`/api/v1/folders/${folderId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/v1/folders/project/${projectId}`] });
      handleSuccess('Folder updated successfully');
    },
    onError: handleError,
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (folderId: number) =>
      apiRequest<ApiResponse>(`/api/v1/folders/${folderId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/v1/folders/project/${projectId}`] });
      handleSuccess('Folder deleted successfully');
    },
    onError: handleError,
  });

  return {
    folders,
    isLoading,
    error,
    createFolder: createFolderMutation.mutate,
    updateFolder: updateFolderMutation.mutate,
    deleteFolder: deleteFolderMutation.mutate,
    isCreating: createFolderMutation.isPending,
    isUpdating: updateFolderMutation.isPending,
    isDeleting: deleteFolderMutation.isPending,
  };
}

export function useFolder(folderId: number) {
  const { queryClient, handleError, handleSuccess } = useApi();

  const { data: folder, isLoading, error } = useQuery({
    queryKey: [`/api/v1/folders/${folderId}`],
    queryFn: () => apiRequest<Folder>(`/api/v1/folders/${folderId}`),
    enabled: !!folderId,
  });

  const updateFolderMutation = useMutation({
    mutationFn: (data: Partial<Folder>) =>
      apiRequest<Folder>(`/api/v1/folders/${folderId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/v1/folders/${folderId}`] });
      handleSuccess('Folder updated successfully');
    },
    onError: handleError,
  });

  return {
    folder,
    isLoading,
    error,
    updateFolder: updateFolderMutation.mutate,
    isUpdating: updateFolderMutation.isPending,
  };
}
