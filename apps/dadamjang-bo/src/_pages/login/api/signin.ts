import { requestGraphQl } from "@/shared/api";

const SIGNIN_MUTATION = `
  mutation AdminSignin($input: SigninAuthInput!) {
    signin(input: $input) { role }
  }
`;

export const signinAdmin = async (input: {
  userid: string;
  password: string;
}) =>
  (
    await requestGraphQl<
      { signin: { role: string } },
      { input: { userid: string; password: string; portal: "BO" } }
    >(SIGNIN_MUTATION, { input: { ...input, portal: "BO" } })
  ).signin;
