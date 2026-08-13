import { requestGraphQl, type AdminCategory } from "@/shared/api";

const CATEGORY_FIELDS =
  "categoryId name slug parentId sortOrder isActive createdAt updatedAt";
const CREATE_CATEGORY = `mutation CreateCategory($input: CreateCategoryInput!) { createCategory(input: $input) { ${CATEGORY_FIELDS} } }`;
const UPDATE_CATEGORY = `mutation UpdateCategory($input: UpdateCategoryInput!) { updateCategory(input: $input) { ${CATEGORY_FIELDS} } }`;

export type CreateCategoryValues = {
  name: string;
  slug: string;
  parentId?: string;
  sortOrder?: number;
  isActive?: boolean;
};

export type UpdateCategoryValues = Omit<
  Partial<CreateCategoryValues>,
  "parentId"
> & {
  categoryId: string;
  parentId?: string | null;
};

export const createCategory = async (input: CreateCategoryValues) =>
  (
    await requestGraphQl<
      { createCategory: AdminCategory },
      { input: CreateCategoryValues }
    >(CREATE_CATEGORY, { input })
  ).createCategory;

export const updateCategory = async (input: UpdateCategoryValues) =>
  (
    await requestGraphQl<
      { updateCategory: AdminCategory },
      { input: UpdateCategoryValues }
    >(UPDATE_CATEGORY, { input })
  ).updateCategory;
