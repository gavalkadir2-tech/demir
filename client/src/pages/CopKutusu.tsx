import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Project, KATEGORI_ETIKET } from "../api/types";
import { Spinner, EmptyState, Badge } from "../components/ui";
import { tarih } from "../lib/format";

export default function CopKutusu() {
  const [isler, setIsler] = useState<(Project & { customer: { name: string } })[] | null>(null);
  const [secililer, setSecililer] = useState<Set<number>>(new Set());

  const yukle = () => api.get<(Project & { customer: { name: string } })[]>("/projects?trash=true").then(setIsler);

  useEffect(() => {
    yukle();
  }, []);

  const geriYukle = async (id: number) => {
    await api.post(`/projects/${id}/restore`);
    setIsler((liste) => liste?.filter((p) => p.id !== id) ?? liste);
    setSecililer((s) => {
      const yeni = new Set(s);
      yeni.delete(id);
      return yeni;
    });
  };

  const kaliciSil = async (id: number, title: string) => {
    if (!confirm(`"${title}" kalıcı olarak silinsin mi? Bu işlem geri alınamaz.`)) return;
    await api.del(`/projects/${id}/permanent`);
    setIsler((liste) => liste?.filter((p) => p.id !== id) ?? liste);
    setSecililer((s) => {
      const yeni = new Set(s);
      yeni.delete(id);
      return yeni;
    });
  };

  const secimDegistir = (id: number) => {
    setSecililer((s) => {
      const yeni = new Set(s);
      if (yeni.has(id)) yeni.delete(id);
      else yeni.add(id);
      return yeni;
    });
  };

  const tumunuSec = () => setSecililer(new Set(isler?.map((p) => p.id) ?? []));
  const secimiTemizle = () => setSecililer(new Set());

  const secilenleriGeriYukle = async () => {
    if (secililer.size === 0) return;
    const idler = [...secililer];
    await Promise.all(idler.map((id) => api.post(`/projects/${id}/restore`)));
    setIsler((liste) => liste?.filter((p) => !secililer.has(p.id)) ?? liste);
    setSecililer(new Set());
  };

  const secilenleriKaliciSil = async () => {
    if (secililer.size === 0) return;
    if (!confirm(`${secililer.size} iş kalıcı olarak silinsin mi? Bu işlem geri alınamaz.`)) return;
    const idler = [...secililer];
    await Promise.all(idler.map((id) => api.del(`/projects/${id}/permanent`)));
    setIsler((liste) => liste?.filter((p) => !secililer.has(p.id)) ?? liste);
    setSecililer(new Set());
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">🗑️ Çöp Kutusu</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Çöpe taşınan işler burada listelenir. Geri yükleyebilir veya kalıcı olarak silebilirsiniz.
          </p>
        </div>
        <Link to="/isler" className="btn-secondary">
          ← İşler
        </Link>
      </div>

      {isler && isler.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" className="btn-secondary btn-sm" onClick={secililer.size === isler.length ? secimiTemizle : tumunuSec}>
            {secililer.size === isler.length ? "Seçimi Temizle" : "Tümünü Seç"}
          </button>
          {secililer.size > 0 && (
            <>
              <span className="text-sm text-neutral-500">{secililer.size} seçili</span>
              <button type="button" className="btn-secondary btn-sm" onClick={secilenleriGeriYukle}>
                ↺ Seçilenleri Geri Yükle
              </button>
              <button type="button" className="btn-danger btn-sm" onClick={secilenleriKaliciSil}>
                Seçilenleri Kalıcı Sil
              </button>
            </>
          )}
        </div>
      )}

      {!isler ? (
        <Spinner />
      ) : isler.length === 0 ? (
        <EmptyState title="Çöp kutusu boş" />
      ) : (
        <div className="grid gap-3">
          {isler.map((p) => (
            <div key={p.id} className="card flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <input
                  type="checkbox"
                  className="h-4 w-4 shrink-0"
                  checked={secililer.has(p.id)}
                  onChange={() => secimDegistir(p.id)}
                  aria-label="İşi seç"
                />
                <div className="min-w-0">
                  <div className="font-bold text-lg">{p.title}</div>
                  <div className="text-sm text-neutral-500">
                    {p.customer.name} • {KATEGORI_ETIKET[p.category]}
                    {p.deletedAt && ` • Çöpe taşındı: ${tarih(p.deletedAt)}`}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge className="bg-neutral-100 text-neutral-500">🗑️ Çöpte</Badge>
                <button type="button" className="btn-secondary btn-sm" onClick={() => geriYukle(p.id)}>
                  ↺ Geri Yükle
                </button>
                <button type="button" className="btn-danger btn-sm" onClick={() => kaliciSil(p.id, p.title)}>
                  Kalıcı Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
