/**
 * Build script for Tactical Voice Desktop
 * 
 * Usage:
 *   node scripts/build-prod.js https://your-server.com         # Build only
 *   node scripts/build-prod.js https://your-server.com publish # Build and publish to GitHub
 *   npm run dist:prod -- https://your-server.com
 *   npm run publish:prod -- https://your-server.com
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get args
const args = process.argv.slice(2);
const serverUrl = args.find(arg => arg.startsWith('http'));
const shouldPublish = args.includes('publish');

if (!serverUrl) {
  console.error('\x1b[31mError: Server URL is required!\x1b[0m');
  console.log('\nUsage:');
  console.log('  node scripts/build-prod.js https://your-server.com');
  console.log('  node scripts/build-prod.js https://your-server.com publish');
  console.log('  npm run dist:prod -- https://your-server.com');
  process.exit(1);
}

// Validate URL
try {
  new URL(serverUrl);
} catch (e) {
  console.error(`\x1b[31mError: Invalid URL "${serverUrl}"\x1b[0m`);
  process.exit(1);
}

console.log(`\n\x1b[36m🔧 Building Tactical Voice with server: ${serverUrl}\x1b[0m`);
if (shouldPublish) {
  console.log('\x1b[33m📤 Will publish to GitHub after build\x1b[0m');
}
console.log('');

const envProdPath = path.join(__dirname, '..', 'src', 'environments', 'environment.prod.ts');

// Read the template
const envContent = `export const environment = {
  production: true,
  serverUrl: '${serverUrl}'
};
`;

// Write the environment file
fs.writeFileSync(envProdPath, envContent);
console.log(`✅ Updated environment.prod.ts with serverUrl: ${serverUrl}`);

// Run the build
try {
  console.log('\n📦 Building Angular app...');
  execSync('npm run build:angular:prod', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  
  console.log('\n⚡ Building Electron...');
  execSync('npm run build:electron', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  
  if (shouldPublish) {
    console.log('\n📤 Publishing to GitHub...');
    console.log('\x1b[33mNote: Set GH_TOKEN environment variable with your GitHub Personal Access Token\x1b[0m');
    execSync('npx electron-builder --win --publish always', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    console.log('\n\x1b[32m✅ Published to GitHub Releases!\x1b[0m');
  } else {
    console.log('\n📦 Packaging for Windows...');
    execSync('npx electron-builder --win', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    console.log('\n\x1b[32m✅ Build complete!\x1b[0m');
    console.log(`\n📁 Output: ${path.join(__dirname, '..', 'release')}`);
  }
  
} catch (error) {
  console.error('\x1b[31m❌ Build failed!\x1b[0m');
  process.exit(1);
}
