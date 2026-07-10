export type Viewer = {
  userId: string;
  userid: string;
  email: string;
  role: 'USER' | 'PARTNER' | 'ADMIN';
};

export type TokenPayload = {
  accessToken: string;
  refreshToken: string;
  role: Viewer['role'];
};
