import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Worker } from "../api/types";
import { Modal, Spinner, EmptyState, HataKutusu, Badge } from "../components/ui";

export default function Isciler() {
  const [isciler, setIsciler] = useState<Worker[] | null>(null);
  const [modal, setModal] = useState<Worker | "new" | null>(null);

  const yukle = () => api.get<Worker[]>("/workers").then(setIsciler);

  useEffect(() => {
    yukle();
  }, []);

  const sil = async (id: number) => {
    if (!confirm("Bu işçiyi silmek istediğinize emin misiniz?")) return;
    await api.del(`/workers/${id}`);
    yukle();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">İşçiler</h1>
        <button className="btn-primary" onClick={() => setModal("new")}>
          ➕ Yeni İşçi
        </button>
      </div>

      {!isciler ? (
        <Spinner />
      ) : isciler.length === 0 ? (
        <EmptyState title="Henüz işçi eklenmedi" description="Üretim görevlerini atayabilmek için önce işçi ekleyin." />
      ) : (
        <div className="grid gap-3">
          {isciler.map((i) => (
            <div key={i.id} className="card flex items-center justify-between">
              <div>
                <div className="font-bold flex items-center gap-2">
                  {i.name}
                  {!i.active && <Badge className="bg-neutral-100 text-neutral-500">Pasif</Badge>}
                </div>
                {i.role && <div className="text-sm text-neutral-500">{i.role}</div>}
              </div>
              <div className="flex gap-2">
                <button className="btn-secondary btn-sm" onClick={() => setModal(i)}>
                  Düzenle
                </button>
                <button className="btn-danger btn-sm" onClick={() => sil(i.id)}>
                  Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <IsciModal
          isci={modal === "new" ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => {
            yukle();
            setModal(null);
          }}
        />
      )}
    </div>
  );
}

function IsciModal({ isci, onClose, onSaved }: { isci: Worker | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(isci?.name ?? "");
  const [role, setRole] = useState(isci?.role ?? "");
  const [active, setActive] = useState(isci?.active ?? true);
  const [hata, setHata] = useState<string | null>(null);
  const [kaydediliyor, setKaydediliyor] = useState(false);

  const kaydet = async () => {
    if (!name.trim()) return setHata("Ad zorunlu.");
    setKaydediliyor(true);
    setHata(null);
    try {
      if (isci) await api.put(`/workers/${isci.id}`, { name, role, active });
      else await api.post("/workers", { name, role });
      onSaved();
    } catch (e: any) {
      setHata(e.message);
    } finally {
      setKaydediliyor(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={isci ? "İşçiyi Düzenle" : "Yeni İşçi"}>
      <div className="space-y-3">
        <HataKutusu mesaj={hata} />
        <div>
          <label className="field-label">Ad Soyad</label>
          <input className="field-input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="field-label">Görev / Uzmanlık (örn. Kaynakçı, Boyacı)</label>
          <input className="field-input" value={role} onChange={(e) => setRole(e.target.value)} />
        </div>
        {isci && (
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Aktif (görev atamalarında görünsün)
          </label>
        )}
        <button className="btn-primary w-full" onClick={kaydet} disabled={kaydediliyor}>
          {kaydediliyor ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </div>
    </Modal>
  );
}
