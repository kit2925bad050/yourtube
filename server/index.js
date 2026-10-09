import dotenv from "dotenv";
import http from "http";
import net from "net";
import { app } from "./app.js";
import { connectDatabase, setupDatabaseEventHandlers } from "./config/database.js";
import { initSocket } from "./socket/index.js";
import { migrateLegacyThumbnails, generateMissingThumbnails } from "./controllers/video.js";

dotenv.config();

// Startup diagnostics for Cloudinary env vars
console.log("Cloudinary configured:", {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key_exists: !!process.env.CLOUDINARY_API_KEY,
  api_secret_exists: !!process.env.CLOUDINARY_API_SECRET,
});

const httpServer = http.createServer(app);
const PORT = process.env.PORT || 5000;

async function tryListen(server, port) {
  return new Promise((resolve, reject) => {
    const onError = (err) => {
      server.removeListener("listening", onListen);
      reject(err);
    };
    const onListen = () => {
      server.removeListener("error", onError);
      resolve();
    };

    server.once("error", onError);
    server.once("listening", onListen);
    server.listen(port);
  });
}

async function startServer() {
  setupDatabaseEventHandlers();

  try {
    await connectDatabase();
    await migrateLegacyThumbnails();
    await generateMissingThumbnails();
  } catch (error) {
    console.error("Server startup aborted: could not connect to MongoDB.");
    process.exit(1);
  }

  initSocket(httpServer);

  const startPort = Number(process.env.PORT || PORT);
  const maxAttempts = Number(process.env.PORT_FALLBACK_ATTEMPTS || 20);
  let boundPort = null;

  for (let i = 0; i < maxAttempts; i++) {
    const tryPort = startPort + i;
    try {
      // Before listening, quickly check TCP availability
      await new Promise((res, rej) => {
        const tester = net.createServer()
          .once("error", (err) => {
            rej(err);
          })
          .once("listening", () => {
            tester.close();
            res();
          })
          .listen(tryPort);
      });

      await tryListen(httpServer, tryPort);
      boundPort = tryPort;
      break;
    } catch (err) {
      if (err && err.code === "EADDRINUSE") {
        console.warn(`Port ${tryPort} in use, trying next port...`);
        continue;
      }
      console.error("Failed to bind server:", err);
      process.exit(1);
    }
  }

  if (!boundPort) {
    console.error(`Could not find available port after ${maxAttempts} attempts starting at ${startPort}`);
    process.exit(1);
  }

  console.log(`Server running on port ${boundPort}`);
  console.log(`WebRTC signaling ready via Socket.IO`);
}

startServer();
