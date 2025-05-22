#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Define paths to each project
const backendPath = path.join(__dirname, 'Musicify-backend');
const adminPath = path.join(__dirname, 'Musicify-admin');
const frontendPath = path.join(__dirname, 'Musicify-frontend');

// Function to run npm command in specified directory
function runCommand(directory, command, args) {
  console.log(`Starting ${command} in ${path.basename(directory)}...`);
  
  const process = spawn(command, args, { 
    cwd: directory,
    shell: true,
    stdio: 'inherit'
  });
  
  process.on('error', (error) => {
    console.error(`Error starting ${command} in ${path.basename(directory)}: ${error.message}`);
  });
  
  return process;
}

// Start all services
console.log('Starting all Musicify services...');
runCommand(backendPath, 'npm', ['run', 'server']);
runCommand(adminPath, 'npm', ['run', 'dev']);
runCommand(frontendPath, 'npm', ['run', 'dev']);

console.log('\nAll services started! Use Ctrl+C to stop all processes.');