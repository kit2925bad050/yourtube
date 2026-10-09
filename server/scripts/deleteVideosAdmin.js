#!/usr/bin/env node
/**
 * Video Deletion Tool - Direct CLI Usage
 * 
 * This script provides multiple methods to delete all videos:
 * 1. Direct Node.js execution
 * 2. API endpoint via curl
 * 3. Admin panel integration
 * 
 * Usage:
 *   node deleteVideosAdmin.js
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import https from 'https';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log(`\n${'='.repeat(60)}`, 'blue');
  log(`  ${title}`, 'bold');
  log(`${'='.repeat(60)}\n`, 'blue');
}

async function callAPI(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const serverUrl = process.env.SERVER_URL || 'http://localhost:5000';
    const url = new URL(path, serverUrl);
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer admin-secret-key`, // Default admin key
      },
      timeout: 30000,
    };

    const protocol = url.protocol === 'https:' ? https : http;
    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
          });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timeout (${options.timeout}ms)`));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function showMenu() {
  logSection('VIDEO DELETION OPTIONS');
  
  log('This tool provides the following options:\n', 'yellow');
  log('1. API Call Method (Requires running server)', 'green');
  log('   - Most reliable if server is running');
  log('   - Command: curl -X DELETE http://localhost:5000/api/videos/ -H "Authorization: Bearer admin-secret-key"\n');
  
  log('2. Direct Node.js Script (Offline method)', 'green');
  log('   - Can run without server');
  log('   - Requires MongoDB connection\n');
  
  log('3. View Setup Instructions', 'green');
  log('   - Shows step-by-step setup\n');

  logSection('QUICK START - DELETE ALL VIDEOS');

  log('Option A: If server is running at http://localhost:5000\n', 'yellow');
  log('Run this curl command in PowerShell or Bash:\n', 'blue');
  log(`curl -X DELETE http://localhost:5000/api/videos/ \\`, 'green');
  log(`  -H "Authorization: Bearer admin-secret-key" \\`, 'green');
  log(`  -H "Content-Type: application/json"\n`, 'green');

  log('Option B: Using the standalone deletion script\n', 'yellow');
  log('Run this command:\n', 'blue');
  log(`node scripts/deleteAllVideos.js\n`, 'green');

  log('Option C: Using this admin tool\n', 'yellow');
  log('Attempting to connect to server at localhost:5000...\n', 'blue');

  // Try to connect to API
  try {
    const response = await callAPI('DELETE', '/api/videos/', { confirmDeletion: true });
    
    if (response.status === 200 || response.status === 401) {
      log('✓ Server is running and reachable!', 'green');
      
      if (response.status === 200) {
        logSection('DELETION RESULT');
        if (response.body) {
          log(JSON.stringify(response.body, null, 2), 'green');
        }
      } else if (response.status === 401) {
        log('⚠ Authorization failed - check admin token', 'yellow');
        log(`Response: ${JSON.stringify(response.body)}`, 'red');
      }
    } else {
      log(`✗ Server responded with status ${response.status}`, 'red');
      if (response.body) {
        log(JSON.stringify(response.body, null, 2), 'red');
      }
    }
  } catch (error) {
    log(`✗ Could not connect to server: ${error.message}`, 'red');
    log('\nTo start the server, run:', 'yellow');
    log('npm start\n', 'green');
  }
}

async function showInstructions() {
  logSection('SETUP INSTRUCTIONS FOR VIDEO DELETION');

  log('STEP 1: Start the Backend Server', 'blue');
  log('--------', 'blue');
  log('Run in a terminal:', 'yellow');
  log('cd you_tube2.0-main/server', 'green');
  log('npm install  (if not already done)', 'green');
  log('npm start\n', 'green');

  log('You should see output like:', 'yellow');
  log('> server@1.0.0 start', 'green');
  log('> nodemon index.js', 'green');
  log('[nodemon] starting `node index.js`', 'green');
  log('Server running on port 5000\n\n', 'green');

  log('STEP 2: Delete All Videos (in a new terminal)', 'blue');
  log('--------', 'blue');

  log('Option 2a: Using curl command', 'yellow');
  log('curl -X DELETE http://localhost:5000/api/videos/ \\', 'green');
  log('  -H "Authorization: Bearer admin-secret-key" \\', 'green');
  log('  -H "Content-Type: application/json"\n', 'green');

  log('Option 2b: Using the Node.js script', 'yellow');
  log('node scripts/deleteAllVideosViaAPI.js\n', 'green');

  log('Option 2c: Using standalone script (offline)', 'yellow');
  log('node scripts/deleteAllVideos.js\n', 'green');

  log('STEP 3: Verify Deletion', 'blue');
  log('--------', 'yellow');
  log('Check that the homepage shows no videos by visiting:', 'green');
  log('http://localhost:3000  (frontend)\n', 'green');

  log('STEP 4: Test New Upload', 'blue');
  log('--------', 'yellow');
  log('1. Log in to the frontend', 'green');
  log('2. Navigate to upload page', 'green');
  log('3. Upload a test video', 'green');
  log('4. Verify it appears on the homepage\n', 'green');

  logSection('RESPONSE FORMAT');
  log('On successful deletion, you\'ll receive JSON like:', 'yellow');
  log(`
{
  "success": true,
  "message": "Successfully deleted all 5 video(s)",
  "summary": {
    "totalVideosDeleted": 5,
    "cloudinaryVideosDeleted": 5,
    "cloudinaryThumbnailsDeleted": 5,
    "databaseRecordsDeleted": 5,
    "remainingVideos": 0,
    "errors": []
  },
  "deletedVideos": [
    {
      "id": "64abc123...",
      "title": "Sample Video",
      "uploader": "username",
      "uploadedAt": "2026-06-15T10:30:00Z"
    }
  ]
}`, 'green');
}

// Main
logSection('YOUTUBE 2.0 - VIDEO DELETION TOOL');

log('Environment Check:', 'blue');
log(`Database: ${process.env.DB_URL ? '✓ Configured' : '✗ Not configured'}`, 
    process.env.DB_URL ? 'green' : 'red');
log(`Cloudinary: ${process.env.CLOUDINARY_CLOUD_NAME ? '✓ Configured' : '✗ Not configured'}`, 
    process.env.CLOUDINARY_CLOUD_NAME ? 'green' : 'red');
log(`Server URL: ${process.env.SERVER_URL || 'http://localhost:5000'}\n`, 'yellow');

await showMenu();
log('\n\nFor detailed instructions, review the setup section above.', 'yellow');
log('Questions? Check README.md in the server directory.\n', 'yellow');
