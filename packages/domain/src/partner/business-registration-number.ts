const BUSINESS_REGISTRATION_NUMBER_LENGTH = 10;

export const normalizeBusinessRegistrationNumber = (value: string) =>
  value.replaceAll(/\D/g, '');

export const formatBusinessRegistrationNumber = (value: string) => {
  const normalizedValue = normalizeBusinessRegistrationNumber(value).slice(
    0,
    BUSINESS_REGISTRATION_NUMBER_LENGTH,
  );

  if (normalizedValue.length <= 3) return normalizedValue;
  if (normalizedValue.length <= 5) {
    return `${normalizedValue.slice(0, 3)}-${normalizedValue.slice(3)}`;
  }

  return `${normalizedValue.slice(0, 3)}-${normalizedValue.slice(3, 5)}-${normalizedValue.slice(5)}`;
};

export const isBusinessRegistrationNumber = (value: string) =>
  normalizeBusinessRegistrationNumber(value).length === BUSINESS_REGISTRATION_NUMBER_LENGTH;
