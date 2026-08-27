import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { Customer, Project } from "../api/types";

const GECIKME_MS = 300;

type ProjeSonuc = Project & { customer: { name: string } };

/** Header'daki global arama kutusu: iş başlığı, müşteri adı ve telefonuna göre işleri ve
 * müşterileri birlikte arar; sonuca tıklanınca ilgili detay sayfasına gider. */
export default function GlobalArama() {
  const [sorgu, setSorgu] = useState("");
  const [isler, setIsler] = useState<ProjeSonuc[]>([]);
  const [musteriler, setMusteriler] = useState<Customer[]>([]);
  const [acik, setAcik] = useState(false);
  const kutuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const q = sorgu.trim();
    if (q.length < 2) {
      setIsler([]);
      setMusteriler([]);
      return;
    }
    const zamanlayici = setTimeout(() => {
      api.get<ProjeSonuc[]>(`/projects?q=${encodeURIComponent(q)}`).then(setIsler).catch(() => {});
      api.get<Customer[]>(`/customers?q=${encodeURIComponent(q)}`).then(setMusteriler).catch(() => {});
    }, GECIKME_MS);
    return () => clearTimeout(zamanlayici);
  }, [sorgu]);

  useEffect(() => {
    const disariTikla = (e: MouseEvent) => {
      if (kutuRef.current && !kutuRef.current.contains(e.target as Node)) setAcik(false);
    };
    document.addEventListener("mousedown", disariTikla);
    return () => document.removeEventListener("mousedown", disariTikla);
  }, []);

  const sonucVar = isler.length > 0 || musteriler.length > 0;
  const goster = acik && sorgu.trim().length >= 2;

  const git = (yol: string) => {
    setAcik(false);
    setSorgu("");
    navigate(yol);
  };

  return (
    <div className="relative flex-1 max-w-md" ref={kutuRef}>
      <input
        className="field-input"
        placeholder="🔍 İş, müşteri veya telefon ara..."
        value={sorgu}
        onChange={(e) => setSorgu(e.target.value)}
        onFocus={() => setAcik(true)}
      />
      {goster && (
        <div className="absolute left-0 right-0 mt-2 max-h-96 overflow-y-auto bg-white rounded-xl border border-neutral-200 shadow-lg z-50">
          {!sonucVar ? (
            <div className="p-4 text-sm text-neutral-500">Sonuç bulunamadı.</div>
          ) : (
            <>
              {isler.length > 0 && (
                <div>
                  <div className="px-3 pt-3 pb-1 text-xs font-semibold text-neutral-400 uppercase">İşler</div>
                  {isler.map((p) => (
                    <button
                      key={p.id}
                      className="w-full text-left flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-neutral-50"
                      onClick={() => git(`/isler/${p.id}`)}
                    >
                      <span className="font-medium">{p.title}</span>
                      <span className="text-neutral-500">{p.customer.name}</span>
                    </button>
                  ))}
                </div>
              )}
              {musteriler.length > 0 && (
                <div>
                  <div className="px-3 pt-3 pb-1 text-xs font-semibold text-neutral-400 uppercase">Müşteriler</div>
                  {musteriler.map((m) => (
                    <button
                      key={m.id}
                      className="w-full text-left flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-neutral-50"
                      onClick={() => git(`/musteriler/${m.id}`)}
                    >
                      <span className="font-medium">{m.name}</span>
                      <span className="text-neutral-500">{m.phone}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
