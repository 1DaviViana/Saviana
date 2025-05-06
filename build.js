#!/usr/bin/env node

import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure the dist directory exists
async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  } catch (err) {
    if (err.code !== 'EEXIST') {
      console.error(`❌ Failed to create directory ${dir}:`, err);
      throw err;
    }
  }
}

// Execute a command and return the promise
function execCommand(command) {
  return new Promise((resolve, reject) => {
    console.log(`🔄 Executing: ${command}`);
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Error: ${error.message}`);
        console.error(`stderr: ${stderr}`);
        reject(error);
        return;
      }
      if (stderr) {
        console.warn(`⚠️ Command produced stderr: ${stderr}`);
      }
      console.log(`✅ Command success: ${stdout}`);
      resolve(stdout);
    });
  });
}

async function main() {
  try {
    // Create dist directories
    const distDir = path.join(__dirname, 'dist');
    const publicDir = path.join(distDir, 'public');
    
    await ensureDir(distDir);
    await ensureDir(publicDir);
    
    // Build frontend with Vite
    console.log('🔨 Building frontend with Vite...');
    await execCommand('NODE_ENV=production vite build');
    
    // Build backend with esbuild
    console.log('🔨 Building backend with esbuild...');
    await execCommand('NODE_ENV=production esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist');
    
    // Create .nojekyll file for GitHub Pages
    console.log('📝 Creating .nojekyll file...');
    await fs.writeFile(path.join(publicDir, '.nojekyll'), '');
    
    console.log('🎉 Build completed successfully!');
  } catch (error) {
    console.error('💥 Build failed:', error);
    process.exit(1);
  }
}

main();