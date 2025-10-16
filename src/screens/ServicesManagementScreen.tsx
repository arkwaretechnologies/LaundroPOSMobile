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
  ActivityIndicator 
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { useStore } from '../context/StoreContext'

interface Service {
  id: string
  store_id: string | null
  name: string
  description: string | null
  price: number
  icon: string
  category: string | null
  is_active: boolean
  is_global: boolean
  sort_order: number
}

const ServicesManagementScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { currentStore } = useStore()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  
  // Form state
  const [serviceName, setServiceName] = useState('')
  const [serviceDescription, setServiceDescription] = useState('')
  const [servicePrice, setServicePrice] = useState('')
  const [serviceIcon, setServiceIcon] = useState('shirt-outline')
  const [serviceCategory, setServiceCategory] = useState('wash')
  const [isActive, setIsActive] = useState(true)

  const availableIcons = [
    { name: 'shirt-outline', label: 'Shirt' },
    { name: 'sparkles-outline', label: 'Sparkles' },
    { name: 'flame-outline', label: 'Flame' },
    { name: 'cut-outline', label: 'Cut' },
    { name: 'cube-outline', label: 'Cube' },
    { name: 'flash-outline', label: 'Flash' },
    { name: 'water-outline', label: 'Water' },
    { name: 'snow-outline', label: 'Snow' },
  ]

  const categories = [
    { value: 'wash', label: 'Wash' },
    { value: 'dry-clean', label: 'Dry Clean' },
    { value: 'press', label: 'Press' },
    { value: 'alterations', label: 'Alterations' },
    { value: 'express', label: 'Express' },
    { value: 'other', label: 'Other' },
  ]

  useEffect(() => {
    loadServices()
  }, [currentStore])

  const loadServices = async () => {
    if (!currentStore) return

    try {
      setLoading(true)
      // Load both global services AND this store's custom services
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .or(`is_global.eq.true,store_id.eq.${currentStore.id}`)
        .order('is_global', { ascending: false }) // Global first
        .order('sort_order', { ascending: true })

      if (error) throw error
      setServices(data || [])
    } catch (error: any) {
      console.error('Error loading services:', error)
      Alert.alert('Error', 'Failed to load services')
    } finally {
      setLoading(false)
    }
  }

  const openModal = (service?: Service) => {
    if (service) {
      // Don't allow editing global services
      if (service.is_global) {
        Alert.alert('Cannot Edit', 'Global services can only be edited by the system administrator. You can create your own custom service instead.')
        return
      }
      setEditingService(service)
      setServiceName(service.name)
      setServiceDescription(service.description || '')
      setServicePrice(service.price.toString())
      setServiceIcon(service.icon)
      setServiceCategory(service.category || 'wash')
      setIsActive(service.is_active)
    } else {
      resetForm()
    }
    setShowModal(true)
  }

  const resetForm = () => {
    setEditingService(null)
    setServiceName('')
    setServiceDescription('')
    setServicePrice('')
    setServiceIcon('shirt-outline')
    setServiceCategory('wash')
    setIsActive(true)
  }

  const handleSave = async () => {
    if (!serviceName || !servicePrice) {
      Alert.alert('Validation Error', 'Please fill in service name and price')
      return
    }

    const price = parseFloat(servicePrice)
    if (isNaN(price) || price < 0) {
      Alert.alert('Validation Error', 'Please enter a valid price')
      return
    }

    if (!currentStore) {
      Alert.alert('Error', 'No store selected')
      return
    }

    try {
      const serviceData = {
        store_id: currentStore.id,
        name: serviceName,
        description: serviceDescription || null,
        price: price,
        icon: serviceIcon,
        category: serviceCategory,
        is_active: isActive,
        is_global: false, // Always create as custom service
        sort_order: editingService ? editingService.sort_order : services.length,
      }

      if (editingService) {
        // Update existing service
        const { error } = await supabase
          .from('services')
          .update(serviceData)
          .eq('id', editingService.id)

        if (error) throw error
        Alert.alert('Success', 'Service updated successfully')
      } else {
        // Create new service
        const { error } = await supabase
          .from('services')
          .insert(serviceData)

        if (error) throw error
        Alert.alert('Success', 'Service created successfully')
      }

      setShowModal(false)
      resetForm()
      loadServices()
    } catch (error: any) {
      console.error('Error saving service:', error)
      Alert.alert('Error', 'Failed to save service')
    }
  }

  const handleDelete = (service: Service) => {
    // Don't allow deleting global services
    if (service.is_global) {
      Alert.alert('Cannot Delete', 'Global services cannot be deleted. You can only delete custom services that you created.')
      return
    }

    Alert.alert(
      'Delete Service',
      `Are you sure you want to delete "${service.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('services')
                .delete()
                .eq('id', service.id)

              if (error) throw error
              Alert.alert('Success', 'Service deleted successfully')
              loadServices()
            } catch (error: any) {
              console.error('Error deleting service:', error)
              Alert.alert('Error', 'Failed to delete service')
            }
          },
        },
      ]
    )
  }

  const toggleServiceStatus = async (service: Service) => {
    try {
      const { error } = await supabase
        .from('services')
        .update({ is_active: !service.is_active })
        .eq('id', service.id)

      if (error) throw error
      loadServices()
    } catch (error: any) {
      console.error('Error updating service status:', error)
      Alert.alert('Error', 'Failed to update service status')
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading services...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Services & Pricing</Text>
          <Text style={styles.subtitle}>{currentStore?.name}</Text>
        </View>
        <TouchableOpacity onPress={() => openModal()} style={styles.addButton}>
          <Ionicons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Services List */}
      <ScrollView style={styles.content}>
        {services.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="pricetag-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No Services Yet</Text>
            <Text style={styles.emptySubtitle}>Add your first service to get started</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={() => openModal()}>
              <Text style={styles.emptyButtonText}>Add Service</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Section headers */}
            {services.some(s => s.is_global) && (
              <View style={styles.sectionHeader}>
                <Ionicons name="globe" size={20} color="#3b82f6" />
                <Text style={styles.sectionHeaderText}>Default Services (All Stores)</Text>
              </View>
            )}
            
            {services.filter(s => s.is_global).map((service) => (
              <View key={service.id} style={[styles.serviceCard, styles.globalServiceCard]}>
                <View style={styles.globalBadge}>
                  <Ionicons name="globe" size={12} color="#3b82f6" />
                  <Text style={styles.globalBadgeText}>DEFAULT</Text>
                </View>
                <View style={styles.serviceHeader}>
                  <View style={styles.serviceLeft}>
                    <View style={[styles.serviceIconContainer, { opacity: service.is_active ? 1 : 0.5 }]}>
                      <Ionicons name={service.icon as any} size={24} color="#3b82f6" />
                    </View>
                    <View style={styles.serviceInfo}>
                      <Text style={[styles.serviceName, { opacity: service.is_active ? 1 : 0.5 }]}>
                        {service.name}
                      </Text>
                      {service.description && (
                        <Text style={styles.serviceDescription}>{service.description}</Text>
                      )}
                      {service.category && (
                        <View style={styles.categoryBadge}>
                          <Text style={styles.categoryText}>
                            {categories.find(c => c.value === service.category)?.label || service.category}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.serviceRight}>
                    <Text style={[styles.servicePrice, { opacity: service.is_active ? 1 : 0.5 }]}>
                      ₱{service.price.toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}

            {services.some(s => !s.is_global) && (
              <View style={[styles.sectionHeader, { marginTop: 16 }]}>
                <Ionicons name="pricetag" size={20} color="#10b981" />
                <Text style={styles.sectionHeaderText}>Your Custom Services</Text>
              </View>
            )}
            
            {services.filter(s => !s.is_global).map((service) => (
              <View key={service.id} style={styles.serviceCard}>
                <View style={styles.serviceHeader}>
                  <View style={styles.serviceLeft}>
                    <View style={[styles.serviceIconContainer, { opacity: service.is_active ? 1 : 0.5 }]}>
                      <Ionicons name={service.icon as any} size={24} color="#3b82f6" />
                    </View>
                    <View style={styles.serviceInfo}>
                      <Text style={[styles.serviceName, { opacity: service.is_active ? 1 : 0.5 }]}>
                        {service.name}
                      </Text>
                      {service.description && (
                        <Text style={styles.serviceDescription}>{service.description}</Text>
                      )}
                      {service.category && (
                        <View style={styles.categoryBadge}>
                          <Text style={styles.categoryText}>
                            {categories.find(c => c.value === service.category)?.label || service.category}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.serviceRight}>
                    <Text style={[styles.servicePrice, { opacity: service.is_active ? 1 : 0.5 }]}>
                      ₱{service.price.toFixed(2)}
                    </Text>
                    <View style={[styles.statusBadge, service.is_active ? styles.activeBadge : styles.inactiveBadge]}>
                      <Text style={[styles.statusText, service.is_active ? styles.activeText : styles.inactiveText]}>
                        {service.is_active ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.serviceActions}>
                  <TouchableOpacity 
                    style={styles.actionButton} 
                    onPress={() => toggleServiceStatus(service)}
                  >
                    <Ionicons 
                      name={service.is_active ? 'eye-off' : 'eye'} 
                      size={18} 
                      color="#6b7280" 
                    />
                    <Text style={styles.actionButtonText}>
                      {service.is_active ? 'Deactivate' : 'Activate'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.actionButton} 
                    onPress={() => openModal(service)}
                  >
                    <Ionicons name="create" size={18} color="#3b82f6" />
                    <Text style={[styles.actionButtonText, { color: '#3b82f6' }]}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.actionButton} 
                    onPress={() => handleDelete(service)}
                  >
                    <Ionicons name="trash" size={18} color="#ef4444" />
                    <Text style={[styles.actionButtonText, { color: '#ef4444' }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Service Modal */}
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
                {editingService ? 'Edit Service' : 'Add New Service'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Service Name */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Service Name *</Text>
                <TextInput
                  style={styles.input}
                  value={serviceName}
                  onChangeText={setServiceName}
                  placeholder="e.g., Wash & Fold"
                />
              </View>

              {/* Description */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={serviceDescription}
                  onChangeText={setServiceDescription}
                  placeholder="Brief description of the service"
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Price */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Price (₱) *</Text>
                <TextInput
                  style={styles.input}
                  value={servicePrice}
                  onChangeText={setServicePrice}
                  placeholder="0.00"
                  keyboardType="numeric"
                />
              </View>

              {/* Category */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.value}
                      style={[
                        styles.categoryChip,
                        serviceCategory === cat.value && styles.categoryChipSelected
                      ]}
                      onPress={() => setServiceCategory(cat.value)}
                    >
                      <Text style={[
                        styles.categoryChipText,
                        serviceCategory === cat.value && styles.categoryChipTextSelected
                      ]}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Icon */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Icon</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconScroll}>
                  {availableIcons.map((icon) => (
                    <TouchableOpacity
                      key={icon.name}
                      style={[
                        styles.iconOption,
                        serviceIcon === icon.name && styles.iconOptionSelected
                      ]}
                      onPress={() => setServiceIcon(icon.name)}
                    >
                      <Ionicons 
                        name={icon.name as any} 
                        size={24} 
                        color={serviceIcon === icon.name ? '#3b82f6' : '#6b7280'} 
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Status Toggle */}
              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <Text style={styles.label}>Service Active</Text>
                  <TouchableOpacity 
                    style={[styles.switchButton, isActive && styles.switchButtonActive]}
                    onPress={() => setIsActive(!isActive)}
                  >
                    <View style={[styles.switchThumb, isActive && styles.switchThumbActive]} />
                  </TouchableOpacity>
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
                <Text style={styles.saveButtonText}>Save Service</Text>
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
  serviceCard: {
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
  globalServiceCard: {
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
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  serviceLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  serviceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 6,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  serviceRight: {
    alignItems: 'flex-end',
  },
  servicePrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 6,
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
  serviceActions: {
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
  categoryScroll: {
    flexGrow: 0,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginRight: 8,
  },
  categoryChipSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#6b7280',
  },
  categoryChipTextSelected: {
    color: '#3b82f6',
    fontWeight: '500',
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
  switchButton: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#d1d5db',
    padding: 2,
    justifyContent: 'center',
  },
  switchButtonActive: {
    backgroundColor: '#3b82f6',
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignSelf: 'flex-start',
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
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

export default ServicesManagementScreen

