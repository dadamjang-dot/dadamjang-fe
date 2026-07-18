export type CurrentUser = {
  userId: string;
  userid: string;
  email: string;
  role: 'USER' | 'PARTNER' | 'ADMIN';
};

export type TokenPayload = {
  accessToken: string;
  refreshToken: string;
  role: CurrentUser['role'];
};
