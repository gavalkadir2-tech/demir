import { useEffect } from "react";
import { Material } from "../api/types";

// En sık kullanılan profil ölçüsü - zorunlu (allowEmpty olmayan) profil seçimlerinde kullanıcı hiç
// dokunmadan önce otomatik seçili gelsin diye. Sadece PROFILE kategorisindeki listelerde uygulanır
// (sac/bağlantı/sarf malzeme seçimlerinde section eşleşmesi zaten bulunamayacağından etkisizdir).
const VARSAYILAN_PROFIL_SECTION = "40x40x2";

export default function MaterialSelect({
  materials,
  value,
  onChange,
  label,
  allowEmpty,
  category,
}: {
  materials: Material[];
  value: number | undefined;
  onChange: (id: number | undefined) => void;
  label: string;
  allowEmpty?: boolean;
  category?: Material["category"];
}) {
  const liste = category ? materials.filter((m) => m.category === category) : materials;

  // Zorunlu bir profil alanı, henüz hiç değer taşımıyorsa (kullanıcı elle boşaltmadıysa) en sık
  // kullanılan ölçüyü otomatik seçer - dikme/üst-alt ray/kolon/kiriş gibi alanları her seferinde
  // elle doldurma zorunluluğunu kaldırır.
  useEffect(() => {
    if (allowEmpty || value !== undefined || liste.length === 0) return;
    if (liste[0].category !== "PROFILE") return;
    const varsayilan = liste.find((m) => m.section === VARSAYILAN_PROFIL_SECTION);
    if (varsayilan) onChange(varsayilan.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liste, allowEmpty, value]);

  return (
    <div>
      <label className="field-label">{label}</label>
      <select
        className="field-select"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
      >
        {(allowEmpty || !value) && <option value="">Seçiniz...</option>}
        {liste.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
    </div>
  );
}
