import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { HesaplamaHatasi } from "../calc/units";

export class ApiHatasi extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** async route handler'ları try/catch yazmadan sarmalar. */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };

export function hataMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({ error: "Geçersiz veri.", detaylar: err.issues });
    return;
  }
  if (err instanceof HesaplamaHatasi) {
    res.status(400).json({ error: err.message });
    return;
  }
  if (err instanceof ApiHatasi) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  // Prisma bilinen hata kodları (örn. P2025: kayıt bulunamadı, P2003: FK ihlali)
  const prismaErr = err as { code?: string; meta?: unknown };
  if (prismaErr && typeof prismaErr.code === "string") {
    if (prismaErr.code === "P2025") {
      res.status(404).json({ error: "Kayıt bulunamadı." });
      return;
    }
    if (prismaErr.code === "P2003") {
      res.status(400).json({ error: "İlişkili kayıt bulunamadı veya silinemiyor (başka kayıtlar buna bağlı)." });
      return;
    }
  }
  console.error(err);
  res.status(500).json({ error: "Sunucu hatası." });
}
