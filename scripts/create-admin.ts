/**
 * Create First Admin Agent Script
 *
 * This script creates the first admin agent in the system.
 * Run with: npx tsx scripts/create-admin.ts
 *
 * Required environment variables:
 * - DATABASE_URL: PostgreSQL connection string
 * - NEXT_PUBLIC_SUPABASE_URL: Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Supabase service role key
 * - ADMIN_EMAIL: Email for the admin user
 * - ADMIN_PASSWORD: Password for the admin user (min 8 chars)
 * - ADMIN_NAME: Display name for the admin user
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });
dotenv.config();

// Disable TLS certificate validation for self-signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

async function main() {
  // Validate environment variables
  const requiredEnvVars = [
    "DATABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "ADMIN_EMAIL",
    "ADMIN_PASSWORD",
    "ADMIN_NAME",
  ];

  const missing = requiredEnvVars.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:");
    missing.forEach((key) => console.error(`   - ${key}`));
    console.error(
      "\nAdd them to .env.local or set them before running this script."
    );
    process.exit(1);
  }

  const adminEmail = process.env.ADMIN_EMAIL!;
  const adminPassword = process.env.ADMIN_PASSWORD!;
  const adminName = process.env.ADMIN_NAME!;

  // Validate password length
  if (adminPassword.length < 8) {
    console.error("❌ ADMIN_PASSWORD must be at least 8 characters long");
    process.exit(1);
  }

  console.log("🔧 Creating first admin agent...");
  console.log(`   Email: ${adminEmail}`);
  console.log(`   Name: ${adminName}`);

  // Initialize Prisma
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  // Initialize Supabase with service role
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  try {
    // Check if agent already exists
    const existingAgent = await prisma.agent.findUnique({
      where: { email: adminEmail },
    });

    if (existingAgent) {
      console.log("⚠️  Agent with this email already exists!");
      console.log(`   ID: ${existingAgent.id}`);
      console.log(`   Role: ${existingAgent.role}`);
      console.log(`   Active: ${existingAgent.isActive}`);
      return;
    }

    // Create user in Supabase Auth
    console.log("   Creating Supabase auth user...");
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: {
          name: adminName,
          role: "admin",
        },
      });

    if (authError) {
      if (authError.message.includes("already been registered")) {
        // User exists in Supabase, get their ID
        console.log("   Supabase user already exists, fetching ID...");
        const { data: users } = await supabase.auth.admin.listUsers();
        const existingUser = users?.users?.find((u) => u.email === adminEmail);
        if (existingUser) {
          // Create agent record linked to existing auth user
          const agent = await prisma.agent.create({
            data: {
              authUserId: existingUser.id,
              email: adminEmail,
              name: adminName,
              role: "admin",
              isActive: true,
            },
          });
          console.log("✅ Admin agent created (linked to existing auth user)!");
          console.log(`   Agent ID: ${agent.id}`);
          return;
        }
      }
      throw new Error(`Supabase auth error: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error("Failed to create Supabase user - no user returned");
    }

    console.log(`   Auth user created: ${authData.user.id}`);

    // Create agent in database
    console.log("   Creating agent in database...");
    const agent = await prisma.agent.create({
      data: {
        authUserId: authData.user.id,
        email: adminEmail,
        name: adminName,
        role: "admin",
        isActive: true,
      },
    });

    console.log("\n✅ Admin agent created successfully!");
    console.log(`   Agent ID: ${agent.id}`);
    console.log(`   Auth User ID: ${agent.authUserId}`);
    console.log(`   Email: ${agent.email}`);
    console.log(`   Name: ${agent.name}`);
    console.log(`   Role: ${agent.role}`);
    console.log("\n🔐 You can now login at /login with the provided credentials.");
  } catch (error) {
    console.error("\n❌ Failed to create admin agent:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
