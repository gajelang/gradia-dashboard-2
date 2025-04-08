const fs = require('fs');
const path = require('path');

// Function to recursively find all files in a directory
function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findFiles(filePath, fileList);
    } else if (stat.isFile() && (filePath.endsWith('.js') || filePath.endsWith('.ts') || filePath.endsWith('.tsx'))) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Function to update imports in a file
function updateImports(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if the file imports from @/lib/auth
    if (content.includes('from "@/lib/auth"') || content.includes("from '@/lib/auth'")) {
      // Replace the imports
      content = content.replace(/from ["']@\/lib\/auth["']/g, 'from "@/lib/auth/auth"');
      
      // Write the updated content back to the file
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated imports in ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error);
    return false;
  }
}

// Main function
function main() {
  const apiDir = path.join(__dirname, 'src', 'app', 'api');
  const libDir = path.join(__dirname, 'src', 'lib');
  
  // Find all files in the api and lib directories
  const apiFiles = findFiles(apiDir);
  const libFiles = findFiles(libDir);
  const allFiles = [...apiFiles, ...libFiles];
  
  // Update imports in all files
  let updatedCount = 0;
  
  allFiles.forEach(file => {
    if (updateImports(file)) {
      updatedCount++;
    }
  });
  
  console.log(`Updated imports in ${updatedCount} files.`);
}

main();
