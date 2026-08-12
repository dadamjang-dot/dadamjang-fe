import { view } from "./storybook.requires";

const getItem = async () => null;
const setItem = async () => undefined;

export default view.getStorybookUI({
  storage: { getItem, setItem },
});
