export const validateInviteAccount = (input: {
  token: string;
  userid: string;
  password: string;
}) => {
  const errors: Record<string, string> = {};
  if (!input.token) errors.token = "초대 링크가 올바르지 않습니다.";
  if (!/^[a-z0-9][a-z0-9._-]{2,39}$/i.test(input.userid.trim()))
    errors.userid =
      "아이디는 3~40자의 영문, 숫자, ., _, -만 사용할 수 있습니다.";
  if (
    input.password.length < 8 ||
    new TextEncoder().encode(input.password).byteLength > 72
  )
    errors.password =
      "비밀번호는 8자 이상, UTF-8 기준 72바이트 이하여야 합니다.";
  return errors;
};
