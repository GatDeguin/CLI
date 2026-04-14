import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { useForm } from 'react-hook-form';
import { Text } from 'react-native';
import { ScreenId, byId } from '../../config/screens';
import { useSession } from '../../session/SessionProvider';
import { Card, FeatureScreen, FieldLabel, Input, NextStep, PrimaryButton, SecondaryButton, StateBlock } from '../shared/ui';
import { bookingSchema, cancelSchema, rescheduleSchema } from './forms';
import { schedulingErrorToMessage } from './errors';
import { useAppointments, useBookAppointment, useCancelAppointment, useProfessionals, useRescheduleAppointment, useSlots, useSpecialties } from './hooks';

export function SchedulingScreen({ screenId }: { screenId: ScreenId }) {
  const meta = byId(screenId);
  const profileId = useSession().activeProfileId ?? 'self';
  const specialties = useSpecialties(screenId === 'SC-06' || screenId === 'SC-16');
  const specialtyId = specialties.data?.[0]?.id;
  const professionals = useProfessionals(specialtyId, ['SC-07', 'SC-16', 'SC-17', 'SC-18'].includes(screenId));
  const professionalId = professionals.data?.[0]?.id;
  const slots = useSlots(professionalId, ['SC-08', 'SC-14'].includes(screenId));
  const appointments = useAppointments(profileId, ['SC-09', 'SC-11', 'SC-12', 'SC-13', 'SC-14', 'SC-15'].includes(screenId));

  const bookMutation = useBookAppointment();
  const rescheduleMutation = useRescheduleAppointment();
  const cancelMutation = useCancelAppointment();

  const bookingForm = useForm({ resolver: zodResolver(bookingSchema), defaultValues: { slotId: '', coverageProfile: 'PLAN_A' } });
  const rescheduleForm = useForm({ resolver: zodResolver(rescheduleSchema), defaultValues: { slotId: '' } });
  const cancelForm = useForm({ resolver: zodResolver(cancelSchema), defaultValues: { reason: 'No puedo asistir en este horario.' } });

  const firstAppointmentId = appointments.data?.[0]?.id ?? '';

  return (
    <FeatureScreen title={`${meta.id} · ${meta.title}`} subtitle={meta.description}>
      {screenId === 'SC-06' && (
        <Card title="Paso 1 · Elegí especialidad">
          <StateBlock
            isLoading={specialties.isLoading}
            error={specialties.error ? schedulingErrorToMessage(specialties.error) : null}
            isEmpty={!specialties.data?.length}
            emptyText="No hay especialidades disponibles en este momento."
            success={specialties.data?.map((item) => <Text key={item.id}>• {item.name}</Text>)}
          />
          <NextStep to="/sc/sc-07" label="Continuar con profesionales" />
        </Card>
      )}

      {screenId === 'SC-07' && (
        <Card title="Paso 2 · Elegí profesional">
          <StateBlock
            isLoading={professionals.isLoading}
            error={professionals.error ? schedulingErrorToMessage(professionals.error) : null}
            isEmpty={!professionals.data?.length}
            emptyText="No encontramos profesionales para la especialidad elegida."
            success={professionals.data?.map((professional) => <Text key={professional.id}>• {professional.fullName}</Text>)}
          />
          <NextStep to="/sc/sc-08" label="Ver agendas disponibles" />
        </Card>
      )}

      {screenId === 'SC-08' && (
        <Card title="Paso 3 · Elegí horario">
          <StateBlock
            isLoading={slots.isLoading}
            error={slots.error ? schedulingErrorToMessage(slots.error) : null}
            isEmpty={!slots.data?.length}
            emptyText="No hay horarios para este profesional."
            success={slots.data?.map((slot) => (
              <SecondaryButton key={slot.id} label={`${slot.start} a ${slot.end}`} onPress={() => bookingForm.setValue('slotId', slot.id)} />
            ))}
          />
          <Text>Horario seleccionado: {bookingForm.watch('slotId') || 'Ninguno'}</Text>
          <NextStep to="/sc/sc-09" label="Ir a confirmar reserva" />
        </Card>
      )}

      {screenId === 'SC-09' && (
        <Card title="Paso 4 · Confirmá tu reserva">
          <FieldLabel>ID del slot</FieldLabel>
          <Input accessibilityLabel="Slot a reservar" value={bookingForm.watch('slotId')} onChangeText={(value) => bookingForm.setValue('slotId', value)} />
          <FieldLabel>Plan de cobertura</FieldLabel>
          <Input accessibilityLabel="Plan de cobertura" value={bookingForm.watch('coverageProfile')} onChangeText={(value) => bookingForm.setValue('coverageProfile', value)} />
          <PrimaryButton label="Confirmar turno" onPress={bookingForm.handleSubmit((values) => bookMutation.mutate({ ...values, patientId: profileId }))} disabled={bookMutation.isPending} />
          <StateBlock isLoading={bookMutation.isPending} error={bookMutation.error ? schedulingErrorToMessage(bookMutation.error) : null} success={bookMutation.data ? <Text>Turno reservado: {bookMutation.data.id}</Text> : null} />
          <NextStep to="/sc/sc-10" label="Continuar al pago de copago" />
        </Card>
      )}

      {screenId === 'SC-11' && (
        <Card title="Reserva confirmada">
          <Text>¡Listo! Tu turno quedó reservado correctamente.</Text>
          <NextStep to="/sc/sc-12" label="Ver mis turnos" />
        </Card>
      )}

      {screenId === 'SC-12' && (
        <Card title="Mis turnos">
          <StateBlock
            isLoading={appointments.isLoading}
            error={appointments.error ? schedulingErrorToMessage(appointments.error) : null}
            isEmpty={!appointments.data?.length}
            emptyText="Aún no tenés turnos agendados."
            success={appointments.data?.map((appointment) => (
              <Text key={appointment.id}>• {appointment.id} · Estado: {appointment.status}</Text>
            ))}
          />
        </Card>
      )}

      {screenId === 'SC-13' && (
        <Card title="Detalle del turno">
          <Text>Mostramos la información completa de tu primer turno activo.</Text>
          <Text>ID: {appointments.data?.[0]?.id ?? 'Sin turnos'}</Text>
          <Text>Estado: {appointments.data?.[0]?.status ?? 'N/A'}</Text>
        </Card>
      )}

      {screenId === 'SC-14' && (
        <Card title="Reprogramar turno">
          <FieldLabel>Nuevo slot</FieldLabel>
          <Input accessibilityLabel="Nuevo horario" value={rescheduleForm.watch('slotId')} onChangeText={(value) => rescheduleForm.setValue('slotId', value)} />
          <PrimaryButton
            label="Reprogramar"
            onPress={rescheduleForm.handleSubmit((values) => rescheduleMutation.mutate({ appointmentId: firstAppointmentId, slotId: values.slotId }))}
            disabled={!firstAppointmentId || rescheduleMutation.isPending}
          />
          <StateBlock isLoading={rescheduleMutation.isPending} error={rescheduleMutation.error ? schedulingErrorToMessage(rescheduleMutation.error) : null} success={rescheduleMutation.data ? <Text>Turno actualizado.</Text> : null} />
        </Card>
      )}

      {screenId === 'SC-15' && (
        <Card title="Cancelar turno">
          <FieldLabel>Motivo</FieldLabel>
          <Input accessibilityLabel="Motivo de cancelación" value={cancelForm.watch('reason')} onChangeText={(value) => cancelForm.setValue('reason', value)} />
          <PrimaryButton label="Cancelar turno" onPress={cancelForm.handleSubmit((values) => cancelMutation.mutate({ appointmentId: firstAppointmentId, reason: values.reason }))} disabled={!firstAppointmentId || cancelMutation.isPending} />
          <StateBlock isLoading={cancelMutation.isPending} error={cancelMutation.error ? schedulingErrorToMessage(cancelMutation.error) : null} success={cancelMutation.data ? <Text>Turno cancelado correctamente.</Text> : null} />
        </Card>
      )}

      {screenId === 'SC-16' && (
        <Card title="Cartilla médica">
          <Text>Especialidades y prestadores disponibles para tu plan.</Text>
          <StateBlock isLoading={specialties.isLoading || professionals.isLoading} error={specialties.error ? schedulingErrorToMessage(specialties.error) : professionals.error ? schedulingErrorToMessage(professionals.error) : null} success={<Text>{(specialties.data?.length ?? 0) + (professionals.data?.length ?? 0)} registros encontrados.</Text>} />
        </Card>
      )}

      {screenId === 'SC-17' && (
        <Card title="Detalle del prestador">
          <StateBlock isLoading={professionals.isLoading} error={professionals.error ? schedulingErrorToMessage(professionals.error) : null} isEmpty={!professionals.data?.length} success={<Text>{professionals.data?.[0]?.fullName}</Text>} />
        </Card>
      )}

      {screenId === 'SC-18' && (
        <Card title="Favoritos">
          <Text>Guardá tus prestadores frecuentes para reservar más rápido.</Text>
          {professionals.data?.slice(0, 3).map((item) => <Text key={item.id}>❤️ {item.fullName}</Text>)}
        </Card>
      )}

      <Link href="/sc/sc-11" accessibilityLabel="Ir a reserva exitosa" style={{ color: '#124ec6', fontWeight: '700' }}>Ver pantalla de confirmación</Link>
    </FeatureScreen>
  );
}
