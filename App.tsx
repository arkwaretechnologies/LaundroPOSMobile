import React, { useState, useEffect } from 'react'
import { View, Text, ActivityIndicator, StyleSheet, SafeAreaView, TouchableOpacity, Alert } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import LoginScreen from './src/screens/LoginScreen'
import StoreSelectionScreen from './src/screens/StoreSelectionScreen'
import DashboardScreen from './src/screens/DashboardScreen'
import POSScreen from './src/screens/POSScreen'
import OrdersScreen from './src/screens/OrdersScreen'
import ReportsScreen from './src/screens/ReportsScreen'
import SettingsScreen from './src/screens/SettingsScreen'
import ServicesManagementScreen from './src/screens/ServicesManagementScreen'
import PaymentMethodsScreen from './src/screens/PaymentMethodsScreen'
import InventoryScreen from './src/screens/InventoryScreen'
import BottomNavigation from './src/components/BottomNavigation'
import { StoreProvider, useStore } from './src/context/StoreContext'
import { NotificationProvider, useNotifications } from './src/context/NotificationContext'
import { supabase } from './lib/supabase'
import { isFeatureEnabled } from './src/utils/featureFlags'
import { getSessionStatus, refreshSession, signOut, shouldRefreshSession } from './src/utils/sessionManager'

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [needsStoreSelection, setNeedsStoreSelection] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [currentScreen, setCurrentScreen] = useState<string | null>(null)

  useEffect(() => {
    initializeAuth()
    
    // Set up periodic session expiration check (every 30 seconds)
    const sessionCheckInterval = setInterval(async () => {
      await checkAndHandleSessionExpiration()
    }, 30000) // Check every 30 seconds

    return () => {
      clearInterval(sessionCheckInterval)
    }
  }, [])

  const initializeAuth = async () => {
    try {
      console.log('🚀 Initializing auth...')
      console.log('📱 Platform: React Native (Expo)')
      
      // Check initial session
      console.log('🔍 Checking session...')
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        // If it's an invalid refresh token error, just clear it and continue
        if (sessionError.message?.includes('Invalid Refresh Token') || 
            sessionError.message?.includes('Refresh Token Not Found')) {
          console.log('🧹 Clearing invalid session...')
          await supabase.auth.signOut()
          console.log('✅ Session cleared, continuing to login')
        } else {
          console.error('❌ Session error:', sessionError)
        }
        // Don't block the app for session errors - just continue without auth
      }
      
      console.log('✅ Session check complete:', session ? 'User logged in' : 'No session')
      
      if (session) {
        // Check session expiration status
        const sessionStatus = await getSessionStatus(60)
        if (sessionStatus.isExpired) {
          console.log('⏰ Session expired on initialization')
          await handleSessionExpiration()
          setLoading(false)
          return
        }
        
        // Check if session needs refresh
        if (shouldRefreshSession(session)) {
          console.log('🔄 Session expiring soon, refreshing...')
          const refreshed = await refreshSession()
          if (!refreshed) {
            console.log('❌ Failed to refresh session on init')
            await handleSessionExpiration()
            setLoading(false)
            return
          }
        }
        
        console.log('👤 User logged in, checking stores...')
        try {
          await checkStoreSelectionNeeded()
        } catch (storeError) {
          console.error('⚠️ Store check error (non-fatal):', storeError)
          // Don't block login for store check errors
        }
      }
      
      setIsAuthenticated(!!session)
      setLoading(false)
      console.log('✅ Auth initialization complete')

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('🔄 Auth state changed:', event, session ? 'Logged in' : 'Logged out')
        
        // Handle token refresh
        if (event === 'TOKEN_REFRESHED' && session) {
          console.log('✅ Token refreshed successfully')
        }
        
        // Handle session expiration
        if (event === 'SIGNED_OUT' || !session) {
          console.log('🔒 User signed out or session expired')
          setIsAuthenticated(false)
          return
        }
        
        if (session) {
          // Check if session needs refresh
          if (shouldRefreshSession(session)) {
            console.log('🔄 Session expiring soon, attempting refresh...')
            const refreshed = await refreshSession()
            if (!refreshed) {
              console.log('❌ Failed to refresh session, signing out...')
              await handleSessionExpiration()
              return
            }
          }
          
          await checkStoreSelectionNeeded()
        }
        
        setIsAuthenticated(!!session)
      })

      return () => subscription.unsubscribe()
    } catch (err) {
      console.error('💥 Init error:', err)
      console.error('Error details:', JSON.stringify(err))
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      setLoading(false)
      setIsAuthenticated(false)
    }
  }

  /**
   * Check and handle session expiration
   * This is called periodically to ensure the session is still valid
   */
  const checkAndHandleSessionExpiration = async () => {
    if (!isAuthenticated) return

    try {
      const sessionStatus = await getSessionStatus(60) // 60 second buffer

      if (sessionStatus.isExpired) {
        console.log('⏰ Session expired, signing out...')
        await handleSessionExpiration()
      } else if (sessionStatus.expiresIn && sessionStatus.expiresIn < 300) {
        // Session expires in less than 5 minutes, try to refresh
        console.log('🔄 Session expiring soon, attempting refresh...')
        const refreshed = await refreshSession()
        if (!refreshed) {
          console.log('❌ Failed to refresh session')
          // Don't sign out yet, let it expire naturally
        }
      }
    } catch (error) {
      console.error('Error checking session expiration:', error)
    }
  }

  /**
   * Handle session expiration - show alert and sign out
   */
  const handleSessionExpiration = async () => {
    try {
      Alert.alert(
        'Session Expired',
        'Your session has expired. Please log in again to continue.',
        [
          {
            text: 'OK',
            onPress: async () => {
              await signOut()
              setIsAuthenticated(false)
              setNeedsStoreSelection(false)
            },
          },
        ],
        { cancelable: false }
      )
    } catch (error) {
      console.error('Error handling session expiration:', error)
      // Force sign out even if alert fails
      await signOut()
      setIsAuthenticated(false)
      setNeedsStoreSelection(false)
    }
  }

  const checkStoreSelectionNeeded = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      // Get user details
      const { data: userData } = await supabase
        .from('users')
        .select('id, role')
        .eq('email', user.email)
        .single()

      if (!userData) return

      // Check if user has store assignments
      const { data: assignments } = await supabase
        .from('user_store_assignments')
        .select('store_id')
        .eq('user_id', userData.id)

      // Show store selection screen if:
      // 1. User is Super Admin (can access all stores)
      // 2. User has multiple store assignments
      // Skip store selection if user has only 1 store assigned
      // Note: All users must have at least 1 store assignment (required during user creation)
      const assignmentCount = assignments?.length || 0
      const shouldShowStoreSelection = userData.role === 'super_admin' || assignmentCount > 1
      
      setNeedsStoreSelection(shouldShowStoreSelection)
    } catch (error) {
      console.error('Error checking store selection:', error)
    }
  }

  if (loading) {
    return (
      <SafeAreaProvider>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2089dc" />
          <Text style={styles.loadingText}>Loading LaundroPOS...</Text>
          <Text style={styles.loadingSubtext}>Connecting to database...</Text>
          <TouchableOpacity 
            onPress={() => {
              console.log('⏭️ User skipped loading')
              setLoading(false)
              setIsAuthenticated(false)
            }}
            style={{ marginTop: 30 }}
          >
            <Text style={styles.skipButton}>
              Taking too long? Tap to skip →
            </Text>
          </TouchableOpacity>
        </View>
        <StatusBar style="dark" />
      </SafeAreaProvider>
    )
  }

  if (error) {
    return (
      <SafeAreaProvider>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
          <Text style={styles.errorSubtext}>Please check your connection and try again</Text>
        </View>
        <StatusBar style="dark" />
      </SafeAreaProvider>
    )
  }

  const handleStoreSelectionComplete = (selectedStoreIds: string[]) => {
    setNeedsStoreSelection(false)
    // Store selection is complete, proceed to POS screen
  }

  const handleLoginSuccess = async () => {
    setIsAuthenticated(true)
    await checkStoreSelectionNeeded()
  }

  const navigation = {
    navigate: (screen: string) => setCurrentScreen(screen),
    goBack: () => setCurrentScreen(null),
  }

  // Inner component to access safe area insets and notification badges
  const MainAppContent: React.FC<{
    currentScreen: string | null
    activeTab: string
    setActiveTab: (tab: string) => void
    renderCurrentScreen: () => React.ReactNode
  }> = ({
    currentScreen,
    activeTab,
    setActiveTab,
    renderCurrentScreen
  }) => {
    const insets = useSafeAreaInsets()
    const { ordersBadge, settingsBadge } = useNotifications()
    
    // Navigation bar height: ~64px (padding + icon + label) + safe area bottom
    // BottomNavigation is absolutely positioned at bottom: insets.bottom, so we need to account for
    // its full height (64px) plus the bottom inset to prevent content overlap
    const navigationHeight = 64 + insets.bottom
    
    return (
      <>
        <SafeAreaView style={styles.container}>
          <View style={[styles.screenContainer, { paddingBottom: currentScreen ? 0 : navigationHeight }]}>
            {renderCurrentScreen()}
          </View>
          {/* Hide bottom navigation when on detail screens */}
          {!currentScreen && (
            <BottomNavigation
              activeTab={activeTab}
              onTabPress={setActiveTab}
              ordersBadge={ordersBadge}
              settingsBadge={settingsBadge}
            />
          )}
        </SafeAreaView>
        <StatusBar style="light" />
      </>
    )
  }

  const renderCurrentScreen = () => {
    // If a specific screen is set, render that screen
    if (currentScreen === 'ServicesManagement') {
      return <ServicesManagementScreen navigation={navigation} />
    }
    if (currentScreen === 'PaymentMethods') {
      return <PaymentMethodsScreen navigation={navigation} />
    }

    // Otherwise render the tab screen
    switch (activeTab) {
      case 'dashboard':
        return <DashboardScreen />
      case 'pos':
        return <POSScreen />
      case 'orders':
        return <OrdersScreen />
      case 'inventory':
        return <InventoryScreen />
      case 'reports':
        return <ReportsScreen />
      case 'settings':
        return <SettingsScreen navigation={navigation} />
      default:
        return <DashboardScreen />
    }
  }

  return (
    <SafeAreaProvider>
      {isAuthenticated ? (
        <StoreProvider>
          <NotificationProvider>
            {needsStoreSelection ? (
              <>
                <StoreSelectionScreen onStoreSelectionComplete={handleStoreSelectionComplete} />
                <StatusBar style="dark" />
              </>
            ) : (
              <MainAppContent
                currentScreen={currentScreen}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                renderCurrentScreen={renderCurrentScreen}
              />
            )}
          </NotificationProvider>
        </StoreProvider>
      ) : (
        <>
          <LoginScreen onLoginSuccess={handleLoginSuccess} />
          <StatusBar style="dark" />
        </>
      )}
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  screenContainer: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
  },
  skipButton: {
    fontSize: 14,
    color: '#2089dc',
    textDecorationLine: 'underline',
    padding: 10,
  },
  errorText: {
    fontSize: 18,
    color: '#e74c3c',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
})
