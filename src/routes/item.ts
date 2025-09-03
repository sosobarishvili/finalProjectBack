// src/routes/item.ts
import { Router } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import { isAuthenticated } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// A helper function to check for write permissions
const canWriteToInventory = async (userId: string, inventoryId: string) => {
  const inventory = await prisma.inventory.findUnique({
    where: { id: inventoryId },
    select: { creatorId: true }
  });

  if (!inventory) return false;
  if (inventory.creatorId === userId) return true;

  // Optional: Check for AccessPermission as well
  const permission = await prisma.accessPermission.findUnique({
    where: { userId_inventoryId: { userId, inventoryId } }
  });

  return !!permission;
};


// GET all items (Public endpoint, no auth needed)
router.get("/", async (_req, res) => {
  try {
    const items = await prisma.item.findMany();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch items" });
  }
});

// GET single item (Public endpoint, no auth needed)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const item = await prisma.item.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch item" });
  }
});

// CREATE item (SECURE)
router.post("/", isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const {
      name, customId, inventoryId,
      string1_val, string2_val, string3_val,
      multiline1_val, multiline2_val, multiline3_val,
      int1_val, int2_val, int3_val,
      bool1_val, bool2_val, bool3_val,
      doc1_val, doc2_val, doc3_val
    } = req.body;

    // Authorization check: Ensure user can write to this inventory
    if (!inventoryId || !(await canWriteToInventory(userId, inventoryId))) {
      return res.status(403).json({ message: "Forbidden: You do not have permission to add items to this inventory." });
    }

    const item = await prisma.item.create({
      data: {
        name, customId, inventoryId,
        string1_val, string2_val, string3_val,
        multiline1_val, multiline2_val, multiline3_val,
        int1_val, int2_val, int3_val,
        bool1_val, bool2_val, bool3_val,
        doc1_val, doc2_val, doc3_val
      }
    });
    res.status(201).json(item);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return res.status(409).json({ message: "Conflict: An item with this Custom ID already exists in this inventory." });
    }
    console.error(err);
    res.status(500).json({ error: "Failed to create item" });
  }
});

// UPDATE item (SECURE)
router.put("/:id", isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req.user as any).id;

    // Find the item to check its inventory
    const existingItem = await prisma.item.findUnique({ where: { id } });
    if (!existingItem) {
      return res.status(404).json({ message: "Item not found." });
    }

    // Authorization check
    if (!(await canWriteToInventory(userId, existingItem.inventoryId))) {
      return res.status(403).json({ message: "Forbidden: You do not have permission to edit this item." });
    }

    // Safely destructure body for allowed fields
    const {
      name, customId,
      string1_val, string2_val, string3_val,
      multiline1_val, multiline2_val, multiline3_val,
      int1_val, int2_val, int3_val,
      bool1_val, bool2_val, bool3_val,
      doc1_val, doc2_val, doc3_val
    } = req.body;

    const item = await prisma.item.update({
      where: { id },
      data: {
        name, customId,
        string1_val, string2_val, string3_val,
        multiline1_val, multiline2_val, multiline3_val,
        int1_val, int2_val, int3_val,
        bool1_val, bool2_val, bool3_val,
        doc1_val, doc2_val, doc3_val
      }
    });

    res.json(item);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return res.status(409).json({ message: "Conflict: An item with this Custom ID already exists in this inventory." });
    }
    console.error(err);
    res.status(500).json({ error: "Failed to update item" });
  }
});


// DELETE item (SECURE)
router.delete("/:id", isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req.user as any).id;

    const item = await prisma.item.findUnique({ where: { id } });
    if (!item) {
      return res.status(404).json({ message: "Item not found." });
    }

    if (!(await canWriteToInventory(userId, item.inventoryId))) {
      return res.status(403).json({ message: "Forbidden: You do not have permission to delete this item." });
    }

    await prisma.item.delete({ where: { id } });
    res.json({ message: "Item deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete item" });
  }
});

export default router;