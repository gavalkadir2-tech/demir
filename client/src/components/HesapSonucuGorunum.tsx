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
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {sonuc.parcalar.map((p, i) => (
              <tr key={i}>
                <td className="px-3 py-2 font-medium">{p.label}</td>
                <td className="px-3 py-2">{adSoyad(p.profilKey)}</td>
                <td className="px-3 py-2">{mm(p.uzunlukMm)}</td>
                <td className="px-3 py-2">{p.adet}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
              <div key={i} className="flex justify-between">
                <span>
                  {s.label} ({s.enMm}×{s.boyMm}mm)
                </span>
                <span className="font-semibold">{s.adet} adet</span>
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
    </div>
  );
}
