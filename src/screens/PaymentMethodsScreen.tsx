import React, { useState, useEffect } from 'react'
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  Alert,
  ActivityIndicator,
  Switch
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { useStore } from '../context/StoreContext'
import { PaymentMethod } from '../types/paymentMethod'

const PaymentMethodsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { currentStore } = useStore()
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null)
  
  // Form state
  const [methodName, setMethodName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('cash-outline')
  const [isActive, setIsActive] = useState(true)
  const [requiresReference, setRequiresReference] = useState(false)
  const [sortOrder, setSortOrder] = useState('0')

  const availableIcons = [
    { name: 'cash-outline', label: 'Cash' },
    { name: 'card-outline', label: 'Card' },
    { name: 'phone-portrait-outline', label: 'Mobile' },
    { name: 'wallet-outline', label: 'Wallet' },
    { name: 'qr-code-outline', label: 'QR Code' },
    { name: 'logo-paypal', label: 'PayPal' },
    { name: 'globe-outline', label: 'Online' },
  ]

  useEffect(() => {
    loadPaymentMethods()
  }, [currentStore])

  const loadPaymentMethods = async () => {
    if (!currentStore) return

    try {
      setLoading(true)
      // Load both global payment methods (store_id is NULL) AND this store's custom payment methods
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .or(`store_id.is.null,store_id.eq.${currentStore.id}`)
        .order('store_id', { ascending: true, nullsFirst: true }) // Global first
        .order('sort_order', { ascending: true })

      if (error) throw error
      setPaymentMethods(data || [])
    } catch (error: any) {
      console.error('Error loading payment methods:', error)
      Alert.alert('Error', 'Failed to load payment methods')
    } finally {
      setLoading(false)
    }
  }

  const openModal = (method?: PaymentMethod) => {
    if (method) {
      // Don't allow editing global payment methods
      if (!method.store_id) {
        Alert.alert('Cannot Edit', 'Global payment methods can only be edited by the system administrator. You can create your own custom payment method instead.')
        return
      }
      setEditingMethod(method)
      setMethodName(method.name)
      setDisplayName(method.display_name)
      setDescription(method.description || '')
      setIcon(method.icon || 'cash-outline')
      setIsActive(method.is_active)
      setRequiresReference(method.requires_reference)
      setSortOrder(method.sort_order.toString())
    } else {
      resetForm()
    }
    setShowModal(true)
  }

  const resetForm = () => {
    setEditingMethod(null)
    setMethodName('')
    setDisplayName('')
    setDescription('')
    setIcon('cash-outline')
    setIsActive(true)
    setRequiresReference(false)
    setSortOrder('0')
  }

  const validateName = (name: string): boolean => {
    // Name must be lowercase, alphanumeric with underscores only
    return /^[a-z0-9_]+$/.test(name)
  }

  const handleSave = async () => {
    if (!methodName || !displayName) {
      Alert.alert('Validation Error', 'Please fill in method name and display name')
      return
    }

    if (!validateName(methodName)) {
      Alert.alert('Validation Error', 'Method name must be lowercase, alphanumeric with underscores only (e.g., "cash", "credit_card")')
      return
    }

    const sortOrderNum = parseInt(sortOrder)
    if (isNaN(sortOrderNum) || sortOrderNum < 0) {
      Alert.alert('Validation Error', 'Please enter a valid sort order (0 or greater)')
      return
    }

    if (!currentStore) {
      Alert.alert('Error', 'No store selected')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const methodData = {
        name: methodName.toLowerCase().trim(),
        display_name: displayName.trim(),
        description: description.trim() || null,
        icon: icon || null,
        is_active: isActive,
        sort_order: sortOrderNum,
        store_id: currentStore.id, // Store-specific payment method
        requires_reference: requiresReference,
        metadata: {},
        created_by: user.id,
      }

      if (editingMethod) {
        // Update existing payment method
        const { error } = await supabase
          .from('payment_methods')
          .update({
            ...methodData,
            created_by: undefined, // Don't update created_by on edit
          })
          .eq('id', editingMethod.id)

        if (error) throw error
        Alert.alert('Success', 'Payment method updated successfully')
      } else {
        // Check if name already exists for this store
        const { data: existing } = await supabase
          .from('payment_methods')
          .select('id')
          .eq('name', methodData.name)
          .or(`store_id.is.null,store_id.eq.${currentStore.id}`)
          .single()

        if (existing) {
          Alert.alert('Validation Error', 'A payment method with this name already exists')
          return
        }

        // Create new payment method
        const { error } = await supabase
          .from('payment_methods')
          .insert(methodData)

        if (error) throw error
        Alert.alert('Success', 'Payment method created successfully')
      }

      setShowModal(false)
      resetForm()
      loadPaymentMethods()
    } catch (error: any) {
      console.error('Error saving payment method:', error)
      Alert.alert('Error', error.message || 'Failed to save payment method')
    }
  }

  const handleDelete = (method: PaymentMethod) => {
    // Don't allow deleting global payment methods
    if (!method.store_id) {
      Alert.alert('Cannot Delete', 'Global payment methods cannot be deleted. You can only delete custom payment methods that you created.')
      return
    }

    Alert.alert(
      'Delete Payment Method',
      `Are you sure you want to delete "${method.display_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('payment_methods')
                .delete()
                .eq('id', method.id)

              if (error) throw error
              Alert.alert('Success', 'Payment method deleted successfully')
              loadPaymentMethods()
            } catch (error: any) {
              console.error('Error deleting payment method:', error)
              Alert.alert('Error', 'Failed to delete payment method')
            }
          },
        },
      ]
    )
  }

  const toggleMethodStatus = async (method: PaymentMethod) => {
    // Don't allow toggling global payment methods
    if (!method.store_id) {
      Alert.alert('Cannot Modify', 'Global payment methods cannot be modified. You can create your own custom payment method instead.')
      return
    }

    try {
      const { error } = await supabase
        .from('payment_methods')
        .update({ is_active: !method.is_active })
        .eq('id', method.id)

      if (error) throw error
      loadPaymentMethods()
    } catch (error: any) {
      console.error('Error updating payment method status:', error)
      Alert.alert('Error', 'Failed to update payment method status')
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading payment methods...</Text>
      </View>
    )
  }

  const globalMethods = paymentMethods.filter(m => !m.store_id)
  const customMethods = paymentMethods.filter(m => m.store_id === currentStore?.id)

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Payment Methods</Text>
          <Text style={styles.subtitle}>{currentStore?.name}</Text>
        </View>
        <TouchableOpacity onPress={() => openModal()} style={styles.addButton}>
          <Ionicons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Payment Methods List */}
      <ScrollView style={styles.content}>
        {paymentMethods.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="card-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No Payment Methods Yet</Text>
            <Text style={styles.emptySubtitle}>Add your first payment method to get started</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={() => openModal()}>
              <Text style={styles.emptyButtonText}>Add Payment Method</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Global Payment Methods */}
            {globalMethods.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Ionicons name="globe" size={20} color="#3b82f6" />
                  <Text style={styles.sectionHeaderText}>Default Payment Methods (All Stores)</Text>
                </View>
                
                {globalMethods.map((method) => (
                  <View key={method.id} style={[styles.methodCard, styles.globalMethodCard]}>
                    <View style={styles.globalBadge}>
                      <Ionicons name="globe" size={12} color="#3b82f6" />
                      <Text style={styles.globalBadgeText}>DEFAULT</Text>
                    </View>
                    <View style={styles.methodHeader}>
                      <View style={styles.methodLeft}>
                        <View style={[styles.methodIconContainer, { opacity: method.is_active ? 1 : 0.5 }]}>
                          <Ionicons name={method.icon as any || 'cash-outline'} size={24} color="#3b82f6" />
                        </View>
                        <View style={styles.methodInfo}>
                          <Text style={[styles.methodName, { opacity: method.is_active ? 1 : 0.5 }]}>
                            {method.display_name}
                          </Text>
                          {method.description && (
                            <Text style={styles.methodDescription}>{method.description}</Text>
                          )}
                          <View style={styles.methodTags}>
                            <Text style={styles.methodTag}>Name: {method.name}</Text>
                            {method.requires_reference && (
                              <View style={styles.referenceBadge}>
                                <Text style={styles.referenceText}>Requires Reference</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                      <View style={styles.methodRight}>
                        <View style={[styles.statusBadge, method.is_active ? styles.activeBadge : styles.inactiveBadge]}>
                          <Text style={[styles.statusText, method.is_active ? styles.activeText : styles.inactiveText]}>
                            {method.is_active ? 'Active' : 'Inactive'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </>
            )}

            {/* Custom Payment Methods */}
            {customMethods.length > 0 && (
              <>
                <View style={[styles.sectionHeader, { marginTop: 16 }]}>
                  <Ionicons name="card" size={20} color="#10b981" />
                  <Text style={styles.sectionHeaderText}>Your Custom Payment Methods</Text>
                </View>
                
                {customMethods.map((method) => (
                  <View key={method.id} style={styles.methodCard}>
                    <View style={styles.methodHeader}>
                      <View style={styles.methodLeft}>
                        <View style={[styles.methodIconContainer, { opacity: method.is_active ? 1 : 0.5 }]}>
                          <Ionicons name={method.icon as any || 'cash-outline'} size={24} color="#3b82f6" />
                        </View>
                        <View style={styles.methodInfo}>
                          <Text style={[styles.methodName, { opacity: method.is_active ? 1 : 0.5 }]}>
                            {method.display_name}
                          </Text>
                          {method.description && (
                            <Text style={styles.methodDescription}>{method.description}</Text>
                          )}
                          <View style={styles.methodTags}>
                            <Text style={styles.methodTag}>Name: {method.name}</Text>
                            {method.requires_reference && (
                              <View style={styles.referenceBadge}>
                                <Text style={styles.referenceText}>Requires Reference</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                      <View style={styles.methodRight}>
                        <View style={[styles.statusBadge, method.is_active ? styles.activeBadge : styles.inactiveBadge]}>
                          <Text style={[styles.statusText, method.is_active ? styles.activeText : styles.inactiveText]}>
                            {method.is_active ? 'Active' : 'Inactive'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.methodActions}>
                      <TouchableOpacity 
                        style={styles.actionButton} 
                        onPress={() => toggleMethodStatus(method)}
                      >
                        <Ionicons 
                          name={method.is_active ? 'eye-off' : 'eye'} 
                          size={18} 
                          color="#6b7280" 
                        />
                        <Text style={styles.actionButtonText}>
                          {method.is_active ? 'Deactivate' : 'Activate'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={styles.actionButton} 
                        onPress={() => openModal(method)}
                      >
                        <Ionicons name="create" size={18} color="#3b82f6" />
                        <Text style={[styles.actionButtonText, { color: '#3b82f6' }]}>Edit</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={styles.actionButton} 
                        onPress={() => handleDelete(method)}
                      >
                        <Ionicons name="trash" size={18} color="#ef4444" />
                        <Text style={[styles.actionButtonText, { color: '#ef4444' }]}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Payment Method Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingMethod ? 'Edit Payment Method' : 'Add New Payment Method'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Method Name (identifier) */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Method Name (Identifier) *</Text>
                <Text style={styles.hint}>Lowercase, alphanumeric with underscores only (e.g., "cash", "credit_card")</Text>
                <TextInput
                  style={styles.input}
                  value={methodName}
                  onChangeText={setMethodName}
                  placeholder="e.g., cash, credit_card, paypal"
                  autoCapitalize="none"
                  editable={!editingMethod} // Can't change name when editing
                />
              </View>

              {/* Display Name */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Display Name *</Text>
                <TextInput
                  style={styles.input}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="e.g., Cash, Credit Card, PayPal"
                />
              </View>

              {/* Description */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Brief description of the payment method"
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Icon */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Icon</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconScroll}>
                  {availableIcons.map((iconOption) => (
                    <TouchableOpacity
                      key={iconOption.name}
                      style={[
                        styles.iconOption,
                        icon === iconOption.name && styles.iconOptionSelected
                      ]}
                      onPress={() => setIcon(iconOption.name)}
                    >
                      <Ionicons 
                        name={iconOption.name as any} 
                        size={24} 
                        color={icon === iconOption.name ? '#3b82f6' : '#6b7280'} 
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Sort Order */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Sort Order</Text>
                <Text style={styles.hint}>Lower numbers appear first (0, 1, 2, ...)</Text>
                <TextInput
                  style={styles.input}
                  value={sortOrder}
                  onChangeText={setSortOrder}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>

              {/* Requires Reference */}
              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <View style={styles.switchLabelContainer}>
                    <Text style={styles.label}>Requires Reference Number</Text>
                    <Text style={styles.hint}>Enable if this method needs a transaction ID (e.g., digital wallets)</Text>
                  </View>
                  <Switch
                    value={requiresReference}
                    onValueChange={setRequiresReference}
                    trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
                    thumbColor={requiresReference ? '#ffffff' : '#f4f3f4'}
                  />
                </View>
              </View>

              {/* Status Toggle */}
              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <Text style={styles.label}>Payment Method Active</Text>
                  <Switch
                    value={isActive}
                    onValueChange={setIsActive}
                    trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
                    thumbColor={isActive ? '#ffffff' : '#f4f3f4'}
                  />
                </View>
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>Save Payment Method</Text>
              </TouchableOpacity>
            </View>
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
  centerContent: {
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
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  methodCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  globalMethodCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
    backgroundColor: '#f9fafb',
  },
  globalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#eff6ff',
    borderRadius: 4,
    marginBottom: 8,
  },
  globalBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3b82f6',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  methodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  methodLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  methodIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  methodDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 6,
  },
  methodTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  methodTag: {
    fontSize: 12,
    color: '#9ca3af',
    fontFamily: 'monospace',
  },
  referenceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#fef3c7',
    borderRadius: 4,
  },
  referenceText: {
    fontSize: 10,
    color: '#92400e',
    fontWeight: '600',
  },
  methodRight: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeBadge: {
    backgroundColor: '#d1fae5',
  },
  inactiveBadge: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  activeText: {
    color: '#10b981',
  },
  inactiveText: {
    color: '#ef4444',
  },
  methodActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 6,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalBody: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  iconScroll: {
    flexGrow: 0,
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconOptionSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: 12,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#10b981',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
})

export default PaymentMethodsScreen

