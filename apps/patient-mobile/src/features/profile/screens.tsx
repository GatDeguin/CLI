import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Text } from 'react-native';
import { ScreenId, byId } from '../../config/screens';
import { useSession } from '../../session/SessionProvider';
import { Card, FeatureScreen, Input, PrimaryButton } from '../shared/ui';
import { activeProfileSchema } from './forms';

export function ProfileScreen({ screenId }: { screenId: ScreenId }) {
  const meta = byId(screenId);
  const session = useSession();
  const form = useForm({ resolver: zodResolver(activeProfileSchema), defaultValues: { profileId: session.activeProfileId ?? 'self' } });

  return (
    <FeatureScreen title={`${meta.id} · ${meta.title}`} subtitle={meta.description}>
      <Card title="Gestión de perfil">
        <Text>Perfil activo: {session.activeProfileId ?? 'titular'}</Text>
        {(screenId === 'SC-27' || screenId === 'SC-28' || screenId === 'SC-29') && (
          <>
            <Input accessibilityLabel="Identificador del perfil activo" value={form.watch('profileId')} onChangeText={(value) => form.setValue('profileId', value)} />
            <PrimaryButton label="Cambiar perfil activo" onPress={form.handleSubmit(async (values) => session.setActiveProfile(values.profileId))} />
          </>
        )}
        {screenId === 'SC-24' && <Text>Credencial digital disponible para presentar en admisión.</Text>}
        {screenId === 'SC-26' && <Text>Preferencias de notificaciones por email y push habilitadas.</Text>}
        {screenId === 'SC-23' && <Text>Actualizá tus datos personales y de contacto.</Text>}
      </Card>
    </FeatureScreen>
  );
}
