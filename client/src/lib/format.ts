export const tl = (n: number): string =>
  n.toLocaleString("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 });

export const sayi = (n: number, basamak = 0): string => n.toLocaleString("tr-TR", { maximumFractionDigits: basamak });

export const mm = (n: number): string => `${sayi(n)} mm`;
export const metre = (n: number): string => `${sayi(n, 2)} m`;

export const tarih = (iso: string): string => new Date(iso).toLocaleDateString("tr-TR");
