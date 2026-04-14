import { z } from 'zod';

export const activeProfileSchema = z.object({
  profileId: z.string().min(3, 'Seleccioná un integrante válido.'),
});

export type ActiveProfileValues = z.infer<typeof activeProfileSchema>;
