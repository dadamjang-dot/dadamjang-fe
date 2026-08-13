"use client";

import { ActionButton } from "@seed-design/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AdminApiError } from "@/shared/api";
import {
  AdminTextField,
  ApiCallout,
  AuthLayout,
  authLayoutStyles,
} from "@/shared/ui";
import { signinAdmin } from "../api/signin";
import { validateLogin } from "../model/login";

export const LoginPage = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [values, setValues] = useState({ userid: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const signin = useMutation({
    mutationFn: signinAdmin,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-session"] });
      router.replace("/dashboard");
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validateLogin(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) signin.mutate(values);
  };

  return (
    <AuthLayout>
      <div className={authLayoutStyles.formCard}>
        <header className={authLayoutStyles.formHeader}>
          <h1>관리자 로그인</h1>
          <p>발급받은 관리자 계정으로 로그인하세요.</p>
        </header>
        {signin.error ? (
          <ApiCallout
            message={
              signin.error instanceof AdminApiError
                ? signin.error.message
                : "로그인에 실패했습니다."
            }
          />
        ) : null}
        <form className={authLayoutStyles.form} onSubmit={submit} noValidate>
          <AdminTextField
            label="아이디"
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
            autoComplete="current-password"
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
            className={authLayoutStyles.submit}
            variant="neutralSolid"
            size="large"
            type="submit"
            loading={signin.isPending}
          >
            로그인
          </ActionButton>
        </form>
        <div className={authLayoutStyles.links}>
          <Link href="/forgot-password">비밀번호 찾기</Link>
          <span>내부 관리자 전용</span>
        </div>
      </div>
    </AuthLayout>
  );
};
