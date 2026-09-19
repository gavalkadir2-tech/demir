import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

function googleScriptYukle(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  const mevcut = document.querySelector(`script[src="${GOOGLE_SCRIPT_SRC}"]`);
  if (mevcut) {
    return new Promise((resolve) => mevcut.addEventListener("load", () => resolve()));
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google giriş betiği yüklenemedi."));
    document.head.appendChild(script);
  });
}

export default function Login({ onGiris }: { onGiris: () => void }) {
  const butonRef = useRef<HTMLDivElement>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  useEffect(() => {
    if (!clientId || !butonRef.current) return;

    let iptal = false;
    googleScriptYukle()
      .then(() => {
        if (iptal || !window.google || !butonRef.current) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            setHata(null);
            setYukleniyor(true);
            try {
              await api.post("/auth/google", { credential: response.credential });
              onGiris();
            } catch (e: any) {
              setHata(e.message ?? "Giriş başarısız.");
            } finally {
              setYukleniyor(false);
            }
          },
        });
        window.google.accounts.id.renderButton(butonRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "signin_with",
          locale: "tr",
        });
      })
      .catch((e) => setHata(e.message));

    return () => {
      iptal = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-4">
      <div className="card w-full max-w-sm space-y-5 text-center">
        <div className="text-2xl font-bold text-brand-700">🔧 Demirci Atölye</div>
        <p className="text-sm text-neutral-500">Devam etmek için yetkili Google hesabınızla giriş yapın.</p>

        {!clientId ? (
          <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 text-sm text-left">
            Google ile giriş henüz yapılandırılmamış. Sunucuda <code>GOOGLE_CLIENT_ID</code> ve build sırasında{" "}
            <code>VITE_GOOGLE_CLIENT_ID</code> ortam değişkenleri ayarlanmalı.
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div ref={butonRef} />
            {yukleniyor && <div className="text-sm text-neutral-500">Giriş yapılıyor...</div>}
          </div>
        )}

        {hata && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm font-medium">{hata}</div>}
      </div>
    </div>
  );
}
