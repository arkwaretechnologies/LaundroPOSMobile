import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator, RefreshControl, Dimensions } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../../lib/supabase'
import { useStore } from '../context/StoreContext'
import ThermalPrinterService from '../services/ThermalPrinterService'
import QRCodeDisplay from '../components/QRCodeDisplay'
import QRScanner from '../components/QRScanner'
import { useNotifications } from '../context/NotificationContext'
import { PaymentMethod } from '../types/paymentMethod'

interface OrderItem {
  id: string
  service_name: string
  quantity: number
  unit_price: number
  total_price: number
}

interface Payment {
  id: string
  amount: number
  payment_method: string
  payment_date: string
  reference_number: string | null
}

interface Order {
  id: string
  order_number: string
  customer_id: string | null
  customers: {
    first_name: string
    last_name: string
    phone: string
  } | null
  total_amount: number
  paid_amount: number
  balance: number
  payment_status: 'unpaid' | 'partial' | 'paid' | 'refunded'
  order_status: 'pending' | 'in_progress' | 'ready' | 'completed' | 'cancelled'
  order_date: string
  notes: string | null
  order_items: OrderItem[]
  payments: Payment[]
}

type OrderFilter = 'all' | 'pending' | 'in_progress' | 'ready' | 'completed'
type PaymentFilter = 'all' | 'unpaid' | 'partial' | 'paid'

export default function OrdersScreen() {
  const { currentStore } = useStore()
  const { markOrdersAsViewed } = useNotifications()
  const insets = useSafeAreaInsets()
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const ITEMS_PER_PAGE = 20
  const [orderFilter, setOrderFilter] = useState<OrderFilter>('pending')
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Selected order details
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showOrderDetails, setShowOrderDetails] = useState(false)
  
  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | null>(null)
  
  // Print functionality
  const [printerService] = useState(ThermalPrinterService.getInstance())
  const [showQRCode, setShowQRCode] = useState(false)
  
  // QR Scanner
  const [showQRScanner, setShowQRScanner] = useState(false)

  useEffect(() => {
    if (currentStore) {
      // Clear orders first when store changes to avoid showing old data
      setOrders([])
      setFilteredOrders([])
      loadOrders(true) // Reset pagination
      loadPaymentMethods()
    } else {
      // Clear orders if no store is selected
      setOrders([])
      setFilteredOrders([])
      setLoading(false)
    }
  }, [currentStore])

  useEffect(() => {
    applyFilters()
  }, [orders, orderFilter, paymentFilter, searchQuery])

  // Reset pagination when filter changes
  useEffect(() => {
    if (currentStore) {
      loadOrders(true) // Reset and reload with new filter
    }
  }, [orderFilter, paymentFilter])

  const loadOrders = async (reset: boolean = false) => {
    if (!currentStore) {
      console.log('⚠️ No store selected, cannot load orders')
      setOrders([])
      setFilteredOrders([])
      return
    }

    try {
      if (reset) {
        setLoading(true)
        setPage(0)
        setHasMore(true)
      } else {
        setLoadingMore(true)
      }

      const currentPage = reset ? 0 : page
      const from = currentPage * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1

      console.log(`📦 Loading orders for store: ${currentStore.id} (page ${currentPage + 1}, items ${from}-${to})`)

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customers (
            first_name,
            last_name,
            phone
          ),
          order_items (*),
          payments (*)
        `)
        .eq('store_id', currentStore.id)
        .order('order_date', { ascending: false })
        .range(from, to)

      if (error) {
        console.error('❌ Error loading orders:', error)
        throw error
      }

      // Ensure all orders belong to the selected store (additional safety check)
      const filteredData = (data || []).filter(order => order.store_id === currentStore.id)
      
      if (filteredData.length !== (data?.length || 0)) {
        console.warn('⚠️ Some orders were filtered out - they did not match the selected store')
      }
      
      console.log(`✅ Orders loaded: ${filteredData.length} orders (page ${currentPage + 1})`)
      
      // Check if there are more items to load
      setHasMore(filteredData.length === ITEMS_PER_PAGE)
      
      if (reset) {
        setOrders(filteredData)
        setPage(1)
      } else {
        setOrders(prev => [...prev, ...filteredData])
        setPage(prev => prev + 1)
      }
      
      // Mark all loaded orders as viewed (user has seen them)
      // This will also refresh the badge counts
      const orderIds = filteredData.map(order => order.id)
      if (orderIds.length > 0) {
        await markOrdersAsViewed(orderIds)
      }
    } catch (error: any) {
      console.error('❌ Error loading orders:', error)
      if (reset) {
        Alert.alert('Error', `Failed to load orders: ${error.message || 'Unknown error'}`)
        setOrders([])
        setFilteredOrders([])
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const loadMoreOrders = () => {
    if (!loadingMore && hasMore && !loading) {
      loadOrders(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadOrders(true) // Reset pagination on refresh
    await loadPaymentMethods()
    setRefreshing(false)
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

  const applyFilters = () => {
    let filtered = [...orders]

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(order => {
        // Search by order ID (exact match)
        if (order.id.toLowerCase() === query) return true
        
        // Search by order number
        if (order.order_number.toLowerCase().includes(query)) return true
        
        // Search by customer name
        if (order.customers) {
          const fullName = `${order.customers.first_name} ${order.customers.last_name}`.toLowerCase()
          if (fullName.includes(query)) return true
          if (order.customers.first_name.toLowerCase().includes(query)) return true
          if (order.customers.last_name.toLowerCase().includes(query)) return true
        }
        
        // Search by phone number
        if (order.customers?.phone && order.customers.phone.includes(query)) return true
        
        return false
      })
    }

    // Filter by order status
    if (orderFilter !== 'all') {
      filtered = filtered.filter(order => order.order_status === orderFilter)
    }

    // Filter by payment status
    if (paymentFilter !== 'all') {
      filtered = filtered.filter(order => order.payment_status === paymentFilter)
    }

    setFilteredOrders(filtered)
  }

  const handleQRScan = async (scannedData: string) => {
    console.log('📷 QR Code scanned:', scannedData)
    
    if (!scannedData) {
      Alert.alert('Error', 'Could not read QR code')
      return
    }

    // Since QR code now only contains order number, use it directly
    const orderNumber = scannedData.trim()
    
    if (!orderNumber) {
      Alert.alert('Error', 'Could not extract order number from QR code')
      return
    }

    // Set search query to locate the order
    setSearchQuery(orderNumber)
    setShowQRScanner(false) // Close scanner after scan
    
    // Check if the order exists in the current orders list
    const foundOrder = orders.find(order => 
      order.id === orderNumber || order.order_number === orderNumber
    )
    
    if (foundOrder) {
      // Order found in current list - scroll to it and highlight
      Alert.alert(
        'Order Found',
        `Order ${foundOrder.order_number} located successfully!`,
        [
          {
            text: 'View Details',
            onPress: () => {
              setSelectedOrder(foundOrder)
              setShowOrderDetails(true)
            }
          },
          { text: 'OK' }
        ]
      )
    } else {
      // Order might not be loaded yet, try to fetch it
      if (!currentStore) {
        Alert.alert('Error', 'No store selected')
        return
      }

      try {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            customers (
              first_name,
              last_name,
              phone
            ),
            order_items (*),
            payments (*)
          `)
          .eq('store_id', currentStore.id)
          .or(`id.eq.${orderNumber},order_number.eq.${orderNumber}`)
          .single()

        if (error || !data) {
          Alert.alert(
            'Order Not Found',
            `Could not find order with number: ${orderNumber}\n\nThis order may not exist or belong to a different store.`
          )
          return
        }

        // Reload orders to include the found order in the list
        await loadOrders()
        
        // Show alert and allow viewing details using the fetched data
        Alert.alert(
          'Order Found',
          `Order ${data.order_number} located successfully!`,
          [
            {
              text: 'View Details',
              onPress: () => {
                setSelectedOrder(data)
                setShowOrderDetails(true)
              }
            },
            { text: 'OK' }
          ]
        )
      } catch (error: any) {
        console.error('Error fetching order:', error)
        Alert.alert('Error', `Failed to locate order: ${error.message || 'Unknown error'}`)
      }
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: Order['order_status']) => {
    if (!currentStore) {
      Alert.alert('Error', 'No store selected')
      return
    }

    try {
      // Verify the order belongs to the current store before updating
      const order = orders.find(o => o.id === orderId)
      if (!order || order.store_id !== currentStore.id) {
        Alert.alert('Error', 'Order does not belong to the selected store')
        return
      }

      const updateData: any = {
        order_status: newStatus,
      }

      // If marking as completed, set completion date
      if (newStatus === 'completed') {
        updateData.actual_completion = new Date().toISOString()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) updateData.completed_by = user.id
      }

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .eq('store_id', currentStore.id) // Additional safety: ensure order belongs to current store

      if (error) throw error

      Alert.alert('Success', `Order status updated to ${formatStatusText(newStatus)}`)
      loadOrders()
      setShowOrderDetails(false)
    } catch (error: any) {
      console.error('Error updating order status:', error)
      Alert.alert('Error', 'Failed to update order status')
    }
  }

  const handleAddPayment = async () => {
    if (!selectedOrder) return

    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid payment amount')
      return
    }

    if (amount > selectedOrder.balance) {
      Alert.alert('Invalid Amount', 'Payment amount cannot exceed the remaining balance')
      return
    }

    // Validate store ownership BEFORE any database operations
    if (!currentStore || selectedOrder.store_id !== currentStore.id) {
      Alert.alert('Error', 'Order does not belong to the selected store')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Calculate new payment status
      const newPaidAmount = selectedOrder.paid_amount + amount
      const newBalance = selectedOrder.total_amount - newPaidAmount
      const newPaymentStatus = newBalance === 0 ? 'paid' : 'partial'

      const selectedMethod = paymentMethods.find(m => m.id === selectedPaymentMethodId)
      if (!selectedMethod) {
        Alert.alert('Error', 'Please select a payment method')
        return
      }

      // Create payment record (only after validation passes)
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          order_id: selectedOrder.id,
          amount: amount,
          payment_method: selectedMethod.name, // Store the method name for backward compatibility
          received_by: user.id,
          notes: 'Additional payment',
        })

      if (paymentError) throw paymentError

      // Update order payment status

      const { error: orderError } = await supabase
        .from('orders')
        .update({
          paid_amount: newPaidAmount,
          balance: newBalance,
          payment_status: newPaymentStatus,
        })
        .eq('id', selectedOrder.id)
        .eq('store_id', currentStore.id) // Additional safety: ensure order belongs to current store

      if (orderError) throw orderError

      Alert.alert(
        'Payment Recorded',
        `Payment of ₱${amount.toFixed(2)} recorded successfully!\nRemaining balance: ₱${newBalance.toFixed(2)}`
      )
      
      setShowPaymentModal(false)
      setPaymentAmount('')
      // Reset to first payment method
      if (paymentMethods.length > 0) {
        setSelectedPaymentMethodId(paymentMethods[0].id)
      }
      loadOrders()
    } catch (error: any) {
      console.error('Error adding payment:', error)
      Alert.alert('Error', `Failed to record payment: ${error.message}`)
    }
  }

  const getStatusColor = (status: Order['order_status']) => {
    switch (status) {
      case 'pending': return '#f59e0b'
      case 'in_progress': return '#3b82f6'
      case 'ready': return '#10b981'
      case 'completed': return '#6b7280'
      case 'cancelled': return '#ef4444'
      default: return '#9ca3af'
    }
  }

  const formatStatusText = (status: Order['order_status']) => {
    switch (status) {
      case 'pending': return 'Pending'
      case 'in_progress': return 'In Progress'
      case 'ready': return 'Ready'
      case 'completed': return 'Completed'
      case 'cancelled': return 'Cancelled'
      default: return status
    }
  }

  const getPaymentStatusColor = (status: Order['payment_status']) => {
    switch (status) {
      case 'unpaid': return '#ef4444'
      case 'partial': return '#f59e0b'
      case 'paid': return '#10b981'
      case 'refunded': return '#6b7280'
      default: return '#9ca3af'
    }
  }

  // Print functions
  const printClaimStub = async () => {
    if (!selectedOrder) return

    try {
      const orderData = {
        orderId: selectedOrder.id,
        orderNumber: selectedOrder.order_number,
        customerName: selectedOrder.customers ? 
          `${selectedOrder.customers.first_name} ${selectedOrder.customers.last_name}` : 
          'Walk-in Customer',
        orderDate: selectedOrder.order_date,
        totalAmount: selectedOrder.total_amount,
        items: selectedOrder.order_items?.map(item => ({
          name: item.service_name,
          quantity: item.quantity,
          price: item.unit_price
        })) || [],
        storeInfo: {
          name: currentStore?.name || 'LaundroPOS',
          address: currentStore?.address || '',
          phone: currentStore?.phone || ''
        }
      }

      const success = await printerService.printOrderClaimStub(orderData)
      if (success) {
        Alert.alert('Success', 'Claim ticket printed successfully!')
      } else {
        Alert.alert('Error', 'Failed to print claim ticket. Please check printer connection.')
      }
    } catch (error) {
      console.error('Print error:', error)
      Alert.alert('Error', 'Failed to print claim ticket')
    }
  }

  const generateQRCodeData = () => {
    if (!selectedOrder) return ''
    
    return JSON.stringify({
      orderId: selectedOrder.id,
      orderNumber: selectedOrder.order_number,
      customerName: selectedOrder.customers ? 
        `${selectedOrder.customers.first_name} ${selectedOrder.customers.last_name}` : 
        'Walk-in Customer',
      totalAmount: selectedOrder.total_amount,
      status: selectedOrder.order_status,
      date: selectedOrder.order_date
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading orders...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Orders</Text>
        <Text style={styles.subtitle}>{filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by order #, customer name, or phone"
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="#9ca3af" />
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          onPress={() => setShowQRScanner(true)} 
          style={styles.scanButton}
        >
          <Ionicons name="qr-code-outline" size={22} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.filters}
        contentContainerStyle={styles.filtersContent}
      >
        <Text style={styles.filterLabel}>Status:</Text>
        {(['pending', 'in_progress', 'ready', 'completed', 'all'] as OrderFilter[]).map(filter => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterButton, orderFilter === filter && styles.filterButtonActive]}
            onPress={() => setOrderFilter(filter)}
          >
            <Text style={[styles.filterButtonText, orderFilter === filter && styles.filterButtonTextActive]}>
              {filter.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Text>
          </TouchableOpacity>
        ))}
        
        <View style={styles.filterDivider} />
        
        <Text style={styles.filterLabel}>Payment:</Text>
        {(['all', 'unpaid', 'partial', 'paid'] as PaymentFilter[]).map(filter => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterButton, paymentFilter === filter && styles.filterButtonActive]}
            onPress={() => setPaymentFilter(filter)}
          >
            <Text style={[styles.filterButtonText, paymentFilter === filter && styles.filterButtonTextActive]}>
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Orders List */}
      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onScroll={(event: any) => {
          const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent
          const paddingToBottom = 20
          const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom
          if (isCloseToBottom && hasMore && !loadingMore && !loading) {
            loadMoreOrders()
          }
        }}
        scrollEventThrottle={400}
      >
        {filteredOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyStateText}>No orders found</Text>
            <Text style={styles.emptyStateSubtext}>Orders will appear here once created</Text>
          </View>
        ) : (
          filteredOrders.map(order => (
            <TouchableOpacity
              key={order.id}
              style={styles.orderCard}
              onPress={() => {
                setSelectedOrder(order)
                setShowOrderDetails(true)
              }}
            >
              <View style={styles.orderHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.orderNumber}>{order.order_number}</Text>
                  <Text style={styles.orderDate}>{formatDate(order.order_date)}</Text>
                  {/* Compact status bars */}
                  <View style={styles.statusBarsContainer}>
                    <View style={styles.statusBarWrapper}>
                      <View style={[styles.statusBar, { backgroundColor: getStatusColor(order.order_status) }]} />
                      <Text style={styles.statusBarLabel}>{order.order_status.replace('_', ' ')}</Text>
                    </View>
                    <View style={styles.statusBarWrapper}>
                      <View style={[styles.statusBar, { backgroundColor: getPaymentStatusColor(order.payment_status) }]} />
                      <Text style={styles.statusBarLabel}>{order.payment_status}</Text>
                    </View>
                  </View>
                </View>
              </View>

              {order.customers && (
                <Text style={styles.customerName}>
                  <Ionicons name="person" size={14} color="#6b7280" /> {order.customers.first_name} {order.customers.last_name}
                </Text>
              )}

              <View style={styles.orderFooter}>
                <View>
                  <Text style={styles.orderTotal}>₱{order.total_amount.toFixed(2)}</Text>
                  {order.balance > 0 && (
                    <Text style={styles.balanceText}>Balance: ₱{order.balance.toFixed(2)}</Text>
                  )}
                </View>
                <Text style={styles.itemCount}>{order.order_items?.length || 0} item{order.order_items?.length !== 1 ? 's' : ''}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
        {loadingMore && (
          <View style={styles.loadingMoreContainer}>
            <ActivityIndicator size="small" color="#3b82f6" />
            <Text style={styles.loadingMoreText}>Loading more orders...</Text>
          </View>
        )}
        {!hasMore && filteredOrders.length > 0 && (
          <View style={styles.endOfListContainer}>
            <Text style={styles.endOfListText}>No more orders to load</Text>
          </View>
        )}
      </ScrollView>

      {/* Order Details Modal */}
      <Modal
        visible={showOrderDetails}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowOrderDetails(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Order Details</Text>
              <TouchableOpacity onPress={() => setShowOrderDetails(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            {selectedOrder && (
              <ScrollView 
                style={styles.modalBody}
                contentContainerStyle={{ paddingBottom: 20 }}
              >
                {/* Order Info */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Order Number</Text>
                  <Text style={styles.detailValue}>{selectedOrder.order_number}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Date</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedOrder.order_date)}</Text>
                </View>

                {selectedOrder.customers && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Customer</Text>
                    <Text style={styles.detailValue}>
                      {selectedOrder.customers.first_name} {selectedOrder.customers.last_name}
                    </Text>
                    {selectedOrder.customers.phone && (
                      <Text style={styles.detailSubvalue}>{selectedOrder.customers.phone}</Text>
                    )}
                  </View>
                )}

                {/* Order Items */}
                <Text style={styles.sectionTitle}>Order Items</Text>
                {selectedOrder.order_items?.map((item, index) => (
                  <View key={item.id} style={styles.itemRow}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.service_name}</Text>
                      <Text style={styles.itemDetails}>
                        {item.quantity} × ₱{item.unit_price.toFixed(2)}
                      </Text>
                    </View>
                    <Text style={styles.itemTotal}>₱{item.total_price.toFixed(2)}</Text>
                  </View>
                ))}

                {/* Payment Summary */}
                <View style={styles.paymentSummary}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Total</Text>
                    <Text style={styles.summaryValue}>₱{selectedOrder.total_amount.toFixed(2)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Paid</Text>
                    <Text style={[styles.summaryValue, { color: '#10b981' }]}>
                      ₱{selectedOrder.paid_amount.toFixed(2)}
                    </Text>
                  </View>
                  <View style={[styles.summaryRow, styles.summaryRowTotal]}>
                    <Text style={styles.summaryLabelTotal}>Balance</Text>
                    <Text style={styles.summaryValueTotal}>
                      ₱{selectedOrder.balance.toFixed(2)}
                    </Text>
                  </View>
                </View>

                {/* Payment History */}
                {selectedOrder.payments && selectedOrder.payments.length > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>Payment History</Text>
                    {selectedOrder.payments.map(payment => (
                      <View key={payment.id} style={styles.paymentRow}>
                        <View>
                          <Text style={styles.paymentAmount}>₱{payment.amount.toFixed(2)}</Text>
                          <Text style={styles.paymentMethod}>{payment.payment_method.toUpperCase()}</Text>
                        </View>
                        <Text style={styles.paymentDate}>{formatDate(payment.payment_date)}</Text>
                      </View>
                    ))}
                  </>
                )}

                {/* Print and QR Code Buttons */}
                <View style={styles.printButtons}>
                  <TouchableOpacity
                    style={styles.printButton}
                    onPress={printClaimStub}
                  >
                    <Ionicons name="print-outline" size={20} color="#3b82f6" />
                    <Text style={[styles.printButtonText, { color: '#3b82f6' }]}>Print Claim Ticket</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.printButton}
                    onPress={() => setShowQRCode(!showQRCode)}
                  >
                    <Ionicons name="qr-code-outline" size={20} color="#10b981" />
                    <Text style={[styles.printButtonText, { color: '#10b981' }]}>
                      {showQRCode ? 'Hide' : 'Show'} QR Code
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* QR Code Display */}
                {showQRCode && (
                  <View style={styles.qrCodeContainer}>
                    <QRCodeDisplay
                      data={generateQRCodeData()}
                      orderNumber={selectedOrder.order_number}
                      size={200}
                    />
                  </View>
                )}

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  {selectedOrder.balance > 0 && (
                    <TouchableOpacity
                      style={styles.actionButtonPrimary}
                      onPress={() => {
                        setShowOrderDetails(false)
                        setShowPaymentModal(true)
                      }}
                    >
                      <Ionicons name="cash-outline" size={20} color="#ffffff" />
                      <Text style={styles.actionButtonText}>Add Payment</Text>
                    </TouchableOpacity>
                  )}

                  {selectedOrder.order_status !== 'completed' && selectedOrder.order_status !== 'cancelled' && (
                    <TouchableOpacity
                      style={styles.actionButtonSecondary}
                      onPress={() => {
                        // If order is ready but unpaid, redirect to payment instead of completing
                        if (selectedOrder.order_status === 'ready' && selectedOrder.payment_status === 'unpaid') {
                          setShowOrderDetails(false)
                          setShowPaymentModal(true)
                          return
                        }
                        
                        const nextStatus = selectedOrder.order_status === 'pending' ? 'in_progress' : 
                                         selectedOrder.order_status === 'in_progress' ? 'ready' : 'completed'
                        updateOrderStatus(selectedOrder.id, nextStatus)
                      }}
                    >
                      <Ionicons name="checkmark-circle-outline" size={20} color="#10b981" />
                      <Text style={[styles.actionButtonText, { color: '#10b981' }]}>
                        Mark as {selectedOrder.order_status === 'pending' ? 'In Progress' : 
                                 selectedOrder.order_status === 'in_progress' ? 'Ready' : 'Completed'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Payment</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalBody}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              {selectedOrder && (
                <>
                  <View style={styles.balanceInfo}>
                    <Text style={styles.balanceLabel}>Remaining Balance</Text>
                    <Text style={styles.balanceAmount}>₱{selectedOrder.balance.toFixed(2)}</Text>
                  </View>

                  <Text style={styles.inputLabel}>Payment Amount</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter amount"
                    keyboardType="numeric"
                    value={paymentAmount}
                    onChangeText={setPaymentAmount}
                  />

                  <Text style={styles.inputLabel}>Payment Method</Text>
                  {paymentMethods.length === 0 ? (
                    <Text style={styles.noPaymentMethodsText}>No payment methods available. Please configure payment methods in Settings.</Text>
                  ) : (
                    <View style={styles.paymentMethods}>
                      {paymentMethods.map(method => (
                        <TouchableOpacity
                          key={method.id}
                          style={[
                            styles.paymentMethodButton,
                            selectedPaymentMethodId === method.id && styles.paymentMethodButtonActive
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
                            selectedPaymentMethodId === method.id && styles.paymentMethodTextActive
                          ]}>
                            {method.display_name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.submitButton}
                    onPress={handleAddPayment}
                  >
                    <Text style={styles.submitButtonText}>Record Payment</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* QR Scanner Modal */}
      <Modal
        visible={showQRScanner}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowQRScanner(false)}
      >
        <QRScanner
          onScan={(qrData: string) => {
            // Since QR code now only contains order number, use it directly
            handleQRScan(qrData)
          }}
          onClose={() => setShowQRScanner(false)}
        />
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
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  scanButton: {
    padding: 8,
    marginLeft: 8,
  },
  filters: {
    backgroundColor: '#ffffff',
    maxHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filtersContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginRight: 8,
  },
  filterDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 12,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    marginRight: 6,
  },
  filterButtonActive: {
    backgroundColor: '#3b82f6',
  },
  filterButtonText: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#ffffff',
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
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
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
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  orderDate: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  statusBarsContainer: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 12,
  },
  statusBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusBar: {
    width: 4,
    height: 16,
    borderRadius: 2,
  },
  statusBarLabel: {
    fontSize: 11,
    color: '#6b7280',
    textTransform: 'capitalize',
    fontWeight: '500',
  },
  customerName: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 12,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  orderTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  balanceText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 2,
  },
  itemCount: {
    fontSize: 14,
    color: '#6b7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: Dimensions.get('window').height * 0.9,
    minHeight: Dimensions.get('window').height * 0.5,
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
  detailSection: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#111827',
  },
  detailSubvalue: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 24,
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  itemDetails: {
    fontSize: 13,
    color: '#6b7280',
  },
  itemTotal: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  paymentSummary: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  summaryRowTotal: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#e5e7eb',
  },
  summaryLabelTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  summaryValueTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10b981',
  },
  paymentMethod: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  paymentDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  actionButtons: {
    marginTop: 24,
    gap: 12,
  },
  actionButtonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#10b981',
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  printButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    marginBottom: 8,
  },
  printButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 8,
  },
  printButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  qrCodeContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  balanceInfo: {
    backgroundColor: '#fef3c7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 12,
    color: '#92400e',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#92400e',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  paymentMethods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  paymentMethodButton: {
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
    marginRight: 8,
    marginBottom: 8,
  },
  paymentMethodButtonActive: {
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
  paymentMethodTextActive: {
    color: '#3b82f6',
    fontWeight: '700',
  },
  noPaymentMethodsText: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
    padding: 16,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
})
