import type { AdminCategory } from "@/shared/api";

export type CategoryTreeRow = AdminCategory & { depth: number };

export const flattenCategoryTree = (categories: AdminCategory[]) => {
  const children = new Map<string | null, AdminCategory[]>();
  categories.forEach((category) => {
    const siblings = children.get(category.parentId) ?? [];
    children.set(category.parentId, [...siblings, category]);
  });
  children.forEach((siblings) =>
    siblings.sort(
      (left, right) =>
        left.sortOrder - right.sortOrder || left.name.localeCompare(right.name),
    ),
  );
  const rows: CategoryTreeRow[] = [];
  const append = (
    parentId: string | null,
    depth: number,
    visited: Set<string>,
  ) => {
    (children.get(parentId) ?? []).forEach((category) => {
      if (visited.has(category.categoryId)) return;
      const nextVisited = new Set(visited).add(category.categoryId);
      rows.push({ ...category, depth });
      append(category.categoryId, depth + 1, nextVisited);
    });
  };
  append(null, 0, new Set());
  categories
    .filter(
      (category) => !rows.some((row) => row.categoryId === category.categoryId),
    )
    .forEach((category) => rows.push({ ...category, depth: 0 }));
  return rows;
};

export const validateCategory = (input: {
  name: string;
  slug: string;
  sortOrder: number;
}) => {
  const errors: Record<string, string> = {};
  if (!input.name.trim() || input.name.trim().length > 100)
    errors.name = "이름은 1~100자로 입력해주세요.";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug.trim()))
    errors.slug = "slug는 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.";
  if (input.sortOrder < 0)
    errors.sortOrder = "정렬 순서는 0 이상이어야 합니다.";
  return errors;
};
