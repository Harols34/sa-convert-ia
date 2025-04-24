
import { Hono } from "hono";

// Define environment interface
interface Env {
  // Define your environment variables here if needed
}

// Create Hono app
const app = new Hono<{ Bindings: Env }>();

// Define routes
app.get("/api/", (c) => c.json({ name: "Cloudflare", status: "OK" }));

// Export the app
export default app;
