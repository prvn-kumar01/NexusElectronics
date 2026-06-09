const fs = require('fs');
const path = require('path');

const directories = [
  'c:/Praveen/MERN-Stack-Ecommerce-App/src',
  'c:/Praveen/MERN-Stack-Ecommerce-App/backend'
];

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Replace variations
  content = content.replace(/FUSION ELECTRONICS/g, 'NEXUS ELECTRONICS');
  content = content.replace(/Fusion Electronics/g, 'Nexus Electronics');
  content = content.replace(/fusion electronics/g, 'nexus electronics');
  
  content = content.replace(/Fusion/g, 'Nexus');
  content = content.replace(/fusion/g, 'nexus');
  content = content.replace(/FUSION/g, 'NEXUS');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated:', filePath);
  }
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (/\.(js|jsx|json)$/.test(fullPath)) {
      if (fullPath.includes('package-lock.json')) continue;
      replaceInFile(fullPath);
    }
  }
}

directories.forEach(processDirectory);
console.log('Done replacing names.');
