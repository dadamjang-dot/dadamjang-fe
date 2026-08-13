import { describe, expect, it } from "vitest";
import { validateCategory } from "@/_pages/categories/model/category-tree";
import { validateInviteAccount } from "@/_pages/invite-accept/model/invite";
import { validateLogin } from "@/_pages/login/model/login";

describe("admin form validation", () => {
  it("requires both login credentials", () => {
    expect(validateLogin({ userid: " ", password: "" })).toEqual({
      userid: "아이디를 입력해주세요.",
      password: "비밀번호를 입력해주세요.",
    });
    expect(validateLogin({ userid: "admin", password: "password" })).toEqual(
      {},
    );
  });

  it("enforces invite token, userid, and bcrypt password limits", () => {
    expect(
      validateInviteAccount({ token: "", userid: "ab", password: "short" }),
    ).toEqual({
      token: "초대 링크가 올바르지 않습니다.",
      userid: "아이디는 3~40자의 영문, 숫자, ., _, -만 사용할 수 있습니다.",
      password: "비밀번호는 8자 이상, UTF-8 기준 72바이트 이하여야 합니다.",
    });
    expect(
      validateInviteAccount({
        token: "token",
        userid: "admin.user",
        password: "가".repeat(24),
      }),
    ).toEqual({});
    expect(
      validateInviteAccount({
        token: "token",
        userid: "admin.user",
        password: "가".repeat(25),
      }),
    ).toHaveProperty("password");
  });

  it("validates category names, slugs, and sort order", () => {
    expect(
      validateCategory({ name: "", slug: "Upper_Case", sortOrder: -1 }),
    ).toEqual({
      name: "이름은 1~100자로 입력해주세요.",
      slug: "slug는 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.",
      sortOrder: "정렬 순서는 0 이상이어야 합니다.",
    });
    expect(
      validateCategory({ name: "상의", slug: "tops-2026", sortOrder: 0 }),
    ).toEqual({});
  });
});
