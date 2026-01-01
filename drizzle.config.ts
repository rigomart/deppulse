import { defineConfig } from "drizzle-kit";
import "./envConfig.ts";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
  casing: "snake_case",
  entities: {
    roles: {
      provider: "neon",
    },
  },
});
