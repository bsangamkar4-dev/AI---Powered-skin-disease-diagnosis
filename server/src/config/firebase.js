import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') });

// Accept env key casing from existing local setup files while keeping canonical
// uppercase names as the preferred configuration.
const getEnv = (name) => process.env[name] ??
  Object.entries(process.env).find(([key]) => key.toUpperCase() === name)?.[1];

// Initialize Firebase Admin SDK
const initializeFirebase = () => {
  try {
    // Check if Firebase is already initialized
    if (admin.apps.length === 0) {
      // Check if required environment variables are set
      const requiredVars = [
        'FIREBASE_PROJECT_ID',
        'FIREBASE_PRIVATE_KEY_ID',
        'FIREBASE_PRIVATE_KEY',
        'FIREBASE_CLIENT_EMAIL',
        'FIREBASE_CLIENT_ID'
      ];
      
      const missingVars = requiredVars.filter(varName => !getEnv(varName));
      
      if (missingVars.length > 0) {
        console.warn('⚠️  Missing Firebase environment variables:', missingVars.join(', '));
        console.warn('📖 Please check FIREBASE_SETUP.md for configuration instructions.');
        
        // In development, we'll continue without Firebase
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️  Running in development mode without Firebase Admin SDK');
          return false;
        } else {
          throw new Error(`Missing required Firebase environment variables: ${missingVars.join(', ')}`);
        }
      }

      const serviceAccount = {
        type: "service_account",
        project_id: getEnv('FIREBASE_PROJECT_ID'),
        private_key_id: getEnv('FIREBASE_PRIVATE_KEY_ID'),
        private_key: getEnv('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n'),
        client_email: getEnv('FIREBASE_CLIENT_EMAIL'),
        client_id: getEnv('FIREBASE_CLIENT_ID'),
        auth_uri: getEnv('FIREBASE_AUTH_URI') || "https://accounts.google.com/o/oauth2/auth",
        token_uri: getEnv('FIREBASE_TOKEN_URI') || "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${getEnv('FIREBASE_CLIENT_EMAIL')}`
      };

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: getEnv('FIREBASE_PROJECT_ID')
      });

      console.log('✅ Firebase Admin SDK initialized successfully');
      return true;
    }
    return true;
  } catch (error) {
    console.error('❌ Firebase Admin SDK initialization failed:', error.message);
    
    // For development, we'll continue without Firebase
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️  Running in development mode without Firebase Admin SDK');
      return false;
    } else {
      throw error;
    }
  }
};

// Initialize Firebase
const isFirebaseInitialized = initializeFirebase();

// Export a function to check if Firebase is available
export const isFirebaseAvailable = () => {
  try {
    // Check if Firebase is initialized and has valid credentials
    if (isFirebaseInitialized && admin.apps.length > 0) {
      // Try to verify that Firebase is actually working by checking if we can access the auth service
      const auth = admin.auth();
      return true;
    }
    return false;
  } catch (error) {
    console.warn('⚠️  Firebase availability check failed:', error.message);
    return false;
  }
};

export default admin;
