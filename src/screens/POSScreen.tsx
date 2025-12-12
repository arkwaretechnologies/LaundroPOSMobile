import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { useStore } from '../context/StoreContext'
import { isFeatureEnabled } from '../utils/featureFlags'
import { PaymentMethod } from '../types/paymentMethod'
import ThermalPrinterService from '../services/ThermalPrinterService'

interface Service {
  id: string
  name: string
  price: number
  icon: string
  description?: string | null
  category?: string | null
}

interface InventoryItem {
  id: string
  name: string
  unit_price: number
  current_stock: number
  unit_of_measure: string
  category?: string | null
  low_stock_threshold?: number
}

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  type: 'service' | 'product'
  service_id?: string
  inventory_item_id?: string
  icon?: string
  stock?: number
}

interface Customer {
  id: string
  first_name: string
  last_name: string
  phone: string | null
  email: string | null
  customer_number: string
  loyalty_points: number
}

const POSScreen: React.FC = () => {
  const { currentStore, availableStores, switchStore } = useStore()
  const [services, setServices] = useState<Service[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [loadingServices, setLoadingServices] = useState(true)
  const [activeCategory, setActiveCategory] = useState<'services' | 'products'>('services')
  
  // Customer state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [showCustomerSearch, setShowCustomerSearch] = useState(false)
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [showStoreSelector, setShowStoreSelector] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Customer[]>([])
  const [searchingCustomers, setSearchingCustomers] = useState(false)
  const [loadingMoreCustomers, setLoadingMoreCustomers] = useState(false)
  const [hasMoreCustomers, setHasMoreCustomers] = useState(true)
  const [customerPage, setCustomerPage] = useState(0)
  const CUSTOMERS_PER_PAGE = 20
  
  // New customer form state
  const [newCustomerFirstName, setNewCustomerFirstName] = useState('')
  const [newCustomerLastName, setNewCustomerLastName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [newCustomerEmail, setNewCustomerEmail] = useState('')
  const [newCustomerAddress, setNewCustomerAddress] = useState('')

  // Cart and payment state
  const [cart, setCart] = useState<CartItem[]>([])
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentType, setPaymentType] = useState<'full' | 'partial' | 'later'>('full')
  const [partialAmount, setPartialAmount] = useState('')
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | null>(null)

  // Load services and inventory from database
  useEffect(() => {
    loadServices()
    loadPaymentMethods()
    // Only load inventory if the feature is enabled
    if (isFeatureEnabled(currentStore as any, 'inventory_tracking')) {
      loadInventoryItems()
    }
  }, [currentStore])

  const loadServices = async () => {
    console.log('Loading services...')
    console.log('Current store:', currentStore)
    
    if (!currentStore) {
      console.log('No current store, skipping service load')
      setLoadingServices(false)
      return
    }

    try {
      setLoadingServices(true)
      console.log('Fetching services from database...')
      
      // Load both global services AND this store's custom services
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .or(`is_global.eq.true,store_id.eq.${currentStore.id}`)
        .eq('is_active', true)
        .order('is_global', { ascending: false }) // Global first
        .order('sort_order', { ascending: true })

      console.log('Services query result:', { data, error })

      if (error) {
        console.error('Services query error:', error)
        throw error
      }
      
      console.log('Services loaded successfully:', data?.length || 0, 'services')
      console.log('Services details:', data)
        setServices(data || [])
    } catch (error: any) {
      console.error('Error loading services:', error)
      Alert.alert('Error', `Failed to load services: ${error.message}`)
      
      // Fallback: Load sample services if database fails
      console.log('Loading fallback services...')
      const fallbackServices = [
        { id: '1', name: 'Wash & Fold', price: 15.00, icon: 'shirt-outline', description: 'Professional wash and fold service', category: 'wash' },
        { id: '2', name: 'Dry Clean', price: 25.00, icon: 'sparkles-outline', description: 'Expert dry cleaning for delicate items', category: 'dry-clean' },
        { id: '3', name: 'Press Only', price: 8.00, icon: 'flame-outline', description: 'Ironing and pressing service', category: 'press' },
        { id: '4', name: 'Alterations', price: 12.00, icon: 'cut-outline', description: 'Clothing alterations and repairs', category: 'alterations' },
        { id: '5', name: 'Bulk Laundry', price: 35.00, icon: 'cube-outline', description: 'Large volume laundry service', category: 'wash' },
        { id: '6', name: 'Express Service', price: 20.00, icon: 'flash-outline', description: 'Same-day express service', category: 'express' }
      ]
      setServices(fallbackServices)
    } finally {
      setLoadingServices(false)
    }
  }

  const loadInventoryItems = async () => {
    if (!currentStore) {
      console.log('No current store, skipping inventory load')
      return
    }

    try {
      console.log('Loading inventory items from database...')
      
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('store_id', currentStore.id)
        .eq('is_active', true)
        .gt('current_stock', 0) // Only show items in stock
        .order('name', { ascending: true })

      if (error) {
        console.error('Inventory query error:', error)
        throw error
      }
      
      console.log('Inventory items loaded:', data?.length || 0, 'items')
      setInventoryItems(data || [])
    } catch (error: any) {
      console.error('Error loading inventory:', error)
      // Don't show alert for inventory - it's optional feature
    }
  }

  const loadPaymentMethods = async () => {
    if (!currentStore) {
      console.log('No current store, skipping payment methods load')
      return
    }

    try {
      console.log('Loading payment methods from database...')
      
      // Load both global payment methods (store_id is NULL) AND this store's custom payment methods
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .or(`store_id.is.null,store_id.eq.${currentStore.id}`)
        .eq('is_active', true) // Only load active payment methods
        .order('store_id', { ascending: true, nullsFirst: true }) // Global first
        .order('sort_order', { ascending: true })

      if (error) {
        console.error('Payment methods query error:', error)
        throw error
      }
      
      console.log('Payment methods loaded:', data?.length || 0, 'methods')
      setPaymentMethods(data || [])
      
      // Set default selected payment method (first active method)
      if (data && data.length > 0) {
        setSelectedPaymentMethodId(data[0].id)
      }
    } catch (error: any) {
      console.error('Error loading payment methods:', error)
      // Fallback to default payment methods if database fails
      Alert.alert('Warning', 'Could not load payment methods. Using default methods.')
    }
  }

  // Load all customers with pagination, ordered by name
  const loadCustomers = async (reset: boolean = false, searchTerm: string = '') => {
    if (!currentStore) {
      setSearchResults([])
      return
    }

    try {
      if (reset) {
        setSearchingCustomers(true)
        setCustomerPage(0)
        setHasMoreCustomers(true)
      } else {
        setLoadingMoreCustomers(true)
      }

      const currentPage = reset ? 0 : customerPage
      const from = currentPage * CUSTOMERS_PER_PAGE
      const to = from + CUSTOMERS_PER_PAGE - 1

      let query = supabase
        .from('customers')
        .select('id, first_name, last_name, phone, email, customer_number, loyalty_points')
        .eq('store_id', currentStore.id)
        .eq('is_active', true)
        .order('first_name', { ascending: true })
        .order('last_name', { ascending: true })
        .range(from, to)

      // If there's a search term, filter by it
      if (searchTerm.trim().length >= 2) {
        const searchPattern = `%${searchTerm.trim()}%`
        query = query.or(`first_name.ilike.${searchPattern},last_name.ilike.${searchPattern},phone.ilike.${searchPattern},email.ilike.${searchPattern},customer_number.ilike.${searchPattern}`)
      }

      const { data, error } = await query

      if (error) throw error

      console.log(`Customers loaded: ${data?.length || 0} (page ${currentPage + 1})`)
      
      // Check if there are more items to load
      setHasMoreCustomers((data?.length || 0) === CUSTOMERS_PER_PAGE)

      if (reset) {
        setSearchResults(data || [])
        setCustomerPage(1)
      } else {
        setSearchResults(prev => [...prev, ...(data || [])])
        setCustomerPage(prev => prev + 1)
      }
    } catch (error: any) {
      console.error('Error loading customers:', error)
      if (reset) {
        Alert.alert('Error', 'Failed to load customers')
        setSearchResults([])
      }
    } finally {
      setSearchingCustomers(false)
      setLoadingMoreCustomers(false)
    }
  }

  // Load more customers when scrolling
  const loadMoreCustomers = () => {
    if (!loadingMoreCustomers && hasMoreCustomers && !searchingCustomers) {
      loadCustomers(false, searchQuery)
    }
  }

  // Search customers by first name, last name, phone, email, or customer number
  const searchCustomers = async (query: string) => {
    if (!currentStore) {
      setSearchResults([])
      return
    }

    // Load customers with search term
    await loadCustomers(true, query)
  }

  // Load all customers when modal opens
  useEffect(() => {
    if (showCustomerSearch && currentStore) {
      // Load all customers initially when modal opens
      loadCustomers(true, '')
    } else if (!showCustomerSearch) {
      // Reset when modal closes
      setSearchResults([])
      setSearchQuery('')
      setCustomerPage(0)
      setHasMoreCustomers(true)
    }
  }, [showCustomerSearch, currentStore])

  // Debounce search
  useEffect(() => {
    if (!showCustomerSearch) return

    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        searchCustomers(searchQuery)
      } else if (searchQuery.trim().length === 0) {
        // If search is cleared, reload all customers
        loadCustomers(true, '')
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, showCustomerSearch])

  // Create new customer
  const handleCreateCustomer = async () => {
    if (!newCustomerFirstName || !newCustomerLastName) {
      Alert.alert('Validation Error', 'First name and last name are required')
      return
    }

    if (!currentStore) {
      Alert.alert('Error', 'No store selected')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { data, error } = await supabase
        .from('customers')
        .insert({
          store_id: currentStore.id,
          first_name: newCustomerFirstName,
          last_name: newCustomerLastName,
          phone: newCustomerPhone || null,
          email: newCustomerEmail || null,
          address: newCustomerAddress || null,
          created_by: user?.id
        })
        .select()
        .single()

      if (error) throw error

      setSelectedCustomer(data)
      setShowNewCustomer(false)
      resetNewCustomerForm()
      Alert.alert('Success', `Customer ${data.customer_number} created successfully`)
    } catch (error: any) {
      console.error('Error creating customer:', error)
      Alert.alert('Error', 'Failed to create customer')
    }
  }

  const resetNewCustomerForm = () => {
    setNewCustomerFirstName('')
    setNewCustomerLastName('')
    setNewCustomerPhone('')
    setNewCustomerEmail('')
    setNewCustomerAddress('')
  }

  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setShowCustomerSearch(false)
    setSearchQuery('')
    setSearchResults([])
  }

  const clearCustomer = () => {
    setSelectedCustomer(null)
  }

  // Calculate totals
  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)

  // Add service to cart
  const addServiceToCart = (service: Service) => {
    setCart(prev => {
      const existing = prev.find(item => item.type === 'service' && item.service_id === service.id)
      if (existing) {
        return prev.map(item => 
          item.type === 'service' && item.service_id === service.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
        )
    } else {
        return [...prev, {
          id: service.id,
          name: service.name,
          price: service.price,
          quantity: 1,
          type: 'service',
          service_id: service.id,
          icon: service.icon
        }]
      }
    })
  }

  const addProductToCart = (product: InventoryItem) => {
    setCart(prev => {
      const existing = prev.find(item => item.type === 'product' && item.inventory_item_id === product.id)
      
      // Check if adding would exceed stock
      const newQuantity = existing ? existing.quantity + 1 : 1
      if (newQuantity > product.current_stock) {
        Alert.alert('Out of Stock', `Only ${product.current_stock} ${product.unit_of_measure} available`)
        return prev
      }
      
      if (existing) {
        return prev.map(item => 
          item.type === 'product' && item.inventory_item_id === product.id
            ? { ...item, quantity: newQuantity }
            : item
        )
    } else {
        return [...prev, {
          id: product.id,
          name: product.name,
          price: product.unit_price,
          quantity: 1,
          type: 'product',
          inventory_item_id: product.id,
          stock: product.current_stock
        }]
      }
    })
  }

  // Remove item from cart
  const removeFromCart = (itemId: string, itemType: 'service' | 'product') => {
    setCart(prev => prev.filter(item => !(
      item.id === itemId && item.type === itemType
    )))
  }

  // Update quantity
  const updateQuantity = (itemId: string, itemType: 'service' | 'product', quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId, itemType)
      return
    }
    
    // Check stock for products
    if (itemType === 'product') {
      const cartItem = cart.find(item => item.id === itemId && item.type === 'product')
      if (cartItem && cartItem.stock && quantity > cartItem.stock) {
        Alert.alert('Out of Stock', `Only ${cartItem.stock} available`)
        return
      }
    }
    
    setCart(prev => prev.map(item => 
      item.id === itemId && item.type === itemType
          ? { ...item, quantity }
          : item
      ))
  }

  // Process payment and create order
  const processPayment = async () => {
    if (!currentStore) {
      Alert.alert('Error', 'No store selected')
      return
    }

    if (cart.length === 0) {
      Alert.alert('Error', 'Cart is empty')
      return
    }

    if (!selectedCustomer) {
      Alert.alert('Customer Required', 'Please select a customer before completing the order')
      return
    }

    let amountPaid = 0
    let balanceDue = 0

    switch (paymentType) {
      case 'full':
        amountPaid = totalAmount
        balanceDue = 0
        break
      case 'partial':
        amountPaid = parseFloat(partialAmount) || 0
        balanceDue = totalAmount - amountPaid
        break
      case 'later':
        amountPaid = 0
        balanceDue = totalAmount
        break
    }

    if (paymentType === 'partial' && (amountPaid <= 0 || amountPaid >= totalAmount)) {
      Alert.alert('Invalid Amount', 'Please enter a valid partial payment amount')
        return
      }

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        Alert.alert('Error', 'User not authenticated')
        return
      }

      // Determine payment status
      let paymentStatus = 'unpaid'
      if (amountPaid === totalAmount) {
        paymentStatus = 'paid'
      } else if (amountPaid > 0) {
        paymentStatus = 'partial'
      }

      // Create order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          store_id: currentStore.id,
          customer_id: selectedCustomer?.id || null,
          subtotal: totalAmount,
          tax: 0,
          discount: 0,
          total_amount: totalAmount,
          paid_amount: amountPaid,
          balance: balanceDue,
          payment_status: paymentStatus,
          order_status: 'pending',
          created_by: user.id,
          notes: selectedCustomer ? `Customer: ${selectedCustomer.first_name} ${selectedCustomer.last_name}` : null,
        })
        .select()
        .single()

      if (orderError) throw orderError
      if (!orderData) throw new Error('Failed to create order')

      console.log('Order created:', orderData)

      // Create order items
      const orderItems = cart.map(item => ({
        order_id: orderData.id,
        service_id: item.type === 'service' ? item.service_id : null,
        inventory_item_id: item.type === 'product' ? item.inventory_item_id : null,
        item_type: item.type,
        service_name: item.name, // Works for both services and products
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) throw itemsError

      console.log('Order items created:', orderItems.length)

      // Create payment record if amount was paid
      if (amountPaid > 0) {
        const selectedMethod = paymentMethods.find(m => m.id === selectedPaymentMethodId)
        if (!selectedMethod) {
          throw new Error('No payment method selected')
        }

        const { error: paymentError } = await supabase
          .from('payments')
          .insert({
            order_id: orderData.id,
            amount: amountPaid,
            payment_method: selectedMethod.name, // Store the method name for backward compatibility
            received_by: user.id,
            notes: `Initial ${paymentType} payment`,
          })

        if (paymentError) throw paymentError
        console.log('Payment recorded:', amountPaid)
      }

      // Print claim ticket
      try {
        const customerName = selectedCustomer 
          ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}`.trim()
          : 'Walk-in Customer'
        
        // Get order date - use order_date if available, otherwise use created_at or current date
        const orderDate = orderData.order_date || orderData.created_at || new Date().toISOString()
        
        const printOrder = {
          orderId: orderData.id,
          orderNumber: orderData.order_number,
          customerName: customerName,
          orderDate: orderDate,
          totalAmount: totalAmount,
          items: cart.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          })),
          storeInfo: currentStore ? {
            name: currentStore.name || '',
            address: currentStore.address || '',
          } : undefined,
        }

        console.log('🖨️ Attempting to print claim ticket...')
        const printSuccess = await ThermalPrinterService.getInstance().printOrderClaimStub(printOrder)
        
        if (printSuccess) {
          console.log('✅ Claim ticket printed successfully')
        } else {
          console.log('⚠️ Claim ticket printing failed or printer not available')
        }
      } catch (printError: any) {
        // Don't block the success flow if printing fails
        console.error('❌ Error printing claim ticket:', printError)
      }

      // Show success message
      Alert.alert(
        'Order Created Successfully!', 
        `Order Number: ${orderData.order_number}\nTotal: ₱${totalAmount.toFixed(2)}\nPaid: ₱${amountPaid.toFixed(2)}\nBalance: ₱${balanceDue.toFixed(2)}`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setCart([])
              setSelectedCustomer(null)
              setShowPaymentModal(false)
              setPartialAmount('')
              setPaymentType('full')
              // Reset to first payment method
              if (paymentMethods.length > 0) {
                setSelectedPaymentMethodId(paymentMethods[0].id)
              }
            }
          }
        ]
      )
    } catch (error: any) {
      console.error('Error processing payment:', error)
      Alert.alert('Error', `Failed to process payment: ${error.message}`)
    }
  }

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Point of Sale</Text>
          <Text style={styles.subtitle}>Select Services</Text>
          
          {/* Store Selector */}
          {availableStores.length > 1 && (
            <View style={styles.storeSelector}>
              <Text style={styles.storeLabel}>Store:</Text>
              <TouchableOpacity 
                style={styles.storeDropdown}
                onPress={() => setShowStoreSelector(true)}
              >
                <Text style={styles.currentStoreText}>{currentStore?.name}</Text>
                <Ionicons name="chevron-down" size={16} color="#6b7280" />
              </TouchableOpacity>
      </View>
          )}
        </View>

      <ScrollView style={styles.content}>
        {/* Cart Items */}
        {cart.length > 0 && (
          <View style={styles.cartSection}>
            <Text style={styles.sectionTitle}>Cart Items</Text>
            {cart.map((item) => (
              <View key={`${item.type}-${item.id}`} style={styles.cartItem}>
                <View style={styles.cartItemInfo}>
                  <View style={styles.cartItemHeader}>
                    <Text style={styles.cartItemName}>{item.name}</Text>
                    <Ionicons 
                      name={item.type === 'product' ? 'cube' : 'pricetag'} 
                      size={14} 
                      color={item.type === 'product' ? '#10b981' : '#3b82f6'} 
                    />
                  </View>
                  <Text style={styles.cartItemPrice}>₱{item.price.toFixed(2)} each</Text>
                  {item.type === 'product' && item.stock && (
                    <Text style={styles.cartItemStock}>Stock: {item.stock} available</Text>
                  )}
                </View>
                <View style={styles.quantityControls}>
                  <TouchableOpacity 
                    style={styles.quantityButton}
                    onPress={() => updateQuantity(item.id, item.type, item.quantity - 1)}
                  >
                    <Ionicons name="remove" size={16} color="#ef4444" />
                  </TouchableOpacity>
                  <Text style={styles.quantityText}>{item.quantity}</Text>
                  <TouchableOpacity 
                    style={styles.quantityButton}
                    onPress={() => updateQuantity(item.id, item.type, item.quantity + 1)}
                  >
                    <Ionicons name="add" size={16} color="#10b981" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.removeButton}
                    onPress={() => removeFromCart(item.id, item.type)}
                  >
                    <Ionicons name="trash" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Category Tabs */}
        {isFeatureEnabled(currentStore as any, 'inventory_tracking') ? (
          <View style={styles.categoryTabs}>
            <TouchableOpacity 
              style={[styles.categoryTab, activeCategory === 'services' && styles.categoryTabActive]}
              onPress={() => setActiveCategory('services')}
            >
              <Ionicons 
                name="pricetag" 
                size={20} 
                color={activeCategory === 'services' ? '#3b82f6' : '#6b7280'} 
              />
              <Text style={[styles.categoryTabText, activeCategory === 'services' && styles.categoryTabTextActive]}>
                Services ({services.length})
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.categoryTab, activeCategory === 'products' && styles.categoryTabActive]}
              onPress={() => setActiveCategory('products')}
            >
              <Ionicons 
                name="cube" 
                size={20} 
                color={activeCategory === 'products' ? '#3b82f6' : '#6b7280'} 
              />
              <Text style={[styles.categoryTabText, activeCategory === 'products' && styles.categoryTabTextActive]}>
                Products ({inventoryItems.length})
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Items Grid */}
        <View style={styles.servicesGrid}>
          {loadingServices ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : !isFeatureEnabled(currentStore as any, 'inventory_tracking') || activeCategory === 'services' ? (
            // Always show services when inventory is disabled OR when Services tab is active
            services.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="pricetag-outline" size={48} color="#d1d5db" />
                <Text style={styles.emptyText}>No services available</Text>
                <Text style={styles.emptySubtext}>Add services in Settings</Text>
              </View>
            ) : (
              services.map((service) => (
                <TouchableOpacity 
                  key={service.id} 
                  style={styles.serviceCard}
                  onPress={() => addServiceToCart(service)}
                >
                  <View style={styles.serviceIcon}>
                    <Ionicons name={service.icon as any} size={32} color="#3b82f6" />
                  </View>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  <Text style={styles.servicePrice}>₱{service.price.toFixed(2)}</Text>
                </TouchableOpacity>
              ))
            )
          ) : (
            // Show products when inventory is enabled AND Products tab is active
            inventoryItems.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="cube-outline" size={48} color="#d1d5db" />
                <Text style={styles.emptyText}>No products available</Text>
                <Text style={styles.emptySubtext}>Add inventory items in Inventory</Text>
              </View>
            ) : (
              inventoryItems.map((product) => (
                <TouchableOpacity 
                  key={product.id} 
                  style={styles.serviceCard}
                  onPress={() => addProductToCart(product)}
                >
                  <View style={styles.serviceIcon}>
                    <Ionicons name="cube" size={32} color="#10b981" />
                  </View>
                  <Text style={styles.serviceName}>{product.name}</Text>
                  <Text style={styles.servicePrice}>₱{product.unit_price.toFixed(2)}</Text>
                  <Text style={styles.productStock}>Stock: {product.current_stock} {product.unit_of_measure}</Text>
                </TouchableOpacity>
              ))
            )
          )}
        </View>

        {/* Customer Section */}
        {selectedCustomer ? (
          <View style={styles.customerSection}>
            <View style={styles.customerHeader}>
              <Ionicons name="person-circle" size={32} color="#3b82f6" />
              <View style={styles.customerInfoSection}>
                <Text style={styles.customerName}>
                  {selectedCustomer.first_name} {selectedCustomer.last_name}
                </Text>
                <Text style={styles.customerDetails}>
                  {selectedCustomer.customer_number} • {selectedCustomer.loyalty_points} pts
                </Text>
                {selectedCustomer.phone && (
                  <Text style={styles.customerPhone}>{selectedCustomer.phone}</Text>
                )}
              </View>
              <TouchableOpacity onPress={clearCustomer} style={styles.clearCustomerButton}>
                <Ionicons name="close-circle" size={24} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.quickActions}>
            <Text style={styles.sectionTitle}>Customer</Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => setShowNewCustomer(true)}
              >
                <Ionicons name="person-add" size={24} color="#ffffff" />
                <Text style={styles.actionButtonText}>New Customer</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => setShowCustomerSearch(true)}
              >
                <Ionicons name="search" size={24} color="#ffffff" />
                <Text style={styles.actionButtonText}>Find Customer</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.cartSummary}>
          <Text style={styles.cartText}>Cart: {totalItems} items</Text>
          <Text style={styles.cartTotal}>Total: ₱{totalAmount.toFixed(2)}</Text>
        </View>
        <TouchableOpacity 
          style={[styles.checkoutButton, { opacity: cart.length > 0 && selectedCustomer ? 1 : 0.5 }]}
          disabled={cart.length === 0 || !selectedCustomer}
          onPress={() => setShowPaymentModal(true)}
        >
          <Text style={styles.checkoutButtonText}>
            {!selectedCustomer ? 'Select Customer First' : 'Checkout'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Customer Search Modal */}
      <Modal
        visible={showCustomerSearch}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCustomerSearch(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Find Customer</Text>
              <TouchableOpacity onPress={() => setShowCustomerSearch(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#6b7280" />
          <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search by name, phone, or customer number"
                autoFocus
              />
              {searchingCustomers && <ActivityIndicator size="small" color="#3b82f6" />}
            </View>

            <ScrollView 
              style={styles.searchResults}
              onScroll={(event: any) => {
                const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent
                const paddingToBottom = 20
                const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom
                if (isCloseToBottom && hasMoreCustomers && !loadingMoreCustomers && !searchingCustomers) {
                  loadMoreCustomers()
                }
              }}
              scrollEventThrottle={400}
            >
              {searchResults.length === 0 && !searchingCustomers ? (
                <View style={styles.emptySearch}>
                  <Ionicons name="search-outline" size={48} color="#d1d5db" />
                  <Text style={styles.emptySearchText}>
                    {searchQuery.length >= 2 ? 'No customers found' : 'No customers available'}
                  </Text>
                  <TouchableOpacity 
                    style={styles.createNewButton}
                    onPress={() => {
                      setShowCustomerSearch(false)
                      setShowNewCustomer(true)
                    }}
                  >
                    <Text style={styles.createNewButtonText}>Create New Customer</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {searchResults.map((customer) => (
                    <TouchableOpacity
                      key={customer.id}
                      style={styles.customerResultItem}
                      onPress={() => selectCustomer(customer)}
                    >
                      <View style={styles.customerResultIcon}>
                        <Ionicons name="person" size={24} color="#3b82f6" />
                      </View>
                      <View style={styles.customerResultInfo}>
                        <Text style={styles.customerResultName}>
                          {customer.first_name} {customer.last_name}
                        </Text>
                        <Text style={styles.customerResultDetails}>
                          {customer.customer_number} • {customer.loyalty_points} pts
                        </Text>
                        {customer.phone && (
                          <Text style={styles.customerResultPhone}>{customer.phone}</Text>
                        )}
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
                    </TouchableOpacity>
                  ))}
                  {loadingMoreCustomers && (
                    <View style={styles.loadingMoreContainer}>
                      <ActivityIndicator size="small" color="#3b82f6" />
                      <Text style={styles.loadingMoreText}>Loading more customers...</Text>
                    </View>
                  )}
                  {!hasMoreCustomers && searchResults.length > 0 && (
                    <View style={styles.endOfListContainer}>
                      <Text style={styles.endOfListText}>No more customers to load</Text>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* New Customer Modal */}
      <Modal
        visible={showNewCustomer}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowNewCustomer(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, backgroundColor: '#ffffff' }}
        >
          <View style={styles.fullModalHeader}>
            <TouchableOpacity onPress={() => setShowNewCustomer(false)}>
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.fullModalTitle}>New Customer</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView 
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.formGroup}>
              <Text style={styles.label}>First Name *</Text>
          <TextInput
                style={styles.inputField}
                value={newCustomerFirstName}
                onChangeText={setNewCustomerFirstName}
                placeholder=""
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Last Name *</Text>
              <TextInput
                style={styles.inputField}
                value={newCustomerLastName}
                onChangeText={setNewCustomerLastName}
                placeholder=""
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.inputField}
                value={newCustomerPhone}
                onChangeText={setNewCustomerPhone}
                placeholder=""
            keyboardType="phone-pad"
          />
        </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.inputField}
                value={newCustomerEmail}
                onChangeText={setNewCustomerEmail}
                placeholder=""
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Address</Text>
              <TextInput
                style={[styles.inputField, styles.textArea]}
                value={newCustomerAddress}
                onChangeText={setNewCustomerAddress}
                placeholder=""
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          <View style={styles.fullModalActions}>
            <TouchableOpacity
              style={styles.fullCancelButton}
              onPress={() => setShowNewCustomer(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.fullSaveButton}
              onPress={handleCreateCustomer}
            >
              <Text style={styles.saveButtonText}>Create Customer</Text>
            </TouchableOpacity>
              </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Payment Details</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
        </View>

            <ScrollView 
              style={styles.modalScrollContent}
              contentContainerStyle={styles.modalScrollContainer}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.paymentSummary}>
                <Text style={styles.paymentSummaryTitle}>Order Summary</Text>
                <Text style={styles.paymentSummaryTotal}>Total Amount: ₱{totalAmount.toFixed(2)}</Text>
                  </View>

            {/* Payment Type Selection */}
            <View style={styles.paymentSection}>
              <Text style={styles.paymentSectionTitle}>Payment Type</Text>
              
                  <TouchableOpacity
                style={[styles.paymentOption, paymentType === 'full' && styles.paymentOptionSelected]}
                onPress={() => setPaymentType('full')}
              >
                <View style={styles.paymentOptionContent}>
                  <Ionicons name="checkmark-circle" size={20} color={paymentType === 'full' ? '#10b981' : '#6b7280'} />
                  <Text style={[styles.paymentOptionText, paymentType === 'full' && styles.paymentOptionTextSelected]}>
                    Pay in Full
                  </Text>
                </View>
                <Text style={styles.paymentOptionAmount}>₱{totalAmount.toFixed(2)}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                style={[styles.paymentOption, paymentType === 'partial' && styles.paymentOptionSelected]}
                onPress={() => setPaymentType('partial')}
              >
                <View style={styles.paymentOptionContent}>
                  <Ionicons name="card" size={20} color={paymentType === 'partial' ? '#f59e0b' : '#6b7280'} />
                  <Text style={[styles.paymentOptionText, paymentType === 'partial' && styles.paymentOptionTextSelected]}>
                    Partial Payment
                  </Text>
                </View>
                <View style={styles.partialPaymentInput}>
                  <TextInput
                    style={styles.partialAmountInput}
                    value={partialAmount}
                    onChangeText={setPartialAmount}
                    placeholder="0.00"
                    keyboardType="numeric"
                    editable={paymentType === 'partial'}
                  />
                  <Text style={styles.partialAmountLabel}>₱</Text>
                </View>
                  </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.paymentOption, paymentType === 'later' && styles.paymentOptionSelected]}
                onPress={() => setPaymentType('later')}
              >
                <View style={styles.paymentOptionContent}>
                  <Ionicons name="time" size={20} color={paymentType === 'later' ? '#3b82f6' : '#6b7280'} />
                  <Text style={[styles.paymentOptionText, paymentType === 'later' && styles.paymentOptionTextSelected]}>
                    Pay Later
                  </Text>
                </View>
                <Text style={styles.paymentOptionAmount}>₱{totalAmount.toFixed(2)} due on pickup</Text>
              </TouchableOpacity>
              </View>

            {/* Payment Method Selection */}
            <View style={styles.paymentSection}>
              <Text style={styles.paymentSectionTitle}>Payment Method</Text>
              {paymentMethods.length === 0 ? (
                <Text style={styles.noPaymentMethodsText}>No payment methods available. Please configure payment methods in Settings.</Text>
              ) : (
                <View style={styles.paymentMethods}>
                  {paymentMethods.map((method) => (
                    <TouchableOpacity
                      key={method.id}
                      style={[
                        styles.paymentMethodButton, 
                        selectedPaymentMethodId === method.id && styles.paymentMethodSelected
                      ]}
                      onPress={() => setSelectedPaymentMethodId(method.id)}
                    >
                      {method.icon && (
                        <Ionicons 
                          name={method.icon as any} 
                          size={18} 
                          color={selectedPaymentMethodId === method.id ? '#3b82f6' : '#6b7280'} 
                          style={styles.paymentMethodIcon}
                        />
                      )}
                      <Text style={[
                        styles.paymentMethodText, 
                        selectedPaymentMethodId === method.id && styles.paymentMethodTextSelected
                      ]}>
                        {method.display_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Balance Due */}
            {paymentType !== 'full' && (
              <View style={styles.balanceSection}>
                <Text style={styles.balanceTitle}>Balance Due:</Text>
                <Text style={styles.balanceAmount}>
                  ₱{(paymentType === 'partial' ? totalAmount - (parseFloat(partialAmount) || 0) : totalAmount).toFixed(2)}
                </Text>
          </View>
        )}

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowPaymentModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
              <TouchableOpacity 
                style={styles.processButton}
                onPress={processPayment}
              >
                <Text style={styles.processButtonText}>Process Payment</Text>
              </TouchableOpacity>
            </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Store Selection Modal */}
      <Modal
        visible={showStoreSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowStoreSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Store</Text>
              <TouchableOpacity onPress={() => setShowStoreSelector(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.storeList}>
              {availableStores.map((store) => (
                <TouchableOpacity
                  key={store.id}
                  style={[
                    styles.storeItem,
                    currentStore?.id === store.id && styles.selectedStoreItem
                  ]}
                  onPress={() => {
                    switchStore(store.id)
                    setShowStoreSelector(false)
                  }}
                >
                  <View style={styles.storeInfo}>
                    <Text style={styles.storeName}>{store.name}</Text>
                    {store.address && (
                      <Text style={styles.storeAddress}>{store.address}</Text>
                    )}
                  </View>
                  {currentStore?.id === store.id && (
                    <Ionicons name="checkmark" size={20} color="#3b82f6" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
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
  header: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
    minHeight: 200,
  },
  loadingContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  debugText: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
  storeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
  },
  storeLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginRight: 8,
  },
  storeDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  currentStoreText: {
    fontSize: 14,
    color: '#111827',
    marginRight: 8,
  },
  storeList: {
    maxHeight: 300,
  },
  storeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  selectedStoreItem: {
    backgroundColor: '#f0f9ff',
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  storeAddress: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptyContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 14,
    color: '#6b7280',
  },
  serviceCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  serviceIcon: {
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  quickActions: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    alignItems: 'center',
  },
  cartSummary: {
    flex: 1,
  },
  cartText: {
    fontSize: 14,
    color: '#6b7280',
  },
  cartTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  checkoutButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  checkoutButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Cart styles
  cartSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  cartItemPrice: {
    fontSize: 12,
    color: '#6b7280',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginHorizontal: 12,
    minWidth: 20,
    textAlign: 'center',
  },
  removeButton: {
    marginLeft: 8,
    padding: 4,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxHeight: '85%',
    minHeight: '60%',
  },
  modalScrollContent: {
    flex: 1,
  },
  modalScrollContainer: {
    paddingBottom: 20,
  },
  modalContentLarge: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxHeight: '85%',
    maxWidth: 500,
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
  paymentSummary: {
    padding: 20,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  paymentSummaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  paymentSummaryTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  paymentSection: {
    padding: 20,
    marginBottom: 10,
  },
  paymentSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  paymentOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  paymentOptionSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  paymentOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentOptionText: {
    fontSize: 16,
    color: '#6b7280',
    marginLeft: 8,
  },
  paymentOptionTextSelected: {
    color: '#3b82f6',
    fontWeight: '500',
  },
  paymentOptionAmount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  partialPaymentInput: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  partialAmountInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    minWidth: 80,
    textAlign: 'right',
  },
  partialAmountLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginLeft: 4,
  },
  paymentMethods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  paymentMethodButton: {
    width: '48%', // Approximately half width to fit 2 per row
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  paymentMethodSelected: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  paymentMethodIcon: {
    marginRight: 4,
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  paymentMethodTextSelected: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  noPaymentMethodsText: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
    padding: 16,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
  },
  balanceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    margin: 20,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  balanceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
  },
  balanceAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#dc2626',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
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
  processButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#10b981',
    alignItems: 'center',
  },
  processButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  // Customer section styles
  customerSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerInfoSection: {
    flex: 1,
    marginLeft: 12,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  customerDetails: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  customerPhone: {
    fontSize: 12,
    color: '#6b7280',
  },
  clearCustomerButton: {
    padding: 4,
  },
  // Search modal styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#111827',
  },
  searchResults: {
    maxHeight: 400,
  },
  emptySearch: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptySearchText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
    marginBottom: 16,
  },
  createNewButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  createNewButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 14,
    color: '#6b7280',
  },
  endOfListContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  endOfListText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  customerResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  customerResultIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  customerResultInfo: {
    flex: 1,
  },
  customerResultName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  customerResultDetails: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  customerResultPhone: {
    fontSize: 12,
    color: '#6b7280',
  },
  // Form styles (reused)
  formGroup: {
    marginBottom: 16,
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
  inputField: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#ffffff',
    minHeight: 48,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalBody: {
    flex: 1,
    padding: 0,
  },
  modalBodyContent: {
    padding: 20,
    paddingBottom: 40,
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  fullModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  fullModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  fullModalActions: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
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
  // Category tabs styles
  categoryTabs: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    gap: 8,
  },
  categoryTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'transparent',
    gap: 8,
  },
  categoryTabActive: {
    backgroundColor: '#eff6ff',
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  categoryTabTextActive: {
    color: '#3b82f6',
  },
  // Cart item enhancements
  cartItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  cartItemStock: {
    fontSize: 11,
    color: '#10b981',
    marginTop: 2,
  },
  // Product stock display
  productStock: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
})

export default POSScreen