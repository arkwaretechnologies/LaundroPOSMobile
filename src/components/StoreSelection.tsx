import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { supabase } from '../../lib/supabase'

interface Store {
  id: string
  name: string
  address?: string
}

interface StoreSelectionProps {
  userId: string
  userRole: string
  onStoreSelectionComplete: (selectedStoreIds: string[]) => void
}

const StoreSelection: React.FC<StoreSelectionProps> = ({
  userId,
  userRole,
  onStoreSelectionComplete,
}) => {
  const [availableStores, setAvailableStores] = useState<Store[]>([])
  const [assignedStores, setAssignedStores] = useState<Store[]>([])
  const [availableFilter, setAvailableFilter] = useState('')
  const [assignedFilter, setAssignedFilter] = useState('')
  const [selectedAvailable, setSelectedAvailable] = useState<Set<string>>(new Set())
  const [selectedAssigned, setSelectedAssigned] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
    loadStoreData()
  }, [])

  const loadStoreData = async () => {
    try {
      setLoading(true)

      // For super admin, show all stores in available list (not pre-assigned)
      if (userRole === 'super_admin') {
        const { data: stores, error } = await supabase
          .from('stores')
          .select('id, name, address')
          .eq('status', 'active')
          .order('name')

        if (error) throw error

        // Super admin sees all stores in available list, none pre-assigned
        setAvailableStores(stores || [])
        setAssignedStores([])
      } else {
        // For other users, get their current assignments and available stores
        const [assignedResult, availableResult] = await Promise.all([
          supabase
            .from('user_store_assignments')
            .select(`
              store_id,
              stores (
                id,
                name,
                address
              )
            `)
            .eq('user_id', userId),
          supabase
            .from('stores')
            .select('id, name, address')
            .eq('status', 'active')
            .order('name')
        ])

        if (assignedResult.error) throw assignedResult.error
        if (availableResult.error) throw availableResult.error

        const assigned = assignedResult.data?.map(item => item.stores).filter(Boolean) || []
        const assignedIds = new Set(assigned.map(store => store.id))
        const available = availableResult.data?.filter(store => !assignedIds.has(store.id)) || []

        setAssignedStores(assigned)
        setAvailableStores(available)
      }
    } catch (error) {
      console.error('Error loading store data:', error)
      Alert.alert('Error', 'Failed to load store data')
    } finally {
      setLoading(false)
    }
  }

  const filteredAvailableStores = availableStores.filter(store =>
    store.name.toLowerCase().includes(availableFilter.toLowerCase())
  )

  const filteredAssignedStores = assignedStores.filter(store =>
    store.name.toLowerCase().includes(assignedFilter.toLowerCase())
  )

  const handleAvailableSelect = (storeId: string) => {
    const newSelected = new Set(selectedAvailable)
    if (newSelected.has(storeId)) {
      newSelected.delete(storeId)
    } else {
      newSelected.add(storeId)
    }
    setSelectedAvailable(newSelected)
  }

  const handleAssignedSelect = (storeId: string) => {
    const newSelected = new Set(selectedAssigned)
    if (newSelected.has(storeId)) {
      newSelected.delete(storeId)
    } else {
      newSelected.add(storeId)
    }
    setSelectedAssigned(newSelected)
  }

  const moveToAssigned = () => {
    const storesToMove = availableStores.filter(store => selectedAvailable.has(store.id))
    setAssignedStores(prev => [...prev, ...storesToMove])
    setAvailableStores(prev => prev.filter(store => !selectedAvailable.has(store.id)))
    setSelectedAvailable(new Set())
  }

  const moveToAvailable = () => {
    const storesToMove = assignedStores.filter(store => selectedAssigned.has(store.id))
    setAvailableStores(prev => [...prev, ...storesToMove])
    setAssignedStores(prev => prev.filter(store => !selectedAssigned.has(store.id)))
    setSelectedAssigned(new Set())
  }

  const handleAssign = async () => {
    if (userRole === 'super_admin') {
      // Super admin automatically has access to all stores
      onStoreSelectionComplete(assignedStores.map(store => store.id))
      return
    }

    setAssigning(true)
    try {
      // Save user store assignments
      const assignments = assignedStores.map(store => ({
        user_id: userId,
        store_id: store.id,
        role: 'employee', // Default role, can be customized
        is_primary: store.id === assignedStores[0]?.id, // First store is primary
        assigned_by: userId
      }))

      // Delete existing assignments
      await supabase
        .from('user_store_assignments')
        .delete()
        .eq('user_id', userId)

      // Insert new assignments
      if (assignments.length > 0) {
        const { error } = await supabase
          .from('user_store_assignments')
          .insert(assignments)

        if (error) throw error
      }

      onStoreSelectionComplete(assignedStores.map(store => store.id))
    } catch (error) {
      console.error('Error saving store assignments:', error)
      Alert.alert('Error', 'Failed to save store assignments')
    } finally {
      setAssigning(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2089dc" />
        <Text style={styles.loadingText}>Loading stores...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Assign Stores</Text>
        <Text style={styles.subtitle}>Select stores for your account</Text>
      </View>

      <View style={styles.content}>
        {/* Available Stores Panel */}
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>🏪 Available Stores</Text>
            <Text style={styles.count}>Showing all {filteredAvailableStores.length}</Text>
          </View>
          
          <TextInput
            style={styles.filterInput}
            placeholder="Filter"
            placeholderTextColor="#999"
            value={availableFilter}
            onChangeText={setAvailableFilter}
          />

          <ScrollView style={styles.listContainer}>
            {filteredAvailableStores.map(store => (
              <TouchableOpacity
                key={store.id}
                style={[
                  styles.listItem,
                  selectedAvailable.has(store.id) && styles.selectedItem
                ]}
                onPress={() => handleAvailableSelect(store.id)}
              >
                <Text style={styles.storeName}>{store.name}</Text>
                {store.address && (
                  <Text style={styles.storeAddress}>{store.address}</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Transfer Controls */}
        <View style={styles.transferControls}>
          <TouchableOpacity
            style={[styles.transferButton, selectedAvailable.size === 0 && styles.disabledButton]}
            onPress={moveToAssigned}
            disabled={selectedAvailable.size === 0}
          >
            <Text style={styles.transferButtonText}>→ →</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.transferButton, selectedAssigned.size === 0 && styles.disabledButton]}
            onPress={moveToAvailable}
            disabled={selectedAssigned.size === 0}
          >
            <Text style={styles.transferButtonText}>← ←</Text>
          </TouchableOpacity>
        </View>

        {/* Assigned Stores Panel */}
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>✅ Assigned Stores</Text>
            <Text style={styles.count}>Showing all {filteredAssignedStores.length}</Text>
          </View>
          
          <TextInput
            style={styles.filterInput}
            placeholder="Filter"
            placeholderTextColor="#999"
            value={assignedFilter}
            onChangeText={setAssignedFilter}
          />

          <ScrollView style={styles.listContainer}>
            {filteredAssignedStores.map(store => (
              <TouchableOpacity
                key={store.id}
                style={[
                  styles.listItem,
                  selectedAssigned.has(store.id) && styles.selectedItem
                ]}
                onPress={() => handleAssignedSelect(store.id)}
              >
                <Text style={styles.storeName}>{store.name}</Text>
                {store.address && (
                  <Text style={styles.storeAddress}>{store.address}</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Assign Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.assignButton, assigning && styles.disabledButton]}
          onPress={handleAssign}
          disabled={assigning}
        >
          {assigning ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.assignButtonText}>Assign</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    padding: 10,
  },
  panel: {
    flex: 1,
    backgroundColor: '#fff',
    marginHorizontal: 5,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  panelHeader: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  count: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  filterInput: {
    margin: 15,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    fontSize: 16,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 15,
  },
  listItem: {
    padding: 12,
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
  transferControls: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  transferButton: {
    backgroundColor: '#2089dc',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  transferButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'flex-end',
  },
  assignButton: {
    backgroundColor: '#2089dc',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  assignButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
})

export default StoreSelection
