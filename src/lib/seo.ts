export const SITE_NAME = "Deppulse";

const host = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "localhost:3000";
const protocol = host.startsWith("localhost") ? "http" : "https";

export const SITE_URL = `${protocol}://${host}`;
