import { requestGraphQl, type AdminInvite } from "@/shared/api";

const INVITE_FIELDS =
  "inviteId email status invitedByUserId invitedByUserid expiresAt acceptedAt revokedAt createdAt";
const CREATE_INVITE = `mutation CreateAdminInvite($input: CreateAdminInviteInput!) { createAdminInvite(input: $input) { ${INVITE_FIELDS} } }`;
const REVOKE_INVITE = `mutation RevokeAdminInvite($input: RevokeAdminInviteInput!) { revokeAdminInvite(input: $input) { ${INVITE_FIELDS} } }`;

export const createAdminInvite = async (email: string) =>
  (
    await requestGraphQl<
      { createAdminInvite: AdminInvite },
      { input: { email: string } }
    >(CREATE_INVITE, { input: { email } })
  ).createAdminInvite;

export const revokeAdminInvite = async (inviteId: string) =>
  (
    await requestGraphQl<
      { revokeAdminInvite: AdminInvite },
      { input: { inviteId: string } }
    >(REVOKE_INVITE, {
      input: { inviteId },
    })
  ).revokeAdminInvite;
