import { z } from 'zod';

export const bookingSchema = z.object({
  slotId: z.string().min(1, 'Seleccioná un horario.'),
  coverageProfile: z.string().min(1, 'Seleccioná la cobertura.'),
});

export const rescheduleSchema = z.object({
  slotId: z.string().min(1, 'Seleccioná un nuevo horario.'),
});

export const cancelSchema = z.object({
  reason: z.string().min(4, 'Indicá brevemente el motivo.'),
});

export type BookingValues = z.infer<typeof bookingSchema>;
export type RescheduleValues = z.infer<typeof rescheduleSchema>;
export type CancelValues = z.infer<typeof cancelSchema>;
