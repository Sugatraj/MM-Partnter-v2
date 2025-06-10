import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FontAwesome5, FontAwesome6 } from '@expo/vector-icons';
import { CommonActions, useNavigation } from '@react-navigation/native';
import DashboardScreen from '../screens/DashboardScreen';
import RestaurantStack from './RestaurantStack';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

function BottomTabNavigator() {
  const navigation = useNavigation();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#67B279",
        tabBarInactiveTintColor: "gray",
        tabBarStyle: {
          height: 60,
          padding: 5,
          justifyContent: 'center',
          paddingHorizontal: 60,
        },
        tabBarLabelStyle: {
          paddingBottom: 5,
        },
        tabBarItemStyle: {
          flex: 1,
          maxWidth: 120,
        },
      }}
      screenListeners={({ navigation, route }) => ({
        tabPress: (e) => {
          e.preventDefault();
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: route.name, params: route.params }],
            })
          );
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="RestaurantStack"
        component={RestaurantStack}
        options={({ route }) => ({
          tabBarButton: () => null,
          tabBarStyle: {
            display: route.name === 'ManageCategory' || 
                    route.name === 'ManageMenus' || 
                    route.name === 'ManageSections' || 
                    route.name === 'Orders' 
                    ? 'none' 
                    : 'flex',
            height: 60,
            padding: 5,
            justifyContent: 'center',
            paddingHorizontal: 60,
          },
        })}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => (
            <FontAwesome6 name="user-large" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default BottomTabNavigator; 