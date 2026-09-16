import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../services/api';
import { isRealUserId } from '../utils/constants';

export type TemperatureUnit = 'celsius' | 'fahrenheit';

interface TemperatureUnitContextType {
  unit: TemperatureUnit;
  setUnit: (unit: TemperatureUnit) => void;
  convert: (celsius: number) => number;
  format: (celsius: number, fractionDigits?: number) => string;
}

export const celsiusToFahrenheit = (celsius: number): number => (celsius * 9) / 5 + 32;

const TemperatureUnitContext = createContext<TemperatureUnitContextType | undefined>(undefined);

export const TemperatureUnitProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [unit, setUnitState] = useState<TemperatureUnit>('celsius');

  useEffect(() => {
    if (!isRealUserId(user?.id)) return;
    let mounted = true;

    const loadUnit = async () => {
      try {
        const { data } = await apiClient.get(`/api/users/${user.id}`);
        const maybeUser = data?.user || data;
        const savedUnit = maybeUser?.notificationPreferences?.temperatureUnit;
        if (mounted && (savedUnit === 'celsius' || savedUnit === 'fahrenheit')) {
          setUnitState(savedUnit);
        }
      } catch (error) {
        console.error('Failed to load temperature unit preference:', error);
      }
    };

    void loadUnit();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const setUnit = (nextUnit: TemperatureUnit) => {
    setUnitState(nextUnit);
  };

  const convert = (celsius: number): number => {
    const value = unit === 'fahrenheit' ? celsiusToFahrenheit(celsius) : celsius;
    // Round to 1 decimal so raw converted values are safe to feed directly
    // into charts/tables that have no value formatter of their own — C-to-F
    // conversion otherwise leaks long floating-point tails (e.g. 87.0800...).
    return Math.round(value * 10) / 10;
  };

  const format = (celsius: number, fractionDigits = 1): string => {
    const value = convert(celsius);
    const suffix = unit === 'fahrenheit' ? '°F' : '°C';
    return `${value.toFixed(fractionDigits)}${suffix}`;
  };

  return (
    <TemperatureUnitContext.Provider value={{ unit, setUnit, convert, format }}>
      {children}
    </TemperatureUnitContext.Provider>
  );
};

export const useTemperatureUnit = (): TemperatureUnitContextType => {
  const context = useContext(TemperatureUnitContext);
  if (context === undefined) {
    throw new Error('useTemperatureUnit must be used within a TemperatureUnitProvider');
  }
  return context;
};
