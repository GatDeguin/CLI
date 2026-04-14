import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { z } from 'zod';
import { authApi } from '../features/auth/api';
import { documentsApi } from '../features/documents/api';
import { paymentsApi } from '../features/payments/api';
import { schedulingApi } from '../features/scheduling/api';
import { byId, ScreenId } from '../config/screens';
import { useSession } from '../session/SessionProvider';

const loginSchema = z.object({ identifier: z.string().min(3), password: z.string().min(6) });

type Props = { id: ScreenId };

export function ScreenScaffold({ id }: Props) {
  const meta = byId(id);
  const session = useSession();
  const profileId = session.activeProfileId ?? 'self';

  const form = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema), defaultValues: { identifier: '', password: '' } });

  const registerMutation = useMutation({ mutationFn: authApi.register });
  const otpMutation = useMutation({ mutationFn: authApi.verifyOtp });
  const loginMutation = useMutation({ mutationFn: authApi.login, onSuccess: ({ tokens, session: loginSession }) => session.setAuth(tokens, loginSession) });
  const logoutDeviceMutation = useMutation({ mutationFn: authApi.logoutDevice });
  const bookMutation = useMutation({ mutationFn: schedulingApi.book });
  const paymentMutation = useMutation({ mutationFn: paymentsApi.createPreference });

  const specialties = useQuery({ queryKey: ['specialties'], queryFn: schedulingApi.specialties, enabled: id === 'SC-06' || id === 'SC-16' });
  const professionals = useQuery({ queryKey: ['professionals'], queryFn: () => schedulingApi.professionals(), enabled: ['SC-07', 'SC-17', 'SC-18'].includes(id) });
  const slots = useQuery({ queryKey: ['slots'], queryFn: () => schedulingApi.slots(), enabled: ['SC-08', 'SC-14'].includes(id) });
  const appointments = useQuery({ queryKey: ['appointments', profileId], queryFn: () => schedulingApi.listAppointments(profileId), enabled: ['SC-11', 'SC-12', 'SC-13', 'SC-14', 'SC-15'].includes(id) });
  const results = useQuery({ queryKey: ['results', profileId], queryFn: () => documentsApi.results(profileId), enabled: ['SC-19', 'SC-20'].includes(id) });
  const documents = useQuery({ queryKey: ['documents', profileId], queryFn: () => documentsApi.documents(profileId), enabled: ['SC-21', 'SC-22'].includes(id) });
  const devices = useQuery({ queryKey: ['devices'], queryFn: authApi.listDevices, enabled: id === 'SC-31' });
  const economics = useQuery({ queryKey: ['economic-visibility', profileId], queryFn: () => paymentsApi.economicVisibility(profileId), enabled: ['SC-10', 'SC-25'].includes(id) });
  const paymentMethods = useQuery({ queryKey: ['payment-methods', profileId], queryFn: () => paymentsApi.methods(profileId), enabled: id === 'SC-25' && Boolean(economics.data?.canViewPaymentMethods) });

  const remoteData = specialties.data ?? professionals.data ?? slots.data ?? appointments.data ?? results.data ?? documents.data ?? devices.data ?? paymentMethods.data ?? economics.data;
  const anyLoading = [specialties, professionals, slots, appointments, results, documents, devices, economics, paymentMethods].some((q) => q.isLoading);
  const anyError = [specialties, professionals, slots, appointments, results, documents, devices, economics, paymentMethods].find((q) => q.error)?.error;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{meta.id} · {meta.title}</Text>
      <Text style={styles.subtitle}>{meta.description}</Text>

      {(id === 'SC-02' || id === 'SC-03' || id === 'SC-04' || id === 'SC-31') && (
        <View style={styles.card}>
          <Text style={styles.section}>Flujo Auth</Text>
          <TextInput style={styles.input} placeholder="identificador" value={form.watch('identifier')} onChangeText={(value) => form.setValue('identifier', value)} />
          <TextInput style={styles.input} placeholder="password" secureTextEntry value={form.watch('password')} onChangeText={(value) => form.setValue('password', value)} />
          <Pressable style={styles.button} onPress={() => registerMutation.mutate({ email: 'demo@app.com', dni: '30111222', password: 'demopass' })}><Text style={styles.buttonText}>Registrar</Text></Pressable>
          <Pressable style={styles.button} onPress={() => otpMutation.mutate({ userId: 'demo-user', otp: '123456' })}><Text style={styles.buttonText}>Validar OTP</Text></Pressable>
          <Pressable style={styles.button} onPress={form.handleSubmit((values) => loginMutation.mutate({ ...values, deviceId: 'device-mobile' }))}><Text style={styles.buttonText}>Iniciar sesión</Text></Pressable>
          {id === 'SC-31' && <Pressable style={styles.buttonSecondary} onPress={() => logoutDeviceMutation.mutate({ deviceId: 'device-mobile' })}><Text>Cerrar dispositivo</Text></Pressable>}
        </View>
      )}

      {(id === 'SC-09' || id === 'SC-10') && (
        <View style={styles.card}>
          <Text style={styles.section}>Reserva y pago</Text>
          <Pressable style={styles.button} onPress={() => bookMutation.mutate({ slotId: 'slot-1', patientId: profileId, coverageProfile: 'PLAN_A' })}><Text style={styles.buttonText}>Confirmar reserva</Text></Pressable>
          <Pressable style={styles.button} onPress={() => paymentMutation.mutate({ appointmentId: 'appointment-1', profileId })} disabled={!economics.data?.canViewCopay}><Text style={styles.buttonText}>Generar checkout</Text></Pressable>
          {economics.data && <Text style={styles.hint}>Visibilidad económica desde backend: copago={String(economics.data.canViewCopay)}</Text>}
        </View>
      )}

      {(id === 'SC-27' || id === 'SC-28' || id === 'SC-29') && (
        <View style={styles.card}>
          <Text style={styles.section}>Perfil activo / grupo familiar</Text>
          <Pressable style={styles.buttonSecondary} onPress={() => session.setActiveProfile('family-child-1')}><Text>Activar perfil familiar</Text></Pressable>
          <Text style={styles.hint}>Perfil activo: {session.activeProfileId ?? 'titular'}</Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.section}>Estado remoto</Text>
        {anyLoading && <Text>Cargando…</Text>}
        {anyError && <Text style={styles.error}>Error: {String(anyError)}</Text>}
        {!anyLoading && !anyError && <Text selectable>{JSON.stringify(remoteData ?? { info: 'Sin consumo remoto para esta pantalla' }, null, 2)}</Text>}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6fb' },
  content: { padding: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: '700', color: '#10223D' },
  subtitle: { color: '#3B4D6A' },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#d9e1ee', padding: 12, gap: 8 },
  section: { fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#c7d3e9', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  button: { backgroundColor: '#235fd1', borderRadius: 8, padding: 10 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  buttonSecondary: { backgroundColor: '#e8eef8', borderRadius: 8, padding: 10 },
  error: { color: '#9f1f1f' },
  hint: { color: '#5b6880', fontSize: 12 },
});
