import { getDeviceId, graphqlRequest } from "@dadamjang/graphql-client";

import type {
  IdentityVerificationProvider,
  IdentityVerificationPurpose,
  IdentityVerificationStart,
  IdentityVerificationStatus,
} from "./types";

export const startIdentityVerification = async (
  purpose: IdentityVerificationPurpose,
  provider: IdentityVerificationProvider,
) => {
  const deviceId = await getDeviceId();
  const data = await graphqlRequest<{
    startIdentityVerification: IdentityVerificationStart;
  }>(
    `mutation StartIdentityVerification($input: StartIdentityVerificationInput!) {
      startIdentityVerification(input: $input) { sessionId launchUrl expiresAt }
    }`,
    { input: { purpose, provider } },
    { "x-device-id": deviceId },
  );
  return data.startIdentityVerification;
};

export const getIdentityVerificationStatus = async (sessionId: string) => {
  const deviceId = await getDeviceId();
  const data = await graphqlRequest<{
    identityVerificationStatus: {
      sessionId: string;
      status: IdentityVerificationStatus;
      expiresAt: string;
    };
  }>(
    `query IdentityVerificationStatus($sessionId: ID!) {
      identityVerificationStatus(sessionId: $sessionId) { sessionId status expiresAt }
    }`,
    { sessionId },
    { "x-device-id": deviceId },
  );
  return data.identityVerificationStatus;
};

export const completeIdentityVerification = async (sessionId: string) => {
  const deviceId = await getDeviceId();
  const data = await graphqlRequest<{
    completeIdentityVerification: { identityVerificationToken: string };
  }>(
    `mutation CompleteIdentityVerification($sessionId: ID!) {
      completeIdentityVerification(sessionId: $sessionId) { identityVerificationToken }
    }`,
    { sessionId },
    { "x-device-id": deviceId },
  );
  return data.completeIdentityVerification;
};
