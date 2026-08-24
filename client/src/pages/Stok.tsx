import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Material, StockMovement } from "../api/types";
import { Modal, Spinner, HataKutusu } from "../components/ui";
import { sayi, tarih, tl } from "../lib/format";

export default function Stok() {
  const [malzemeler, setMalzemeler] = useState<Material[] | null>(null);
  const [hareketModal, setHareketModal] = useState<Material | null>(null);
  const [gecmisModal, setGecmisModal] = useState<Material | null>(null);
  const [sadeceKritik, setSadeceKritik] = useState(false);

  const yukle = () => api.get<Material[]>("/materials").then(setMalzemeler);

  useEffect(() => {
    yukle();
  }, []);

  const gorunenler = (malzemeler ?? []).filter((m) => !sadeceKritik || (m.minStockQty > 0 && m.stockQty <= m.minStockQty));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Stok</h1>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={sadeceKritik} onChange={(e) => setSadeceKritik(e.target.checked)} />
          Sadece kritik stoklar
        </label>
      </div>

      {!malzemeler ? (
        <Spinner />
      ) : (
        <div className="grid gap-3">
          {gorunenler.map((m) => {
            const kritik = m.minStockQty > 0 && m.stockQty <= m.minStockQty;
            return (
              <div key={m.id} className={`card flex items-center justify-between ${kritik ? "border-amber-300 bg-amber-50" : ""}`}>
                <div>
                  <div className="font-bold">{m.name}</div>
                  <div className="text-sm text-neutral-500">
                    Stok: {sayi(m.stockQty)} {m.unit === "M" ? "m" : m.unit === "KG" ? "kg" : "adet"}
                    {m.minStockQty > 0 && ` • Min: ${sayi(m.minStockQty)}`}
                    {kritik && <span className="text-amber-700 font-semibold"> • Kritik!</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="btn-secondary btn-sm" onClick={() => setGecmisModal(m)}>
                    Hareketler
                  </button>
                  <button className="btn-primary btn-sm" onClick={() => setHareketModal(m)}>
                    Stok Hareketi
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hareketModal && (
        <StokHareketModal
          malzeme={hareketModal}
          onClose={() => setHareketModal(null)}
          onSaved={() => {
            yukle();
            setHareketModal(null);
          }}
        />
      )}
      {gecmisModal && <StokGecmisModal malzeme={gecmisModal} onClose={() => setGecmisModal(null)} />}
    </div>
  );
}

function StokHareketModal({ malzeme, onClose, onSaved }: { malzeme: Material; onClose: () => void; onSaved: () => void }) {
  const [yon, setYon] = useState<"giris" | "cikis">("giris");
  const [miktar, setMiktar] = useState(1);
  const [sebep, setSebep] = useState("");
  const [tedarikci, setTedarikci] = useState("");
  const [birimMaliyet, setBirimMaliyet] = useState(0);
  const [hata, setHata] = useState<string | null>(null);
  const [kaydediliyor, setKaydediliyor] = useState(false);

  const kaydet = async () => {
    if (!sebep.trim()) {
      setHata("Sebep girilmeli.");
      return;
    }
    setKaydediliyor(true);
    setHata(null);
    try {
      const qtyDelta = yon === "giris" ? Math.abs(miktar) : -Math.abs(miktar);
      await api.post(`/materials/${malzeme.id}/stock-adjust`, {
        qtyDelta,
        reason: sebep,
        ...(yon === "giris" && tedarikci.trim() ? { supplier: tedarikci, unitCost: birimMaliyet || undefined } : {}),
      });
      onSaved();
    } catch (e: any) {
      setHata(e.message);
    } finally {
      setKaydediliyor(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`Stok Hareketi: ${malzeme.name}`}>
      <div className="space-y-3">
        <HataKutusu mesaj={hata} />
        <div className="flex gap-2">
          <button className={yon === "giris" ? "btn-primary flex-1" : "btn-secondary flex-1"} onClick={() => setYon("giris")}>
            ➕ Giriş
          </button>
          <button className={yon === "cikis" ? "btn-danger flex-1" : "btn-secondary flex-1"} onClick={() => setYon("cikis")}>
            ➖ Çıkış
          </button>
        </div>
        <div>
          <label className="field-label">Miktar</label>
          <input type="number" className="field-input" value={miktar} onChange={(e) => setMiktar(Number(e.target.value))} />
        </div>
        <div>
          <label className="field-label">Sebep</label>
          <input className="field-input" value={sebep} onChange={(e) => setSebep(e.target.value)} placeholder="örn. Yeni sevkiyat, sayım düzeltmesi..." />
        </div>
        {yon === "giris" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Tedarikçi (opsiyonel)</label>
              <input className="field-input" value={tedarikci} onChange={(e) => setTedarikci(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Birim Maliyet (TL)</label>
              <input
                type="number"
                className="field-input"
                value={birimMaliyet || ""}
                onChange={(e) => setBirimMaliyet(Number(e.target.value))}
              />
            </div>
          </div>
        )}
        <button className="btn-primary w-full" onClick={kaydet} disabled={kaydediliyor}>
          {kaydediliyor ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </div>
    </Modal>
  );
}

function StokGecmisModal({ malzeme, onClose }: { malzeme: Material; onClose: () => void }) {
  const [hareketler, setHareketler] = useState<StockMovement[] | null>(null);

  useEffect(() => {
    api.get<StockMovement[]>(`/materials/${malzeme.id}/stock-movements`).then(setHareketler);
  }, [malzeme.id]);

  return (
    <Modal open onClose={onClose} title={`Stok Hareketleri: ${malzeme.name}`} wide>
      {!hareketler ? (
        <Spinner />
      ) : hareketler.length === 0 ? (
        <div className="text-neutral-500 text-sm">Henüz hareket yok.</div>
      ) : (
        <div className="divide-y divide-neutral-100">
          {hareketler.map((h) => (
            <div key={h.id} className="py-2 flex items-center justify-between text-sm">
              <div>
                <div className="font-medium">{h.reason}</div>
                <div className="text-neutral-500">
                  {tarih(h.createdAt)}
                  {h.project && ` • ${h.project.title}`}
                  {h.supplier && ` • ${h.supplier}`}
                  {h.unitCost != null && ` • ${tl(h.unitCost)}/birim`}
                </div>
              </div>
              <div className={`font-bold ${h.qtyDelta >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {h.qtyDelta >= 0 ? "+" : ""}
                {sayi(h.qtyDelta)}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
