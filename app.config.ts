import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Extends app.json with values that must not be committed.
 *
 * GOOGLE_MAPS_API_KEY — Google Maps SDK for Android key, used only by your own
 * Android builds (`npx expo run:android`, EAS Build). Expo Go ships its own key,
 * so the map works there without it. See README → "Google Maps API key".
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

  return {
    ...(config as ExpoConfig),
    android: {
      ...config.android,
      config: {
        ...config.android?.config,
        ...(googleMapsApiKey ? { googleMaps: { apiKey: googleMapsApiKey } } : {}),
      },
    },
  };
};
