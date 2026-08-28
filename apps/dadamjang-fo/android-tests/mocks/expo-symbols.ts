const unstable_getMaterialSymbolSourceAsync = async (
  symbol: string,
  size: number,
  color: string,
) => ({ uri: `material-symbol://${symbol}/${size}/${color}` });

export { unstable_getMaterialSymbolSourceAsync };
