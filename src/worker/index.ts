
import { Hono } from "hono";
import { cors } from "hono/cors";

// Define environment interface
interface Env {
  // Define your environment variables here if needed
}

// Create Hono app
const app = new Hono<{ Bindings: Env }>();

// Add CORS middleware to allow cross-origin requests
app.use("*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
}));

// Define basic routes
app.get("/api/", (c) => c.json({ name: "Speech Analytics API", status: "OK" }));

// Health check route
app.get("/api/health", (c) => c.json({ 
  status: "healthy", 
  timestamp: new Date().toISOString(),
  version: "1.0.0"
}));

// Analytics API status
app.get("/api/status/transcription", async (c) => {
  return c.json({
    service: "transcription",
    status: "operational",
    provider: "OpenAI Whisper",
    features: [
      "Enhanced acoustic-based speaker diarization",
      "Silence detection",
      "Cost-optimized processing",
      "Turn detection using acoustic patterns"
    ],
    timestamp: new Date().toISOString()
  });
});

// Export the app
export default app;
