import { useEffect, useState } from "react";
import { api } from "../api/client";
import { CuttingList, Project } from "../api/types";
import { Spinner, EmptyState, HataKutusu, UyariKutusu } from "../components/ui";
import CuttingBarView from "../components/CuttingBarView";
import { mm, sayi } from "../lib/format";

export default function KesimListeleri() {
  const [projeler, setProjeler] = useState<Project[] | null>(null);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [listeler, setListeler] = useState<CuttingList[] | null>(null);
  const [uretiliyor, setUretiliyor] = useState(false);
  const [uyarilar, setUyarilar] = useState<string[]>([]);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    api.get<Project[]>("/projects").then((p) => {
      setProjeler(p);
      if (p.length > 0) setProjectId(p[0].id);
    });
  }, []);

  const yukle = (id: number) => api.get<CuttingList[]>(`/projects/${id}/cutting`).then(setListeler);

  useEffect(() => {
    if (projectId) yukle(projectId);
  }, [projectId]);

  const uret = async () => {
    if (!projectId) return;
    setUretiliyor(true);
    setHata(null);
    try {
      const r = await api.post<{ uyarilar: string[] }>(`/projects/${projectId}/cutting/generate`);
      setUyarilar(r.uyarilar);
      yukle(projectId);
    } catch (e: any) {
      setHata(e.message);
    } finally {
      setUretiliyor(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Kesim Listeleri</h1>

      {!projeler ? (
        <Spinner />
      ) : projeler.length === 0 ? (
        <EmptyState title="Henüz iş yok" />
      ) : (
        <>
          <div className="flex gap-3 flex-wrap items-end">
            <div className="flex-1 min-w-[240px]">
              <label className="field-label">İş Seçin</label>
              <select className="field-select" value={projectId ?? ""} onChange={(e) => setProjectId(Number(e.target.value))}>
                {projeler.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn-primary" onClick={uret} disabled={uretiliyor}>
              {uretiliyor ? "Hesaplanıyor..." : "✂️ Planı Oluştur / Güncelle"}
            </button>
          </div>

          <HataKutusu mesaj={hata} />
          <UyariKutusu mesajlar={uyarilar} />

          {!listeler ? (
            <Spinner />
          ) : listeler.length === 0 ? (
            <EmptyState title="Bu iş için kesim planı yok" description="Önce parça ekleyip planı oluşturun." />
          ) : (
            listeler.map((cl) => (
              <div key={cl.id} className="card space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="font-bold text-lg">{cl.material.name}</h2>
                  <div className="text-sm text-neutral-500">
                    Standart boy: {cl.standardLengthMm / 1000} m • Kesim payı: {cl.kerfMm} mm
                  </div>
                </div>
                <div className="grid sm:grid-cols-3 gap-3 text-sm">
                  <div className="rounded-xl bg-neutral-50 p-3 text-center">
                    <div className="text-2xl font-bold">{cl.totalBars}</div>
                    <div className="text-neutral-500">Toplam Çubuk</div>
                  </div>
                  <div className="rounded-xl bg-neutral-50 p-3 text-center">
                    <div className="text-2xl font-bold">{mm(cl.totalWasteMm)}</div>
                    <div className="text-neutral-500">Toplam Fire</div>
                  </div>
                  <div className="rounded-xl bg-neutral-50 p-3 text-center">
                    <div className="text-2xl font-bold">%{sayi(cl.wastePercent, 1)}</div>
                    <div className="text-neutral-500">Fire Oranı</div>
                  </div>
                </div>
                <div className="space-y-2">
                  {cl.barsJson.map((bar, i) => (
                    <CuttingBarView key={i} bar={bar} standardLengthMm={cl.standardLengthMm} index={i} />
                  ))}
                </div>
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}
