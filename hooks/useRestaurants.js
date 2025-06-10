import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RESTAURANTS_STORAGE_KEY = 'restaurants';

export function useRestaurants() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadRestaurants = async () => {
    try {
      setLoading(true);
      const restaurantsData = await AsyncStorage.getItem(RESTAURANTS_STORAGE_KEY);
      const loadedRestaurants = restaurantsData ? JSON.parse(restaurantsData) : [];
      console.log('Loaded restaurants:', loadedRestaurants);
      setRestaurants(loadedRestaurants);
    } catch (err) {
      console.error('Error loading restaurants:', err);
      setError('Failed to load restaurants');
    } finally {
      setLoading(false);
    }
  };

  // Create
  const createRestaurant = async (newRestaurant) => {
    try {
      setLoading(true);
      const restaurantWithId = {
        ...newRestaurant,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        hotelStatus: newRestaurant.hotelStatus ?? true,
        isOpen: newRestaurant.isOpen ?? true,
      };
      
      // First get existing restaurants from storage
      const existingData = await AsyncStorage.getItem(RESTAURANTS_STORAGE_KEY);
      const existingRestaurants = existingData ? JSON.parse(existingData) : [];
      
      const updatedRestaurants = [...existingRestaurants, restaurantWithId];
      await AsyncStorage.setItem(RESTAURANTS_STORAGE_KEY, JSON.stringify(updatedRestaurants));
      
      // Update local state
      setRestaurants(updatedRestaurants);
      
      console.log('Created restaurant:', restaurantWithId);
      return restaurantWithId;
    } catch (err) {
      console.error('Error in createRestaurant:', err);
      setError('Failed to create restaurant');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Read
  const getRestaurant = async (id) => {
    try {
      console.log('Getting restaurant with ID:', id);
      console.log('Available restaurants:', restaurants);
      
      const restaurant = restaurants.find(r => r.id === id);
      
      if (!restaurant) {
        console.log('Restaurant not found in state');
        // Try to fetch from AsyncStorage directly
        const restaurantsData = await AsyncStorage.getItem(RESTAURANTS_STORAGE_KEY);
        const allRestaurants = restaurantsData ? JSON.parse(restaurantsData) : [];
        const restaurantFromStorage = allRestaurants.find(r => r.id === id);
        
        if (!restaurantFromStorage) {
          throw new Error(`Restaurant with ID ${id} not found`);
        }
        
        return restaurantFromStorage;
      }
      
      return restaurant;
    } catch (err) {
      console.error('Error in getRestaurant:', err);
      throw err;
    }
  };

  // Update
  const updateRestaurant = async (id, updatedData) => {
    try {
      setLoading(true);
      const updatedRestaurants = restaurants.map(restaurant =>
        restaurant.id === id 
          ? { ...restaurant, ...updatedData, updatedAt: new Date().toISOString() } 
          : restaurant
      );
      
      await AsyncStorage.setItem(RESTAURANTS_STORAGE_KEY, JSON.stringify(updatedRestaurants));
      setRestaurants(updatedRestaurants);
      return updatedRestaurants.find(r => r.id === id);
    } catch (err) {
      setError('Failed to update restaurant');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete
  const deleteRestaurant = async (id) => {
    try {
      setLoading(true);
      const updatedRestaurants = restaurants.filter(restaurant => restaurant.id !== id);
      await AsyncStorage.setItem(RESTAURANTS_STORAGE_KEY, JSON.stringify(updatedRestaurants));
      setRestaurants(updatedRestaurants);
    } catch (err) {
      setError('Failed to delete restaurant');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Get restaurants by owner
  const getRestaurantsByOwner = async (ownerId) => {
    try {
      return restaurants.filter(restaurant => restaurant.owner === ownerId);
    } catch (err) {
      setError('Failed to get restaurants by owner');
      throw err;
    }
  };

  useEffect(() => {
    loadRestaurants();
  }, []);

  return {
    restaurants,
    loading,
    error,
    createRestaurant,
    getRestaurant,
    updateRestaurant,
    deleteRestaurant,
    getRestaurantsByOwner,
    refreshRestaurants: loadRestaurants,
  };
}