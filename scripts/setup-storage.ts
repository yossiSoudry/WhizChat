/**
 * Setup Storage Bucket Script
 *
 * This script creates the chat-files bucket in Supabase Storage.
 * Run with: npx tsx scripts/setup-storage.ts
 *
 * Required environment variables:
 * - NEXT_PUBLIC_SUPABASE_URL: Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Supabase service role key
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });
dotenv.config();

async function main() {
  // Validate environment variables
  const requiredEnvVars = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];

  const missing = requiredEnvVars.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error("Missing required environment variables:");
    missing.forEach((key) => console.error(`   - ${key}`));
    process.exit(1);
  }

  console.log("Setting up Supabase Storage bucket...");

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

  const bucketName = "chat-files";

  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      throw listError;
    }

    const existingBucket = buckets?.find((b) => b.name === bucketName);

    if (existingBucket) {
      console.log(`Bucket "${bucketName}" already exists!`);
    } else {
      // Create bucket
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true, // Public bucket for easy access to files
        fileSizeLimit: 10 * 1024 * 1024, // 10MB limit
        allowedMimeTypes: [
          // Images
          "image/jpeg",
          "image/png",
          "image/gif",
          "image/webp",
          "image/svg+xml",
          // Documents
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-powerpoint",
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          "text/plain",
          "text/csv",
          "application/json",
          "application/zip",
          "application/x-rar-compressed",
          // Audio
          "audio/mpeg",
          "audio/wav",
          "audio/ogg",
          "audio/webm",
          // Video
          "video/mp4",
          "video/webm",
          "video/quicktime",
        ],
      });

      if (createError) {
        throw createError;
      }

      console.log(`Bucket "${bucketName}" created successfully!`);
    }

    console.log("\nStorage setup complete!");
    console.log("\nNote: Make sure to enable RLS policies in the Supabase dashboard:");
    console.log("1. Go to Storage > Policies");
    console.log("2. Create a SELECT policy for public access (read)");
    console.log("3. Create an INSERT policy for authenticated users or all users");
  } catch (error) {
    console.error("\nFailed to setup storage:", error);
    process.exit(1);
  }
}

main();
