#!/usr/bin/env node

/**
 * Development server with automatic CSS injection
 * Runs CSS injection first, then starts Eleventy dev server
 */

import { spawn } from 'child_process';
import { autoInjectCSSQuiet } from './component-bundler.js';

try {
  // Run initial CSS injection
  await autoInjectCSSQuiet();
  
  console.log('\n🔥 Starting Eleventy dev server...\n');
  
  // Start Eleventy dev server
  const eleventy = spawn('npx', ['@11ty/eleventy', '--serve'], {
    stdio: 'inherit',
    shell: true
  });
  
  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down dev server...');
    eleventy.kill('SIGINT');
    process.exit(0);
  });
  
} catch (error) {
  console.error('❌ Failed to start dev server:', error.message);
  process.exit(1);
}