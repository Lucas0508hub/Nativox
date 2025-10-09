#!/usr/bin/env node

import { config } from "dotenv";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

// Load environment variables first
config();

interface CreateUserOptions {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username?: string;
  role?: "admin" | "manager" | "editor";
  isActive?: boolean;
}

async function createUser(options: CreateUserOptions) {
  try {
    // Import database modules only when needed
    const { db } = await import("../server/db");
    const { users } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");

    const {
      email,
      password,
      firstName,
      lastName,
      username,
      role = "editor",
      isActive = true
    } = options;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Invalid email format");
    }

    // Validate password strength
    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters long");
    }

    // Validate required fields
    if (!firstName.trim()) {
      throw new Error("First name is required");
    }
    if (!lastName.trim()) {
      throw new Error("Last name is required");
    }

    // Generate username from email if not provided
    const finalUsername = username || email.split('@')[0];

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      throw new Error(`User with email ${email} already exists`);
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
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate unique ID
    const userId = `${role}-${Date.now()}`;

    // Create user
    const newUser = {
      id: userId,
      email,
      username: finalUsername,
      passwordHash,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role,
      isActive,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(users).values(newUser);

    console.log("✅ User created successfully!");
    console.log(`📧 Email: ${email}`);
    console.log(`👤 Username: ${finalUsername}`);
    console.log(`🔑 Role: ${role}`);
    console.log(`👨‍💼 Name: ${newUser.firstName} ${newUser.lastName}`);
    console.log(`🆔 ID: ${userId}`);
    console.log(`✅ Active: ${isActive ? 'Yes' : 'No'}`);

    return newUser;

  } catch (error) {
    console.error("❌ Error creating user:", error.message);
    throw error;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
🔧 AudioSeg User Creation Script

Usage:
  npm run create-user -- <email> <password> <firstName> <lastName> [options]
  node scripts/create-user.ts <email> <password> <firstName> <lastName> [options]

Options:
  --username <username>    Custom username (default: email prefix)
  --role <role>            Role: admin, manager, editor (default: editor)
  --inactive               Create inactive user (default: active)
  --help, -h               Show this help

Examples:
  npm run create-user -- john@example.com mypassword123 John Doe
  npm run create-user -- admin@company.com secretpass John Doe --role admin
  npm run create-user -- editor@test.com password123 Jane Smith --username editor1 --role editor
    `);
    process.exit(0);
  }

  const email = args[0];
  const password = args[1];
  const firstName = args[2];
  const lastName = args[3];

  if (!email || !password || !firstName || !lastName) {
    console.error("❌ Error: Email, password, first name, and last name are required");
    console.log("Use --help for usage information");
    process.exit(1);
  }

  // Parse options
  const options: CreateUserOptions = {
    email,
    password,
    firstName,
    lastName,
  };

  for (let i = 4; i < args.length; i += 2) {
    const flag = args[i];
    const value = args[i + 1];

    switch (flag) {
      case '--username':
        options.username = value;
        break;
      case '--role':
        if (!['admin', 'manager', 'editor'].includes(value)) {
          console.error(`❌ Error: Invalid role '${value}'. Must be admin, manager, or editor`);
          process.exit(1);
        }
        options.role = value as "admin" | "manager" | "editor";
        break;
      case '--inactive':
        options.isActive = false;
        i--; // Don't skip next argument since this flag has no value
        break;
      default:
        console.error(`❌ Error: Unknown option '${flag}'`);
        console.log("Use --help for usage information");
        process.exit(1);
    }
  }

  try {
    await createUser(options);
    console.log("\n🎉 User creation completed successfully!");
  } catch (error) {
    console.error("\n💥 User creation failed!");
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().then(() => {
    process.exit(0);
  });
}

export { createUser, CreateUserOptions };
