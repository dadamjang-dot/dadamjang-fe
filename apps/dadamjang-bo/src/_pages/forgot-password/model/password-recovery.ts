export const isEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export const isValidPassword = (value: string) =>
  value.length >= 8 && new TextEncoder().encode(value).byteLength <= 72;
