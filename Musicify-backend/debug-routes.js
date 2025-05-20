import express from 'express';
import { pathToRegexp } from 'path-to-regexp';

// Create a function to test path patterns
function testPath(path) {
  try {
    pathToRegexp(path);
    console.log(`✅ Valid path: ${path}`);
    return true;
  } catch (error) {
    console.error(`❌ Invalid path: ${path}`);
    console.error(error.message);
    return false;
  }
}

// Test common patterns
console.log("Testing common path patterns:");
testPath('/api/song');
testPath('/api/song/:id');

// Correct wildcard patterns
console.log("\nTesting correct wildcard patterns:");
testPath('/api/clerk/:wildcard(.*)'); // This is the correct way to use a wildcard
testPath('/api/clerk/:path+');        // This matches one or more path segments

// Incorrect wildcard patterns
console.log("\nTesting incorrect wildcard patterns:");
testPath('/api/clerk/*');             // This is incorrect
testPath('/api/clerk/:path*');        // This is incorrect

console.log("\nIf you need to use wildcards in Express routes, use the correct syntax:");
console.log("1. For a catch-all route: '/api/clerk/:wildcard(.*)'");
console.log("2. For one or more segments: '/api/clerk/:path+'");
