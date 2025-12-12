import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import Constants from 'expo-constants'

// Get environment variables from expo-constants
// In development, these come from .env file
// In production, set these in EAS build secrets or environment variables
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || ''
const supabaseKey = Constants.expoConfig?.extra?.supabaseKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''

// JWT Secret (Legacy/Server-side secret - for reference only, not used in client)
// This is configured in Supabase Dashboard > Authentication > Settings
// The client app uses the anon key above, not the JWT secret
const jwtSecret = Constants.expoConfig?.extra?.jwtSecret || process.env.JWT_SECRET || ''

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase credentials are not configured. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY environment variables.')
}

// Export JWT secret for reference (if needed for server-side operations)
// Note: JWT secrets should NEVER be used in client-side code for security reasons
export const JWT_SECRET = jwtSecret

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})