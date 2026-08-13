import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors, spacing } from "@dadamjang/design-tokens";

import {
  IdentitySheetDismissedError,
  authErrorMessage,
  hasCompleteSignupConsentDocuments,
  hasRequiredConsents,
  resolveAuthReturnTo,
  toConsentAcceptances,
  useAuthFlow,
  useCompleteKakaoSignupFo,
  useRequestSignupEmailCode,
  useSignUpFo,
  useSignupConsentDocuments,
  useVerifySignupEmailCode,
  validateEmail,
  validatePassword,
} from "@/features/auth";
import {
  AuthScreen,
  ConsentChecklist,
  SignupCredentials,
} from "@/features/auth/components";
import { Button } from "@/shared/components/button";

const SignupScreen = () => {
  const router = useRouter();
  const { mode, returnTo } = useLocalSearchParams<{ mode?: string; returnTo?: string }>();
  const {
    kakaoSignup,
    clearKakaoSignup,
    openIdentityProviderSheet,
  } = useAuthFlow();
  const isKakao = mode === "kakao" && Boolean(kakaoSignup);
  const consentsQuery = useSignupConsentDocuments();
  const requestCode = useRequestSignupEmailCode();
  const verifyCode = useVerifySignupEmailCode();
  const signupFo = useSignUpFo();
  const signupKakao = useCompleteKakaoSignupFo();
  const [email, setEmail] = useState(kakaoSignup?.email ?? "");
  const [emailVerificationToken, setEmailVerificationToken] = useState<string>();
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<Set<string>>(new Set());
  const [identityVerificationToken, setIdentityVerificationToken] = useState<string>();
  const [isIdentityPending, setIsIdentityPending] = useState(false);
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    if (kakaoSignup?.email) setEmail(kakaoSignup.email);
  }, [kakaoSignup?.email]);

  const documents = useMemo(() => consentsQuery.data ?? [], [consentsQuery.data]);
  const emailVerified = isKakao && !kakaoSignup?.emailVerificationRequired
    ? Boolean(email)
    : Boolean(emailVerificationToken);
  const credentialsValid = isKakao
    ? validateEmail(email) === null && emailVerified
    : validateEmail(email) === null && emailVerified && validatePassword(password) === null &&
      password === passwordConfirmation;
  const requiredConsentsAccepted = hasCompleteSignupConsentDocuments(documents) &&
    hasRequiredConsents(documents, selectedDocumentIds);
  const canVerifyIdentity = credentialsValid && requiredConsentsAccepted && !isIdentityPending;
  const isSubmitting = signupFo.isPending || signupKakao.isPending;

  const consents = useMemo(
    () => toConsentAcceptances(documents, selectedDocumentIds),
    [documents, selectedDocumentIds],
  );

  const toggleConsent = (documentId: string) => {
    setSelectedDocumentIds((current) => {
      const next = new Set(current);
      if (next.has(documentId)) next.delete(documentId);
      else next.add(documentId);
      return next;
    });
  };

  const handleIdentity = async () => {
    if (!canVerifyIdentity) return;
    setIsIdentityPending(true);
    setMessage(undefined);
    try {
      setIdentityVerificationToken(await openIdentityProviderSheet("SIGNUP"));
    } catch (error) {
      if (!(error instanceof IdentitySheetDismissedError))
        setMessage(authErrorMessage(error, "본인인증을 완료하지 못했습니다."));
    } finally {
      setIsIdentityPending(false);
    }
  };

  const handleSubmit = async () => {
    if (!identityVerificationToken || !credentialsValid || !requiredConsentsAccepted) return;
    setMessage(undefined);
    try {
      if (isKakao && kakaoSignup) {
        await signupKakao.mutateAsync({
          kakaoSignupToken: kakaoSignup.kakaoSignupToken,
          email: email.trim().toLowerCase(),
          emailVerificationToken,
          identityVerificationToken,
          consents,
        });
        clearKakaoSignup();
      } else {
        await signupFo.mutateAsync({
          email: email.trim().toLowerCase(),
          password,
          emailVerificationToken: emailVerificationToken ?? "",
          identityVerificationToken,
          consents,
        });
      }
      router.replace(resolveAuthReturnTo(returnTo) as Href);
    } catch (error) {
      setMessage(authErrorMessage(error, "가입을 완료하지 못했습니다."));
    }
  };

  if (mode === "kakao" && !kakaoSignup) {
    return (
      <AuthScreen centered>
        <View style={s.missingFlow}>
          <Text style={s.message}>카카오 가입 시간이 만료되었습니다. 다시 시작해 주세요.</Text>
          <Button label="로그인으로 돌아가기" onPress={() => router.replace("/auth")} />
        </View>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen testID="e2e.auth.signup">
      <View style={s.form}>
        <SignupCredentials
          email={email}
          emailVerificationToken={emailVerificationToken}
          kakaoSignup={isKakao ? kakaoSignup : undefined}
          onEmailChange={setEmail}
          onEmailVerified={setEmailVerificationToken}
          onPasswordChange={setPassword}
          onPasswordConfirmationChange={setPasswordConfirmation}
          password={password}
          passwordConfirmation={passwordConfirmation}
          requestCode={(nextEmail) => requestCode.mutateAsync(nextEmail)}
          verifyCode={(input) => verifyCode.mutateAsync(input)}
        />
        <View style={s.section}>
          <Text style={s.sectionTitle}>약관 동의</Text>
          {consentsQuery.isPending ? <Text style={s.status}>약관을 불러오는 중입니다.</Text> : null}
          {consentsQuery.isError ? (
            <View style={s.statusGroup}>
              <Text style={s.message}>약관을 불러오지 못했습니다.</Text>
              <Button label="다시 시도" onPress={() => consentsQuery.refetch()} variant="secondary" />
            </View>
          ) : null}
          {documents.length > 0 ? (
            <ConsentChecklist
              documents={documents}
              onOpenDocument={(documentId) =>
                router.push({ pathname: "/auth/terms/[document-id]", params: { "document-id": documentId } })
              }
              onToggle={toggleConsent}
              onToggleAll={(selected) =>
                setSelectedDocumentIds(selected ? new Set(documents.map(({ documentId }) => documentId)) : new Set())
              }
              selectedDocumentIds={selectedDocumentIds}
            />
          ) : null}
        </View>
        <View style={s.identity}>
          <Button
            disabled={!canVerifyIdentity || Boolean(identityVerificationToken)}
            label={
              identityVerificationToken
                ? "본인 인증 완료"
                : isIdentityPending
                  ? "인증사 선택 중"
                  : "본인 인증하기"
            }
            onPress={handleIdentity}
            testID="e2e.auth.signup.identity"
            variant={identityVerificationToken ? "secondary" : "primary"}
          />
          {identityVerificationToken ? (
            <Text style={s.verified}>본인인증이 완료되었습니다.</Text>
          ) : null}
        </View>
        {message ? (
          <Text accessibilityRole="alert" style={s.message}>
            {message}
          </Text>
        ) : null}
        {identityVerificationToken ? (
          <Button
            disabled={isSubmitting}
            label={isSubmitting ? "가입 처리 중" : "가입하기"}
            onPress={handleSubmit}
            testID="e2e.auth.signup.submit"
          />
        ) : null}
      </View>
    </AuthScreen>
  );
};

const s = StyleSheet.create({
  form: { gap: spacing.xxl },
  section: { gap: spacing.lg },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: "800" },
  identity: { gap: spacing.sm },
  verified: { color: colors.ink, fontSize: 13, fontWeight: "600", textAlign: "center" },
  status: { color: colors.muted, fontSize: 13 },
  statusGroup: { gap: spacing.md },
  message: { color: colors.danger, fontSize: 13, lineHeight: 18 },
  missingFlow: { gap: spacing.lg },
});

export default SignupScreen;
