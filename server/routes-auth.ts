import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq, or } from "drizzle-orm";
import { db } from "./db";
import { users } from "@shared/schema";

const router = Router();

// JWT secret - in production, use a secure random string
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";

// Login endpoint
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    // Find user by username or email
    const user = await db
      .select()
      .from(users)
      .where(
        or(
          eq(users.username, username),
          eq(users.email, username)
        )
      )
      .limit(1);

    if (user.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const foundUser = user[0];

    // Check if user is active
    if (!foundUser.isActive) {
      return res.status(401).json({ message: "Account is deactivated" });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, foundUser.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Update last login
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, foundUser.id));

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: foundUser.id, 
        username: foundUser.username,
        role: foundUser.role 
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Return user data (without password hash)
    const { passwordHash, ...userWithoutPassword } = foundUser;

    res.json({
      message: "Login successful",
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Verify token endpoint
router.get("/verify", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Get fresh user data
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1);

    if (user.length === 0 || !user[0].isActive) {
      return res.status(401).json({ message: "Invalid token" });
    }

    const { passwordHash, ...userWithoutPassword } = user[0];

    res.json({
      valid: true,
      user: userWithoutPassword,
    });
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
});

// Logout endpoint
router.post("/logout", (req, res) => {
  // Since we're using JWT, logout is handled on the client side
  // by removing the token from localStorage
  res.json({ message: "Logout successful" });
});

// Change password endpoint
router.post("/change-password", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const { currentPassword, newPassword } = req.body;

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new passwords are required" });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Get user
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1);

    if (user.length === 0) {
      return res.status(401).json({ message: "User not found" });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user[0].passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await db
      .update(users)
      .set({ 
        passwordHash: newPasswordHash,
        updatedAt: new Date()
      })
      .where(eq(users.id, decoded.userId));

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
