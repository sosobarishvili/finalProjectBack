import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { isAuthenticated } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// GET latest inventories
router.get("/latest", async (req, res) => {
  try {
    const inventories = await prisma.inventory.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { tags: { include: { tag: true } }, creator: true },
    });
    res.json(inventories);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch latest inventories" });
  }
});

// GET popular inventories (by number of items) - EFFICIENT
router.get("/popular", async (req, res) => {
  try {
    const inventories = await prisma.inventory.findMany({
      orderBy: {
        items: {
          _count: "desc", // Order by the count of related items
        },
      },
      take: 10,
      include: {
        _count: { select: { items: true } }, // Optionally include the count
        tags: { include: { tag: true } },
        creator: true
      },
    });
    res.json(inventories);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch popular inventories" });
  }
});

// GET tag cloud (all unique tags) - EFFICIENT
router.get("/tags", async (req, res) => {
  try {
    const tags = await prisma.tag.findMany({
      select: {
        name: true,
      },
    });
    const uniqueTags = tags.map(t => t.name);
    res.json(uniqueTags);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tags" });
  }
});

// GET all inventories
router.get("/", async (req, res) => {
  try {
    const inventories = await prisma.inventory.findMany({
      include: { tags: { include: { tag: true } }, creator: true },
    });
    res.json(inventories);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch inventories" });
  }
});

// GET single inventory by id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const inventory = await prisma.inventory.findUnique({
      where: { id },
      include: { items: true, tags: { include: { tag: true } }, creator: true },
    });
    if (!inventory) return res.status(404).json({ error: "Not found" });
    res.json(inventory);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch inventory" });
  }
});


// Create inventory
router.post("/", isAuthenticated, async (req, res) => {
  try {
    const { title, description, categoryId, tags } = req.body;

    // 1. Validate incoming data to prevent crashes
    if (!title || !description || !categoryId) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    // 2. Explicitly check if categoryId exists
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      return res.status(404).json({ error: "Category not found." });
    }

    // 3. Create the inventory with validated data
    const inventory = await prisma.inventory.create({
      data: {
        title,
        description,
        categoryId,
        creatorId: (req.user as any).id, // Assuming req.user is populated by isAuthenticated
        // Handle tags as well if they are part of the error
        tags: tags?.length ? {
          create: tags.map((tagId: string) => ({
            tag: { connect: { id: tagId } }
          }))
        } : undefined,
      },
      include: { tags: { include: { tag: true } } },
    });
    res.status(201).json(inventory);
  } catch (err) {
    // Log the detailed error for server-side debugging
    console.error("Failed to create inventory:", err);
    res.status(500).json({ error: "Failed to create inventory" });
  }
});

// Update inventory
router.put("/:id", isAuthenticated, async (req, res) => {
  try {
    // ✅ FIX: Use the string ID directly from req.params.
    const { id } = req.params;
    const { title, description, tags } = req.body;

    const inventory = await prisma.inventory.update({
      // ✅ FIX: Use the string ID here.
      where: { id },
      data: {
        title,
        description,
        tags: tags
          ? {
            deleteMany: {}, // remove existing
            create: tags.map((tagId: number) => ({
              tag: { connect: { id: tagId } },
            })),
          }
          : undefined,
      },
      include: { tags: { include: { tag: true } } },
    });

    res.json(inventory);
  } catch (err) {
    res.status(500).json({ error: "Failed to update inventory" });
  }
});

// Get items of an inventory
router.get("/:id/items", async (req, res) => {
  try {
    // ✅ FIX: Use the string ID directly from req.params.
    const { id } = req.params;

    const items = await prisma.item.findMany({
      // ✅ FIX: Use the string ID here.
      where: { inventoryId: id },
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch items" });
  }
});

// Add item to an inventory
router.post("/:id/items", isAuthenticated, async (req, res) => {
  try {
    // ✅ FIX: Use the string ID directly from req.params.
    const { id } = req.params;

    const {
      name,
      // ✅ FIX: Removed 'tags' as it's not part of the Item model.
      customId,
      string1_val, string2_val, string3_val,
      multiline1_val, multiline2_val, multiline3_val,
      int1_val, int2_val, int3_val,
      bool1_val, bool2_val, bool3_val,
      doc1_val, doc2_val, doc3_val
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Item name is required." });
    }

    const item = await prisma.item.create({
      data: {
        // ✅ FIX: Pass the required 'name' and the string 'inventoryId'.
        name,
        inventoryId: id,
        customId,
        string1_val, string2_val, string3_val,
        multiline1_val, multiline2_val, multiline3_val,
        int1_val, int2_val, int3_val,
        bool1_val, bool2_val, bool3_val,
        doc1_val, doc2_val, doc3_val,
        // ✅ FIX: Removed 'tags' property from the data object.
      },
    });

    res.status(201).json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add item" });
  }
});

// Delete item
router.delete("/items/:itemId", isAuthenticated, async (req, res) => {
  try {
    // ✅ FIX: Use the string ID directly from req.params.
    const { itemId } = req.params;

    // ✅ FIX: Use the string ID here.
    await prisma.item.delete({ where: { id: itemId } });
    res.json({ message: "Item deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete item" });
  }
});

export default router;

