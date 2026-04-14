export type ScreenId =
  | 'SC-01' | 'SC-02' | 'SC-03' | 'SC-04' | 'SC-05' | 'SC-06' | 'SC-07' | 'SC-08'
  | 'SC-09' | 'SC-10' | 'SC-11' | 'SC-12' | 'SC-13' | 'SC-14' | 'SC-15' | 'SC-16'
  | 'SC-17' | 'SC-18' | 'SC-19' | 'SC-20' | 'SC-21' | 'SC-22' | 'SC-23' | 'SC-24'
  | 'SC-25' | 'SC-26' | 'SC-27' | 'SC-28' | 'SC-29' | 'SC-30' | 'SC-31' | 'SC-32';

export type ScreenDef = { id: ScreenId; title: string; tab: string; description: string; flow: 'auth' | 'scheduling' | 'payments' | 'documents' | 'account' | 'home'; };

export const SCREENS: ScreenDef[] = [
  { id: 'SC-01', title: 'Bienvenida', tab: 'Inicio', description: 'Inicio del portal paciente', flow: 'home' },
  { id: 'SC-02', title: 'Registro', tab: 'Mi cuenta', description: 'Alta de usuario', flow: 'auth' },
  { id: 'SC-03', title: 'OTP', tab: 'Mi cuenta', description: 'Validación OTP', flow: 'auth' },
  { id: 'SC-04', title: 'Login', tab: 'Mi cuenta', description: 'Ingreso con DNI/email', flow: 'auth' },
  { id: 'SC-05', title: 'Dashboard', tab: 'Inicio', description: 'Resumen de salud', flow: 'home' },
  { id: 'SC-06', title: 'Buscar especialidad', tab: 'Turnos', description: 'Especialidades y cobertura', flow: 'scheduling' },
  { id: 'SC-07', title: 'Seleccionar profesional', tab: 'Turnos', description: 'Profesionales disponibles', flow: 'scheduling' },
  { id: 'SC-08', title: 'Seleccionar agenda', tab: 'Turnos', description: 'Slots disponibles', flow: 'scheduling' },
  { id: 'SC-09', title: 'Confirmar reserva', tab: 'Turnos', description: 'Confirmación de turno', flow: 'scheduling' },
  { id: 'SC-10', title: 'Pago de copago', tab: 'Turnos', description: 'Checkout de copago', flow: 'payments' },
  { id: 'SC-11', title: 'Reserva exitosa', tab: 'Turnos', description: 'Comprobante de reserva', flow: 'scheduling' },
  { id: 'SC-12', title: 'Mis turnos', tab: 'Turnos', description: 'Turnos vigentes e historial', flow: 'scheduling' },
  { id: 'SC-13', title: 'Detalle de turno', tab: 'Turnos', description: 'Detalle e indicaciones', flow: 'scheduling' },
  { id: 'SC-14', title: 'Reprogramar turno', tab: 'Turnos', description: 'Cambio de slot', flow: 'scheduling' },
  { id: 'SC-15', title: 'Cancelar turno', tab: 'Turnos', description: 'Cancelación segura', flow: 'scheduling' },
  { id: 'SC-16', title: 'Cartilla médica', tab: 'Cartilla', description: 'Especialidades y prestadores', flow: 'scheduling' },
  { id: 'SC-17', title: 'Detalle de prestador', tab: 'Cartilla', description: 'Perfil y atención', flow: 'scheduling' },
  { id: 'SC-18', title: 'Favoritos', tab: 'Cartilla', description: 'Prestadores favoritos', flow: 'scheduling' },
  { id: 'SC-19', title: 'Resultados', tab: 'Resultados', description: 'Resultados clínicos', flow: 'documents' },
  { id: 'SC-20', title: 'Detalle resultado', tab: 'Resultados', description: 'Detalle de resultado', flow: 'documents' },
  { id: 'SC-21', title: 'Documentos', tab: 'Resultados', description: 'Recetas y certificados', flow: 'documents' },
  { id: 'SC-22', title: 'Compartir documento', tab: 'Resultados', description: 'Compartir y descargar', flow: 'documents' },
  { id: 'SC-23', title: 'Perfil personal', tab: 'Mi cuenta', description: 'Datos personales', flow: 'account' },
  { id: 'SC-24', title: 'Credencial digital', tab: 'Mi cuenta', description: 'Credencial activa', flow: 'account' },
  { id: 'SC-25', title: 'Medios de pago', tab: 'Mi cuenta', description: 'Tarjetas guardadas', flow: 'payments' },
  { id: 'SC-26', title: 'Notificaciones', tab: 'Mi cuenta', description: 'Preferencias de notificación', flow: 'account' },
  { id: 'SC-27', title: 'Grupo familiar', tab: 'Mi cuenta', description: 'Gestión de familia', flow: 'account' },
  { id: 'SC-28', title: 'Alta integrante', tab: 'Mi cuenta', description: 'Agregar familiar', flow: 'account' },
  { id: 'SC-29', title: 'Cambiar titular activo', tab: 'Mi cuenta', description: 'Perfil activo', flow: 'account' },
  { id: 'SC-30', title: 'Ayuda y soporte', tab: 'Inicio', description: 'Canales de soporte', flow: 'home' },
  { id: 'SC-31', title: 'Seguridad de cuenta', tab: 'Mi cuenta', description: 'Dispositivos y sesiones', flow: 'auth' },
  { id: 'SC-32', title: 'Estado de servicios', tab: 'Inicio', description: 'Estado de APIs', flow: 'home' },
];

export const byId = (id: ScreenId) => SCREENS.find((s) => s.id === id)!;
