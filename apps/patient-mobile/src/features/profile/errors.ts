export const profileErrorToMessage = (error: unknown) => `No pudimos actualizar el perfil activo. ${String((error as Error | undefined)?.message ?? '')}`.trim();
