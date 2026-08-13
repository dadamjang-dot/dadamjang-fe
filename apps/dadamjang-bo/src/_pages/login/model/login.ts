export const validateLogin = (input: { userid: string; password: string }) => {
  const errors: Record<string, string> = {};
  if (!input.userid.trim()) errors.userid = "아이디를 입력해주세요.";
  if (!input.password) errors.password = "비밀번호를 입력해주세요.";
  return errors;
};
