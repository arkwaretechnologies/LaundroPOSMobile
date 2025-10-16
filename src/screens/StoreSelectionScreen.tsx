import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { StoreProvider } from '../context/StoreContext'
import { supabase } from '../../lib/supabase'

interface Store {
  id: string
  name: string
  address?: string
}

interface StoreSelectionScreenProps {
  onStoreSelectionComplete: (selectedStoreIds: string[]) => void
}

const StoreSelectionScreen: React.FC<StoreSelectionScreenProps> = ({
  onStoreSelectionComplete,
}) => {
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string>('')
  const [availableStores, setAvailableStores] = useState<Store[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        Alert.alert('Error', 'User not found')
        return
      }

      // Get user details from our users table
      const { data: userData, error } = await supabase
        .from('users')
        .select('id, role')
        .eq('email', user.email)
        .single()

      console.log('👤 User data query result:', { userData, error })
      if (error) {
        console.error('❌ Error fetching user data:', error)
        Alert.alert('Error', `Failed to load user data: ${error.message}`)
        return
      }

      console.log('✅ User found:', userData)
      setUserId(userData.id)
      setUserRole(userData.role)

      // Load available stores for selection
      await loadAvailableStores(userData.id, userData.role)
    } catch (error) {
      console.error('Error loading user data:', error)
      Alert.alert('Error', 'Failed to load user data')
    } finally {
      setLoading(false)
    }
  }

  const loadAvailableStores = async (userId: string, role: string) => {
    try {
      console.log('🔍 Loading stores for user:', userId, 'with role:', role)
      let stores: Store[] = []

      if (role === 'super_admin') {
        console.log('👑 Loading stores for super admin')
        // Super admin can see all stores
        const { data: allStores, error } = await supabase
          .from('stores')
          .select('id, name, address')
          .eq('status', 'active')
          .order('name')

        console.log('📊 Super admin stores query result:', { allStores, error })
        if (error) throw error
        stores = allStores || []
      } else {
        console.log('👤 Loading stores for regular user')
        // Regular users see only their assigned stores
        const { data: assignments, error } = await supabase
          .from('user_store_assignments')
          .select(`
            store_id,
            stores (
              id,
              name,
              address
            )
          `)
          .eq('user_id', userId)

        console.log('📊 Regular user assignments query result:', { assignments, error })
        if (error) throw error
        stores = assignments?.map(item => item.stores).filter(Boolean) || []
      }

      console.log('🏪 Final stores array:', stores)
      setAvailableStores(stores)
      
      // Auto-select first store if only one available
      if (stores.length === 1) {
        setSelectedStoreId(stores[0].id)
      }
    } catch (error) {
      console.error('❌ Error loading stores:', error)
      Alert.alert('Error', `Failed to load stores: ${error.message}`)
    }
  }

  const handleContinue = () => {
    if (!selectedStoreId) {
      Alert.alert('Error', 'Please select a store to continue')
      return
    }
    onStoreSelectionComplete([selectedStoreId])
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2089dc" />
          <Text style={styles.loadingText}>Loading user data...</Text>
        </View>
        <StatusBar style="dark" />
      </SafeAreaView>
    )
  }

  if (!userId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Unable to load user data</Text>
        </View>
        <StatusBar style="dark" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Select Store</Text>
        <Text style={styles.subtitle}>Choose which store to work with</Text>

        {availableStores.length > 0 ? (
          <>
            <View style={styles.dropdownContainer}>
              <Text style={styles.label}>Store *</Text>
              <View style={styles.dropdown}>
                {availableStores.map(store => (
                  <TouchableOpacity
                    key={store.id}
                    style={[
                      styles.dropdownItem,
                      selectedStoreId === store.id && styles.selectedItem
                    ]}
                    onPress={() => setSelectedStoreId(store.id)}
                  >
                    <Text style={[
                      styles.storeName,
                      selectedStoreId === store.id && styles.selectedText
                    ]}>
                      {store.name}
                    </Text>
                    {store.address && (
                      <Text style={[
                        styles.storeAddress,
                        selectedStoreId === store.id && styles.selectedText
                      ]}>
                        {store.address}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.continueButton, !selectedStoreId && styles.disabledButton]}
              onPress={handleContinue}
              disabled={!selectedStoreId}
            >
              <Text style={styles.continueButtonText}>Continue to Dashboard</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.noStoresContainer}>
            <Text style={styles.noStoresText}>No stores available</Text>
            <Text style={styles.noStoresSubtext}>Please contact your administrator</Text>
          </View>
        )}
      </View>
      <StatusBar style="dark" />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#2c3e50',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  dropdownContainer: {
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 10,
  },
  dropdown: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedItem: {
    backgroundColor: '#e3f2fd',
    borderLeftWidth: 4,
    borderLeftColor: '#2089dc',
  },
  storeName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
  },
  storeAddress: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  selectedText: {
    color: '#1976d2',
  },
  continueButton: {
    backgroundColor: '#2089dc',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#2089dc',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  disabledButton: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  noStoresContainer: {
    alignItems: 'center',
    padding: 40,
  },
  noStoresText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e74c3c',
    marginBottom: 10,
  },
  noStoresSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
  },
})

export default StoreSelectionScreen
