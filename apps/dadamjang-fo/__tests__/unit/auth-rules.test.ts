import {
  getConsentSelectionState,
  hasCompleteSignupConsentDocuments,
  hasRequiredConsents,
  resolveAuthReturnTo,
  validateEmail,
  validatePassword,
} from "@/features/auth/rules";
import type { SignupConsentDocument } from "@/features/auth/types";

const documents: SignupConsentDocument[] = [
  {
    documentId: "age",
    type: "AGE_OVER_14",
    title: "만 14세 이상",
    body: "본문",
    version: "1",
    required: true,
    activeFrom: "2026-01-01T00:00:00.000Z",
  },
  {
    documentId: "marketing",
    type: "MARKETING",
    title: "마케팅 정보 수신",
    body: "본문",
    version: "1",
    required: false,
    activeFrom: "2026-01-01T00:00:00.000Z",
  },
];

describe("auth rules", () => {
  it("distinguishes checked, mixed, and unchecked consent states", () => {
    expect(getConsentSelectionState(documents, new Set())).toBe("unchecked");
    expect(getConsentSelectionState(documents, new Set(["age"]))).toBe("mixed");
    expect(getConsentSelectionState(documents, new Set(["age", "marketing"]))).toBe("checked");
    expect(hasRequiredConsents(documents, new Set(["age"]))).toBe(true);
    expect(hasCompleteSignupConsentDocuments(documents)).toBe(false);
  });

  it("validates email and bcrypt-safe password bounds", () => {
    expect(validateEmail("member@example.com")).toBeNull();
    expect(validateEmail("invalid")).toBe("올바른 이메일 주소를 입력해 주세요.");
    expect(validatePassword("short")).toBe("비밀번호는 8자 이상이어야 합니다.");
    expect(validatePassword("가".repeat(24))).toBeNull();
    expect(validatePassword("가".repeat(25))).toBe("비밀번호는 72바이트 이하여야 합니다.");
  });

  it("allows only known internal return paths", () => {
    expect(resolveAuthReturnTo("/style-compose")).toBe("/style-compose");
    expect(resolveAuthReturnTo("/style/style-1")).toBe("/style/style-1");
    expect(resolveAuthReturnTo("https://evil.example")).toBe("/");
    expect(resolveAuthReturnTo("//evil.example")).toBe("/");
    expect(resolveAuthReturnTo(undefined)).toBe("/");
  });
});
