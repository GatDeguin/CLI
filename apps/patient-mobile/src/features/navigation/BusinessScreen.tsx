import { ScreenId, byId } from '../../config/screens';
import { AuthScreen } from '../auth/screens';
import { DocumentsScreen } from '../documents/screens';
import { HomeScreen } from '../home/screens';
import { PaymentsScreen } from '../payments/screens';
import { ProfileScreen } from '../profile/screens';
import { SchedulingScreen } from '../scheduling/screens';

export function BusinessScreen({ id }: { id: ScreenId }) {
  const flow = byId(id).flow;

  if (flow === 'auth') return <AuthScreen screenId={id} />;
  if (flow === 'documents') return <DocumentsScreen screenId={id} />;
  if (flow === 'payments') return <PaymentsScreen screenId={id} />;
  if (flow === 'account') return <ProfileScreen screenId={id} />;
  if (flow === 'scheduling') return <SchedulingScreen screenId={id} />;
  return <HomeScreen screenId={id} />;
}
