import { Stack } from 'expo-router';
import { AppProviders } from '../src/providers/AppProviders';

export default function RootLayout() {
  return (
    <AppProviders>
      <Stack screenOptions={{ headerTitle: 'Portal Paciente' }} />
    </AppProviders>
  );
}
