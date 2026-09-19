import { Request, Response, NextFunction } from "express";

/** Bu uygulamaya girişine izin verilen tek Google hesabı. Ortam değişkeniyle geçersiz kılınabilir. */
export const ALLOWED_EMAIL = process.env.ALLOWED_EMAIL ?? "gavalkadir2@gmail.com";

export const SESSION_COOKIE = "demirci_session";

// Prod'da mutlaka ayarlanmalı (Render env var). Ayarlanmazsa sunucu her yeniden başladığında
// önceki oturum çerezleri geçersiz kalır - uygulama çalışır ama kullanıcı tekrar giriş yapmak
// zorunda kalır. Bu yüzden hard-fail yerine uyarıyla devam ediyoruz.
export const SESSION_SECRET = (() => {
  const deger = process.env.SESSION_SECRET;
  if (deger) return deger;
  console.warn(
    "[auth] SESSION_SECRET ortam değişkeni ayarlanmamış - geçici bir anahtar kullanılıyor. " +
      "Render'da SESSION_SECRET ayarlayın, aksi halde her deploy'da tüm oturumlar sıfırlanır."
  );
  return "demirci-atolye-gecici-anahtar-lutfen-degistirin";
})();

const COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 gün

export function oturumAyarla(res: Response, email: string) {
  res.cookie(SESSION_COOKIE, email, {
    signed: true,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE_MS,
  });
}

export function oturumTemizle(res: Response) {
  res.clearCookie(SESSION_COOKIE);
}

export function oturumEpostasi(req: Request): string | null {
  const deger = req.signedCookies?.[SESSION_COOKIE];
  return typeof deger === "string" && deger === ALLOWED_EMAIL ? deger : null;
}

/** /api altındaki korumalı rotalar için: geçerli oturum çerezi yoksa 401 döner. */
export function girisGerekli(req: Request, res: Response, next: NextFunction) {
  if (!oturumEpostasi(req)) {
    return res.status(401).json({ error: "Giriş gerekli." });
  }
  next();
}
