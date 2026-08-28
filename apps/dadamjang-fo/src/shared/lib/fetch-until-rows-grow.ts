import { uniqueBy } from "./unique-by";

type CursorPage<Item> = {
  nodes: readonly Item[];
  nextCursor: string | null;
  hasNextPage: boolean;
};

type CursorPages<Item> = {
  pages: readonly CursorPage<Item>[];
};

const getRowCount = <Item, Key extends PropertyKey>(
  data: CursorPages<Item> | undefined,
  getKey: (item: Item) => Key,
  columns: number,
) =>
  Math.ceil(
    uniqueBy(data?.pages.flatMap((page) => page.nodes) ?? [], getKey).length /
      columns,
  );

export const fetchUntilRowsGrow = async <Item, Key extends PropertyKey>(
  initialData: CursorPages<Item> | undefined,
  fetchNextPage: () => Promise<{ data?: CursorPages<Item> }>,
  getKey: (item: Item) => Key,
  columns: number,
) => {
  const initialRowCount = getRowCount(initialData, getKey, columns);
  const seenCursors = new Set<string>();
  let data = initialData;

  while (true) {
    const page = data?.pages.at(-1);
    const cursor = page?.nextCursor;

    if (
      !page?.hasNextPage ||
      cursor === null ||
      cursor === undefined ||
      seenCursors.has(cursor)
    )
      return;

    seenCursors.add(cursor);
    data = (await fetchNextPage()).data;

    if (!data || getRowCount(data, getKey, columns) > initialRowCount) return;
  }
};
