import { useMutation, useQuery } from '@tanstack/react-query';
import { schedulingApi } from './api';

export const useSpecialties = (enabled = true) => useQuery({ queryKey: ['scheduling', 'specialties'], queryFn: schedulingApi.specialties, enabled });

export const useProfessionals = (specialtyId: string | undefined, enabled = true) =>
  useQuery({ queryKey: ['scheduling', 'professionals', specialtyId], queryFn: () => schedulingApi.professionals(specialtyId), enabled });

export const useSlots = (professionalId: string | undefined, enabled = true) =>
  useQuery({ queryKey: ['scheduling', 'slots', professionalId], queryFn: () => schedulingApi.slots(professionalId), enabled });

export const useAppointments = (profileId: string, enabled = true) =>
  useQuery({ queryKey: ['scheduling', 'appointments', profileId], queryFn: () => schedulingApi.listAppointments(profileId), enabled });

export const useBookAppointment = () => useMutation({ mutationFn: schedulingApi.book });

export const useRescheduleAppointment = () => useMutation({ mutationFn: ({ appointmentId, slotId }: { appointmentId: string; slotId: string }) => schedulingApi.reschedule(appointmentId, { slotId }) });

export const useCancelAppointment = () => useMutation({ mutationFn: ({ appointmentId, reason }: { appointmentId: string; reason?: string }) => schedulingApi.cancel(appointmentId, { reason }) });
