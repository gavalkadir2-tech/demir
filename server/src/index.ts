import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
import { hataMiddleware } from "./lib/errors";
import { girisGerekli, SESSION_SECRET } from "./lib/auth";

import authRouter from "./routes/auth";
import customersRouter from "./routes/customers";
import materialsRouter from "./routes/materials";
import productTemplatesRouter from "./routes/productTemplates";
import calcRouter from "./routes/calc";
import projectsRouter from "./routes/projects";
import quoteDetailRouter from "./routes/quoteDetail";
import dashboardRouter from "./routes/dashboard";
import reportsRouter from "./routes/reports";
import settingsRouter from "./routes/settings";
import aiRouter from "./routes/ai";
import workersRouter from "./routes/workers";
import notificationsRouter from "./routes/notifications";
import publicRouter from "./routes/public";
import backupRouter from "./routes/backup";

const app = express();
app.use(cors());
// AI plan fotoğrafı yüklemeleri base64 olarak JSON gövdesinde gelir; varsayılan 100kb limiti yetersiz.
app.use(express.json({ limit: "12mb" }));
app.use(cookieParser(SESSION_SECRET));

// Render, her deploy'da RENDER_GIT_COMMIT ortam değişkenini otomatik ayarlar - hangi commit'in
// yayında olduğunu görmek için (örn. bir düzeltmenin gerçekten deploy olup olmadığını doğrulamak
// için) tarayıcıdan bu adrese gidip sonucu okumak yeterli, DevTools gerekmez.
app.get("/api/health", (_req, res) =>
  res.json({ ok: true, commit: process.env.RENDER_GIT_COMMIT ?? null, checkedAt: new Date().toISOString() })
);

// Girişsiz erişilebilen rotalar: Google ile giriş akışının kendisi ve müşterinin
// token'la eriştiği teklif onay / iş takip sayfalarının API'leri.
app.use("/api/auth", authRouter);
app.use("/api/public", publicRouter);

// Bu satırdan sonraki tüm /api rotaları geçerli oturum çerezi ister.
app.use("/api", girisGerekli);

app.use("/api/customers", customersRouter);
app.use("/api/materials", materialsRouter);
app.use("/api/product-templates", productTemplatesRouter);
app.use("/api/calc", calcRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/quotes", quoteDetailRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/ai", aiRouter);
app.use("/api/workers", workersRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/backup", backupRouter);

// Üretimde (Render vb.) client build'i backend'in kendisinden sun (tek servis, tek URL).
// Yerel geliştirmede client/dist yoktur (Vite ayrı çalışır), bu blok o zaman devre dışı kalır.
const clientDistPath = path.join(__dirname, "..", "..", "client", "dist");
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(path.join(clientDistPath, "index.html"));
  });
}

app.use(hataMiddleware);

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
  console.log(`Demirci API ${port} portunda çalışıyor.`);
});
