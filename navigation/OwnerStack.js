import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import ManageRestaurantOwner from '../screens/ManageRestaurantOwner';
import ViewOwnerScreen from '../screens/ViewOwnerScreen';
import CreateOwnerScreen from '../screens/CreateOwnerScreen';
import UpdateOwnerScreen from '../screens/UpdateOwnerScreen';

const Stack = createStackNavigator();

export default function OwnerStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="ManageOwnerList" 
        component={ManageRestaurantOwner}
        options={{
          title: "Manage Owners",
          headerShown: false // Hide header for list screen as it's shown by tab navigator
        }}
      />
      <Stack.Screen 
        name="ViewOwner" 
        component={ViewOwnerScreen}
        options={{
          title: "Owner Details",
          headerShown: false
        }}
      />
      <Stack.Screen 
        name="CreateOwner" 
        component={CreateOwnerScreen}
        options={{
          title: "Add Owner",
          headerShown: false
        }}
      />
      <Stack.Screen 
        name="UpdateOwner" 
        component={UpdateOwnerScreen}
        options={{
          title: "Update Owner",
          headerShown: false
        }}
      />
    </Stack.Navigator>
  );
} 