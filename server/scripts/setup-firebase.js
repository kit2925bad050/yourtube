#!/usr/bin/env node

/**
 * Firebase Credentials Setup Helper
 * This script helps you set up Firebase credentials for the migration
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverDir = __dirname;
const envPath = path.join(serverDir, ".env");
const credentialsPath = path.join(serverDir, "firebase-credentials.json");

console.log(`
╔═════════════════════════════════════════════════════════════════════╗
║              FIREBASE CREDENTIALS SETUP HELPER                     ║
╚═════════════════════════════════════════════════════════════════════╝
`);

// Check current status
console.log("📋 CURRENT STATUS:\n");

let hasGoogleCredentials = false;
let hasCredentialsFile = false;

// Check GOOGLE_APPLICATION_CREDENTIALS
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.log("✅ GOOGLE_APPLICATION_CREDENTIALS environment variable is set");
  hasGoogleCredentials = true;
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (fs.existsSync(credPath)) {
    console.log(`   Path: ${credPath} (EXISTS)`);
  } else {
    console.log(`   Path: ${credPath} (NOT FOUND)`);
  }
}

// Check for local credentials file
if (fs.existsSync(credentialsPath)) {
  console.log("✅ firebase-credentials.json file exists in server directory");
  hasCredentialsFile = true;
}

// Check .env file
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  if (envContent.includes("GOOGLE_APPLICATION_CREDENTIALS")) {
    console.log("✅ GOOGLE_APPLICATION_CREDENTIALS is configured in .env");
  } else {
    console.log("⚠️  GOOGLE_APPLICATION_CREDENTIALS not in .env");
  }
}

console.log(`\n`);

if (hasGoogleCredentials && hasCredentialsFile) {
  console.log(`✅ Firebase credentials are properly configured!\n`);
  console.log(`You can now run the migration:\n`);
  console.log(`   npm run migrate:videos\n`);
  process.exit(0);
}

// Provide setup instructions
console.log(`📖 SETUP INSTRUCTIONS:\n`);

console.log(`1️⃣  DOWNLOAD SERVICE ACCOUNT KEY:`);
console.log(`   • Open: https://console.firebase.google.com/project/yourtube-b1d38/settings/serviceaccounts/adminsdk`);
console.log(`   • Select "Node.js" if not already selected`);
console.log(`   • Click "Generate new private key"`);
console.log(`   • Save the downloaded JSON file\n`);

console.log(`2️⃣  PLACE THE FILE:`);
console.log(`   • Move the downloaded JSON file to:`);
console.log(`     ${credentialsPath}\n`);

console.log(`3️⃣  UPDATE .env FILE:`);
console.log(`   • Add this line to server/.env:\n`);
console.log(`     GOOGLE_APPLICATION_CREDENTIALS=./firebase-credentials.json\n`);

console.log(`4️⃣  VERIFY SETUP:`);
console.log(`   • Run: node scripts/setup-firebase.js`);
console.log(`   • It should show: ✅ Firebase credentials are properly configured!\n`);

console.log(`5️⃣  RUN MIGRATION:`);
console.log(`   • Run: npm run migrate:videos:analyze`);
console.log(`   • Run: npm run migrate:videos\n`);

console.log(`⚠️  SECURITY NOTES:`);
console.log(`   • firebase-credentials.json contains sensitive private keys`);
console.log(`   • NEVER commit this file to Git`);
console.log(`   • Add to .gitignore: firebase-credentials.json`);
console.log(`   • Don't share the credentials with anyone\n`);

console.log(`📚 MORE HELP:`);
console.log(`   • Read: FIREBASE_CREDENTIALS_SETUP.md`);
console.log(`   • Read: MIGRATION_GUIDE.md\n`);

if (!hasCredentialsFile) {
  console.log(`❌ firebase-credentials.json NOT FOUND`);
  console.log(`   Please download it and place it in: ${credentialsPath}\n`);
}

console.log(`╔═════════════════════════════════════════════════════════════════════╗`);
console.log(`║              Complete the steps above to continue                   ║`);
console.log(`╚═════════════════════════════════════════════════════════════════════╝\n`);
