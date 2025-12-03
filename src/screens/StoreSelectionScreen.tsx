import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useStore } from '../context/StoreContext'
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
  const insets = useSafeAreaInsets()
  const { setStoreById } = useStore()
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string>('')
  const [availableStores, setAvailableStores] = useState<Store[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [storeData, setStoreData] = useState<{
    totalOrders: number
    totalCustomers: number
    todaySales: number
    todayOrders: number
    activeOrders: number
    loading: boolean
  } | null>(null)

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
        loadStoreData(stores[0].id)
      }
    } catch (error) {
      console.error('❌ Error loading stores:', error)
      Alert.alert('Error', `Failed to load stores: ${error.message}`)
    }
  }

  const loadStoreData = async (storeId: string) => {
    try {
      setStoreData({
        totalOrders: 0,
        totalCustomers: 0,
        todaySales: 0,
        todayOrders: 0,
        activeOrders: 0,
        loading: true
      })

      console.log('📊 Loading data for store:', storeId)

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const endOfDay = new Date()
      endOfDay.setHours(23, 59, 59, 999)

      // Fetch total orders for this store (always load, even if zero)
      const { count: totalOrdersCount, error: ordersCountError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeId)

      if (ordersCountError) {
        console.error('Error loading orders count:', ordersCountError)
        // Continue with 0 if error
      }

      // Fetch today's orders (always load, even if zero)
      const { data: todayOrdersData, error: todayOrdersError } = await supabase
        .from('orders')
        .select('*')
        .eq('store_id', storeId)
        .gte('order_date', today.toISOString())
        .lte('order_date', endOfDay.toISOString())

      if (todayOrdersError) {
        console.error('Error loading today\'s orders:', todayOrdersError)
        // Continue with empty array if error
      }

      // Calculate today's sales (handle null/undefined gracefully)
      const todaySales = (todayOrdersData || [])?.reduce((sum, order) => sum + Number(order?.paid_amount || 0), 0) || 0
      const todayOrders = (todayOrdersData || []).length || 0
      const activeOrders = (todayOrdersData || []).filter(o => 
        o && o.order_status && o.order_status !== 'completed' && o.order_status !== 'cancelled'
      ).length || 0

      // Fetch total customers for this store (always load, even if zero)
      const { count: customersCount, error: customersError } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeId)
        .eq('is_active', true)

      if (customersError) {
        console.error('Error loading customers count:', customersError)
        // Continue with 0 if error
      }

      const finalTotalOrders = totalOrdersCount ?? 0
      const finalCustomers = customersCount ?? 0
      
      console.log(`✅ Store data loaded: ${finalTotalOrders} orders, ${finalCustomers} customers (including zero counts)`)

      // Always set data even if all values are zero (no data scenario)
      setStoreData({
        totalOrders: finalTotalOrders,
        totalCustomers: finalCustomers,
        todaySales,
        todayOrders,
        activeOrders,
        loading: false
      })
      
      console.log(`✅ Store data display ready - Orders: ${finalTotalOrders}, Customers: ${finalCustomers}, Today Sales: ₱${todaySales.toFixed(2)}`)
    } catch (error: any) {
      console.error('❌ Error loading store data, showing zeros:', error)
      // Even on error, show zeros so user knows data was attempted to load
      setStoreData({
        totalOrders: 0,
        totalCustomers: 0,
        todaySales: 0,
        todayOrders: 0,
        activeOrders: 0,
        loading: false
      })
    }
  }

  const handleContinue = async () => {
    if (!selectedStoreId) {
      Alert.alert('Error', 'Please select a store to continue')
      return
    }
    
    try {
      console.log('🔄 Setting selected store in context:', selectedStoreId)
      
      // Set the store in context using the new method (it will fetch if needed)
      await setStoreById(selectedStoreId)
      
      console.log('✅ Store set in context, proceeding to dashboard')
      
      // Small delay to ensure store state is fully updated
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // Now proceed with store selection complete
      onStoreSelectionComplete([selectedStoreId])
    } catch (error: any) {
      console.error('❌ Error setting store:', error)
      Alert.alert('Error', `Failed to set store: ${error.message || 'Unknown error'}`)
    }
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
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 20) }
        ]}
        showsVerticalScrollIndicator={false}
      >
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
                    onPress={() => {
                      setSelectedStoreId(store.id)
                      loadStoreData(store.id)
                    }}
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

            {/* Store Statistics Preview - Always show when store is selected */}
            {selectedStoreId && (
              <View style={styles.storePreviewContainer}>
                {!storeData || storeData.loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#2089dc" />
                    <Text style={styles.loadingPreviewText}>Loading store data...</Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.previewTitle}>Store Overview</Text>
                    <View style={styles.statsGrid}>
                      <View style={styles.statCard}>
                        <Text style={styles.statValue}>{storeData.totalOrders || 0}</Text>
                        <Text style={styles.statLabel}>Total Orders</Text>
                      </View>
                      <View style={styles.statCard}>
                        <Text style={styles.statValue}>{storeData.totalCustomers || 0}</Text>
                        <Text style={styles.statLabel}>Customers</Text>
                      </View>
                      <View style={styles.statCard}>
                        <Text style={styles.statValue}>₱{(storeData.todaySales || 0).toFixed(2)}</Text>
                        <Text style={styles.statLabel}>Today's Sales</Text>
                      </View>
                      <View style={styles.statCard}>
                        <Text style={styles.statValue}>{storeData.todayOrders || 0}</Text>
                        <Text style={styles.statLabel}>Today's Orders</Text>
                      </View>
                      <View style={styles.statCard}>
                        <Text style={styles.statValue}>{storeData.activeOrders || 0}</Text>
                        <Text style={styles.statLabel}>Active Orders</Text>
                      </View>
                    </View>
                  </>
                )}
              </View>
            )}

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
      </ScrollView>
      <StatusBar style="dark" />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 20,
    minHeight: '100%',
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
  storePreviewContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e3f2fd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  loadingPreviewText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2089dc',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
})

export default StoreSelectionScreen
