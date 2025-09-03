import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { isAuthenticated } from "../middleware/auth";

const prisma = new PrismaClient();
const router = Router();

// Owned = user is the creator
router.get("/owned", isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const inventories = await prisma.inventory.findMany({
      where: { creatorId: userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        createdAt: true,
      },
    });
    res.json(inventories);
  } catch (e) {
    res.status(500).json({ error: "Failed to load owned inventories" });
  }
});

// Accessible = has write access via AccessPermission (or public if you want read-only)
// This endpoint returns ones the user can WRITE to.
router.get("/accessible", isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const permissions = await prisma.accessPermission.findMany({
      where: { userId },
      include: { inventory: true },
      orderBy: { createdAt: "desc" },
    });
    const inventories = permissions.map((p) => p.inventory);
    res.json(inventories);
  } catch (e) {
    res.status(500).json({ error: "Failed to load accessible inventories" });
  }
});

export default router;
