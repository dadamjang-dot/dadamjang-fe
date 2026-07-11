export type CartLine = {
  quantity: number;
  unitPrice: number;
  selected?: boolean;
};

export const calculateCartLineTotal = ({ quantity, unitPrice }: CartLine) =>
  quantity * unitPrice;

export const calculateCartTotal = (lines: CartLine[]) =>
  lines
    .filter((line) => line.selected ?? true)
    .reduce((total, line) => total + calculateCartLineTotal(line), 0);

export const canCheckout = (lines: CartLine[]) =>
  lines.some((line) => (line.selected ?? true) && line.quantity > 0 && line.unitPrice >= 0);
