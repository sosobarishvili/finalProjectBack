import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// GET all tags
router.get("/", async (_req, res) => {
  try {
    const tags = await prisma.tag.findMany();
    res.json(tags);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tags" });
  }
});

export default router;
