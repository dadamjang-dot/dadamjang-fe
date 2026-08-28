export const uniqueBy = <Item, Key extends PropertyKey>(
  items: readonly Item[],
  getKey: (item: Item) => Key,
) => {
  const seen = new Set<Key>();

  return items.filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
