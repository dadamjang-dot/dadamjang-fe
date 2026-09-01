export type CurrentUser = {
  userId: string;
  userid: string;
  email: string;
  role: "USER" | "PARTNER" | "ADMIN";
  hasPassword: boolean;
};

export type FoAccountDeactivation = {
  ok: boolean;
  scheduledAnonymizationAt: string;
};

export type TokenPayload = {
  accessToken: string;
  refreshToken: string;
  role: CurrentUser["role"];
};

export type SignInFoResult =
  | {
      status: "SIGNED_IN";
      tokenPayload: TokenPayload;
      reactivationToken: null;
    }
  | {
      status: "REACTIVATION_REQUIRED";
      tokenPayload: null;
      reactivationToken: string;
    };

export type SignupConsentType =
  "AGE_OVER_14" | "SERVICE_TERMS" | "PRIVACY_COLLECTION" | "MARKETING";

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
export type IdentityVerificationStatus =
  "PENDING" | "VERIFIED" | "FAILED" | "EXPIRED";

export type IdentityVerificationStart = {
  sessionId: string;
  launchUrl: string;
  expiresAt: string;
};

export type KakaoLoginResult =
  | {
      status: "SIGNED_IN";
      tokenPayload: TokenPayload;
      kakaoSignupToken: null;
      email: null;
      emailVerificationRequired: false;
      reactivationToken: null;
    }
  | {
      status: "SIGNUP_REQUIRED";
      tokenPayload: null;
      kakaoSignupToken: string;
      email: string | null;
      emailVerificationRequired: boolean;
      reactivationToken: null;
    }
  | {
      status: "REACTIVATION_REQUIRED";
      tokenPayload: null;
      kakaoSignupToken: null;
      email: null;
      emailVerificationRequired: false;
      reactivationToken: string;
    };

export type KakaoSignupContext = {
  kakaoSignupToken: string;
  email?: string;
  emailVerificationRequired: boolean;
};
