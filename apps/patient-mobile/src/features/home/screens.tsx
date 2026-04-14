import { Text } from 'react-native';
import { ScreenId, byId } from '../../config/screens';
import { Card, FeatureScreen, NextStep } from '../shared/ui';

export function HomeScreen({ screenId }: { screenId: ScreenId }) {
  const meta = byId(screenId);
  return (
    <FeatureScreen title={`${meta.id} · ${meta.title}`} subtitle={meta.description}>
      <Card title="Portal Paciente">
        {screenId === 'SC-01' && (
          <>
            <Text>Bienvenida al onboarding del Portal Paciente (es-AR).</Text>
            <NextStep to="/sc/sc-02" label="Comenzar onboarding" />
          </>
        )}
        {screenId === 'SC-05' && <Text>Tu tablero con próximos turnos, resultados y avisos de cobertura.</Text>}
        {screenId === 'SC-30' && <Text>¿Necesitás ayuda? Contactanos por WhatsApp o por la guardia telefónica.</Text>}
        {screenId === 'SC-32' && <Text>Estado de servicios: autenticación, turnos, pagos y documentos operativos.</Text>}
      </Card>
    </FeatureScreen>
  );
}
