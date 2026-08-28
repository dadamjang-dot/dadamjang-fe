import { uniqueBy } from "./unique-by";

type Page<Item> = {
  nodes: readonly Item[];
};

type Pages<Item> = {
  pages: readonly Page<Item>[];
};

const getRowCount = <Item, Key extends PropertyKey>(
  data: Pages<Item> | undefined,
  getKey: (item: Item) => Key,
  columns: number,
) =>
  Math.ceil(
    uniqueBy(data?.pages.flatMap((page) => page.nodes) ?? [], getKey).length /
      columns,
  );

export const fetchUntilRowsGrow = async <Item, Key extends PropertyKey>(
  initialData: Pages<Item> | undefined,
  fetchNextPage: () => Promise<{
    data?: Pages<Item>;
    hasNextPage: boolean;
  }>,
  getKey: (item: Item) => Key,
  columns: number,
  isCurrentQuery: () => boolean,
) => {
  const initialRowCount = getRowCount(initialData, getKey, columns);
  let data = initialData;
  let pageCount = data?.pages.length ?? 0;

  while (true) {
    if (!isCurrentQuery()) return;
    const result = await fetchNextPage();
    if (!isCurrentQuery()) return;
    data = result.data;

    if (
      !data ||
      data.pages.length <= pageCount ||
      !result.hasNextPage ||
      getRowCount(data, getKey, columns) > initialRowCount
    )
      return;

    pageCount = data.pages.length;
  }
};
