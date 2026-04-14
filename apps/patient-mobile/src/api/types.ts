export type Tokens = { accessToken: string; refreshToken: string; expiresIn: number };
export type SessionInfo = { userId: string; deviceId: string; activeProfileId: string | null };
export type ApiError = { status: number; message: string; code?: string };

export type Specialty = { id: string; name: string };
export type Professional = { id: string; fullName: string; specialtyId: string };
export type Slot = { id: string; professionalId: string; start: string; end: string };
export type Appointment = { id: string; patientId: string; slotId: string; status: 'BOOKED' | 'CANCELLED' | 'RESCHEDULED'; copayAmount?: number; };
export type PaymentPreference = { paymentId: string; checkoutUrl: string; amount: number; currency: string };
export type DocumentItem = { id: string; title: string; type: 'RESULT' | 'DOCUMENT'; createdAt: string; downloadUrl?: string };
export type FamilyProfile = { id: string; fullName: string; relationship: string; };
export type EconomicVisibility = { canViewCopay: boolean; canViewDebt: boolean; canViewPaymentMethods: boolean; };
