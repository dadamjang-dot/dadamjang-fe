"use client";

import { ActionButton, Callout } from "@seed-design/react";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { AdminApiError } from "@/shared/api";
import {
  AdminTextField,
  ApiCallout,
  AuthLayout,
  authLayoutStyles,
} from "@/shared/ui";
import { acceptAdminInvite } from "../api/accept-invite";
import { validateInviteAccount } from "../model/invite";

export const InviteAcceptPage = () => {
  const token = useRef("");
  const [values, setValues] = useState({ userid: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const accept = useMutation({ mutationFn: acceptAdminInvite });

  useEffect(() => {
    const nextToken = new URLSearchParams(window.location.hash.slice(1)).get(
      "token",
    );
    if (nextToken) token.current = nextToken;
    if (window.location.hash)
      window.history.replaceState(null, "", window.location.pathname);
  }, []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const input = { ...values, token: token.current };
    const nextErrors = validateInviteAccount(input);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) accept.mutate(input);
  };

  return (
    <AuthLayout>
      <div className={authLayoutStyles.formCard}>
        <header className={authLayoutStyles.formHeader}>
          <h1>관리자 초대 수락</h1>
          <p>새 관리자 전용 계정을 만듭니다.</p>
        </header>
        {accept.isSuccess ? (
          <div className={authLayoutStyles.success}>
            <Callout.Root tone="positive">
              <Callout.Content>
                <Callout.Title>관리자 계정이 생성되었습니다</Callout.Title>
                <Callout.Description>
                  새 계정으로 로그인할 수 있습니다.
                </Callout.Description>
              </Callout.Content>
            </Callout.Root>
            <Link href="/login">로그인으로 이동</Link>
          </div>
        ) : (
          <>
            {errors.token ? <ApiCallout message={errors.token} /> : null}
            {accept.error ? (
              <ApiCallout
                message={
                  accept.error instanceof AdminApiError
                    ? accept.error.message
                    : "초대를 수락하지 못했습니다."
                }
              />
            ) : null}
            <form
              className={authLayoutStyles.form}
              onSubmit={submit}
              noValidate
            >
              <AdminTextField
                label="관리자 아이디"
                name="userid"
                autoComplete="username"
                value={values.userid}
                error={errors.userid}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    userid: event.target.value,
                  }))
                }
              />
              <AdminTextField
                label="비밀번호"
                name="password"
                type="password"
                autoComplete="new-password"
                value={values.password}
                error={errors.password}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
              />
              <ActionButton
                variant="neutralSolid"
                size="large"
                type="submit"
                loading={accept.isPending}
              >
                계정 만들기
              </ActionButton>
            </form>
          </>
        )}
      </div>
    </AuthLayout>
  );
};
