import { KesimCubugu } from "../api/types";
import { sayi } from "../lib/format";

const RENKLER = ["bg-brand-500", "bg-blue-500", "bg-emerald-500", "bg-purple-500", "bg-pink-500", "bg-amber-500", "bg-teal-500"];

/** Bir kesim çubuğunu, kendi stok boyuna göre ölçekli bar olarak gösterir. Karışık stok boyu
 * kullanıldığında (bkz. Material.alternatifBoylarM) her çubuk kendi stockLengthMm'ine göre çizilir.
 * Mevcut en uzun stoktan uzun parçalar bölünüp ek (kaynak) parçası olarak işaretlenmişse
 * (bkz. KesimParcasi.spliceGroupId), bu parçalar taralı desen ve 🔗 simgesiyle vurgulanır. */
export default function CuttingBarView({ bar, index }: { bar: KesimCubugu; index: number }) {
  const boyMm = bar.stockLengthMm;
  return (
    <div className="space-y-1">
      <div className="text-sm font-semibold text-neutral-600">
        Çubuk #{index + 1} <span className="text-neutral-400 font-normal">({(boyMm / 1000).toFixed(boyMm % 1000 ? 2 : 0)} m)</span>
      </div>
      <div className="flex h-10 w-full overflow-hidden rounded-lg border border-neutral-300 bg-neutral-100">
        {bar.cuts.map((c, i) => (
          <div
            key={i}
            className={`relative flex items-center justify-center text-[11px] font-bold text-white border-r border-white/40 ${RENKLER[i % RENKLER.length]}`}
            style={{ width: `${(c.lengthMm / boyMm) * 100}%` }}
            title={
              c.spliceGroupId
                ? `${c.lengthMm} mm — Ek parçası (${c.spliceIndex}/${c.spliceCount}), ${c.originalLengthMm} mm'lik parçayı oluşturmak için kaynakla birleştirilecek`
                : `${c.lengthMm} mm`
            }
          >
            {c.spliceGroupId && (
              <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.35),rgba(255,255,255,0.35)_4px,transparent_4px,transparent_8px)]" />
            )}
            <span className="truncate px-0.5 relative">
              {c.spliceGroupId && "🔗 "}
              {sayi(c.lengthMm)}
              {c.spliceGroupId && ` (ek ${c.spliceIndex}/${c.spliceCount})`}
            </span>
          </div>
        ))}
        {bar.wasteMm > 0 && (
          <div
            className="flex items-center justify-center text-[11px] font-semibold text-neutral-500 bg-[repeating-linear-gradient(45deg,#e5e5e5,#e5e5e5_4px,#f5f5f5_4px,#f5f5f5_8px)]"
            style={{ width: `${(bar.wasteMm / boyMm) * 100}%` }}
            title={`Fire: ${bar.wasteMm} mm`}
          >
            {(bar.wasteMm / boyMm) * 100 > 6 && <span className="px-0.5">fire {sayi(bar.wasteMm)}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
