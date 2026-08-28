"use client";

import { ActionButton } from "@seed-design/react";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { FormEvent, useMemo, useState } from "react";
import { adminStatusLabel } from "@/entities/operation-status";
import { AdminApiError, type AdminInvite } from "@/shared/api";
import { formatDateTime } from "@/shared/lib";
import {
  AdminInput,
  AdminSelect,
  ApiCallout,
  Card,
  ConfirmDialog,
  DataTable,
  EmptyState,
  ErrorState,
  FilterBar,
  FilterControl,
  InlineActions,
  LoadMore,
  Page,
  PageHeader,
  StatusBadge,
  TableCard,
  TableSkeleton,
  useAdminSnackbar,
  type DataTableColumn,
} from "@/shared/ui";
import { createAdminInvite, revokeAdminInvite } from "../api/invite-mutations";
import { inviteQueries, type InviteFilter } from "../api/invite-queries";

const INITIAL_FILTER: InviteFilter = { query: "", status: "" };

export const AdminsPage = () => {
  const queryClient = useQueryClient();
  const notify = useAdminSnackbar();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [draft, setDraft] = useState<InviteFilter>(INITIAL_FILTER);
  const [filter, setFilter] = useState<InviteFilter>(INITIAL_FILTER);
  const [revokeTarget, setRevokeTarget] = useState<AdminInvite | null>(null);
  const list = useInfiniteQuery(inviteQueries.list(filter));
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: inviteQueries.all() }),
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-audit-logs"] }),
    ]);
  };
  const create = useMutation({
    mutationFn: createAdminInvite,
    onSuccess: async () => {
      setEmail("");
      notify("관리자 초대 메일을 발송했습니다.");
      await refresh();
    },
  });
  const revoke = useMutation({
    mutationFn: revokeAdminInvite,
    onSuccess: async () => {
      setRevokeTarget(null);
      notify("관리자 초대를 취소했습니다.");
      await refresh();
    },
  });
  const nodes = list.data?.pages.flatMap((page) => page.nodes) ?? [];
  const totalCount = list.data?.pages[0]?.totalCount ?? 0;
  const columns = useMemo<DataTableColumn<AdminInvite>[]>(
    () => [
      { key: "email", header: "이메일", render: (node) => node.email },
      {
        key: "status",
        header: "상태",
        render: (node) => (
          <StatusBadge
            status={node.status}
            label={adminStatusLabel(node.status)}
          />
        ),
      },
      {
        key: "inviter",
        header: "초대한 관리자",
        render: (node) => node.invitedByUserid,
      },
      {
        key: "created",
        header: "발송일",
        render: (node) => formatDateTime(node.createdAt),
      },
      {
        key: "expires",
        header: "만료일",
        render: (node) => formatDateTime(node.expiresAt),
      },
      {
        key: "actions",
        header: "작업",
        render: (node) => (
          <InlineActions>
            {node.status !== "ACCEPTED" ? (
              <ActionButton
                variant="ghost"
                size="xsmall"
                loading={create.isPending}
                onClick={() => create.mutate(node.email)}
              >
                재발송
              </ActionButton>
            ) : null}
            {node.status === "PENDING" ? (
              <ActionButton
                variant="ghost"
                size="xsmall"
                onClick={() => setRevokeTarget(node)}
              >
                취소
              </ActionButton>
            ) : null}
          </InlineActions>
        ),
      },
    ],
    [create],
  );

  const submitInvite = (event: FormEvent) => {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError("올바른 이메일 주소를 입력해주세요.");
      return;
    }
    setEmailError("");
    create.mutate(email.trim());
  };

  return (
    <Page>
      <PageHeader
        title="관리자"
        description="관리자 전용 계정을 초대하고 수락 상태를 확인합니다."
      />
      <Card title="관리자 초대">
        <form onSubmit={submitInvite}>
          <InlineActions>
            <FilterControl label="이메일" wide>
              <AdminInput
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              {emailError ? <p role="alert">{emailError}</p> : null}
            </FilterControl>
            <ActionButton
              type="submit"
              variant="neutralSolid"
              loading={create.isPending}
            >
              초대 발송
            </ActionButton>
          </InlineActions>
          {create.error ? (
            <ApiCallout
              message={
                create.error instanceof AdminApiError
                  ? create.error.message
                  : "초대를 발송하지 못했습니다."
              }
            />
          ) : null}
        </form>
      </Card>
      <FilterBar onSubmit={() => setFilter({ ...draft })}>
        <FilterControl label="검색" wide>
          <AdminInput
            placeholder="이메일"
            value={draft.query}
            onChange={(event) =>
              setDraft({ ...draft, query: event.target.value })
            }
          />
        </FilterControl>
        <FilterControl label="상태">
          <AdminSelect
            value={draft.status}
            onChange={(event) =>
              setDraft({ ...draft, status: event.target.value })
            }
          >
            <option value="">전체</option>
            <option value="PENDING">대기</option>
            <option value="ACCEPTED">수락</option>
            <option value="EXPIRED">만료</option>
            <option value="REVOKED">취소</option>
          </AdminSelect>
        </FilterControl>
        <ActionButton type="submit" variant="neutralSolid">
          조회
        </ActionButton>
      </FilterBar>
      <TableCard>
        {list.isPending ? <TableSkeleton /> : null}
        {list.isError ? <ErrorState retry={() => list.refetch()} /> : null}
        {nodes.length ? (
          <DataTable
            caption={`관리자 초대 ${totalCount}건`}
            columns={columns}
            nodes={nodes}
            rowKey={(node) => node.inviteId}
          />
        ) : null}
        {!list.isPending && !list.isError && nodes.length === 0 ? (
          <EmptyState
            title="관리자 초대가 없습니다"
            description="새 관리자를 이메일로 초대하세요."
          />
        ) : null}
        {list.hasNextPage ? (
          <LoadMore
            pending={list.isFetchingNextPage}
            onClick={() => list.fetchNextPage()}
          />
        ) : null}
      </TableCard>
      <ConfirmDialog
        open={!!revokeTarget}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
        title="관리자 초대를 취소할까요?"
        description={`${revokeTarget?.email ?? ""} 초대 링크는 즉시 사용할 수 없게 됩니다.`}
        confirmLabel="초대 취소"
        critical
        pending={revoke.isPending}
        onConfirm={() => {
          if (revokeTarget) revoke.mutate(revokeTarget.inviteId);
        }}
      >
        {revoke.error ? (
          <ApiCallout
            message={
              revoke.error instanceof AdminApiError
                ? revoke.error.message
                : "초대를 취소하지 못했습니다."
            }
          />
        ) : null}
      </ConfirmDialog>
    </Page>
  );
};
