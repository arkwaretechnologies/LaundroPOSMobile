import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { useStore } from '../context/StoreContext'

interface InventoryItem {
  id: string
  name: string
  sku: string | null
  category: string | null
  unit_of_measure: string
  current_stock: number
  low_stock_threshold: number
  reorder_point: number
  unit_price: number
  is_active: boolean
}

interface InventoryTransaction {
  id: string
  transaction_type: 'usage' | 'purchase' | 'adjustment' | 'return'
  quantity: number
  previous_stock: number
  new_stock: number
  notes: string | null
  created_at: string
}

const InventoryScreen: React.FC = () => {
  const { currentStore } = useStore()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  
  // Selected item
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [itemHistory, setItemHistory] = useState<InventoryTransaction[]>([])
  
  // Form states
  const [newItem, setNewItem] = useState({
    name: '',
    sku: '',
    category: 'detergent',
    unit_of_measure: 'pcs',
    current_stock: '0',
    low_stock_threshold: '5',
    reorder_point: '10',
    unit_price: '0',
  })
  
  const [adjustment, setAdjustment] = useState({
    type: 'purchase' as 'purchase' | 'adjustment' | 'return',
    quantity: '',
    notes: '',
  })

  useEffect(() => {
    loadInventory()
  }, [currentStore])

  useEffect(() => {
    filterItems()
  }, [searchQuery, items])

  const loadInventory = async () => {
    if (!currentStore) return
    
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('store_id', currentStore.id)
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setItems(data || [])
    } catch (error: any) {
      console.error('Error loading inventory:', error)
      Alert.alert('Error', 'Failed to load inventory')
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadInventory()
    setRefreshing(false)
  }

  const filterItems = () => {
    if (!searchQuery.trim()) {
      setFilteredItems(items)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = items.filter(item =>
      item.name.toLowerCase().includes(query) ||
      item.sku?.toLowerCase().includes(query) ||
      item.category?.toLowerCase().includes(query)
    )
    setFilteredItems(filtered)
  }

  const handleAddItem = async () => {
    if (!currentStore || !newItem.name.trim()) {
      Alert.alert('Validation Error', 'Item name is required')
      return
    }

    try {
      const { data: authData } = await supabase.auth.getUser()
      
      const { error } = await supabase
        .from('inventory_items')
        .insert({
          store_id: currentStore.id,
          name: newItem.name,
          sku: newItem.sku || null,
          category: newItem.category,
          unit_of_measure: newItem.unit_of_measure,
          current_stock: parseFloat(newItem.current_stock) || 0,
          low_stock_threshold: parseFloat(newItem.low_stock_threshold) || 0,
          reorder_point: parseFloat(newItem.reorder_point) || 0,
          unit_price: parseFloat(newItem.unit_price) || 0,
        })

      if (error) throw error

      Alert.alert('Success', 'Inventory item added successfully')
      setShowAddModal(false)
      resetNewItemForm()
      loadInventory()
    } catch (error: any) {
      console.error('Error adding item:', error)
      Alert.alert('Error', 'Failed to add inventory item')
    }
  }

  const handleEditItem = async () => {
    if (!selectedItem || !newItem.name.trim()) {
      Alert.alert('Validation Error', 'Item name is required')
      return
    }

    try {
      const { error } = await supabase
        .from('inventory_items')
        .update({
          name: newItem.name,
          sku: newItem.sku || null,
          category: newItem.category,
          unit_of_measure: newItem.unit_of_measure,
          low_stock_threshold: parseFloat(newItem.low_stock_threshold) || 0,
          reorder_point: parseFloat(newItem.reorder_point) || 0,
          unit_price: parseFloat(newItem.unit_price) || 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedItem.id)

      if (error) throw error

      Alert.alert('Success', 'Inventory item updated successfully')
      setShowEditModal(false)
      setSelectedItem(null)
      resetNewItemForm()
      loadInventory()
    } catch (error: any) {
      console.error('Error updating item:', error)
      Alert.alert('Error', 'Failed to update inventory item')
    }
  }

  const handleDeleteItem = async (item: InventoryItem) => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Soft delete by setting is_active to false
              const { error } = await supabase
                .from('inventory_items')
                .update({ is_active: false, updated_at: new Date().toISOString() })
                .eq('id', item.id)

              if (error) throw error

              Alert.alert('Success', 'Inventory item deleted successfully')
              loadInventory()
            } catch (error: any) {
              console.error('Error deleting item:', error)
              Alert.alert('Error', 'Failed to delete inventory item')
            }
          },
        },
      ]
    )
  }

  const openEditModal = (item: InventoryItem) => {
    setSelectedItem(item)
    setNewItem({
      name: item.name,
      sku: item.sku || '',
      category: item.category || 'detergent',
      unit_of_measure: item.unit_of_measure,
      current_stock: item.current_stock.toString(),
      low_stock_threshold: item.low_stock_threshold.toString(),
      reorder_point: item.reorder_point.toString(),
      unit_price: item.unit_price.toString(),
    })
    setShowEditModal(true)
  }

  const handleAdjustStock = async () => {
    if (!currentStore || !selectedItem || !adjustment.quantity) {
      Alert.alert('Validation Error', 'Quantity is required')
      return
    }

    try {
      const { data: authData } = await supabase.auth.getUser()
      const quantity = parseFloat(adjustment.quantity)
      
      // Calculate new stock based on transaction type
      let newStock = selectedItem.current_stock
      if (adjustment.type === 'purchase' || adjustment.type === 'return') {
        newStock += quantity
      } else if (adjustment.type === 'adjustment') {
        // For adjustments, the quantity IS the new stock level
        newStock = quantity
      }

      // Update inventory item
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({ current_stock: newStock })
        .eq('id', selectedItem.id)

      if (updateError) throw updateError

      // Create transaction record
      const { error: transactionError } = await supabase
        .from('inventory_transactions')
        .insert({
          store_id: currentStore.id,
          inventory_item_id: selectedItem.id,
          transaction_type: adjustment.type,
          quantity: adjustment.type === 'adjustment' ? newStock - selectedItem.current_stock : quantity,
          previous_stock: selectedItem.current_stock,
          new_stock: newStock,
          notes: adjustment.notes || null,
          created_by: authData.user?.id,
        })

      if (transactionError) throw transactionError

      Alert.alert('Success', 'Stock adjusted successfully')
      setShowAdjustModal(false)
      setSelectedItem(null)
      resetAdjustmentForm()
      loadInventory()
    } catch (error: any) {
      console.error('Error adjusting stock:', error)
      Alert.alert('Error', 'Failed to adjust stock')
    }
  }

  const loadItemHistory = async (item: InventoryItem) => {
    try {
      const { data, error } = await supabase
        .from('inventory_transactions')
        .select('*')
        .eq('inventory_item_id', item.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      setItemHistory(data || [])
      setSelectedItem(item)
      setShowHistoryModal(true)
    } catch (error: any) {
      console.error('Error loading history:', error)
      Alert.alert('Error', 'Failed to load transaction history')
    }
  }

  const resetNewItemForm = () => {
    setNewItem({
      name: '',
      sku: '',
      category: 'detergent',
      unit_of_measure: 'pcs',
      current_stock: '0',
      low_stock_threshold: '5',
      reorder_point: '10',
      unit_price: '0',
    })
  }

  const resetAdjustmentForm = () => {
    setAdjustment({
      type: 'purchase',
      quantity: '',
      notes: '',
    })
  }

  const getStockStatusColor = (item: InventoryItem) => {
    if (item.current_stock <= item.low_stock_threshold) return '#ef4444' // Red
    if (item.current_stock <= item.reorder_point) return '#f59e0b' // Orange
    return '#10b981' // Green
  }

  const getStockStatusIcon = (item: InventoryItem) => {
    if (item.current_stock <= item.low_stock_threshold) return 'alert-circle'
    if (item.current_stock <= item.reorder_point) return 'warning'
    return 'checkmark-circle'
  }

  const renderInventoryItem = ({ item }: { item: InventoryItem }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          {item.sku && <Text style={styles.itemSku}>SKU: {item.sku}</Text>}
          {item.category && (
            <Text style={styles.itemCategory}>{item.category}</Text>
          )}
        </View>
        <Ionicons
          name={getStockStatusIcon(item)}
          size={24}
          color={getStockStatusColor(item)}
        />
      </View>

      <View style={styles.stockInfo}>
        <View style={styles.stockRow}>
          <Text style={styles.stockLabel}>Current Stock:</Text>
          <Text style={[styles.stockValue, { color: getStockStatusColor(item) }]}>
            {item.current_stock} {item.unit_of_measure}
          </Text>
        </View>
        <View style={styles.stockRow}>
          <Text style={styles.stockLabel}>Min Stock:</Text>
          <Text style={styles.stockValue}>{item.low_stock_threshold} {item.unit_of_measure}</Text>
        </View>
        <View style={styles.stockRow}>
          <Text style={styles.stockLabel}>Reorder Level:</Text>
          <Text style={styles.stockValue}>{item.reorder_point} {item.unit_of_measure}</Text>
        </View>
      </View>

      <View style={styles.itemActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => openEditModal(item)}
        >
          <Ionicons name="create-outline" size={16} color="#3b82f6" />
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.adjustButton]}
          onPress={() => {
            setSelectedItem(item)
            setShowAdjustModal(true)
          }}
        >
          <Ionicons name="swap-vertical-outline" size={16} color="#10b981" />
          <Text style={styles.adjustButtonText}>Stock</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteItem(item)}
        >
          <Ionicons name="trash-outline" size={16} color="#ef4444" />
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading inventory...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Inventory Management</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add-circle" size={28} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search items..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Inventory List */}
      <FlatList
        data={filteredItems}
        renderItem={renderInventoryItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>No inventory items</Text>
            <Text style={styles.emptySubtext}>Tap + to add your first item</Text>
          </View>
        }
      />

      {/* Add Item Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent={false}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.fullModalContainer}>
            <View style={styles.fullModalHeader}>
              <Text style={styles.fullModalTitle}>Add Inventory Item</Text>
              <TouchableOpacity onPress={() => {
                setShowAddModal(false)
                resetNewItemForm()
              }}>
                <Ionicons name="close" size={28} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.fullModalBody}
              contentContainerStyle={styles.fullModalBodyContent}
              keyboardShouldPersistTaps="handled"
            >
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Item Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Ariel Detergent Powder"
                value={newItem.name}
                onChangeText={(text) => setNewItem({ ...newItem, name: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>SKU (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., ARIEL-1KG"
                value={newItem.sku}
                onChangeText={(text) => setNewItem({ ...newItem, sku: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.categoryButtons}>
                {['detergent', 'softener', 'bleach', 'supplies', 'others'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryButton,
                      newItem.category === cat && styles.categoryButtonActive
                    ]}
                    onPress={() => setNewItem({ ...newItem, category: cat })}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      newItem.category === cat && styles.categoryButtonTextActive
                    ]}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Unit of Measure</Text>
              <View style={styles.categoryButtons}>
                {['pcs', 'bottle', 'kg', 'liter', 'pack', 'box'].map((unit) => (
                  <TouchableOpacity
                    key={unit}
                    style={[
                      styles.categoryButton,
                      newItem.unit_of_measure === unit && styles.categoryButtonActive
                    ]}
                    onPress={() => setNewItem({ ...newItem, unit_of_measure: unit })}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      newItem.unit_of_measure === unit && styles.categoryButtonTextActive
                    ]}>
                      {unit}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Current Stock</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                value={newItem.current_stock}
                onChangeText={(text) => setNewItem({ ...newItem, current_stock: text })}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Minimum Stock (Low Stock Alert)</Text>
              <TextInput
                style={styles.input}
                placeholder="5"
                value={newItem.low_stock_threshold}
                onChangeText={(text) => setNewItem({ ...newItem, low_stock_threshold: text })}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Reorder Level</Text>
              <TextInput
                style={styles.input}
                placeholder="10"
                value={newItem.reorder_point}
                onChangeText={(text) => setNewItem({ ...newItem, reorder_point: text })}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Unit Cost (₱)</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                value={newItem.unit_price}
                onChangeText={(text) => setNewItem({ ...newItem, unit_price: text })}
                keyboardType="numeric"
              />
            </View>

            </ScrollView>

            <View style={styles.fullModalActions}>
              <TouchableOpacity
                style={styles.fullCancelButton}
                onPress={() => {
                  setShowAddModal(false)
                  resetNewItemForm()
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.fullSaveButton}
                onPress={handleAddItem}
              >
                <Text style={styles.saveButtonText}>Add Item</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Item Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent={false}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.fullModalContainer}>
            <View style={styles.fullModalHeader}>
              <Text style={styles.fullModalTitle}>Edit Inventory Item</Text>
              <TouchableOpacity onPress={() => {
                setShowEditModal(false)
                setSelectedItem(null)
                resetNewItemForm()
              }}>
                <Ionicons name="close" size={28} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.fullModalBody}
              contentContainerStyle={styles.fullModalBodyContent}
              keyboardShouldPersistTaps="handled"
            >
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Item Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Ariel Detergent Powder"
                value={newItem.name}
                onChangeText={(text) => setNewItem({ ...newItem, name: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>SKU (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., ARIEL-1KG"
                value={newItem.sku}
                onChangeText={(text) => setNewItem({ ...newItem, sku: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.categoryButtons}>
                {['detergent', 'softener', 'bleach', 'supplies', 'others'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryButton,
                      newItem.category === cat && styles.categoryButtonActive
                    ]}
                    onPress={() => setNewItem({ ...newItem, category: cat })}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      newItem.category === cat && styles.categoryButtonTextActive
                    ]}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Unit of Measure</Text>
              <View style={styles.categoryButtons}>
                {['pcs', 'bottle', 'kg', 'liter', 'pack', 'box'].map((unit) => (
                  <TouchableOpacity
                    key={unit}
                    style={[
                      styles.categoryButton,
                      newItem.unit_of_measure === unit && styles.categoryButtonActive
                    ]}
                    onPress={() => setNewItem({ ...newItem, unit_of_measure: unit })}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      newItem.unit_of_measure === unit && styles.categoryButtonTextActive
                    ]}>
                      {unit}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Current Stock (Read-Only)</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={newItem.current_stock}
                editable={false}
              />
              <Text style={styles.inputHint}>Use "Stock" button to adjust quantity</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Minimum Stock (Low Stock Alert)</Text>
              <TextInput
                style={styles.input}
                placeholder="5"
                value={newItem.low_stock_threshold}
                onChangeText={(text) => setNewItem({ ...newItem, low_stock_threshold: text })}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Reorder Level</Text>
              <TextInput
                style={styles.input}
                placeholder="10"
                value={newItem.reorder_point}
                onChangeText={(text) => setNewItem({ ...newItem, reorder_point: text })}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Unit Cost (₱)</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                value={newItem.unit_price}
                onChangeText={(text) => setNewItem({ ...newItem, unit_price: text })}
                keyboardType="numeric"
              />
            </View>

            </ScrollView>

            <View style={styles.fullModalActions}>
              <TouchableOpacity
                style={styles.fullCancelButton}
                onPress={() => {
                  setShowEditModal(false)
                  setSelectedItem(null)
                  resetNewItemForm()
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.fullSaveButton}
                onPress={handleEditItem}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Adjust Stock Modal */}
      <Modal visible={showAdjustModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Adjust Stock</Text>
            {selectedItem && (
              <Text style={styles.modalSubtitle}>
                {selectedItem.name} - Current: {selectedItem.current_stock} {selectedItem.unit_of_measure}
              </Text>
            )}
            
            <Text style={styles.inputLabel}>Transaction Type</Text>
            <View style={styles.typeButtons}>
              {(['purchase', 'adjustment', 'return'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeButton,
                    adjustment.type === type && styles.typeButtonActive
                  ]}
                  onPress={() => setAdjustment({ ...adjustment, type })}
                >
                  <Text style={[
                    styles.typeButtonText,
                    adjustment.type === type && styles.typeButtonTextActive
                  ]}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.input}
              placeholder={adjustment.type === 'adjustment' ? 'New Stock Level' : 'Quantity'}
              value={adjustment.quantity}
              onChangeText={(text) => setAdjustment({ ...adjustment, quantity: text })}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Notes (optional)"
              value={adjustment.notes}
              onChangeText={(text) => setAdjustment({ ...adjustment, notes: text })}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowAdjustModal(false)
                  setSelectedItem(null)
                  resetAdjustmentForm()
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleAdjustStock}
              >
                <Text style={styles.saveButtonText}>Update Stock</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* History Modal */}
      <Modal visible={showHistoryModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Transaction History</Text>
            {selectedItem && (
              <Text style={styles.modalSubtitle}>{selectedItem.name}</Text>
            )}
            
            <FlatList
              data={itemHistory}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <View style={styles.historyItem}>
                  <View style={styles.historyHeader}>
                    <Text style={styles.historyType}>{item.transaction_type}</Text>
                    <Text style={styles.historyDate}>
                      {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={styles.historyDetail}>
                    Quantity: {item.quantity} | {item.previous_stock} → {item.new_stock}
                  </Text>
                  {item.notes && (
                    <Text style={styles.historyNotes}>{item.notes}</Text>
                  )}
                </View>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No transaction history</Text>
              }
            />

            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => {
                setShowHistoryModal(false)
                setSelectedItem(null)
                setItemHistory([])
              }}
            >
              <Text style={styles.cancelButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  addButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#111827',
  },
  listContainer: {
    padding: 16,
  },
  itemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  itemSku: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  itemCategory: {
    fontSize: 12,
    color: '#9ca3af',
    textTransform: 'capitalize',
  },
  stockInfo: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  stockLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  stockValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  editButton: {
    backgroundColor: '#eff6ff',
  },
  editButtonText: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '600',
  },
  adjustButton: {
    backgroundColor: '#d1fae5',
  },
  adjustButtonText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#fee2e2',
  },
  deleteButtonText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
  },
  historyButton: {
    backgroundColor: '#f3f4f6',
  },
  historyButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 0,
  },
  inputDisabled: {
    backgroundColor: '#e5e7eb',
    color: '#9ca3af',
  },
  inputHint: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  categoryButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  categoryButtonActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  categoryButtonTextActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#3b82f6',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  typeButtonTextActive: {
    color: '#ffffff',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  historyItem: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  historyType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    textTransform: 'capitalize',
  },
  historyDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  historyDetail: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  historyNotes: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  // Full-screen modal styles (for Edit modal)
  fullModalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  fullModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  fullModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  fullModalBody: {
    flex: 1,
  },
  fullModalBodyContent: {
    padding: 20,
    paddingBottom: 40,
  },
  fullModalActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  fullCancelButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  fullSaveButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#3b82f6',
  },
})

export default InventoryScreen

