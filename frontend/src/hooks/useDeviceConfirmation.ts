import { useContext } from 'react';
import { DeviceConfirmationContext } from '../context/DeviceConfirmationContext';

export const useDeviceConfirmation = () => {
  const context = useContext(DeviceConfirmationContext);
  if (context === undefined) {
    throw new Error('useDeviceConfirmation must be used within a DeviceConfirmationProvider');
  }
  return context;
};
