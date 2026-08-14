"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ActionButton } from "@seed-design/react";
import { PartnerTextField } from "@/shared/ui";
import { sessionQuery, signin } from "@/shared/auth";
export const LoginPage = () => {
  const router = useRouter();
  const client = useQueryClient();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setPending(true);
    const data = new FormData(e.currentTarget);
    try {
      await signin(String(data.get("userid")), String(data.get("password")));
      const session = await client.fetchQuery({
        ...sessionQuery(),
        staleTime: 0,
      });
      if (session.role !== "PARTNER") {
        setError("파트너 계정으로 로그인해 주세요.");
        return;
      }
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인하지 못했습니다.");
    } finally {
      setPending(false);
    }
  };
  return (
    <main className="login">
      <form onSubmit={submit}>
        <h1>다담장 파트너</h1>
        <p>상품과 판매 상태를 관리하세요.</p>
        <PartnerTextField
          label="아이디"
          name="userid"
          required
          autoComplete="username"
        />
        <PartnerTextField
          label="비밀번호"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <ActionButton type="submit" loading={pending}>
          로그인
        </ActionButton>
      </form>
    </main>
  );
};
