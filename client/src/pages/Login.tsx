import { FormEvent, useState } from "react";
import { api } from "../api/client";

export default function Login({ onGiris }: { onGiris: () => void }) {
  const [email, setEmail] = useState("gavalkadir2@gmail.com");
  const [password, setPassword] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  const girisYap = async (e: FormEvent) => {
    e.preventDefault();
    setHata(null);
    setYukleniyor(true);
    try {
      await api.post("/auth/login", { email, password });
      onGiris();
    } catch (err: any) {
      setHata(err.message ?? "Giriş başarısız.");
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-4">
      <form onSubmit={girisYap} className="card w-full max-w-sm space-y-4 text-center">
        <div className="text-2xl font-bold text-brand-700">🔧 Demirci Atölye</div>
        <p className="text-sm text-neutral-500">Devam etmek için giriş yapın.</p>

        <div className="text-left space-y-3">
          <div>
            <label className="field-label">E-posta</label>
            <input
              className="field-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div>
            <label className="field-label">Şifre</label>
            <input
              className="field-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              autoFocus
            />
          </div>
        </div>

        {hata && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm font-medium">{hata}</div>}

        <button type="submit" className="btn-primary w-full" disabled={yukleniyor}>
          {yukleniyor ? "Giriş yapılıyor..." : "Giriş Yap"}
        </button>
      </form>
    </div>
  );
}
