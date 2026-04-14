import { ApiError } from '../../api/types';

export const paymentsErrorToMessage = (error: unknown) => {
  const apiError = error as ApiError | undefined;
  if (!apiError) return 'No pudimos procesar tu pago. Intentá nuevamente.';
  if (apiError.status === 403) return 'Tu plan no permite ver información de copagos en este momento.';
  return apiError.message || 'Error al consultar pagos.';
};
