import { execSync } from 'child_process';

try {
  console.log('--- Starting Build Process ---');
  
  console.log('1. Generating Prisma Client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  console.log('2. Compiling TypeScript...');
  execSync('npx tsc -p tsconfig.json', { stdio: 'inherit' });
  
  console.log('--- Build Completed Successfully ---');
} catch (error) {
  console.error('--- Build Failed ---');
  process.exit(1);
}
