import AsyncStorage from '@react-native-async-storage/async-storage';

const OWNERS_STORAGE_KEY = 'owners';

// Utility functions
const getOwners = async () => {
  try {
    const owners = await AsyncStorage.getItem(OWNERS_STORAGE_KEY);
    return owners ? JSON.parse(owners) : [];
  } catch (error) {
    console.error('Error fetching owners:', error);
    return [];
  }
};

const saveOwners = async (owners) => {
  try {
    await AsyncStorage.setItem(OWNERS_STORAGE_KEY, JSON.stringify(owners));
  } catch (error) {
    console.error('Error saving owners:', error);
  }
};

// Service functions
export const ownerService = {
  // Create
  createOwner: async (ownerData) => {
    try {
      const owners = await getOwners();
      const newOwner = {
        id: Date.now().toString(), // temporary ID generation
        ...ownerData,
        subscription: {
          remainingDays: '-',
          hotelsAllowed: 0,
        },
        hotelsOwned: 0,
      };
      
      owners.push(newOwner);
      await saveOwners(owners);
      return newOwner;
    } catch (error) {
      console.error('Error creating owner:', error);
      throw error;
    }
  },

  // Read all
  getAllOwners: async () => {
    try {
      return await getOwners();
    } catch (error) {
      console.error('Error getting owners:', error);
      throw error;
    }
  },

  // Read one
  getOwnerById: async (id) => {
    try {
      const owners = await getOwners();
      return owners.find(owner => owner.id === id);
    } catch (error) {
      console.error('Error getting owner:', error);
      throw error;
    }
  },

  // Update
  updateOwner: async (id, updateData) => {
    try {
      const owners = await getOwners();
      const index = owners.findIndex(owner => owner.id === id);
      
      if (index !== -1) {
        owners[index] = { ...owners[index], ...updateData };
        await saveOwners(owners);
        return owners[index];
      }
      throw new Error('Owner not found');
    } catch (error) {
      console.error('Error updating owner:', error);
      throw error;
    }
  },

  // Delete
  deleteOwner: async (id) => {
    try {
      const owners = await getOwners();
      const filteredOwners = owners.filter(owner => owner.id !== id);
      await saveOwners(filteredOwners);
      return true;
    } catch (error) {
      console.error('Error deleting owner:', error);
      throw error;
    }
  }
}; 