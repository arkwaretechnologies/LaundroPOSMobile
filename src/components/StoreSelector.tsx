import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useStore } from '../context/StoreContext'
import { supabase } from '../../lib/supabase'

interface StoreSelectorProps {
  style?: any
}

const StoreSelector: React.FC<StoreSelectorProps> = ({ style }) => {
  const { currentStore, availableStores, switchStore } = useStore()
  const [modalVisible, setModalVisible] = useState(false)

  const handleStoreSelect = (storeId: string) => {
    switchStore(storeId)
    setModalVisible(false)
  }

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              setModalVisible(false)
              const { error } = await supabase.auth.signOut()
              if (error) throw error
              // Navigation will be handled by App.tsx auth state listener
            } catch (error: any) {
              console.error('Error logging out:', error)
              Alert.alert('Error', 'Failed to logout. Please try again.')
            }
          },
        },
      ]
    )
  }

  if (!currentStore) {
    return null
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.selector, style]}
        onPress={() => setModalVisible(true)}
      >
        <View style={styles.storeInfo}>
          <Text style={styles.storeEmoji}>🏪</Text>
          <View style={styles.storeDetails}>
            <Text style={styles.storeName} numberOfLines={1}>
              {currentStore.name}
            </Text>
            {currentStore.address && (
              <Text style={styles.storeAddress} numberOfLines={1}>
                {currentStore.address}
              </Text>
            )}
          </View>
        </View>
        <Text style={styles.arrow}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Store</Text>
              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={styles.logoutIconButton}
                  onPress={handleLogout}
                >
                  <Ionicons name="log-out-outline" size={22} color="#ef4444" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={styles.storeList}>
              {availableStores.map(store => (
                <TouchableOpacity
                  key={store.id}
                  style={[
                    styles.storeItem,
                    currentStore.id === store.id && styles.selectedStore
                  ]}
                  onPress={() => handleStoreSelect(store.id)}
                >
                  <Text style={styles.storeEmoji}>🏪</Text>
                  <View style={styles.storeInfo}>
                    <Text style={[
                      styles.storeItemName,
                      currentStore.id === store.id && styles.selectedStoreText
                    ]}>
                      {store.name}
                    </Text>
                    {store.address && (
                      <Text style={[
                        styles.storeItemAddress,
                        currentStore.id === store.id && styles.selectedStoreText
                      ]}>
                        {store.address}
                      </Text>
                    )}
                  </View>
                  {currentStore.id === store.id && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  storeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  storeEmoji: {
    fontSize: 20,
    marginRight: 10,
  },
  storeDetails: {
    flex: 1,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  storeAddress: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  arrow: {
    fontSize: 12,
    color: '#666',
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  logoutIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
  },
  storeList: {
    maxHeight: 400,
  },
  storeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedStore: {
    backgroundColor: '#e3f2fd',
  },
  storeItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
  },
  storeItemAddress: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  selectedStoreText: {
    color: '#1976d2',
  },
  checkmark: {
    fontSize: 20,
    color: '#1976d2',
    marginLeft: 10,
  },
})

export default StoreSelector
