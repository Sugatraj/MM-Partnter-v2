import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OWNERS_STORAGE_KEY = 'owners';

export function useOwners() {
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadOwners = async () => {
    try {
      setLoading(true);
      const ownersData = await AsyncStorage.getItem(OWNERS_STORAGE_KEY);
      setOwners(ownersData ? JSON.parse(ownersData) : []);
    } catch (err) {
      setError('Failed to load owners');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Create
  const createOwner = async (newOwner) => {
    try {
      setLoading(true);
      const ownerWithId = {
        ...newOwner,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      };
      
      const updatedOwners = [...owners, ownerWithId];
      await AsyncStorage.setItem(OWNERS_STORAGE_KEY, JSON.stringify(updatedOwners));
      setOwners(updatedOwners);
      return ownerWithId;
    } catch (err) {
      setError('Failed to create owner');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Read
  const getOwner = async (id) => {
    try {
      const owner = owners.find(o => o.id === id);
      if (!owner) throw new Error('Owner not found');
      return owner;
    } catch (err) {
      setError('Failed to get owner');
      throw err;
    }
  };

  // Update
  const updateOwner = async (id, updatedData) => {
    try {
      setLoading(true);
      const updatedOwners = owners.map(owner =>
        owner.id === id ? { ...owner, ...updatedData, updatedAt: new Date().toISOString() } : owner
      );
      
      await AsyncStorage.setItem(OWNERS_STORAGE_KEY, JSON.stringify(updatedOwners));
      setOwners(updatedOwners);
      return updatedOwners.find(o => o.id === id);
    } catch (err) {
      setError('Failed to update owner');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete
  const deleteOwner = async (id) => {
    try {
      setLoading(true);
      const updatedOwners = owners.filter(owner => owner.id !== id);
      await AsyncStorage.setItem(OWNERS_STORAGE_KEY, JSON.stringify(updatedOwners));
      setOwners(updatedOwners);
    } catch (err) {
      setError('Failed to delete owner');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOwners();
  }, []);

  return {
    owners,
    loading,
    error,
    createOwner,
    getOwner,
    updateOwner,
    deleteOwner,
    refreshOwners: loadOwners,
  };
} 