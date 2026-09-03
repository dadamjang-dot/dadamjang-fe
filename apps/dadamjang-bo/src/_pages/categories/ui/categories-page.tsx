"use client";

import { ActionButton } from "@seed-design/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { AdminApiError, type AdminCategory } from "@/shared/api";
import {
  AdminInput,
  AdminSelect,
  ApiCallout,
  Card,
  ConfirmDialog,
  DataTable,
  DetailPanel,
  EmptyState,
  ErrorState,
  FilterControl,
  FormStack,
  InlineActions,
  Page,
  PageHeader,
  StatusBadge,
  TableCard,
  TableSkeleton,
  useAdminSnackbar,
  type DataTableColumn,
} from "@/shared/ui";
import {
  createCategory,
  updateCategory,
  type CreateCategoryValues,
} from "../api/category-mutations";
import { categoryQueries } from "../api/category-queries";
import {
  flattenCategoryTree,
  validateCategory,
  type CategoryTreeRow,
} from "../model/category-tree";
import styles from "../categories.module.css";

const EMPTY_FORM: Required<CreateCategoryValues> = {
  name: "",
  slug: "",
  parentId: "",
  sortOrder: 0,
  isActive: true,
};

export const CategoriesPage = () => {
  const queryClient = useQueryClient();
  const notify = useAdminSnackbar();
  const categories = useQuery(categoryQueries.list());
  const [createValues, setCreateValues] = useState(EMPTY_FORM);
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<AdminCategory | null>(null);
  const [editValues, setEditValues] = useState(EMPTY_FORM);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const create = useMutation({
    mutationFn: createCategory,
    onSuccess: async () => {
      setCreateValues(EMPTY_FORM);
      notify("카테고리를 생성했습니다.");
      await queryClient.invalidateQueries({ queryKey: categoryQueries.all() });
    },
  });
  const update = useMutation({
    mutationFn: updateCategory,
    onSuccess: async () => {
      setSelected(null);
      setConfirmDeactivate(false);
      notify("카테고리를 수정했습니다.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: categoryQueries.all() }),
        queryClient.invalidateQueries({ queryKey: ["admin-audit-logs"] }),
      ]);
    },
  });
  const rows = flattenCategoryTree(categories.data ?? []);
  const columns: DataTableColumn<CategoryTreeRow>[] = [
    {
      key: "name",
      header: "카테고리",
      render: (node) => (
        <div
          className={styles.nameCell}
          style={{ paddingLeft: `${node.depth * 22}px` }}
        >
          {node.depth ? <span className={styles.branch}>└</span> : null}
          <ActionButton
            variant="ghost"
            size="xsmall"
            onClick={() => {
              setSelected(node);
              setEditValues({
                name: node.name,
                slug: node.slug,
                parentId: node.parentId ?? "",
                sortOrder: node.sortOrder,
                isActive: node.isActive,
              });
            }}
          >
            {node.name}
          </ActionButton>
        </div>
      ),
    },
    { key: "slug", header: "Slug", render: (node) => node.slug },
    {
      key: "sort",
      header: "정렬",
      numeric: true,
      render: (node) => node.sortOrder,
    },
    {
      key: "active",
      header: "상태",
      render: (node) => (
        <StatusBadge
          status={node.isActive ? "APPROVED" : "EXPIRED"}
          label={node.isActive ? "활성" : "비활성"}
        />
      ),
    },
  ];

  const submitCreate = (event: FormEvent) => {
    event.preventDefault();
    const errors = validateCategory(createValues);
    setCreateErrors(errors);
    if (Object.keys(errors).length === 0)
      create.mutate({
        ...createValues,
        name: createValues.name.trim(),
        slug: createValues.slug.trim(),
        parentId: createValues.parentId || undefined,
      });
  };

  const submitUpdate = (event?: FormEvent) => {
    event?.preventDefault();
    if (!selected) return;
    const errors = validateCategory(editValues);
    setEditErrors(errors);
    if (Object.keys(errors).length > 0) return;
    if (selected.isActive && !editValues.isActive && !confirmDeactivate)
      return setConfirmDeactivate(true);
    update.mutate({
      categoryId: selected.categoryId,
      ...editValues,
      name: editValues.name.trim(),
      slug: editValues.slug.trim(),
      parentId: editValues.parentId || null,
    });
  };

  return (
    <Page>
      <PageHeader
        title="카테고리"
        description="계층, 정렬 순서와 공개 여부를 관리합니다."
      />
      <Card title="새 카테고리">
        <form onSubmit={submitCreate}>
          <InlineActions>
            <FilterControl label="이름">
              <AdminInput
                value={createValues.name}
                onChange={(event) =>
                  setCreateValues({ ...createValues, name: event.target.value })
                }
              />
              {createErrors.name ? (
                <p className={styles.error}>{createErrors.name}</p>
              ) : null}
            </FilterControl>
            <FilterControl label="Slug">
              <AdminInput
                value={createValues.slug}
                onChange={(event) =>
                  setCreateValues({
                    ...createValues,
                    slug: event.target.value.toLowerCase(),
                  })
                }
              />
              {createErrors.slug ? (
                <p className={styles.error}>{createErrors.slug}</p>
              ) : null}
            </FilterControl>
            <FilterControl label="상위 카테고리">
              <AdminSelect
                value={createValues.parentId}
                onChange={(event) =>
                  setCreateValues({
                    ...createValues,
                    parentId: event.target.value,
                  })
                }
              >
                <option value="">없음</option>
                {categories.data?.map((category) => (
                  <option key={category.categoryId} value={category.categoryId}>
                    {category.name}
                  </option>
                ))}
              </AdminSelect>
            </FilterControl>
            <FilterControl label="정렬">
              <AdminInput
                type="number"
                min={0}
                value={createValues.sortOrder}
                onChange={(event) =>
                  setCreateValues({
                    ...createValues,
                    sortOrder: Number(event.target.value),
                  })
                }
              />
            </FilterControl>
            <ActionButton
              type="submit"
              variant="neutralSolid"
              loading={create.isPending}
            >
              생성
            </ActionButton>
          </InlineActions>
          {create.error ? (
            <ApiCallout
              message={
                create.error instanceof AdminApiError
                  ? create.error.message
                  : "카테고리를 생성하지 못했습니다."
              }
            />
          ) : null}
        </form>
      </Card>
      <TableCard>
        {categories.isPending ? <TableSkeleton /> : null}
        {categories.isError ? (
          <ErrorState retry={() => categories.refetch()} />
        ) : null}
        {rows.length ? (
          <DataTable
            caption="카테고리 목록"
            columns={columns}
            nodes={rows}
            rowKey={(node) => node.categoryId}
          />
        ) : null}
        {!categories.isPending && !categories.isError && rows.length === 0 ? (
          <EmptyState
            title="카테고리가 없습니다"
            description="첫 카테고리를 생성하세요."
          />
        ) : null}
      </TableCard>
      <DetailPanel
        open={!!selected && !confirmDeactivate}
        onOpenChange={(open) => !open && setSelected(null)}
        title="카테고리 수정"
      >
        {selected ? (
          <form onSubmit={submitUpdate}>
            <FormStack>
              <FilterControl label="이름">
                <AdminInput
                  value={editValues.name}
                  onChange={(event) =>
                    setEditValues({ ...editValues, name: event.target.value })
                  }
                />
                {editErrors.name ? (
                  <p className={styles.error}>{editErrors.name}</p>
                ) : null}
              </FilterControl>
              <FilterControl label="Slug">
                <AdminInput
                  value={editValues.slug}
                  onChange={(event) =>
                    setEditValues({
                      ...editValues,
                      slug: event.target.value.toLowerCase(),
                    })
                  }
                />
                {editErrors.slug ? (
                  <p className={styles.error}>{editErrors.slug}</p>
                ) : null}
              </FilterControl>
              <FilterControl label="상위 카테고리">
                <AdminSelect
                  value={editValues.parentId}
                  onChange={(event) =>
                    setEditValues({
                      ...editValues,
                      parentId: event.target.value,
                    })
                  }
                >
                  <option value="">없음</option>
                  {categories.data
                    ?.filter(
                      (category) => category.categoryId !== selected.categoryId,
                    )
                    .map((category) => (
                      <option
                        key={category.categoryId}
                        value={category.categoryId}
                      >
                        {category.name}
                      </option>
                    ))}
                </AdminSelect>
              </FilterControl>
              <FilterControl label="정렬">
                <AdminInput
                  type="number"
                  min={0}
                  value={editValues.sortOrder}
                  onChange={(event) =>
                    setEditValues({
                      ...editValues,
                      sortOrder: Number(event.target.value),
                    })
                  }
                />
              </FilterControl>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={editValues.isActive}
                  onChange={(event) =>
                    setEditValues({
                      ...editValues,
                      isActive: event.target.checked,
                    })
                  }
                />{" "}
                활성 카테고리
              </label>
              {update.error ? (
                <ApiCallout
                  message={
                    update.error instanceof AdminApiError
                      ? update.error.message
                      : "카테고리를 수정하지 못했습니다."
                  }
                />
              ) : null}
              <ActionButton
                type="submit"
                variant="neutralSolid"
                loading={update.isPending}
              >
                변경 저장
              </ActionButton>
            </FormStack>
          </form>
        ) : null}
      </DetailPanel>
      <ConfirmDialog
        open={confirmDeactivate}
        onOpenChange={setConfirmDeactivate}
        title="카테고리를 비활성화할까요?"
        description="활성 하위 카테고리나 공개 상품이 있으면 변경할 수 없습니다."
        confirmLabel="비활성화"
        critical
        pending={update.isPending}
        onConfirm={() => submitUpdate()}
      >
        {update.error ? (
          <ApiCallout
            message={
              update.error instanceof AdminApiError
                ? update.error.message
                : "카테고리를 비활성화하지 못했습니다."
            }
          />
        ) : null}
      </ConfirmDialog>
    </Page>
  );
};
