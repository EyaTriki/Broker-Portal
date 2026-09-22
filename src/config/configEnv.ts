export const ConfigEnv = {
  API_ENDPOINT: import.meta.env.VITE_API_ENDPOINT,
  HASH_KEY: import.meta.env.VITE_HASH_KEY,
  MEDIA_BASE_URL: import.meta.env.VITE_MEDIA_BASE_URL,
  MAPBOX_ACCESS_TOKEN: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN,
  SOCKET_ENDPOINT: import.meta.env.VITE_SOCKET_URL,
  OPTIMO_ROUTE: import.meta.env.VITE_OPTIMO_ROUTE,
  IDEAL_POSTCODE_API_KEY: import.meta.env.VITE_LOCATION_KEY,
  ONESIGNAL_APP_ID: import.meta.env.VITE_ONESIGNAL_APP_ID,
  /** Python email classifier (Uvicorn), e.g. http://localhost:8001 */
  EMAIL_CLASSIFIER_ENDPOINT:
    import.meta.env.VITE_EMAIL_CLASSIFIER_URL || 'http://localhost:8001',
};
