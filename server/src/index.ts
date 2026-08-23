import express from "express";
import cors from "cors";
import { hataMiddleware } from "./lib/errors";

import customersRouter from "./routes/customers";
import materialsRouter from "./routes/materials";
import productTemplatesRouter from "./routes/productTemplates";
import calcRouter from "./routes/calc";
import projectsRouter from "./routes/projects";
import quoteDetailRouter from "./routes/quoteDetail";
import dashboardRouter from "./routes/dashboard";
import reportsRouter from "./routes/reports";
import settingsRouter from "./routes/settings";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/customers", customersRouter);
app.use("/api/materials", materialsRouter);
app.use("/api/product-templates", productTemplatesRouter);
app.use("/api/calc", calcRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/quotes", quoteDetailRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/settings", settingsRouter);

app.use(hataMiddleware);

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
  console.log(`Demirci API ${port} portunda çalışıyor.`);
});
