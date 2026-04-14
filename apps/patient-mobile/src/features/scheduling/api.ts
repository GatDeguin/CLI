import { apiClient } from '../../api/client';
import { Appointment, Professional, Slot, Specialty } from '../../api/types';

export const schedulingApi = {
  specialties: () => apiClient<Specialty[]>('/directory/specialties'),
  professionals: (specialtyId?: string) => apiClient<Professional[]>(`/directory/professionals${specialtyId ? `?specialtyId=${specialtyId}` : ''}`),
  slots: (professionalId?: string) => apiClient<Slot[]>(`/scheduling/slots${professionalId ? `?professionalId=${professionalId}` : ''}`),
  book: (payload: { slotId: string; patientId: string; coverageProfile: string }) => apiClient<Appointment>('/scheduling/appointments', { method: 'POST', body: JSON.stringify(payload) }),
  listAppointments: (profileId?: string) => apiClient<Appointment[]>(`/scheduling/appointments${profileId ? `?profileId=${profileId}` : ''}`),
  reschedule: (appointmentId: string, payload: { slotId: string }) => apiClient<Appointment>(`/scheduling/appointments/${appointmentId}/reschedule`, { method: 'POST', body: JSON.stringify(payload) }),
  cancel: (appointmentId: string, payload?: { reason?: string }) => apiClient<Appointment>(`/scheduling/appointments/${appointmentId}/cancel`, { method: 'POST', body: JSON.stringify(payload ?? {}) }),
};
