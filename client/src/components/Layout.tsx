import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", emoji: "🏠" },
  { to: "/yeni-is", label: "Yeni İş", emoji: "➕" },
  { to: "/isler", label: "İşler", emoji: "🗂️" },
  { to: "/urunler", label: "Ürünler", emoji: "📐" },
  { to: "/malzemeler", label: "Malzemeler", emoji: "🧱" },
  { to: "/kesim-listeleri", label: "Kesim Listeleri", emoji: "✂️" },
  { to: "/teklifler", label: "Teklifler", emoji: "📄" },
  { to: "/stok", label: "Stok", emoji: "📦" },
  { to: "/musteriler", label: "Müşteriler", emoji: "👤" },
  { to: "/ayarlar", label: "Ayarlar", emoji: "⚙️" },
];

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1 p-3">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-4 py-3.5 text-base font-semibold transition ${
              isActive ? "bg-brand-600 text-white" : "text-neutral-700 hover:bg-neutral-100"
            }`
          }
        >
          <span className="text-xl leading-none">{item.emoji}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:border-neutral-200 md:bg-white">
        <div className="p-5 border-b border-neutral-200">
          <div className="text-lg font-bold text-brand-700">🔧 Demirci Atölye</div>
        </div>
        <NavList />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden sticky top-0 z-30 flex items-center justify-between bg-white border-b border-neutral-200 px-4 py-3">
          <div className="text-lg font-bold text-brand-700">🔧 Demirci Atölye</div>
          <button
            className="btn-secondary btn-sm"
            onClick={() => setMenuOpen(true)}
            aria-label="Menüyü aç"
          >
            ☰ Menü
          </button>
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
