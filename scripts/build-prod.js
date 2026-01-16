const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get arguments
const args = process.argv.slice(2);
const shouldPublish = args.includes('publish');
const serverUrl = args.find(arg => arg.startsWith('http')) || 'http://localhost:3001';

console.log('🔧 Building production version...');
console.log(`📡 Server URL: ${serverUrl}`);
console.log(`📤 Publish: ${shouldPublish ? 'Yes' : 'No'}`);

// Path to environment file
const envProdPath = path.join(__dirname, '..', 'src', 'environments', 'environment.prod.ts');

// Read current environment file
let envContent = fs.readFileSync(envProdPath, 'utf8');

// Update serverUrl
envContent = envContent.replace(
  /serverUrl:\s*['"][^'"]*['"]/,
  `serverUrl: '${serverUrl}'`
);

// Write updated environment file
fs.writeFileSync(envProdPath, envContent);
console.log('✅ Updated environment.prod.ts');

try {
  // Build Angular
  console.log('\n📦 Building Angular...');
  execSync('npm run build:angular:prod', { stdio: 'inherit', cwd: path.join(__dirname, '..') });

  // Build Electron
  console.log('\n⚡ Building Electron...');
  execSync('npm run build:electron', { stdio: 'inherit', cwd: path.join(__dirname, '..') });

  // Build/Publish with electron-builder
  if (shouldPublish) {
    console.log('\n📤 Publishing to GitHub...');
    console.log('Note: Set GH_TOKEN environment variable with your GitHub Personal Access Token');
    execSync('npx electron-builder --win --publish always', { 
      stdio: 'inherit', 
      cwd: path.join(__dirname, '..'),
      env: { ...process.env }
    });
  } else {
    console.log('\n🏗️ Building installer...');
    execSync('npx electron-builder --win', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  }

  console.log('\n✅ Build completed successfully!');
  console.log(`📁 Output: apps/desktop/release/`);
  
} catch (error) {
  console.error('\n❌ Build failed!');
  process.exit(1);
}
