import { useQuery } from '@tanstack/react-query';
import { documentsApi } from './api';

export const useResults = (profileId: string, enabled = true) =>
  useQuery({ queryKey: ['documents', 'results', profileId], queryFn: () => documentsApi.results(profileId), enabled });

export const useDocuments = (profileId: string, enabled = true) =>
  useQuery({ queryKey: ['documents', 'documents', profileId], queryFn: () => documentsApi.documents(profileId), enabled });

export const useDocumentById = (id: string, enabled = true) =>
  useQuery({ queryKey: ['documents', 'detail', id], queryFn: () => documentsApi.getById(id), enabled: enabled && Boolean(id) });
