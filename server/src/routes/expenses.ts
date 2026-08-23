import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/errors";

const router = Router({ mergeParams: true });

const EXPENSE_TYPES = ["TRANSPORT", "INSTALLATION", "PAINT", "CONSUMABLE", "OTHER"] as const;

const giderSchema = z.object({
  type: z.enum(EXPENSE_TYPES).default("OTHER"),
  name: z.string().min(1),
  amount: z.number().nonnegative(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const giderler = await prisma.expense.findMany({
      where: { projectId: Number(req.params.projectId) },
      orderBy: { createdAt: "asc" },
    });
    res.json(giderler);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = giderSchema.parse(req.body);
    const gider = await prisma.expense.create({ data: { ...data, projectId: Number(req.params.projectId) } });
    res.status(201).json(gider);
  })
);

router.put(
  "/:expenseId",
  asyncHandler(async (req, res) => {
    const data = giderSchema.partial().parse(req.body);
    const gider = await prisma.expense.update({ where: { id: Number(req.params.expenseId) }, data });
    res.json(gider);
  })
);

router.delete(
  "/:expenseId",
  asyncHandler(async (req, res) => {
    await prisma.expense.delete({ where: { id: Number(req.params.expenseId) } });
    res.status(204).end();
  })
);

export default router;
