import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '../../lib/supabase'

interface Store {
  id: string
  name: string
  address?: string
  features?: {
    inventory_tracking?: boolean
    loyalty_points?: boolean
    sms_notifications?: boolean
    email_receipts?: boolean
    advanced_reporting?: boolean
    delivery_tracking?: boolean
    multiple_currencies?: boolean
    tax_calculation?: boolean
  }
}

interface StoreContextType {
  currentStore: Store | null
  availableStores: Store[]
  switchStore: (storeId: string) => void
  setStoreById: (storeId: string) => Promise<void>
  refreshStores: () => Promise<void>
  loading: boolean
}

const StoreContext = createContext<StoreContextType | undefined>(undefined)

interface StoreProviderProps {
  children: ReactNode
}

export const StoreProvider: React.FC<StoreProviderProps> = ({ children }) => {
  const [currentStore, setCurrentStore] = useState<Store | null>(null)
  const [availableStores, setAvailableStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)

  const refreshStores = async () => {
    try {
      console.log('Refreshing stores...')
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        console.log('No user found')
        return
      }

      console.log('User found:', user.email)
      
      // Note: We no longer skip if store is set - we still need to refresh available stores
      // But we won't override the current store if it's already set
      
      // Get user details
      const { data: userData } = await supabase
        .from('users')
        .select('id, role')
        .eq('email', user.email)
        .single()

      if (!userData) {
        console.log('No user data found')
        return
      }

      console.log('User data:', userData)

      let stores: Store[] = []

      // Both super admin and regular users get their assigned stores from user_store_assignments
      console.log('Loading store assignments for user:', userData.id)
      const { data: assignments, error: assignmentError } = await supabase
        .from('user_store_assignments')
        .select(`
          store_id,
          stores (
            id,
            name,
            address,
            features
          )
        `)
        .eq('user_id', userData.id)

      console.log('Store assignments result:', { assignments, assignmentError })

      stores = assignments?.map(item => item.stores).filter(Boolean) || []
      console.log('Final stores array:', stores)

      setAvailableStores(stores)

      // Set current store to first available or primary store
      if (stores.length > 0 && !currentStore) {
        console.log('Setting current store from', stores.length, 'available stores')
        // Try to get primary store first
        const { data: primaryAssignment } = await supabase
          .from('user_store_assignments')
          .select(`
            store_id,
            stores (
              id,
              name,
              address,
              features
            )
          `)
          .eq('user_id', userData.id)
          .eq('is_primary', true)
          .single()

        if (primaryAssignment?.stores) {
          console.log('Setting primary store:', primaryAssignment.stores)
          console.log('🎯 Store features:', primaryAssignment.stores.features)
          setCurrentStore(primaryAssignment.stores)
        } else {
          // If no primary store set, use the first assigned store
          console.log('Setting first store:', stores[0])
          console.log('🎯 Store features:', stores[0].features)
          setCurrentStore(stores[0])
        }
      } else if (stores.length > 0 && currentStore) {
        console.log('Current store already set:', currentStore.name)
        // Verify the current store is still in the available stores
        const isCurrentStoreValid = stores.some(store => store.id === currentStore.id)
        if (!isCurrentStoreValid) {
          console.log('Current store is no longer available, switching to first store')
          setCurrentStore(stores[0])
        }
      } else {
        console.log('No stores available or current store already set')
      }
    } catch (error) {
      console.error('Error refreshing stores:', error)
    } finally {
      setLoading(false)
    }
  }

  const switchStore = (storeId: string) => {
    const store = availableStores.find(s => s.id === storeId)
    if (store) {
      console.log('🔄 Switching to store:', store.name)
      setCurrentStore(store)
    } else {
      console.warn('⚠️ Store not found in available stores:', storeId)
    }
  }

  const setStoreById = async (storeId: string) => {
    try {
      console.log('📦 Setting store by ID:', storeId)
      
      // First try to find in available stores
      let store = availableStores.find(s => s.id === storeId)
      
      if (store) {
        console.log('✅ Found store in available stores:', store.name)
        setCurrentStore(store)
        return
      }
      
      // If not found, fetch it from database
      console.log('🔍 Store not in available stores, fetching from database...')
      const { data, error } = await supabase
        .from('stores')
        .select('id, name, address, features')
        .eq('id', storeId)
        .single()
      
      if (error) throw error
      
      if (data) {
        console.log('✅ Fetched store from database:', data.name)
        setCurrentStore(data)
        
        // Add to available stores if not already there
        if (!availableStores.some(s => s.id === storeId)) {
          setAvailableStores([...availableStores, data])
        }
      }
    } catch (error) {
      console.error('❌ Error setting store by ID:', error)
      throw error
    }
  }

  useEffect(() => {
    refreshStores()
  }, [])

  const value: StoreContextType = {
    currentStore,
    availableStores,
    switchStore,
    setStoreById,
    refreshStores,
    loading,
  }

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  )
}

export const useStore = (): StoreContextType => {
  const context = useContext(StoreContext)
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider')
  }
  return context
}
