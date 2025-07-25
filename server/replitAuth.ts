// PROTOTYPE MODE - AUTHENTICATION TEMPORARILY DISABLED
// Original authentication system backed up in replitAuth.backup.ts
// This is a simplified bypass for prototype demonstration

import type { Express, RequestHandler } from "express";
import { storage } from "./storage";

// Demo user for prototype access  
const DEMO_USER = {
  id: "demo-user-001",
  email: "demo@nativox.org", 
  firstName: "Demo",
  lastName: "User",
  profileImageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=demo",
  role: "manager" as const
};

export async function setupAuth(app: Express) {
  // Ensure demo user exists in database
  try {
    await storage.upsertUser(DEMO_USER);
  } catch (error) {
    console.log("Demo user setup:", error);
  }

  // Prototype authentication routes - no actual authentication
  app.get("/api/login", (req, res) => {
    res.json({ 
      message: "Prototype mode - direct access enabled",
      prototypeMode: true
    });
  });

  app.get("/api/callback", (req, res) => {
    res.redirect("/");
  });

  app.get("/api/logout", (req, res) => {
    res.redirect("/");
  });
}

// Bypass authentication - always allow access with demo user
export const isAuthenticated: RequestHandler = async (req: any, res, next) => {
  // Mock user session for prototype
  req.user = {
    claims: {
      sub: DEMO_USER.id,
      email: DEMO_USER.email,
      first_name: DEMO_USER.firstName,
      last_name: DEMO_USER.lastName
    }
  };
  
  req.isAuthenticated = () => true;
  
  next();
};
