import { useMutation, useQuery } from '@tanstack/react-query';
import { paymentsApi } from './api';

export const useEconomicVisibility = (profileId: string, enabled = true) =>
  useQuery({ queryKey: ['payments', 'economic-visibility', profileId], queryFn: () => paymentsApi.economicVisibility(profileId), enabled });

export const usePaymentMethods = (profileId: string, enabled = true) =>
  useQuery({ queryKey: ['payments', 'methods', profileId], queryFn: () => paymentsApi.methods(profileId), enabled });

export const useCreatePreference = () => useMutation({ mutationFn: paymentsApi.createPreference });
