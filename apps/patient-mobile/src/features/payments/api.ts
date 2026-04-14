import { apiClient } from '../../api/client';
import { EconomicVisibility, PaymentPreference } from '../../api/types';

export const paymentsApi = {
  createPreference: (payload: { appointmentId: string; profileId: string }) =>
    apiClient<PaymentPreference>('/payments/preferences', { method: 'POST', body: JSON.stringify(payload) }),
  methods: (profileId: string) => apiClient<Array<{ id: string; brand: string; last4: string }>>(`/payments/methods?profileId=${profileId}`),
  economicVisibility: (profileId: string) => apiClient<EconomicVisibility>(`/rules/economic-visibility?profileId=${profileId}`),
};
