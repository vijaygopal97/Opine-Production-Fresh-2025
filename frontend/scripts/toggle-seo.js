#!/usr/bin/env node

/**
 * SEO Toggle Script for Opine India
 * 
 * This script helps you easily switch between development (no indexing) 
 * and production (indexing enabled) SEO settings.
 * 
 * Usage:
 *   node scripts/toggle-seo.js dev    # Enable development mode (no indexing)
 *   node scripts/toggle-seo.js prod   # Enable production mode (indexing)
 *   node scripts/toggle-seo.js status # Check current status
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENV_FILE = path.join(__dirname, '..', '.env');
const ENV_PROD_FILE = path.join(__dirname, '..', '.env.production');
const ROBOTS_FILE = path.join(__dirname, '..', 'public', 'robots.txt');
const ROBOTS_PROD_FILE = path.join(__dirname, '..', 'public', 'robots.production.txt');

function updateEnvFile(filePath, enableIndexing) {
  const content = `VITE_API_BASE_URL=http://40.81.243.10:5000
# SEO Control - Set to 'true' to enable search engine indexing, 'false' to disable
VITE_ENABLE_SEO_INDEXING=${enableIndexing}`;
  
  fs.writeFileSync(filePath, content);
  console.log(`✅ Updated ${path.basename(filePath)} with VITE_ENABLE_SEO_INDEXING=${enableIndexing}`);
}

function updateRobotsFile(enableIndexing) {
  const content = enableIndexing 
    ? `# Production Robots.txt for Opine India
# This file allows search engines to index the site

User-agent: *
Allow: /

# Sitemap location (update when you have a sitemap)
# Sitemap: https://opineindia.com/sitemap.xml`
    : `# Robots.txt for Opine India
# This file blocks all search engines from indexing the site during development

User-agent: *
Disallow: /

# Block all crawlers from all pages
# Remove this file or change to "Allow: /" when ready for production`;

  fs.writeFileSync(ROBOTS_FILE, content);
  console.log(`✅ Updated robots.txt to ${enableIndexing ? 'allow' : 'block'} search engines`);
}

function getCurrentStatus() {
  try {
    const envContent = fs.readFileSync(ENV_FILE, 'utf8');
    const match = envContent.match(/VITE_ENABLE_SEO_INDEXING=(.+)/);
    const isEnabled = match && match[1] === 'true';
    
    console.log(`\n📊 Current SEO Status:`);
    console.log(`   Environment: ${isEnabled ? '🟢 Production (Indexing ENABLED)' : '🔴 Development (Indexing DISABLED)'}`);
    console.log(`   VITE_ENABLE_SEO_INDEXING: ${isEnabled ? 'true' : 'false'}`);
    
    return isEnabled;
  } catch (error) {
    console.log('❌ Could not read .env file');
    return false;
  }
}

function main() {
  const command = process.argv[2];
  
  console.log('🚀 Opine India SEO Toggle Script\n');
  
  switch (command) {
    case 'dev':
    case 'development':
      console.log('🔴 Switching to DEVELOPMENT mode (No indexing)...');
      updateEnvFile(ENV_FILE, 'false');
      updateRobotsFile(false);
      console.log('\n✅ Development mode activated! Search engines are blocked.');
      break;
      
    case 'prod':
    case 'production':
      console.log('🟢 Switching to PRODUCTION mode (Indexing enabled)...');
      updateEnvFile(ENV_FILE, 'true');
      updateRobotsFile(true);
      console.log('\n✅ Production mode activated! Search engines can index your site.');
      break;
      
    case 'status':
      getCurrentStatus();
      break;
      
    default:
      console.log('Usage:');
      console.log('  node scripts/toggle-seo.js dev     # Enable development mode (no indexing)');
      console.log('  node scripts/toggle-seo.js prod    # Enable production mode (indexing)');
      console.log('  node scripts/toggle-seo.js status  # Check current status');
      console.log('\nCurrent status:');
      getCurrentStatus();
      break;
  }
}

main();
