import { Material, UrunHesapSonucu } from "../api/types";
import { UyariKutusu } from "./ui";
import { mm } from "../lib/format";

export default function HesapSonucuGorunum({
  sonuc,
  malzemeler,
}: {
  sonuc: UrunHesapSonucu;
  malzemeler: Record<string, Material>;
}) {
  const adSoyad = (profilKey: string) => malzemeler[profilKey]?.name ?? `Malzeme #${profilKey}`;
  const agirlikKg = (profilKey: string, uzunlukMm: number, adet: number): number | null => {
    const w = malzemeler[profilKey]?.unitWeightKgPerM;
    if (!w) return null;
    return (uzunlukMm / 1000) * adet * w;
  };
  const toplamProfilAgirlikKg = sonuc.parcalar.reduce((acc, p) => acc + (agirlikKg(p.profilKey, p.uzunlukMm, p.adet) ?? 0), 0);
  const eksikAgirlik = sonuc.parcalar.some((p) => agirlikKg(p.profilKey, p.uzunlukMm, p.adet) == null);

  const ozet = sonuc.ozetDegerler;
  const kaplamaVar = ozet.kaplamaSiparisAlaniM2 != null;

  return (
    <div className="space-y-4">
      <UyariKutusu mesajlar={sonuc.uyarilar} />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-500 text-left">
            <tr>
              <th className="px-3 py-2">Parça</th>
              <th className="px-3 py-2">Malzeme</th>
              <th className="px-3 py-2">Uzunluk</th>
              <th className="px-3 py-2">Adet</th>
              <th className="px-3 py-2">Ağırlık</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {sonuc.parcalar.map((p, i) => {
              const w = agirlikKg(p.profilKey, p.uzunlukMm, p.adet);
              return (
                <tr key={i}>
                  <td className="px-3 py-2 font-medium">{p.label}</td>
                  <td className="px-3 py-2">{adSoyad(p.profilKey)}</td>
                  <td className="px-3 py-2">{mm(p.uzunlukMm)}</td>
                  <td className="px-3 py-2">{p.adet}</td>
                  <td className="px-3 py-2 text-neutral-600">{w != null ? `${w.toFixed(1)} kg` : "-"}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-neutral-200 font-semibold">
              <td className="px-3 py-2" colSpan={4}>
                Toplam profil ağırlığı
              </td>
              <td className="px-3 py-2">{toplamProfilAgirlikKg.toFixed(1)} kg</td>
            </tr>
          </tfoot>
        </table>
        {eksikAgirlik && (
          <p className="text-xs text-amber-700 mt-1">
            ⚠️ Bazı malzemelerin kg/m ağırlığı tanımlı değil; toplam eksik hesaplanmış olabilir.
          </p>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-3">
          <div className="font-bold mb-1">Profil Metrajı</div>
          {sonuc.profilOzet.map((o) => (
            <div key={o.profilKey} className="flex justify-between">
              <span>{adSoyad(o.profilKey)}</span>
              <span className="font-semibold">{o.toplamMetre} m</span>
            </div>
          ))}
        </div>
        {(sonuc.sacKalemleri.length > 0 || sonuc.baglantiKalemleri.length > 0) && (
          <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-3">
            <div className="font-bold mb-1">Ek Malzeme İhtiyacı</div>
            {sonuc.sacKalemleri.map((s, i) => (
              <div key={i} className="mb-1">
                <div className="flex justify-between">
                  <span>
                    {s.label} ({s.enMm}×{s.boyMm}mm)
                  </span>
                  <span className="font-semibold">{s.adet} adet</span>
                </div>
                {s.not && <div className="text-xs text-neutral-500">{s.not}</div>}
              </div>
            ))}
            {sonuc.baglantiKalemleri.map((b, i) => (
              <div key={i} className="flex justify-between">
                <span>{b.label}</span>
                <span className="font-semibold">
                  {b.adet} {b.birim}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {kaplamaVar && (
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-sm">
          <div className="font-bold mb-1">📐 Kaplama Alanı ve Fire</div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-bold">{ozet.kaplamaSiparisAlaniM2} m²</div>
              <div className="text-neutral-500 text-xs">Sipariş edilecek (fire dahil)</div>
            </div>
            <div>
              <div className="text-lg font-bold">{ozet.kaplamaFireM2} m²</div>
              <div className="text-neutral-500 text-xs">Fire</div>
            </div>
            <div>
              <div className="text-lg font-bold">%{ozet.kaplamaFireYuzde}</div>
              <div className="text-neutral-500 text-xs">Fire oranı</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
