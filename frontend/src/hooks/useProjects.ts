import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useApi } from './useApi';
import { Project } from '@/types/shared';
import { ProjectResponse, MessageResponse } from '@/types/api';

export function useProjects() {
  const { queryClient, handleError, handleSuccess } = useApi();

  const { data: projects = [], isLoading, error } = useQuery({
    queryKey: ['/api/v1/projects'],
    queryFn: () => apiRequest<ProjectResponse[]>('/api/v1/projects'),
  });

  const updateProjectMutation = useMutation({
    mutationFn: ({ projectId, data }: { projectId: number; data: Partial<Project> }) =>
      apiRequest<ProjectResponse>(`/api/v1/projects/${projectId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/projects'] });
      handleSuccess('Project updated successfully');
    },
    onError: handleError,
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (projectId: number) =>
      apiRequest<MessageResponse>(`/api/v1/projects/${projectId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/projects'] });
      handleSuccess('Project deleted successfully');
    },
    onError: handleError,
  });

  const recalculateStatsMutation = useMutation({
    mutationFn: (projectId: number) =>
      apiRequest<ProjectResponse>(`/api/v1/projects/${projectId}/recalculate-stats`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/projects'] });
      handleSuccess('Project statistics recalculated');
    },
    onError: handleError,
  });

  return {
    projects,
    isLoading,
    error,
    updateProject: updateProjectMutation.mutate,
    deleteProject: deleteProjectMutation.mutate,
    recalculateStats: recalculateStatsMutation.mutate,
    isUpdating: updateProjectMutation.isPending,
    isDeleting: deleteProjectMutation.isPending,
    isRecalculating: recalculateStatsMutation.isPending,
  };
}

export function useProject(projectId: number) {
  const { queryClient, handleError, handleSuccess } = useApi();

  const { data: project, isLoading, error } = useQuery({
    queryKey: [`/api/v1/projects/${projectId}`],
    queryFn: () => apiRequest<ProjectResponse>(`/api/v1/projects/${projectId}`),
    enabled: !!projectId,
  });

  const updateProjectMutation = useMutation({
    mutationFn: (data: Partial<Project>) =>
      apiRequest<ProjectResponse>(`/api/v1/projects/${projectId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/v1/projects/${projectId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/projects'] });
      handleSuccess('Project updated successfully');
    },
    onError: handleError,
  });

  return {
    project,
    isLoading,
    error,
    updateProject: updateProjectMutation.mutate,
    isUpdating: updateProjectMutation.isPending,
  };
}
