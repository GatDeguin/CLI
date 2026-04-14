import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Ingresá un email válido.'),
  dni: z.string().min(7, 'Ingresá un DNI válido.').max(10),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
});

export const otpSchema = z.object({
  userId: z.string().min(3, 'Ingresá un usuario válido.'),
  otp: z.string().length(6, 'El código OTP tiene 6 dígitos.'),
});

export const loginSchema = z.object({
  identifier: z.string().min(3, 'Ingresá tu email o DNI.'),
  password: z.string().min(6, 'La contraseña es obligatoria.'),
  deviceId: z.string().min(3),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;
export type OtpFormValues = z.infer<typeof otpSchema>;
export type LoginFormValues = z.infer<typeof loginSchema>;
