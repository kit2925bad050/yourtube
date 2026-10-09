#!/usr/bin/env node
/**
 * Alternative: Delete all videos via API call
 * This script uses the running Express server's API to delete videos
 * Usage: node deleteAllVideosViaAPI.js <server_url>
 * Default: http://localhost:5000
 */

import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const SERVER_URL = process.argv[2] || 'http://localhost:5000';
const API_KEY = process.env.ADMIN_API_KEY || 'admin-secret-key'; // Should match server

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function deleteAllVideosViaAPI() {
  log('\n=== VIDEO DELETION VIA API ===\n', 'blue');
  log(`Target server: ${SERVER_URL}\n`, 'yellow');

  try {
    // Call the delete endpoint
    log('Sending deletion request to server...', 'blue');
    
    const response = await axios.post(
      `${SERVER_URL}/api/admin/delete-all-videos`,
      { confirmDeletion: true },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    if (response.data) {
      log('\n✓ API Response:', 'green');
      log(JSON.stringify(response.data, null, 2), 'green');
    }

    log('\n=== SCRIPT COMPLETED ===\n', 'blue');
  } catch (error) {
    if (error.response) {
      log(`✗ Server error: ${error.response.status} ${error.response.statusText}`, 'red');
      log(JSON.stringify(error.response.data, null, 2), 'red');
    } else if (error.code === 'ECONNREFUSED') {
      log(`✗ Connection refused. Is the server running at ${SERVER_URL}?`, 'red');
    } else {
      log(`✗ Error: ${error.message}`, 'red');
    }
    process.exit(1);
  }
}

deleteAllVideosViaAPI();
