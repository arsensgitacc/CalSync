import { useColorScheme } from 'react-native';

const light = {
  background: '#F7F7FA',
  card: '#FFFFFF',
  text: '#1C1C1E',
  subtext: '#6E6E73',
  border: '#E5E5EA',
  accent: '#5E5CE6',
  accentText: '#FFFFFF',
  danger: '#FF3B30',
  bellOn: '#FF9F0A',
  bellOff: '#C7C7CC',
};

const dark = {
  background: '#000000',
  card: '#1C1C1E',
  text: '#F2F2F7',
  subtext: '#9B9BA1',
  border: '#2C2C2E',
  accent: '#7D7AFF',
  accentText: '#FFFFFF',
  danger: '#FF453A',
  bellOn: '#FFB340',
  bellOff: '#48484A',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? dark : light;
}

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const radius = { sm: 8, md: 14, lg: 20 };
