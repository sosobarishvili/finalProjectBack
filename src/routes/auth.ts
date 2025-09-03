// src/routes/auth.ts
import { Router } from 'express';
import passport from 'passport';

const router = Router();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// === GOOGLE ROUTES ===
// 1. The initial request to the Google OAuth server
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// 2. The callback URL Google redirects to after user consent
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${FRONTEND_URL}/login`,
    successRedirect: `${FRONTEND_URL}/dashboard`,
  })
);

// === FACEBOOK ROUTES ===
router.get(
  '/facebook',
  passport.authenticate('facebook', { scope: ['email'] })
);

router.get(
  '/facebook/callback',
  passport.authenticate('facebook', {
    failureRedirect: `${FRONTEND_URL}/login`,
    successRedirect: `${FRONTEND_URL}/dashboard`,
  })
);

// === SESSION MANAGEMENT ROUTES ===
// A route to check the current user's session status
router.get('/me', (req, res) => {
  if (req.user) {
    res.json(req.user); // Send user data if logged in
  } else {
    res.status(401).json({ message: 'Not authenticated' });
  }
});

// A route to log the user out
router.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) { return next(err); }
    // Optional: Clear the session cookie
    res.clearCookie('connect.sid'); // The default session cookie name
    res.status(200).json({ message: 'Logged out successfully' });
  });
});

export default router;