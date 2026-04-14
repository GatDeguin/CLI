import { ApiError } from '../../api/types';

export const authErrorToMessage = (error: unknown) => {
  const apiError = error as ApiError | undefined;
  if (!apiError) return 'No pudimos completar la operación. Reintentá en unos segundos.';

  if (apiError.status === 401) return 'Tus credenciales no son válidas. Verificá email/DNI y contraseña.';
  if (apiError.status === 429) return 'Demasiados intentos. Esperá un momento antes de volver a intentar.';
  return apiError.message || 'Ocurrió un error en autenticación.';
};
