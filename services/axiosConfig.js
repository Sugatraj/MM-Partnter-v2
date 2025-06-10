import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';

let navigationRef;

export const setNavigator = (ref) => {
  navigationRef = ref;
};

const resetToLogin = () => {
  if (navigationRef) {
    navigationRef.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      })
    );
  }
};

const axiosInstance = axios.create();

// Request interceptor to add auth token
axiosInstance.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 errors
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 || error.response?.data?.st === 401) {
      // Clear stored tokens and user data
      await AsyncStorage.multiRemove(['accessToken', 'userData']);
      
      // Reset navigation stack to login
      resetToLogin();
      
      return Promise.reject(new Error('Session expired. Please login again.'));
    }
    return Promise.reject(error);
  }
);

export default axiosInstance; 