import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import BildirimZili from "./BildirimZili";
import GlobalArama from "./GlobalArama";

const NAV_ITEMS = [
  { to: "/", label: "Ana Sayfa", emoji: "🏠" },
  { to: "/isler", label: "İşler", emoji: "📋" },
  { to: "/musteriler", label: "Müşteriler", emoji: "👥" },
  { to: "/takvim", label: "Takvim", emoji: "📅" },
  { to: "/stok", label: "Stok", emoji: "📦" },
  { to: "/raporlar", label: "Raporlar", emoji: "📊" },
  { to: "/ayarlar", label: "Ayarlar", emoji: "⚙️" },
];

// Daha az sık kullanılan sayfalar "Diğer" altında toplanır; işlevsellik korunur, sadece
// ana menü sadeleştirilir.
const DIGER_ITEMS = [
  { to: "/urunler", label: "Ürünler", emoji: "📐" },
  { to: "/malzemeler", label: "Malzemeler", emoji: "🧱" },
  { to: "/kesim-listeleri", label: "Kesim Listeleri", emoji: "✂️" },
  { to: "/teklifler", label: "Teklifler", emoji: "📄" },
  { to: "/isciler", label: "İşçiler", emoji: "👷" },
];

const navLinkClass = (koyu: boolean) =>
  ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-xl px-4 py-3.5 text-base font-semibold transition ${
      isActive
        ? "bg-brand-600 text-white"
        : koyu
        ? "text-neutral-300 hover:bg-neutral-800 hover:text-white"
        : "text-neutral-700 hover:bg-neutral-100"
    }`;

function NavList({ onNavigate, koyu = false }: { onNavigate?: () => void; koyu?: boolean }) {
  const { pathname } = useLocation();
  const [digerAcik, setDigerAcik] = useState(DIGER_ITEMS.some((i) => i.to === pathname));
  const linkClass = navLinkClass(koyu);

  return (
    <nav className="flex flex-col gap-1 p-3">
      {NAV_ITEMS.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.to === "/"} onClick={onNavigate} className={linkClass}>
          <span className="text-xl leading-none">{item.emoji}</span>
          {item.label}
        </NavLink>
      ))}

      <button
        type="button"
        onClick={() => setDigerAcik((v) => !v)}
        className={`flex items-center gap-3 rounded-xl px-4 py-3.5 text-base font-semibold transition ${
          koyu ? "text-neutral-300 hover:bg-neutral-800 hover:text-white" : "text-neutral-700 hover:bg-neutral-100"
        }`}
      >
        <span className="text-xl leading-none">⋯</span>
        Diğer
        <span className={`ml-auto text-sm ${koyu ? "text-neutral-500" : "text-neutral-400"}`}>{digerAcik ? "▲" : "▼"}</span>
      </button>
      {digerAcik && (
        <div className="flex flex-col gap-1 pl-2">
          {DIGER_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} onClick={onNavigate} className={linkClass}>
              <span className="text-xl leading-none">{item.emoji}</span>
              {item.label}
            </NavLink>
          ))}
        </div>
      )}
    </nav>
  );
}

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden md:flex md:w-64 md:flex-col md:bg-neutral-900">
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
          <div className="text-lg font-bold text-brand-500">🔧 Demirci Atölye</div>
          <BildirimZili koyu />
        </div>
        <div className="px-3 pt-3">
          <GlobalArama />
        </div>
        <NavList koyu />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden sticky top-0 z-30 bg-white border-b border-neutral-200 px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-lg font-bold text-brand-700">🔧 Demirci Atölye</div>
            <div className="flex items-center gap-2">
              <BildirimZili />
              <button
                className="btn-secondary btn-sm"
                onClick={() => setMenuOpen(true)}
                aria-label="Menüyü aç"
              >
                ☰ Menü
              </button>
            </div>
          </div>
          <GlobalArama />
        </header>

        {menuOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-white overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-neutral-200">
              <div className="text-lg font-bold text-brand-700">🔧 Demirci Atölye</div>
              <button className="btn-secondary btn-sm" onClick={() => setMenuOpen(false)}>
                ✕ Kapat
              </button>
            </div>
            <NavList onNavigate={() => setMenuOpen(false)} />
          </div>
        )}

        <main className="flex-1 p-4 md:p-8 max-w-6xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
