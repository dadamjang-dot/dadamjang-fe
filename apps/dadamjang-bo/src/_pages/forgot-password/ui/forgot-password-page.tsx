"use client";

import { ActionButton, Callout } from "@seed-design/react";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { AdminApiError } from "@/shared/api";
import {
  AdminTextField,
  ApiCallout,
  AuthLayout,
  authLayoutStyles,
} from "@/shared/ui";
import {
  requestPasswordResetCode,
  resetAdminPassword,
  verifyPasswordResetCode,
} from "../api/password-recovery";
import { isEmail, isValidPassword } from "../model/password-recovery";

type Step = "email" | "code" | "password" | "complete";

export const ForgotPasswordPage = () => {
  const [step, setStep] = useState<Step>("email");
  const [values, setValues] = useState({
    email: "",
    code: "",
    password: "",
    token: "",
  });
  const [error, setError] = useState("");
  const requestCode = useMutation({
    mutationFn: requestPasswordResetCode,
    onSuccess: () => setStep("code"),
  });
  const verifyCode = useMutation({
    mutationFn: verifyPasswordResetCode,
    onSuccess: ({ emailVerificationToken }) => {
      setValues((current) => ({ ...current, token: emailVerificationToken }));
      setStep("password");
    },
  });
  const reset = useMutation({
    mutationFn: resetAdminPassword,
    onSuccess: () => setStep("complete"),
  });
  const activeError = requestCode.error ?? verifyCode.error ?? reset.error;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (step === "email") {
      if (!isEmail(values.email))
        return setError("올바른 이메일 주소를 입력해주세요.");
      requestCode.mutate(values.email.trim());
    }
    if (step === "code") {
      if (!/^\d{6}$/.test(values.code))
        return setError("6자리 인증번호를 입력해주세요.");
      verifyCode.mutate({ email: values.email.trim(), code: values.code });
    }
    if (step === "password") {
      if (!isValidPassword(values.password))
        return setError(
          "비밀번호는 8자 이상, UTF-8 기준 72바이트 이하여야 합니다.",
        );
      reset.mutate({ token: values.token, password: values.password });
    }
  };

  return (
    <AuthLayout>
      <div className={authLayoutStyles.formCard}>
        <header className={authLayoutStyles.formHeader}>
          <h1>비밀번호 재설정</h1>
          <p>관리자 계정 이메일을 인증한 뒤 새 비밀번호를 설정합니다.</p>
        </header>
        {step === "complete" ? (
          <div className={authLayoutStyles.success}>
            <Callout.Root tone="positive">
              <Callout.Content>
                <Callout.Title>비밀번호가 변경되었습니다</Callout.Title>
                <Callout.Description>
                  새 비밀번호로 로그인하세요.
                </Callout.Description>
              </Callout.Content>
            </Callout.Root>
            <Link href="/login">로그인으로 이동</Link>
          </div>
        ) : (
          <form className={authLayoutStyles.form} onSubmit={submit} noValidate>
            {error ? <ApiCallout message={error} /> : null}
            {activeError ? (
              <ApiCallout
                message={
                  activeError instanceof AdminApiError
                    ? activeError.message
                    : "요청을 처리하지 못했습니다."
                }
              />
            ) : null}
            {step === "email" ? (
              <AdminTextField
                label="이메일"
                name="email"
                type="email"
                autoComplete="email"
                value={values.email}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
              />
            ) : null}
            {step === "code" ? (
              <AdminTextField
                label="인증번호"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={values.code}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    code: event.target.value,
                  }))
                }
              />
            ) : null}
            {step === "password" ? (
              <AdminTextField
                label="새 비밀번호"
                name="password"
                type="password"
                autoComplete="new-password"
                value={values.password}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
              />
            ) : null}
            <ActionButton
              variant="neutralSolid"
              size="large"
              type="submit"
              loading={
                requestCode.isPending || verifyCode.isPending || reset.isPending
              }
            >
              {step === "email"
                ? "인증번호 받기"
                : step === "code"
                  ? "인증하기"
                  : "비밀번호 변경"}
            </ActionButton>
            <div className={authLayoutStyles.links}>
              <Link href="/login">로그인으로 돌아가기</Link>
            </div>
          </form>
        )}
      </div>
    </AuthLayout>
  );
};
