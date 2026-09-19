import { Router } from "express";
import { z } from "zod";
import { OAuth2Client } from "google-auth-library";
import { asyncHandler, ApiHatasi } from "../lib/errors";
import { ALLOWED_EMAIL, oturumAyarla, oturumTemizle, oturumEpostasi } from "../lib/auth";

const router = Router();

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const girisSchema = z.object({ credential: z.string().min(1) });

router.post(
  "/google",
  asyncHandler(async (req, res) => {
    if (!process.env.GOOGLE_CLIENT_ID) {
      throw new ApiHatasi(500, "Sunucuda GOOGLE_CLIENT_ID ayarlanmamış - Google ile giriş kullanılamıyor.");
    }
    const { credential } = girisSchema.parse(req.body);

    let ticket;
    try {
      ticket = await client.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    } catch {
      throw new ApiHatasi(401, "Google kimlik doğrulaması geçersiz.");
    }
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.email_verified) {
      throw new ApiHatasi(401, "Google hesabı doğrulanamadı.");
    }
    if (payload.email.toLowerCase() !== ALLOWED_EMAIL.toLowerCase()) {
      throw new ApiHatasi(403, "Bu uygulamaya sadece yetkili hesapla giriş yapılabilir.");
    }

    oturumAyarla(res, ALLOWED_EMAIL);
    res.json({ email: ALLOWED_EMAIL });
  })
);

router.get("/me", (req, res) => {
  const email = oturumEpostasi(req);
  if (!email) return res.status(401).json({ error: "Giriş gerekli." });
  res.json({ email });
});

router.post("/logout", (_req, res) => {
  oturumTemizle(res);
  res.status(204).end();
});

export default router;
