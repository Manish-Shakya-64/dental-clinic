// The clinic bills in Australian dollars. The "A$" prefix is explicit so the amount reads as AUD
// whatever locale the viewer's browser is set to.
const amountWithCents = new Intl.NumberFormat("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const wholeAmount = new Intl.NumberFormat("en-AU", { maximumFractionDigits: 0 });

export function formatAUD(amount: number): string {
  return `A$${amountWithCents.format(amount)}`;
}

export function formatAUDWhole(amount: number): string {
  return `A$${wholeAmount.format(amount)}`;
}
