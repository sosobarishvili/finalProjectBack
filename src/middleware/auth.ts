// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';

// Checks if a user is logged in
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Unauthorized: You must be logged in.' });
};

// Checks if the logged-in user is an admin
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  // `req.user` is populated by Passport
  const user = req.user as { isAdmin?: boolean };

  if (user && user.isAdmin) {
    return next();
  }
  res.status(403).json({ message: 'Forbidden: Administrator access required.' });
};