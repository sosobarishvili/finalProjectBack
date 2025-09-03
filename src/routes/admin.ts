// src/routes/admin.ts
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { isAuthenticated, isAdmin } from '../middleware/auth';

const prisma = new PrismaClient();
const router = Router();

// Protect all admin routes
router.use(isAuthenticated, isAdmin);

// GET all users
router.get('/users', async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});

// POST to update multiple users (block, unblock, delete)
router.post('/users/update', async (req, res) => {
  const { action, userIds } = req.body; // action can be 'block', 'unblock', 'delete', 'toggleAdmin'

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ message: 'User IDs must be a non-empty array.' });
  }

  try {
    if (action === 'block') {
      await prisma.user.updateMany({ where: { id: { in: userIds } }, data: { isBlocked: true } });
    } else if (action === 'unblock') {
      await prisma.user.updateMany({ where: { id: { in: userIds } }, data: { isBlocked: false } });
    } else if (action === 'delete') {
      // Be careful with this! An admin cannot delete themselves with this logic.
      const filteredUserIds = userIds.filter(id => id !== (req.user as any).id);
      await prisma.user.deleteMany({ where: { id: { in: filteredUserIds } } });
    } else if (action === 'toggleAdmin') {
      for (const userId of userIds) {
        // Prevent an admin from de-admining themselves
        if (userId === (req.user as any).id) {
          // Optional: Check if they are the last admin
          const adminCount = await prisma.user.count({ where: { isAdmin: true } });
          if (adminCount <= 1) {
            // You could send a specific error message back to the client here
            continue; // Skip and do not let the last admin remove their own status
          }
        }
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user) {
          await prisma.user.update({
            where: { id: userId },
            data: { isAdmin: !user.isAdmin },
          });
        }
      }
    } else {
      return res.status(400).json({ message: 'Invalid action.' });
    }
    res.status(200).json({ message: `Action '${action}' completed successfully.` });
  } catch (error) {
    res.status(500).json({ message: 'An error occurred.', error });
  }
});

export default router;