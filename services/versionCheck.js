import { VERSION_CHECK_ENDPOINT, APP_VERSION, compareVersions } from '../apiConfig';

export const checkAppVersion = async () => {
  try {
    const response = await fetch(VERSION_CHECK_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_type: 'partner_app'
      })
    });

    const data = await response.json();

    if (data.st === 1 && data.version) {
      // Compare versions using the utility from apiConfig
      const isVersionValid = compareVersions(APP_VERSION, data.version);
      return {
        needsUpdate: !isVersionValid,
        serverVersion: data.version,
      };
    }

    // If response format is invalid, assume no update needed
    return { needsUpdate: false, serverVersion: APP_VERSION };
  } catch (error) {
    console.error('Version check failed:', error);
    // In case of error, allow app to continue
    return { needsUpdate: false, serverVersion: APP_VERSION };
  }
}; 