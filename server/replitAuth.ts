import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// Check if we're in development mode (either local development or Replit dev environment)
const isDevelopment = process.env.NODE_ENV !== "production";

if (!isDevelopment && !process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // In development, create a test user
  if (isDevelopment) {
    try {
      await storage.upsertUser({
        id: "dev-user-001",
        email: "dev@test.com",
        firstName: "Dev",
        lastName: "User",
        profileImageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=dev",
        role: "manager"
      });
    } catch (error) {
      console.log("Dev user setup:", error);
    }
  }

  if (isDevelopment) {
    // Development mode routes
    app.get("/api/login", (req, res) => {
      res.json({ 
        message: "Development mode - authentication disabled. Using dev user.",
        developmentMode: true
      });
    });

    app.get("/api/callback", (req, res) => {
      res.redirect("/");
    });

    app.get("/api/logout", (req, res) => {
      res.redirect("/");
    });
    
    return;
  }

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    // In development, provide a helpful message
    if (req.hostname === 'localhost' || req.hostname === '127.0.0.1') {
      return res.status(500).json({ 
        message: "Authentication requires deployment on Replit. This feature is not available in local development.",
        developmentMode: true
      });
    }
    
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req: any, res, next) => {
  // Development mode bypass
  if (isDevelopment) {
    req.user = {
      claims: {
        sub: "dev-user-001",
        email: "dev@test.com",
        first_name: "Dev",
        last_name: "User"
      }
    };
    req.isAuthenticated = () => true;
    return next();
  }

  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};

// Middleware to check if user has access to a specific project
export const hasProjectAccess: RequestHandler = async (req, res, next) => {
  // In development, allow all access
  if (isDevelopment) {
    return next();
  }

  const user = req.user as any;
  const userId = user?.claims?.sub;
  const projectId = parseInt(req.params.projectId || req.body.projectId || req.query.projectId);

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!projectId || isNaN(projectId)) {
    return res.status(400).json({ message: "Invalid project ID" });
  }

  try {
    // Check if user is assigned to this project
    const hasAccess = await storage.checkUserProjectAccess(userId, projectId);
    
    if (!hasAccess) {
      return res.status(403).json({ message: "You do not have access to this project" });
    }

    next();
  } catch (error) {
    console.error("Error checking project access:", error);
    res.status(500).json({ message: "Error checking project access" });
  }
};
