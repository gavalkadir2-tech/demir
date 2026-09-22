import { Router } from "express";
import { z } from "zod";
import { ApiHatasi } from "../lib/errors";
import { ALLOWED_EMAIL, APP_PASSWORD, oturumAyarla, oturumTemizle, oturumEpostasi } from "../lib/auth";

const router = Router();

const girisSchema = z.object({ email: z.string(), password: z.string() });

router.post("/login", (req, res) => {
  const { email, password } = girisSchema.parse(req.body);

  if (email.trim().toLowerCase() !== ALLOWED_EMAIL.toLowerCase() || password !== APP_PASSWORD) {
    throw new ApiHatasi(401, "E-posta veya şifre hatalı.");
  }

  oturumAyarla(res, ALLOWED_EMAIL);
  res.json({ email: ALLOWED_EMAIL });
});

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
