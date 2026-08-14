import type { SignupConsentDocument } from "./types";

export type ConsentSelectionState = "checked" | "mixed" | "unchecked";

export const validateEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email.trim()) && email.trim().length <= 255
    ? null
    : "이메일 주소를 다시 확인해 주세요.";

const utf8ByteLength = (value: string) => {
  let bytes = 0;
  for (const character of value) {
    const point = character.codePointAt(0) ?? 0;
    bytes += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
  }
  return bytes;
};

export const validatePassword = (password: string) => {
  if (password.length < 8) return "비밀번호를 8자 이상 입력해 주세요.";
  if (utf8ByteLength(password) > 72) return "비밀번호를 72바이트 이하로 입력해 주세요.";
  return null;
};

export const getConsentSelectionState = (
  documents: readonly SignupConsentDocument[],
  selectedDocumentIds: ReadonlySet<string>,
): ConsentSelectionState => {
  const selectedCount = documents.filter(({ documentId }) => selectedDocumentIds.has(documentId)).length;
  if (selectedCount === 0) return "unchecked";
  if (selectedCount === documents.length) return "checked";
  return "mixed";
};

export const hasRequiredConsents = (
  documents: readonly SignupConsentDocument[],
  selectedDocumentIds: ReadonlySet<string>,
) => documents.every(({ documentId, required }) => !required || selectedDocumentIds.has(documentId));

const signupConsentTypes = new Set([
  "AGE_OVER_14",
  "SERVICE_TERMS",
  "PRIVACY_COLLECTION",
  "MARKETING",
]);

export const hasCompleteSignupConsentDocuments = (
  documents: readonly SignupConsentDocument[],
) => documents.length === signupConsentTypes.size &&
  documents.every(({ type }) => signupConsentTypes.has(type));

const allowedExactPaths = new Set(["/", "/cart", "/orders", "/style-compose"]);
const allowedPathPrefixes = ["/product/", "/style/", "/order/"];

export const resolveAuthReturnTo = (returnTo: string | undefined) => {
  if (!returnTo || !returnTo.startsWith("/") || returnTo.startsWith("//")) return "/";
  if (allowedExactPaths.has(returnTo)) return returnTo;
  return allowedPathPrefixes.some((prefix) => returnTo.startsWith(prefix)) ? returnTo : "/";
};

export const toConsentAcceptances = (
  documents: readonly SignupConsentDocument[],
  selectedDocumentIds: ReadonlySet<string>,
) => documents.map(({ documentId }) => ({ documentId, agreed: selectedDocumentIds.has(documentId) }));

export const authErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;
