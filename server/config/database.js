import dns from "dns";
import mongoose from "mongoose";

const DEFAULT_DNS_SERVERS = ["8.8.8.8", "8.8.4.4", "1.1.1.1"];

function configureDnsForMongoSrv() {
  const customServers = process.env.MONGO_DNS_SERVERS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const servers = customServers?.length ? customServers : DEFAULT_DNS_SERVERS;
  dns.setServers(servers);
}

function maskConnectionUri(uri) {
  if (!uri) return "(not set)";
  return uri.replace(/:([^:@/]+)@/, ":****@");
}

export async function connectDatabase() {
  const uri = process.env.DB_URL;

  if (!uri) {
    throw new Error(
      "DB_URL is missing. Add a valid MongoDB Atlas connection string to server/.env"
    );
  }

  if (!uri.startsWith("mongodb://") && !uri.startsWith("mongodb+srv://")) {
    throw new Error(
      "DB_URL must start with mongodb:// or mongodb+srv://"
    );
  }

  if (uri.startsWith("mongodb+srv://")) {
    configureDnsForMongoSrv();
  }

  const options = {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
    socketTimeoutMS: 45000,
    // useNewUrlParser and useUnifiedTopology are defaults in recent mongoose
  };

  const maxAttempts = Number(process.env.DB_CONNECT_RETRIES || 5);
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await mongoose.connect(uri, options);
      console.log("MongoDB connected:", mongoose.connection.name || "default");
      return mongoose.connection;
    } catch (error) {
      console.error(`MongoDB connection attempt ${attempt} failed:`, error.message || error);
      console.error("URI (masked):", maskConnectionUri(uri));

      if (attempt < maxAttempts) {
        const waitMs = attempt * 2000;
        console.log(`Retrying MongoDB connection in ${waitMs}ms...`);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      if (error.message?.includes("querySrv") || error.code === "ECONNREFUSED") {
        console.error(
          "DNS SRV lookup failed. This often happens when local DNS blocks MongoDB Atlas SRV records."
        );
        console.error(
          "Fix: set MONGO_DNS_SERVERS=8.8.8.8,8.8.4.4,1.1.1.1 in .env (already applied automatically for mongodb+srv)."
        );
        console.error(
          "Also verify in MongoDB Atlas: cluster is active, Network Access allows your IP (or 0.0.0.0/0), and DB user credentials are correct."
        );
      }

      if (error.message?.toLowerCase()?.includes("auth") || error.code === 8000) {
        console.error("Authentication failed. Check database username and password in DB_URL.");
      }

      throw error;
    }
  }
}

let dbHandlersRegistered = false;
export function setupDatabaseEventHandlers() {
  if (dbHandlersRegistered) return;
  dbHandlersRegistered = true;

  mongoose.connection.on("error", (err) => {
    console.error("MongoDB runtime error:", err.message);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected. Attempting to reconnect...");
  });

  mongoose.connection.on("reconnected", () => {
    console.log("MongoDB reconnected");
  });
}
