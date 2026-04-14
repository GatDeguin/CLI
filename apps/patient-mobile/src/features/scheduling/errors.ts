import { ApiError } from '../../api/types';

export const schedulingErrorToMessage = (error: unknown) => {
  const apiError = error as ApiError | undefined;
  if (!apiError) return 'No pudimos obtener turnos. Reintentá en unos segundos.';
  if (apiError.status === 404) return 'No encontramos disponibilidad con esos filtros.';
  return apiError.message || 'Error al gestionar turnos.';
};
