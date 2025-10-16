import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://huwqsicrwqhxfinhpxsg.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1d3FzaWNyd3FoeGZpbmhweHNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5NDcwODksImV4cCI6MjA3NTUyMzA4OX0.fO3h-jBOSI4hFDMFUfvXY_hR7aoOP_uJnWCaplkxpOk'

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})