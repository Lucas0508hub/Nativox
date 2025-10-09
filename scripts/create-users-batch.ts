#!/usr/bin/env node

import { config } from "dotenv";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

// Load environment variables first
config();

interface BatchUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username?: string;
  role?: "admin" | "manager" | "editor";
  isActive?: boolean;
}

interface BatchCreateResult {
  success: BatchUserData[];
  failed: Array<{ user: BatchUserData; error: string }>;
}

async function createUsersBatch(userData: BatchUserData[]): Promise<BatchCreateResult> {
  // Import database modules only when needed
  const { db } = await import("../server/db");
  const { users } = await import("@shared/schema");
  const { eq } = await import("drizzle-orm");

  const result: BatchCreateResult = {
    success: [],
    failed: []
  };

  console.log(`🚀 Starting batch creation of ${userData.length} users...\n`);

  for (let i = 0; i < userData.length; i++) {
    const user = userData[i];
    console.log(`[${i + 1}/${userData.length}] Creating user: ${user.email}`);

    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(user.email)) {
        throw new Error("Invalid email format");
      }

      // Validate password strength
      if (user.password.length < 6) {
        throw new Error("Password must be at least 6 characters long");
      }

      // Validate required fields
      if (!user.firstName?.trim()) {
        throw new Error("First name is required");
      }
      if (!user.lastName?.trim()) {
        throw new Error("Last name is required");
      }

      // Generate username from email if not provided
      const finalUsername = user.username || user.email.split('@')[0];

      // Check if user already exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, user.email))
        .limit(1);

      if (existingUser.length > 0) {
        throw new Error(`User with email ${user.email} already exists`);
      }

      // Check if username already exists
      const existingUsername = await db
        .select()
        .from(users)
        .where(eq(users.username, finalUsername))
        .limit(1);

      if (existingUsername.length > 0) {
        throw new Error(`Username ${finalUsername} already exists`);
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(user.password, saltRounds);

      // Generate unique ID
      const role = user.role || "editor";
      const userId = `${role}-${Date.now()}-${i}`;

      // Create user
      const newUser = {
        id: userId,
        email: user.email,
        username: finalUsername,
        passwordHash,
        firstName: user.firstName.trim(),
        lastName: user.lastName.trim(),
        role,
        isActive: user.isActive !== false, // Default to true
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.insert(users).values(newUser);

      console.log(`  ✅ Created: ${user.email} (${role})`);
      result.success.push(user);

    } catch (error) {
      console.log(`  ❌ Failed: ${user.email} - ${error.message}`);
      result.failed.push({ user, error: error.message });
    }
  }

  return result;
}

// Load users from JSON file
function loadUsersFromFile(filePath: string): BatchUserData[] {
  try {
    const fullPath = path.resolve(filePath);
    const fileContent = fs.readFileSync(fullPath, 'utf8');
    const users = JSON.parse(fileContent);

    if (!Array.isArray(users)) {
      throw new Error("JSON file must contain an array of user objects");
    }

    return users;
  } catch (error) {
    throw new Error(`Failed to load users from file: ${error.message}`);
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
🔧 Shemasts Batch User Creation Script

Usage:
  npm run create-users-batch -- <file.json>
  node scripts/create-users-batch.ts <file.json>

JSON File Format:
  [
    {
      "email": "user1@example.com",
      "password": "password123",
      "firstName": "John",
      "lastName": "Doe",
      "username": "user1",
      "role": "editor",
      "isActive": true
    },
    {
      "email": "admin@example.com",
      "password": "adminpass123",
      "firstName": "Admin",
      "lastName": "User",
      "role": "admin"
    }
  ]

Required fields: email, password, firstName, lastName
Optional fields: username, role (admin|manager|editor), isActive (default: true)

Example JSON file:
  [
    {
      "email": "john@company.com",
      "password": "john123",
      "firstName": "John",
      "lastName": "Smith",
      "role": "manager"
    },
    {
      "email": "jane@company.com", 
      "password": "jane123",
      "firstName": "Jane",
      "lastName": "Doe",
      "role": "editor"
    }
  ]
    `);
    process.exit(0);
  }

  const filePath = args[0];

  if (!filePath) {
    console.error("❌ Error: JSON file path is required");
    console.log("Use --help for usage information");
    process.exit(1);
  }

  try {
    // Load users from file
    console.log(`📁 Loading users from: ${filePath}`);
    const userData = loadUsersFromFile(filePath);
    console.log(`📊 Found ${userData.length} users to create\n`);

    // Create users
    const result = await createUsersBatch(userData);

    // Print summary
    console.log("\n" + "=".repeat(50));
    console.log("📊 BATCH CREATION SUMMARY");
    console.log("=".repeat(50));
    console.log(`✅ Successfully created: ${result.success.length} users`);
    console.log(`❌ Failed to create: ${result.failed.length} users`);

    if (result.failed.length > 0) {
      console.log("\n❌ Failed users:");
      result.failed.forEach(({ user, error }) => {
        console.log(`  • ${user.email}: ${error}`);
      });
    }

    if (result.success.length > 0) {
      console.log("\n✅ Successfully created users:");
      result.success.forEach(user => {
        console.log(`  • ${user.email} (${user.role || 'editor'})`);
      });
    }

    console.log("\n🎉 Batch creation completed!");

  } catch (error) {
    console.error("💥 Batch creation failed:", error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().then(() => {
    process.exit(0);
  });
}

export { createUsersBatch, BatchUserData, BatchCreateResult };
