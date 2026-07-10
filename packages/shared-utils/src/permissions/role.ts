export type UserRole = 'USER' | 'PARTNER' | 'ADMIN';

export const canAccessBackoffice = (role: UserRole) => role === 'ADMIN';

export const canAccessPartner = (role: UserRole) => role === 'PARTNER';
