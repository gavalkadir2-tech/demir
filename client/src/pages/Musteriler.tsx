import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Customer } from "../api/types";
import { Modal, Spinner, EmptyState, HataKutusu } from "../components/ui";

export default function Musteriler() {
  const [musteriler, setMusteriler] = useState<Customer[] | null>(null);
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(false);

  const yukle = () => api.get<Customer[]>(`/customers${q ? `?q=${encodeURIComponent(q)}` : ""}`).then(setMusteriler);

  useEffect(() => {
    yukle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Müşteriler</h1>
        <button className="btn-primary" onClick={() => setModal(true)}>
          ➕ Yeni Müşteri
        </button>
      </div>

      <input
        className="field-input"
        placeholder="Müşteri ara..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {!musteriler ? (
        <Spinner />
      ) : musteriler.length === 0 ? (
        <EmptyState title="Henüz müşteri yok" description="İlk müşterinizi ekleyerek başlayın." />
      ) : (
        <div className="grid gap-3">
          {musteriler.map((m) => (
            <Link to={`/musteriler/${m.id}`} key={m.id} className="card flex items-center justify-between hover:shadow-md">
              <div>
                <div className="font-bold text-lg">{m.name}</div>
                <div className="text-sm text-neutral-500">{[m.phone, m.email].filter(Boolean).join(" • ") || "İletişim bilgisi yok"}</div>
              </div>
              <div className="text-sm text-neutral-500">{m._count?.projects ?? 0} iş</div>
            </Link>
          ))}
        </div>
      )}

      <YeniMusteriModal open={modal} onClose={() => setModal(false)} onSaved={yukle} />
    </div>
  );
}

function YeniMusteriModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [kaydediliyor, setKaydediliyor] = useState(false);

  const kapatVeSifirla = () => {
    setName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setNote("");
    setHata(null);
    onClose();
  };

  const kaydet = async () => {
    if (!name.trim()) {
      setHata("Müşteri adı zorunlu.");
      return;
    }
    setKaydediliyor(true);
    setHata(null);
    try {
      await api.post("/customers", { name, phone, email, address, note });
      onSaved();
      kapatVeSifirla();
    } catch (e: any) {
      setHata(e.message);
    } finally {
      setKaydediliyor(false);
    }
  };

  return (
    <Modal open={open} onClose={kapatVeSifirla} title="Yeni Müşteri">
      <div className="space-y-3">
        <HataKutusu mesaj={hata} />
        <div>
          <label className="field-label">Ad Soyad *</label>
          <input className="field-input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div>
          <label className="field-label">Telefon</label>
          <input className="field-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <label className="field-label">E-posta</label>
          <input className="field-input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="field-label">Adres</label>
          <textarea className="field-input" value={address} onChange={(e) => setAddress(e.target.value)} rows={2} />
        </div>
        <div>
          <label className="field-label">Not</label>
          <textarea className="field-input" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
        </div>
        <button className="btn-primary w-full" onClick={kaydet} disabled={kaydediliyor}>
          {kaydediliyor ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </div>
    </Modal>
  );
}
