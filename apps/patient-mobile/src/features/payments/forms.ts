import { z } from 'zod';

export const createPreferenceSchema = z.object({
  appointmentId: z.string().min(1, 'Falta el identificador del turno.'),
  profileId: z.string().min(1, 'Falta el perfil activo.'),
});

export type CreatePreferenceValues = z.infer<typeof createPreferenceSchema>;
