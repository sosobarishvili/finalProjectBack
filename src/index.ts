// src/index.ts
import express from "express";
import session from "express-session";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import passport from "./config/passport";

// ✅ Import route files
import authRoutes from "./routes/auth";
import adminRoutes from "./routes/admin";
import userRoutes from "./routes/user";
import inventoryRoutes from "./routes/inventory";
import itemRoutes from "./routes/item";
import tagsRoutes from "./routes/tags";
import categoryRoutes from "./routes/categories";

dotenv.config();
const app = express();
const prisma = new PrismaClient();

const PORT = process.env.PORT || 3001;

// ✅ CORS (dynamic for dev/prod)
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

// ✅ Sessions
app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production", // secure cookies in prod
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // needed for Netlify + Render cross-origin
    },
  })
);

// ✅ Passport
app.use(passport.initialize());
app.use(passport.session());

// ✅ API Routes
app.use("/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/user", userRoutes);
app.use("/api/inventories", inventoryRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/tags", tagsRoutes);
app.use("/api/categories", categoryRoutes);

// ✅ Health check
app.get("/", (_req, res) => res.send("🚀 API is running!"));

// ✅ Google OAuth (only if env vars exist)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  app.get(
    "/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
  );

  app.get(
    "/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/" }),
    (req, res) => res.redirect("/dashboard")
  );
}

// ✅ Facebook OAuth (only if env vars exist)
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  app.get(
    "/auth/facebook",
    passport.authenticate("facebook", { scope: ["email"] })
  );

  app.get(
    "/auth/facebook/callback",
    passport.authenticate("facebook", { failureRedirect: "/" }),
    (req, res) => res.redirect("/dashboard")
  );
}

// ✅ Protected Dashboard route
app.get("/dashboard", (req, res) => {
  if (!req.user) return res.redirect("/");
  res.send(`Welcome ${(req.user as any).name}`);
});

// ✅ Start server
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
