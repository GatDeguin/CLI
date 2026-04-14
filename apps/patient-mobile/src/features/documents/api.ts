import { apiClient } from '../../api/client';
import { DocumentItem } from '../../api/types';

export const documentsApi = {
  results: (profileId: string) => apiClient<DocumentItem[]>(`/results?profileId=${profileId}`),
  documents: (profileId: string) => apiClient<DocumentItem[]>(`/documents?profileId=${profileId}`),
  getById: (id: string) => apiClient<DocumentItem>(`/documents/${id}`),
};
