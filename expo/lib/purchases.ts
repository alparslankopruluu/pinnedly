import { Platform } from 'react-native';

export const REVENUE_CAT_API_KEYS = {
  apple: 'test_QcGHyGoQqyvOLqjdgifNxxRPERE',
  google: 'test_QcGHyGoQqyvOLqjdgifNxxRPERE', // In a real app, these are usually different
};

export const ENTITLEMENT_ID = 'draft Pro';

export const getApiKey = () => {
  if (Platform.OS === 'ios') {
    return REVENUE_CAT_API_KEYS.apple;
  }
  return REVENUE_CAT_API_KEYS.google;
};
