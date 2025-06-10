import React, { useState, useEffect, useCallback } from "react";
import { View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createDrawerNavigator } from "@react-navigation/drawer";
import * as SplashScreen from 'expo-splash-screen';
import BottomTabNavigator from "./navigation/BottomTabNavigator";
import BulkUploadScreen from "./screens/BulkUploadScreen";
import ManageCategory from "./screens/ManageCategory";
import CreateCategory from "./screens/CreateCategory";
import CategoryDetailsScreen from "./screens/CategoryDetailsScreen";
import UpdateCategory from "./screens/UpdateCategory";
import ManageMenus from "./screens/ManageMenus";
import CreateMenu from "./screens/CreateMenu";
import MenuDetails from "./screens/MenuDetails";
import UpdateMenu from "./screens/UpdateMenu";
import ManageSections from "./screens/ManageSections";
import CreateSection from "./screens/CreateSection";
import SectionDetails from "./screens/SectionDetails";
import TableDetails from "./screens/TableDetails";
import UpdateSection from "./screens/UpdateSection";
import Orders from "./screens/Orders";
import OrderDetails from "./screens/OrderDetails";
import LoginScreen from "./screens/LoginScreen";
import VerifyOTPScreen from "./screens/VerifyOTPScreen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Sidebar from "./components/Sidebar";
import DashboardScreen from "./screens/DashboardScreen";
import { setupNotifications, getDeviceToken } from "./utils/notifications";
import { checkAppVersion } from './services/versionCheck';
import UpdateAppModal from './components/UpdateAppModal';
import { IS_TESTING } from './apiConfig';
import * as Updates from 'expo-updates';
import { checkForUpdates } from './services/updateService';
import { setNavigator } from './services/axiosConfig';
import { requestNotificationPermissions, configureNotifications } from './services/notificationService';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

function MainStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Root" component={BottomTabNavigator} />
      <Stack.Screen name="BulkUpload" component={BulkUploadScreen} />
      <Stack.Screen name="ManageCategory" component={ManageCategory} />
      <Stack.Screen name="CreateCategory" component={CreateCategory} />
      <Stack.Screen name="CategoryDetails" component={CategoryDetailsScreen} />
      <Stack.Screen name="UpdateCategory" component={UpdateCategory} />
      <Stack.Screen name="ManageMenus" component={ManageMenus} />
      <Stack.Screen name="CreateMenu" component={CreateMenu} />
      <Stack.Screen name="MenuDetails" component={MenuDetails} />
      <Stack.Screen name="UpdateMenu" component={UpdateMenu} />
      <Stack.Screen name="ManageSections" component={ManageSections} />
      <Stack.Screen name="CreateSection" component={CreateSection} />
      <Stack.Screen name="SectionDetails" component={SectionDetails} />
      <Stack.Screen name="TableDetails" component={TableDetails} />
      <Stack.Screen name="UpdateSection" component={UpdateSection} />
      <Stack.Screen name="Orders" component={Orders} />
      <Stack.Screen name="OrderDetails" component={OrderDetails} />
      <Stack.Screen name="Home" component={DashboardScreen} />
    </Stack.Navigator>
  );
}

function DrawerNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <Sidebar {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          width: "80%",
        },
        drawerPosition: "right",
      }}
    >
      <Drawer.Screen name="MainTabs" component={BottomTabNavigator} />
    </Drawer.Navigator>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState("Login");
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  // const websiteUrl = IS_TESTING ? 'https://men4u.xyz' : 'https://menusmitra.xyz';
  const websiteUrl = 'https://menumitra.com';
  useEffect(() => {
    const setupApp = async () => {
      try {
        // Configure notifications first
        configureNotifications();
        
        // Request permissions without blocking app launch
        await requestNotificationPermissions();
        
        // Check app version first
        const { needsUpdate } = await checkAppVersion();
        
        if (needsUpdate) {
          setShowUpdateModal(true);
          await SplashScreen.hideAsync();
          return;
        }

        // Check for Expo Updates
        if (!__DEV__) {
          const hasUpdate = await checkForUpdates();
          if (hasUpdate) {
            // Update will be automatically applied
            return;
          }
        }

        // Setup notifications
        await setupNotifications();
        await getDeviceToken();

        // Check user data
        const userData = await AsyncStorage.getItem("userData");
        if (userData) {
          setInitialRoute("MainApp");
        }
      } catch (error) {
        console.error('Error during app setup:', error);
      } finally {
        setIsLoading(false);
        await SplashScreen.hideAsync();
      }
    };

    setupApp();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (!isLoading) {
      await SplashScreen.hideAsync();
    }
  }, [isLoading]);

  if (isLoading) {
    return null;
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <NavigationContainer
        ref={(navigator) => setNavigator(navigator)}
      >
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="VerifyOTP" component={VerifyOTPScreen} />
          <Stack.Screen name="MainApp" component={DrawerNavigator} />
        </Stack.Navigator>
      </NavigationContainer>

      <UpdateAppModal
        visible={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        websiteUrl={websiteUrl}
      />
    </View>
  );
}
