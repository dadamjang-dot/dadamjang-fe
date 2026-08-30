const height = (value: number) => ({ height: value });
const paddingAll = (value: number) => ({ padding: value });
const size = (width: number, heightValue: number) => ({
  height: heightValue,
  width,
});
const width = (value: number) => ({ width: value });

export { height, paddingAll, size, width };
