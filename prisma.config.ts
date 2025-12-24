import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  // No migrations - using db push only
  datasource: {
    url: process.env["DATABASE_URL"]!,
  },
});
