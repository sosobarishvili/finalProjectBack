// src/config/passport.ts

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// This function saves the user ID to the session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// This function retrieves the user from the database using the ID from the session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// ## Google OAuth Strategy ##
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: '/auth/google/callback',
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        // Check if a social account for this user already exists
        const existingAccount = await prisma.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: 'google',
              providerAccountId: profile.id,
            },
          },
          include: { user: true }, // Also fetch the associated user
        });

        // If the account exists, log in the user
        if (existingAccount) {
          return done(null, existingAccount.user);
        }

        // If the account does not exist, create a new user and a new account
        const newUser = await prisma.user.create({
          data: {
            email: profile.emails?.[0]?.value,
            name: profile.displayName,
            accounts: {
              create: {
                provider: 'google',
                providerAccountId: profile.id,
                type: 'oauth',
              },
            },
          },
        });
        return done(null, newUser);
      } catch (err) {
        return done(err as Error);
      }
    }
  )
);

// ## Facebook OAuth Strategy ##
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
      callbackURL: '/auth/facebook/callback',
      profileFields: ['id', 'emails', 'name'],
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        // Check if a social account for this user already exists
        const existingAccount = await prisma.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: 'facebook',
              providerAccountId: profile.id,
            },
          },
          include: { user: true },
        });

        // If the account exists, log in the user
        if (existingAccount) {
          return done(null, existingAccount.user);
        }

        // Format the name from the Facebook profile
        const name = `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim();

        // If the account does not exist, create a new user and a new account
        const newUser = await prisma.user.create({
          data: {
            email: profile.emails?.[0]?.value,
            name: name,
            accounts: {
              create: {
                provider: 'facebook',
                providerAccountId: profile.id,
                type: 'oauth',
              },
            },
          },
        });
        return done(null, newUser);
      } catch (err) {
        return done(err as Error);
      }
    }
  )
);

export default passport;