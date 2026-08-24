import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Project, DURUM_ETIKET, DURUM_RENK, KATEGORI_ETIKET, ONCELIK_ETIKET, ONCELIK_RENK } from "../api/types";
import { Spinner, EmptyState, Badge } from "../components/ui";
import { tarih } from "../lib/format";

type ProjeListe = Project & { customer: { name: string } };

const ONCELIK_SIRA: Record<string, number> = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };

function gunFarki(a: Date, b: Date): number {
  const gunMs = 24 * 60 * 60 * 1000;
  const aGun = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const bGun = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((aGun - bGun) / gunMs);
}

export default function Takvim() {
  const [projeler, setProjeler] = useState<ProjeListe[] | null>(null);

  useEffect(() => {
    api.get<ProjeListe[]>("/projects").then(setProjeler);
  }, []);

  if (!projeler) return <Spinner />;

  const aktifler = projeler.filter((p) => p.status !== "COMPLETED" && p.status !== "CANCELLED");
  const now = new Date();

  const gruplar: { baslik: string; renk: string; projeler: ProjeListe[] }[] = [
    { baslik: "⚠️ Tarihi Geçmiş", renk: "border-red-300 bg-red-50", projeler: [] },
    { baslik: "🔴 Bugün", renk: "border-amber-300 bg-amber-50", projeler: [] },
    { baslik: "🟡 Bu Hafta", renk: "border-neutral-200", projeler: [] },
    { baslik: "🟢 Bu Ay", renk: "border-neutral-200", projeler: [] },
    { baslik: "📅 Daha Sonra", renk: "border-neutral-200", projeler: [] },
    { baslik: "❔ Teslim Tarihi Girilmemiş", renk: "border-neutral-200", projeler: [] },
  ];

  for (const p of aktifler) {
    if (!p.dueDate) {
      gruplar[5].projeler.push(p);
      continue;
    }
    const fark = gunFarki(new Date(p.dueDate), now);
    if (fark < 0) gruplar[0].projeler.push(p);
    else if (fark === 0) gruplar[1].projeler.push(p);
    else if (fark <= 7) gruplar[2].projeler.push(p);
    else if (fark <= 31) gruplar[3].projeler.push(p);
    else gruplar[4].projeler.push(p);
  }

  for (const g of gruplar) {
    g.projeler.sort((a, b) => {
      const oncelikFark = ONCELIK_SIRA[a.priority] - ONCELIK_SIRA[b.priority];
      if (oncelikFark !== 0) return oncelikFark;
      if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      return 0;
    });
  }

  const gorunenGruplar = gruplar.filter((g) => g.projeler.length > 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">📅 Üretim Takvimi</h1>
      <p className="text-sm text-neutral-500">
        Aktif işler, teslim tarihine ve önceliğe göre sıralanmış olarak gösterilir. Teslim tarihi ve öncelik, işin
        "Düzenle" ekranından ayarlanabilir.
      </p>

      {gorunenGruplar.length === 0 ? (
        <EmptyState title="Aktif iş yok" />
      ) : (
        gorunenGruplar.map((g) => (
          <div key={g.baslik} className="space-y-2">
            <h2 className="font-bold text-lg">
              {g.baslik} <span className="text-neutral-400 font-normal text-sm">({g.projeler.length})</span>
            </h2>
            <div className="grid gap-2">
              {g.projeler.map((p) => (
                <Link
                  key={p.id}
                  to={`/isler/${p.id}`}
                  className={`card flex items-center justify-between hover:shadow-md border ${g.renk}`}
                >
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      {p.title}
                      <Badge className={ONCELIK_RENK[p.priority]}>{ONCELIK_ETIKET[p.priority]}</Badge>
                    </div>
                    <div className="text-sm text-neutral-500">
                      {p.customer.name} • {KATEGORI_ETIKET[p.category]}
                      {p.dueDate && ` • Teslim: ${tarih(p.dueDate)}`}
                    </div>
                  </div>
                  <Badge className={DURUM_RENK[p.status]}>{DURUM_ETIKET[p.status]}</Badge>
                </Link>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
