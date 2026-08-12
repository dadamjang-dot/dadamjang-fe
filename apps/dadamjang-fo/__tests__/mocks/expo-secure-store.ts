const getItem = async (_key: string): Promise<string | null> => null;

export const deleteItemAsync = jest.fn(async (_key: string) => undefined);
export const getItemAsync = jest.fn(getItem);
export const setItemAsync = jest.fn(async (_key: string, _value: string) => undefined);
