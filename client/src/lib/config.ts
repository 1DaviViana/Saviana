// Configuration for environment-specific settings

interface Config {
  apiBaseUrl: string;
}

// Default development configuration (for Replit)
const devConfig: Config = {
  apiBaseUrl: '', // Empty means same origin
};

// Production configuration (for GitHub Pages)
const prodConfig: Config = {
  apiBaseUrl: import.meta.env.VITE_API_URL || 'https://your-backend.railway.app', // Will be replaced by actual Railway URL
};

// Determine if we're in a production build
const isProduction = import.meta.env.PROD;

// Export the configuration based on environment
export const config: Config = isProduction ? prodConfig : devConfig;