import { ApiError } from '../../api/types';

export const documentsErrorToMessage = (error: unknown) => {
  const apiError = error as ApiError | undefined;
  if (!apiError) return 'No pudimos obtener documentos por el momento.';
  return apiError.message || 'Error al consultar resultados y documentos.';
};
