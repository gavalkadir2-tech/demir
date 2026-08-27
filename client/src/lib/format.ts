export const tl = (n: number): string =>
  n.toLocaleString("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 });

export const sayi = (n: number, basamak = 0): string => n.toLocaleString("tr-TR", { maximumFractionDigits: basamak });

export const mm = (n: number): string => `${sayi(n)} mm`;
export const metre = (n: number): string => `${sayi(n, 2)} m`;

export const tarih = (iso: string): string => new Date(iso).toLocaleDateString("tr-TR");

/** Türkiye telefon numaralarını wa.me formatına (ülke kodu + rakamlar, boşluk/sıfır yok)
 * çevirir. Numara yoksa/tanınmazsa undefined döner. */
export const telefonNormallestir = (telefon: string | null | undefined): string | undefined => {
  if (!telefon) return undefined;
  const rakamlar = telefon.replace(/\D/g, "");
  if (!rakamlar) return undefined;
  if (rakamlar.startsWith("90")) return rakamlar;
  if (rakamlar.startsWith("0")) return `90${rakamlar.slice(1)}`;
  return `90${rakamlar}`;
};
