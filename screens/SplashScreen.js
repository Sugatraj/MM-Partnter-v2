import React, { useEffect } from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';
import { checkForUpdates, shouldCheckUpdate } from '../services/updateService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SplashScreen = ({ navigation }) => {
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Only check for updates in production and if enough time has passed
        if (!__DEV__ && await shouldCheckUpdate()) {
          // await checkForUpdates(true);
          await AsyncStorage.setItem('lastUpdateCheck', Date.now().toString());
        }
        
        // Check if user is logged in
        const userData = await AsyncStorage.getItem('userData');
        
        // Navigate after minimum splash duration
        setTimeout(() => {
          if (userData) {
            navigation.replace('MainTabs');
          } else {
            navigation.replace('Login');
          }
        }, 2000); // 2 seconds minimum splash duration
      } catch (error) {
        console.error('Error during app initialization:', error);
        // Navigate to login on error
        navigation.replace('Login');
      }
    };

    initializeApp();
  }, []);

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/menumitra-logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: Dimensions.get('window').width * 0.5,
    height: Dimensions.get('window').width * 0.5,
  },
});

export default SplashScreen; 