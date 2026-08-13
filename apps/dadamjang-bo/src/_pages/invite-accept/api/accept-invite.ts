import { requestGraphQl, type AdminInvite } from "@/shared/api";

const ACCEPT_INVITE_MUTATION = `
  mutation AcceptAdminInvite($input: AcceptAdminInviteInput!) {
    acceptAdminInvite(input: $input) { inviteId email status acceptedAt }
  }
`;

export const acceptAdminInvite = async (input: {
  token: string;
  userid: string;
  password: string;
}) =>
  (
    await requestGraphQl<
      { acceptAdminInvite: AdminInvite },
      { input: typeof input }
    >(ACCEPT_INVITE_MUTATION, { input })
  ).acceptAdminInvite;
