import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { ProductTemplate } from "../api/types";
import { Spinner } from "../components/ui";

const EMOJI: Record<string, string> = {
  railing: "🚧",
  stairs: "🪜",
  canopy: "⛺",
  door: "🚪",
  custom: "🔩",
};

export default function Urunler() {
  const [sablonlar, setSablonlar] = useState<ProductTemplate[] | null>(null);

  useEffect(() => {
    api.get<ProductTemplate[]>("/product-templates").then(setSablonlar);
  }, []);

  if (!sablonlar) return <Spinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Ürünler</h1>
      <p className="text-neutral-500">
        Bir ürün şablonu seçin; ölçüleri girdiğinizde parça listesi, kesim planı ve maliyet otomatik hesaplanır.
      </p>
      <div className="grid sm:grid-cols-2 gap-4">
        {sablonlar.map((s) => (
          <Link
            key={s.key}
            to={`/yeni-is?template=${s.key}`}
            className="card flex items-center gap-4 hover:shadow-md hover:border-brand-300"
          >
            <div className="text-4xl">{EMOJI[s.key] ?? "🛠️"}</div>
            <div>
              <div className="font-bold text-lg">{s.name}</div>
              {s.description && <div className="text-sm text-neutral-500">{s.description}</div>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
