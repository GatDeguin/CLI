import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Text } from 'react-native';
import { ScreenId, byId } from '../../config/screens';
import { useSession } from '../../session/SessionProvider';
import { Card, FeatureScreen, NextStep, PrimaryButton, StateBlock } from '../shared/ui';
import { createPreferenceSchema } from './forms';
import { paymentsErrorToMessage } from './errors';
import { useCreatePreference, useEconomicVisibility, usePaymentMethods } from './hooks';

export function PaymentsScreen({ screenId }: { screenId: ScreenId }) {
  const meta = byId(screenId);
  const profileId = useSession().activeProfileId ?? 'self';
  const visibility = useEconomicVisibility(profileId, screenId === 'SC-10' || screenId === 'SC-25');
  const methods = usePaymentMethods(profileId, screenId === 'SC-25' && Boolean(visibility.data?.canViewPaymentMethods));
  const createPreference = useCreatePreference();

  const form = useForm({ resolver: zodResolver(createPreferenceSchema), defaultValues: { appointmentId: 'appointment-1', profileId } });

  return (
    <FeatureScreen title={`${meta.id} · ${meta.title}`} subtitle={meta.description}>
      {screenId === 'SC-10' && (
        <Card title="Pago de copago">
          <StateBlock
            isLoading={visibility.isLoading}
            error={visibility.error ? paymentsErrorToMessage(visibility.error) : null}
            success={<Text>Copago visible: {String(Boolean(visibility.data?.canViewCopay))}</Text>}
          />
          <PrimaryButton label="Generar checkout" onPress={form.handleSubmit((values) => createPreference.mutate(values))} disabled={createPreference.isPending || !visibility.data?.canViewCopay} />
          <StateBlock
            isLoading={createPreference.isPending}
            error={createPreference.error ? paymentsErrorToMessage(createPreference.error) : null}
            success={createPreference.data ? <Text>Checkout listo: {createPreference.data.checkoutUrl}</Text> : null}
          />
          <NextStep to="/sc/sc-11" label="Continuar a confirmación de reserva" />
        </Card>
      )}

      {screenId === 'SC-25' && (
        <Card title="Medios de pago guardados">
          <StateBlock
            isLoading={methods.isLoading}
            error={methods.error ? paymentsErrorToMessage(methods.error) : null}
            isEmpty={!methods.data?.length}
            emptyText="No tenés medios de pago registrados."
            success={methods.data?.map((method) => <Text key={method.id}>• {method.brand} terminada en {method.last4}</Text>)}
          />
        </Card>
      )}
    </FeatureScreen>
  );
}
