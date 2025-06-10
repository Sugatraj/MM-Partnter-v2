import React, { useEffect } from 'react';
import { checkForUpdates } from '../services/updateService';

const UpdateChecker = ({ onUpdateAvailable }) => {
  useEffect(() => {
    const checkUpdate = async () => {
      const hasUpdate = await checkForUpdates();
      if (hasUpdate) {
        onUpdateAvailable();
      }
    };
    
    checkUpdate();
  }, []);

  // Return null as this is just a functional component
  return null;
};

export default UpdateChecker; 