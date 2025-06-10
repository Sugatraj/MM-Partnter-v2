import * as Updates from 'expo-updates';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_VERSION, isDevelopmentBuild } from '../apiConfig';
import Constants from 'expo-constants';

let isCheckingForUpdate = false;
const UPDATE_CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 5000; // 5 seconds

// Get the update channel from app.json extra
const UPDATE_CHANNEL = Constants.expoConfig?.extra?.updateChannel || 'preview';

export const shouldCheckUpdate = async () => {
  try {
    const lastCheck = await AsyncStorage.getItem('lastUpdateCheck');
    if (!lastCheck) return true;
    
    const timeSinceLastCheck = Date.now() - parseInt(lastCheck);
    return timeSinceLastCheck > UPDATE_CHECK_INTERVAL;
  } catch (error) {
    return true;
  }
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const retryOperation = async (operation, retryCount = 0) => {
  try {
    return await operation();
  } catch (error) {
    if (retryCount < MAX_RETRY_ATTEMPTS) {
      await delay(RETRY_DELAY);
      return retryOperation(operation, retryCount + 1);
    }
    throw error;
  }
};

export const checkForUpdates = async (silent = false) => {
  if (isCheckingForUpdate) return false;
  
  try {
    isCheckingForUpdate = true;

    // Only check if we're running in a production build
    if (isDevelopmentBuild || !Updates.isEmbeddedLaunch) {
      if (!silent) {
        console.log('Update checking skipped: Development environment');
      }
      return false;
    }

    // Log current version info
    console.log('Current Version Info:', {
      appVersion: APP_VERSION,
      runtimeVersion: Updates.runtimeVersion,
      updateId: Updates.updateId,
      isEmbeddedLaunch: Updates.isEmbeddedLaunch,
      channel: UPDATE_CHANNEL
    });

    const update = await retryOperation(async () => {
      return await Updates.checkForUpdateAsync();
    });
    
    if (update.isAvailable) {
      // Store update metadata
      await AsyncStorage.setItem('lastUpdateCheck', Date.now().toString());
      await AsyncStorage.setItem('lastUpdateAvailable', JSON.stringify({
        timestamp: Date.now(),
        channel: UPDATE_CHANNEL,
        currentVersion: APP_VERSION
      }));

      return new Promise((resolve) => {
        Alert.alert(
          "Update Available",
          `Current Version: ${APP_VERSION}\nChannel: ${UPDATE_CHANNEL}\nA new version is available. Would you like to update now?`,
          [
            {
              text: "No",
              style: "cancel",
              onPress: async () => {
                await AsyncStorage.setItem('lastUpdateSkipped', JSON.stringify({
                  timestamp: Date.now(),
                  channel: UPDATE_CHANNEL,
                  version: APP_VERSION
                }));
                resolve(false);
              }
            },
            {
              text: "Yes",
              onPress: async () => {
                try {
                  let downloadProgress = 0;
                  const progressAlert = Alert.alert(
                    "Downloading Update",
                    `Progress: 0%\nChannel: ${UPDATE_CHANNEL}`,
                    [],
                    { cancelable: false }
                  );

                  const downloadUpdate = async () => {
                    try {
                      const result = await Updates.fetchUpdateAsync((progress) => {
                        const newProgress = Math.round(progress.totalBytesWritten / progress.totalBytesExpected * 100);
                        if (newProgress !== downloadProgress) {
                          downloadProgress = newProgress;
                          progressAlert.setMessage(`Progress: ${downloadProgress}%\nChannel: ${UPDATE_CHANNEL}`);
                        }
                      });
                      return result;
                    } catch (error) {
                      console.error('Download error:', error);
                      throw error;
                    }
                  };

                  await retryOperation(downloadUpdate);
                  
                  // Track successful update
                  await AsyncStorage.setItem('lastUpdateInstalled', JSON.stringify({
                    timestamp: Date.now(),
                    channel: UPDATE_CHANNEL,
                    fromVersion: APP_VERSION
                  }));
                  
                  Alert.alert(
                    "Success",
                    `Update installed! App will now restart.\nChannel: ${UPDATE_CHANNEL}`,
                    [
                      {
                        text: "OK",
                        onPress: async () => {
                          try {
                            await Updates.reloadAsync();
                          } catch (reloadError) {
                            console.error('Error reloading app:', reloadError);
                            Alert.alert(
                              "Error",
                              "Failed to restart the app. Please close and reopen the app.",
                              [{ text: "OK" }]
                            );
                          }
                        }
                      }
                    ],
                    { cancelable: false }
                  );
                  resolve(true);
                } catch (error) {
                  console.error('Error downloading update:', error);
                  Alert.alert(
                    "Error",
                    `Failed to download the update. Please check your internet connection and try again.\nChannel: ${UPDATE_CHANNEL}`,
                    [{ text: "OK" }]
                  );
                  resolve(false);
                }
              }
            }
          ],
          { cancelable: false }
        );
      });
    }
    return false;
  } catch (error) {
    console.error('Error checking for updates:', error);
    if (!silent) {
      Alert.alert(
        "Error",
        `Failed to check for updates. Please try again later.\nChannel: ${UPDATE_CHANNEL}`,
        [{ text: "OK" }]
      );
    }
    return false;
  } finally {
    isCheckingForUpdate = false;
    // Update the last check timestamp
    await AsyncStorage.setItem('lastUpdateCheck', Date.now().toString());
  }
};

export const getCurrentUpdateStatus = async () => {
  try {
    return {
      isEmulator: !Updates.isEmbeddedLaunch,
      updateId: Updates.updateId,
      runtimeVersion: Updates.runtimeVersion,
      channel: UPDATE_CHANNEL,
      isUpdatePending: await Updates.isUpdatePendingAsync(),
      manifest: await Updates.getUpdateGroupAsync(),
      lastUpdateCheck: await AsyncStorage.getItem('lastUpdateCheck'),
      lastUpdateInstalled: await AsyncStorage.getItem('lastUpdateInstalled')
    };
  } catch (error) {
    console.error('Error getting update status:', error);
    return null;
  }
}; 
