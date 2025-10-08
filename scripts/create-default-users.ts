import bcrypt from "bcryptjs";
import { db } from "../server/db";
import { users } from "@shared/schema";

async function createDefaultUsers() {
  try {
    console.log("Creating default users...");

    const saltRounds = 12;
    const defaultUsers = [
      {
        id: "admin-001",
        username: "admin",
        email: "admin@audioseg.com",
        passwordHash: await bcrypt.hash("admin123", saltRounds),
        firstName: "Admin",
        lastName: "User",
        role: "admin" as const,
        isActive: true,
      },
      {
        id: "manager-001",
        username: "manager",
        email: "manager@audioseg.com",
        passwordHash: await bcrypt.hash("manager123", saltRounds),
        firstName: "Manager",
        lastName: "User",
        role: "manager" as const,
        isActive: true,
      },
      {
        id: "editor-001",
        username: "editor",
        email: "editor@audioseg.com",
        passwordHash: await bcrypt.hash("editor123", saltRounds),
        firstName: "Editor",
        lastName: "User",
        role: "editor" as const,
        isActive: true,
      },
    ];

    for (const user of defaultUsers) {
      try {
        await db.insert(users).values(user).onConflictDoNothing();
        console.log(`✅ Created user: ${user.username} (${user.role})`);
      } catch (error) {
        console.log(`⚠️  User ${user.username} already exists, skipping...`);
      }
    }

    console.log("\n🎉 Default users created successfully!");
    console.log("\nDefault credentials:");
    console.log("Admin:   admin / admin123");
    console.log("Manager: manager / manager123");
    console.log("Editor:  editor / editor123");
    console.log("\n⚠️  Please change these passwords after first login!");

  } catch (error) {
    console.error("Error creating default users:", error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createDefaultUsers().then(() => {
    process.exit(0);
  });
}

export { createDefaultUsers };
