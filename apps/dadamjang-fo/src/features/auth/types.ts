export type CurrentUser = {
  userId: string;
  userid: string;
  email: string;
  role: "USER" | "PARTNER" | "ADMIN";
};

export type TokenPayload = {
  accessToken: string;
  refreshToken: string;
  role: CurrentUser["role"];
};

export type SignupConsentType =
  | "AGE_OVER_14"
  | "SERVICE_TERMS"
  | "PRIVACY_COLLECTION"
  | "MARKETING";

export type SignupConsentDocument = {
  documentId: string;
  type: SignupConsentType;
  title: string;
  body: string;
  version: string;
  required: boolean;
  activeFrom: string;
};

export type ConsentAcceptance = {
  documentId: string;
  agreed: boolean;
};

export type IdentityVerificationPurpose = "SIGNUP" | "FIND_EMAIL";
export type IdentityVerificationProvider = "TOSS" | "KAKAO" | "NAVER";
export type IdentityVerificationStatus = "PENDING" | "VERIFIED" | "FAILED" | "EXPIRED";

export type IdentityVerificationStart = {
  sessionId: string;
  launchUrl: string;
  expiresAt: string;
};

export type KakaoLoginResult = {
  status: "SIGNED_IN" | "SIGNUP_REQUIRED";
  tokenPayload: TokenPayload | null;
  kakaoSignupToken: string | null;
  email: string | null;
  emailVerificationRequired: boolean;
};

export type KakaoSignupContext = {
  kakaoSignupToken: string;
  email?: string;
  emailVerificationRequired: boolean;
};
