import * as LocalAuthentication from 'expo-local-authentication';

export const biometrics = {
  async isAvailable() {
    const [hardware, enrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    return hardware && enrolled;
  },
  authenticate() {
    return LocalAuthentication.authenticateAsync({
      promptMessage: 'Desbloquear sesión',
      cancelLabel: 'Usar contraseña/OTP',
      fallbackLabel: 'Ingresar con contraseña',
      disableDeviceFallback: false,
    });
  },
};
