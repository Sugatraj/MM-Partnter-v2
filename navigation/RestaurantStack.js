import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import ManageRestaurants from '../screens/ManageRestaurants';
import CreateRestaurant from '../screens/CreateRestaurant';
import ViewRestaurantScreen from '../screens/ViewRestaurantScreen';
import UpdateRestaurantScreen from '../screens/UpdateRestaurantScreen';
import RestaurantDetailsScreen from '../screens/RestaurantDetailsScreen';
import BulkUploadScreen from '../screens/BulkUploadScreen';
import ManageCategory from '../screens/ManageCategory';
import CategoryDetailsScreen from '../screens/CategoryDetailsScreen';
import CreateCategory from '../screens/CreateCategory';
import ManageMenus from '../screens/ManageMenus';
import MenuDetails from '../screens/MenuDetails';
import CreateMenu from '../screens/CreateMenu';
import UpdateMenu from '../screens/UpdateMenu';
import ManageSections from '../screens/ManageSections';
import SectionDetails from '../screens/SectionDetails';
import CreateSection from '../screens/CreateSection';
import UpdateSection from '../screens/UpdateSection';
import TableDetails from '../screens/TableDetails';
import Orders from '../screens/Orders';
import OrderDetails from '../screens/OrderDetails';
import ViewOwnerScreen from '../screens/ViewOwnerScreen';
import UpdateCategory from '../screens/UpdateCategory';

const Stack = createStackNavigator();

export default function RestaurantStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen 
        name="ManageRestaurantList" 
        component={ManageRestaurants}
      />
      <Stack.Screen 
        name="CreateRestaurant" 
        component={CreateRestaurant}
      />
      <Stack.Screen 
        name="ViewRestaurant" 
        component={RestaurantDetailsScreen}
      />
      <Stack.Screen 
        name="UpdateRestaurant" 
        component={UpdateRestaurantScreen}
        initialParams={{ restaurant: null }}
      />
      <Stack.Screen 
        name="ViewOwner" 
        component={ViewOwnerScreen}
      />
      <Stack.Screen 
        name="BulkUpload" 
        component={BulkUploadScreen}
      />
      <Stack.Screen 
        name="ManageCategory" 
        component={ManageCategory}
      />
      <Stack.Screen 
        name="CategoryDetails" 
        component={CategoryDetailsScreen}
      />
      <Stack.Screen 
        name="UpdateCategory" 
        component={UpdateCategory}
      />
      <Stack.Screen 
        name="CreateCategory" 
        component={CreateCategory}
      />
      <Stack.Screen 
        name="ManageMenus" 
        component={ManageMenus}
      />
      <Stack.Screen 
        name="MenuDetails" 
        component={MenuDetails}
      />
      <Stack.Screen 
        name="CreateMenu" 
        component={CreateMenu}
      />
      <Stack.Screen 
        name="UpdateMenu" 
        component={UpdateMenu}
      />
      <Stack.Screen 
        name="ManageSections" 
        component={ManageSections}
      />
      <Stack.Screen 
        name="SectionDetails" 
        component={SectionDetails}
      />
      <Stack.Screen 
        name="UpdateSection" 
        component={UpdateSection}
      />
      <Stack.Screen 
        name="CreateSection" 
        component={CreateSection}
      />
      <Stack.Screen 
        name="TableDetails" 
        component={TableDetails}
      />
      <Stack.Screen 
        name="Orders" 
        component={Orders}
      />
      <Stack.Screen 
        name="OrderDetails" 
        component={OrderDetails}
      />

    </Stack.Navigator>
  );
} 