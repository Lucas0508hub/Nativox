import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useApi } from './useApi';
import { Segment, ApiResponse } from '@/types/shared';

export function useFolderSegments(folderId: number) {
  const { queryClient, handleError, handleSuccess } = useApi();

  const { data: segments = [], isLoading, error } = useQuery({
    queryKey: [`/api/v1/segments/folder/${folderId}`],
    queryFn: () => apiRequest<Segment[]>(`/api/v1/segments/folder/${folderId}`),
    enabled: !!folderId,
  });

  const updateSegmentMutation = useMutation({
    mutationFn: ({ segmentId, data }: { segmentId: number; data: Partial<Segment> }) =>
      apiRequest<Segment>(`/api/v1/segments/${segmentId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/v1/segments/folder/${folderId}`] });
      handleSuccess('Segment updated successfully');
    },
    onError: handleError,
  });

  const deleteSegmentMutation = useMutation({
    mutationFn: (segmentId: number) =>
      apiRequest<ApiResponse>(`/api/v1/segments/${segmentId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/v1/segments/folder/${folderId}`] });
      handleSuccess('Segment deleted successfully');
    },
    onError: handleError,
  });

  return {
    segments,
    isLoading,
    error,
    updateSegment: updateSegmentMutation.mutate,
    deleteSegment: deleteSegmentMutation.mutate,
    isUpdating: updateSegmentMutation.isPending,
    isDeleting: deleteSegmentMutation.isPending,
  };
}

export function useSegment(segmentId: number) {
  const { queryClient, handleError, handleSuccess } = useApi();

  const { data: segment, isLoading, error } = useQuery({
    queryKey: [`/api/v1/segments/${segmentId}`],
    queryFn: () => apiRequest<Segment>(`/api/v1/segments/${segmentId}`),
    enabled: !!segmentId,
  });

  const updateSegmentMutation = useMutation({
    mutationFn: (data: Partial<Segment>) =>
      apiRequest<Segment>(`/api/v1/segments/${segmentId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/v1/segments/${segmentId}`] });
      handleSuccess('Segment updated successfully');
    },
    onError: handleError,
  });

  return {
    segment,
    isLoading,
    error,
    updateSegment: updateSegmentMutation.mutate,
    isUpdating: updateSegmentMutation.isPending,
  };
}
