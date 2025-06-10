// Set to true for testing, false for production
const IS_TESTING = true; // Only use this for API endpoint selection

// Add proper build type detection
const isDevelopmentBuild = __DEV__;  // This is the proper way to detect development builds

// API Version
const API_VERSION = "v2";  // Update this to "v2" for the new URL pattern

// Base URLs for testing and production (without trailing slashes)
const TESTING_BASE_URL = `https://men4u.xyz/${API_VERSION}`;
const PRODUCTION_BASE_URL = `https://menusmitra.xyz/${API_VERSION}`;

// App Version Configuration
const APP_VERSION = "1.3"; // Current app version using semantic versioning
const APP_TYPE = "partner_app";

// Helper function to join URL parts without double slashes
const joinURL = (...parts) => {
  return parts
    .map(part => part.replace(/^\/+|\/+$/g, '')) // Remove leading/trailing slashes
    .filter(part => part.length > 0)             // Remove empty parts
    .join('/');
};

// Base API URLs without trailing slashes
const BASE_URL = IS_TESTING ? TESTING_BASE_URL : PRODUCTION_BASE_URL;

// Updated URL patterns for v2
const PARTNER_BASE_URL = `${BASE_URL}/partner`;  // Changed from partner_api to partner
const COMMON_BASE_URL = `${BASE_URL}/common`;    // Changed from common_api to common

// Version check endpoint
const VERSION_CHECK_ENDPOINT = `${COMMON_BASE_URL}/check_version`;

// Print debug information
if (__DEV__) {
  console.log('=== API Configuration ===');
  console.log('Environment:', IS_TESTING ? 'Testing' : 'Production');
  console.log('Base URL:', BASE_URL);
  console.log('Partner API Base:', PARTNER_BASE_URL);
  console.log('Common API Base:', COMMON_BASE_URL);
  console.log('Version Check Endpoint:', VERSION_CHECK_ENDPOINT);
  console.log('App Version:', APP_VERSION);
  console.log('App Type:', APP_TYPE);
}

// Helper function to compare semantic versions
const compareVersions = (currentVersion, serverVersion) => {
  const current = currentVersion.split('.').map(Number);
  const server = serverVersion.split('.').map(Number);
  
  for (let i = 0; i < 3; i++) {
    if (server[i] > current[i]) return false; // Update needed
    if (server[i] < current[i]) return true;  // No update needed
  }
  return true; // Versions are equal, no update needed
};

export { 
  PARTNER_BASE_URL, 
  COMMON_BASE_URL, 
  APP_VERSION, 
  APP_TYPE,
  VERSION_CHECK_ENDPOINT,
  compareVersions,
  IS_TESTING,
  isDevelopmentBuild,
  joinURL
};