import { Material } from "../api/types";

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
