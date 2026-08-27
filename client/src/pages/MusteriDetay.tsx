import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { Customer, Project, CustomerNote, DURUM_ETIKET, DURUM_RENK, DURUM_SIMGE, KATEGORI_ETIKET } from "../api/types";
import { Spinner, Badge, HataKutusu } from "../components/ui";
import { tarih, tl } from "../lib/format";

type MusteriProjesi = Project & { quotes: { total: number }[]; payments: { amount: number }[] };
type MusteriDetayVeri = Customer & { projects: MusteriProjesi[]; notes: CustomerNote[] };

export default function MusteriDetay() {
  const { id } = useParams();
  const [musteri, setMusteri] = useState<MusteriDetayVeri | null>(null);

  const yukle = () => api.get<MusteriDetayVeri>(`/customers/${id}`).then(setMusteri);

  useEffect(() => {
    yukle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!musteri) return <Spinner />;

  return (
    <div className="space-y-6">
      <Link to="/musteriler" className="text-sm text-brand-700 font-semibold">
        ← Müşteriler
      </Link>
      <div className="card">
        <h1 className="text-2xl font-bold">{musteri.name}</h1>
        <div className="mt-2 text-sm text-neutral-600 space-y-1">
          {musteri.phone && <div>📞 {musteri.phone}</div>}
          {musteri.email && <div>✉️ {musteri.email}</div>}
          {musteri.address && <div>📍 {musteri.address}</div>}
          {musteri.note && <div>📝 {musteri.note}</div>}
        </div>
      </div>

      <MusteriNotlariBolumu musteriId={musteri.id} notlar={musteri.notes} onChanged={yukle} />

      <CariBolumu projeler={musteri.projects} />

      <div>
        <h2 className="text-lg font-bold mb-3">Geçmiş İşler</h2>
        {musteri.projects.length === 0 ? (
          <div className="text-neutral-500 text-sm">Bu müşteriye ait iş yok.</div>
        ) : (
          <div className="grid gap-3">
            {musteri.projects.map((p) => {
              const satis = p.quotes[0]?.total;
              const tahsilat = p.payments.reduce((s, pay) => s + pay.amount, 0);
              const alacak = satis != null ? satis - tahsilat : null;
              return (
                <Link to={`/isler/${p.id}`} key={p.id} className="card flex items-center justify-between hover:shadow-md">
                  <div>
                    <div className="font-semibold">{p.title}</div>
                    <div className="text-sm text-neutral-500">
                      {KATEGORI_ETIKET[p.category]} • {tarih(p.createdAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {alacak != null && alacak > 0 && (
                      <span className="text-sm font-semibold text-amber-700">Alacak: {tl(alacak)}</span>
                    )}
                    <Badge className={DURUM_RENK[p.status]}>
                      {DURUM_SIMGE[p.status]} {DURUM_ETIKET[p.status]}
                    </Badge>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/** Müşterinin tüm işleri üzerinden toplu satış/tahsilat/alacak özeti (cari). */
function CariBolumu({ projeler }: { projeler: MusteriProjesi[] }) {
  const toplamSatis = projeler.reduce((s, p) => s + (p.quotes[0]?.total ?? 0), 0);
  const toplamTahsilat = projeler.reduce((s, p) => s + p.payments.reduce((a, pay) => a + pay.amount, 0), 0);
  const toplamAlacak = toplamSatis - toplamTahsilat;

  if (toplamSatis === 0 && toplamTahsilat === 0) return null;

  return (
    <div className="card space-y-3">
      <h2 className="font-bold">💳 Cari</h2>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl bg-neutral-50 p-3">
          <div className="text-lg font-bold">{tl(toplamSatis)}</div>
          <div className="text-xs text-neutral-500">Toplam Satış</div>
        </div>
        <div className="rounded-xl bg-blue-50 p-3">
          <div className="text-lg font-bold text-blue-700">{tl(toplamTahsilat)}</div>
          <div className="text-xs text-neutral-500">Tahsil Edilen</div>
        </div>
        <div className={`rounded-xl p-3 ${toplamAlacak > 0 ? "bg-amber-50" : "bg-neutral-50"}`}>
          <div className={`text-lg font-bold ${toplamAlacak > 0 ? "text-amber-700" : "text-neutral-500"}`}>{tl(toplamAlacak)}</div>
          <div className="text-xs text-neutral-500">Bakiye (Alacak)</div>
        </div>
      </div>
    </div>
  );
}

function MusteriNotlariBolumu({
  musteriId,
  notlar,
  onChanged,
}: {
  musteriId: number;
  notlar: CustomerNote[];
  onChanged: () => void;
}) {
  const [yeniNot, setYeniNot] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [kaydediliyor, setKaydediliyor] = useState(false);

  const ekle = async () => {
    if (!yeniNot.trim()) return;
    setKaydediliyor(true);
    setHata(null);
    try {
      await api.post(`/customers/${musteriId}/notes`, { note: yeniNot });
      setYeniNot("");
      onChanged();
    } catch (e: any) {
      setHata(e.message);
    } finally {
      setKaydediliyor(false);
    }
  };

  const sil = async (noteId: number) => {
    await api.del(`/customers/${musteriId}/notes/${noteId}`);
    onChanged();
  };

  return (
    <div className="card space-y-3">
      <h2 className="font-bold">📝 İletişim Notları</h2>
      <HataKutusu mesaj={hata} />
      <div className="flex gap-2">
        <input
          className="field-input flex-1"
          placeholder="örn. Aradı, teslim tarihini sordu."
          value={yeniNot}
          onChange={(e) => setYeniNot(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ekle()}
        />
        <button className="btn-primary btn-sm" onClick={ekle} disabled={kaydediliyor}>
          Ekle
        </button>
      </div>
      {notlar.length === 0 ? (
        <div className="text-sm text-neutral-500">Henüz not eklenmedi.</div>
      ) : (
        <div className="divide-y divide-neutral-100">
          {notlar.map((n) => (
            <div key={n.id} className="py-2 flex items-start justify-between gap-3 text-sm">
              <div>
                <div>{n.note}</div>
                <div className="text-xs text-neutral-400">{tarih(n.createdAt)}</div>
              </div>
              <button className="text-red-600 text-xs font-semibold shrink-0" onClick={() => sil(n.id)}>
                Sil
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
