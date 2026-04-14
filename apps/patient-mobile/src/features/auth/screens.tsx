import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Text } from 'react-native';
import { ScreenId, byId } from '../../config/screens';
import { Card, FeatureScreen, FieldLabel, Input, NextStep, PrimaryButton, StateBlock } from '../shared/ui';
import { LoginFormValues, OtpFormValues, RegisterFormValues, loginSchema, otpSchema, registerSchema } from './forms';
import { authErrorToMessage } from './errors';
import { useActiveSessions, useDevices, useLogin, useLogoutDevice, useRegister, useRevokeSession, useVerifyOtp } from './hooks';
import { useSession } from '../../session/SessionProvider';

export function AuthScreen({ screenId }: { screenId: ScreenId }) {
  const meta = byId(screenId);
  const queryClient = useQueryClient();
  const sessionContext = useSession();
  const register = useRegister();
  const verifyOtp = useVerifyOtp();
  const login = useLogin();
  const devices = useDevices(screenId === 'SC-31');
  const activeSessions = useActiveSessions(screenId === 'SC-31');
  const logout = useLogoutDevice();
  const revokeSession = useRevokeSession();

  const registerForm = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema), defaultValues: { email: '', dni: '', password: '' } });
  const otpForm = useForm<OtpFormValues>({ resolver: zodResolver(otpSchema), defaultValues: { userId: '', otp: '' } });
  const loginForm = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema), defaultValues: { identifier: '', password: '', deviceId: sessionContext.deviceId } });

  return (
    <FeatureScreen title={`${meta.id} · ${meta.title}`} subtitle={meta.description}>
      {screenId === 'SC-02' && (
        <Card title="Registro de cuenta">
          <FieldLabel>Email</FieldLabel>
          <Input accessibilityLabel="Email para registrarse" value={registerForm.watch('email')} onChangeText={(value) => registerForm.setValue('email', value)} />
          <FieldLabel>DNI</FieldLabel>
          <Input accessibilityLabel="Documento nacional de identidad" value={registerForm.watch('dni')} onChangeText={(value) => registerForm.setValue('dni', value)} keyboardType="number-pad" />
          <FieldLabel>Contraseña</FieldLabel>
          <Input accessibilityLabel="Contraseña para registrarse" secureTextEntry value={registerForm.watch('password')} onChangeText={(value) => registerForm.setValue('password', value)} />
          <PrimaryButton label="Crear cuenta" onPress={registerForm.handleSubmit((values) => register.mutate(values))} disabled={register.isPending} />
          <StateBlock isLoading={register.isPending} error={register.error ? authErrorToMessage(register.error) : null} success={register.data ? <Text>¡Cuenta creada! ID: {register.data.userId}</Text> : null} />
          <NextStep to="/sc/sc-03" label="Continuar a validación OTP" />
        </Card>
      )}

      {screenId === 'SC-03' && (
        <Card title="Validar código OTP">
          <FieldLabel>ID de usuario</FieldLabel>
          <Input accessibilityLabel="Identificador del usuario" value={otpForm.watch('userId')} onChangeText={(value) => otpForm.setValue('userId', value)} />
          <FieldLabel>Código OTP</FieldLabel>
          <Input accessibilityLabel="Código OTP" value={otpForm.watch('otp')} onChangeText={(value) => otpForm.setValue('otp', value)} keyboardType="number-pad" />
          <PrimaryButton label="Validar código" onPress={otpForm.handleSubmit((values) => verifyOtp.mutate(values))} disabled={verifyOtp.isPending} />
          <StateBlock isLoading={verifyOtp.isPending} error={verifyOtp.error ? authErrorToMessage(verifyOtp.error) : null} success={verifyOtp.data ? <Text>Validación exitosa: {String(verifyOtp.data.verified)}</Text> : null} />
          <NextStep to="/sc/sc-04" label="Ir a iniciar sesión" />
        </Card>
      )}

      {screenId === 'SC-04' && (
        <Card title="Ingreso seguro">
          {sessionContext.isBiometricAvailable ? (
            <PrimaryButton
              label={sessionContext.isBiometricLocked ? 'Desbloquear con biometría' : 'Activar biometría para próximos ingresos'}
              onPress={async () => {
                if (sessionContext.isBiometricLocked) {
                  await sessionContext.unlockWithBiometrics();
                } else {
                  await sessionContext.setBiometricPreference(true);
                }
              }}
            />
          ) : (
            <Text>Biometría no disponible. Continuá con OTP o contraseña.</Text>
          )}
          {sessionContext.biometricError ? <Text>{sessionContext.biometricError}</Text> : null}
          <FieldLabel>Email o DNI</FieldLabel>
          <Input accessibilityLabel="Email o DNI" value={loginForm.watch('identifier')} onChangeText={(value) => loginForm.setValue('identifier', value)} autoCapitalize="none" />
          <FieldLabel>Contraseña</FieldLabel>
          <Input accessibilityLabel="Contraseña de ingreso" secureTextEntry value={loginForm.watch('password')} onChangeText={(value) => loginForm.setValue('password', value)} />
          <PrimaryButton label="Entrar a mi cuenta" onPress={loginForm.handleSubmit((values) => login.mutate({ ...values, deviceId: sessionContext.deviceId }))} disabled={login.isPending} />
          <Text>Fallback: si biometría falla, podés validar OTP y volver a ingresar con contraseña.</Text>
          <StateBlock isLoading={login.isPending} error={login.error ? authErrorToMessage(login.error) : null} success={login.data ? <Text>Sesión iniciada en {login.data.session.deviceId}</Text> : null} />
          <NextStep to="/sc/sc-06" label="Comenzar reserva de turnos" />
        </Card>
      )}

      {screenId === 'SC-31' && (
        <Card title="Sesiones activas y dispositivos">
          <StateBlock
            isLoading={devices.isLoading || activeSessions.isLoading}
            error={(devices.error || activeSessions.error) ? authErrorToMessage(devices.error || activeSessions.error) : null}
            isEmpty={!devices.data?.length}
            emptyText="No hay dispositivos asociados a tu cuenta."
            success={
              <>
                {devices.data?.map((device) => (
                  <Card key={device.deviceId} title={device.current ? 'Este dispositivo' : 'Dispositivo'}>
                    <Text>Id: {device.deviceId}</Text>
                    <Text>Último acceso: {device.lastSeenAt}</Text>
                    {!device.current ? (
                      <PrimaryButton
                        label="Cerrar sesión en este dispositivo"
                        onPress={() => logout.mutate(
                          { deviceId: device.deviceId },
                          { onSuccess: () => queryClient.invalidateQueries({ queryKey: ['auth'] }) },
                        )}
                      />
                    ) : null}
                  </Card>
                ))}
                {activeSessions.data?.map((remoteSession) => (
                  <Card key={remoteSession.sessionId} title={remoteSession.current ? 'Sesión actual' : 'Sesión remota'}>
                    <Text>Sesión: {remoteSession.sessionId}</Text>
                    <Text>DeviceId: {remoteSession.deviceId}</Text>
                    <Text>Última actividad: {remoteSession.lastSeenAt}</Text>
                    {!remoteSession.current ? (
                      <PrimaryButton
                        label="Cerrar sesión remota"
                        onPress={() => revokeSession.mutate(
                          { sessionId: remoteSession.sessionId },
                          { onSuccess: () => queryClient.invalidateQueries({ queryKey: ['auth'] }) },
                        )}
                      />
                    ) : null}
                  </Card>
                ))}
              </>
            }
          />
        </Card>
      )}
    </FeatureScreen>
  );
}
