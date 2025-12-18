import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, Alert, Platform, TextInput } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import RNFS from 'react-native-fs'
import { supabase } from '../../lib/supabase'
import { useStore } from '../context/StoreContext'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'

interface ReportStats {
  dailySales: number
  weeklySales: number
  monthlySales: number
  totalOrders: number
  avgOrderValue: number
  customerCount: number
  dailyChange: number
  weeklyChange: number
  monthlyChange: number
  ordersChange: number
  avgOrderChange: number
  customerChange: number
}

interface Transaction {
  id: string
  order_id: string
  amount: number
  payment_method: string
  payment_date: string
  reference_number: string | null
  card_number: string | null
  is_cancelled: boolean
  cancelled_at: string | null
  order_number?: string
  customer_name?: string
}

interface ReportData {
  salesReport?: any
  orderSummary?: any
  customerAnalytics?: any
  servicePerformance?: any
  revenueTrends?: any
  transactions?: Transaction[]
}

const ReportsScreen: React.FC = () => {
  const { currentStore } = useStore()
  const insets = useSafeAreaInsets()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedReport, setSelectedReport] = useState<string | null>(null)
  const [reportData, setReportData] = useState<ReportData>({})
  const [reportLoading, setReportLoading] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancellationReason, setCancellationReason] = useState('')
  const [stats, setStats] = useState<ReportStats>({
    dailySales: 0,
    weeklySales: 0,
    monthlySales: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    customerCount: 0,
    dailyChange: 0,
    weeklyChange: 0,
    monthlyChange: 0,
    ordersChange: 0,
    avgOrderChange: 0,
    customerChange: 0,
  })

  useEffect(() => {
    if (currentStore) {
      loadReportData()
    }
  }, [currentStore])

  const loadReportData = async () => {
    if (!currentStore) return

    try {
      setLoading(true)

      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      
      const weekStart = new Date(today)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()) // Start of week (Sunday)
      const lastWeekStart = new Date(weekStart)
      lastWeekStart.setDate(lastWeekStart.getDate() - 7)
      const lastWeekEnd = new Date(weekStart)
      lastWeekEnd.setDate(lastWeekEnd.getDate() - 1)
      
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

      // Fetch today's orders
      const { data: todayOrders, error: todayError } = await supabase
        .from('orders')
        .select('total_amount, paid_amount')
        .eq('store_id', currentStore.id)
        .gte('order_date', today.toISOString())
        .lt('order_date', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString())

      if (todayError) throw todayError

      // Fetch yesterday's orders
      const { data: yesterdayOrders, error: yesterdayError } = await supabase
        .from('orders')
        .select('total_amount, paid_amount')
        .eq('store_id', currentStore.id)
        .gte('order_date', yesterday.toISOString())
        .lt('order_date', today.toISOString())

      if (yesterdayError) throw yesterdayError

      // Fetch this week's orders
      const { data: weekOrders, error: weekError } = await supabase
        .from('orders')
        .select('total_amount, paid_amount')
        .eq('store_id', currentStore.id)
        .gte('order_date', weekStart.toISOString())
        .lt('order_date', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString())

      if (weekError) throw weekError

      // Fetch last week's orders
      const { data: lastWeekOrders, error: lastWeekError } = await supabase
        .from('orders')
        .select('total_amount, paid_amount')
        .eq('store_id', currentStore.id)
        .gte('order_date', lastWeekStart.toISOString())
        .lt('order_date', lastWeekEnd.toISOString())

      if (lastWeekError) throw lastWeekError

      // Fetch this month's orders
      const { data: monthOrders, error: monthError } = await supabase
        .from('orders')
        .select('total_amount, paid_amount')
        .eq('store_id', currentStore.id)
        .gte('order_date', monthStart.toISOString())

      if (monthError) throw monthError

      // Fetch last month's orders
      const { data: lastMonthOrders, error: lastMonthError } = await supabase
        .from('orders')
        .select('total_amount, paid_amount')
        .eq('store_id', currentStore.id)
        .gte('order_date', lastMonthStart.toISOString())
        .lt('order_date', monthStart.toISOString())

      if (lastMonthError) throw lastMonthError

      // Fetch all orders for total orders and avg order value
      const { data: allOrders, error: allOrdersError } = await supabase
        .from('orders')
        .select('total_amount, paid_amount, order_date')
        .eq('store_id', currentStore.id)

      if (allOrdersError) throw allOrdersError

      // Fetch previous period orders for comparison (30 days ago)
      const thirtyDaysAgo = new Date(today)
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const sixtyDaysAgo = new Date(today)
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

      const { data: previousOrders, error: previousOrdersError } = await supabase
        .from('orders')
        .select('total_amount, paid_amount, order_date')
        .eq('store_id', currentStore.id)
        .gte('order_date', sixtyDaysAgo.toISOString())
        .lt('order_date', thirtyDaysAgo.toISOString())

      if (previousOrdersError) throw previousOrdersError

      // Fetch customer count
      const { count: customerCount, error: customerError } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', currentStore.id)
        .eq('is_active', true)

      if (customerError) throw customerError

      // Fetch previous customer count (30 days ago)
      const { count: previousCustomerCount, error: previousCustomerError } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', currentStore.id)
        .eq('is_active', true)
        .lt('created_at', thirtyDaysAgo.toISOString())

      if (previousCustomerError) throw previousCustomerError

      // Calculate sales
      const dailySales = todayOrders?.reduce((sum, o) => sum + Number(o.paid_amount || 0), 0) || 0
      const yesterdaySales = yesterdayOrders?.reduce((sum, o) => sum + Number(o.paid_amount || 0), 0) || 0
      const weeklySales = weekOrders?.reduce((sum, o) => sum + Number(o.paid_amount || 0), 0) || 0
      const lastWeekSales = lastWeekOrders?.reduce((sum, o) => sum + Number(o.paid_amount || 0), 0) || 0
      const monthlySales = monthOrders?.reduce((sum, o) => sum + Number(o.paid_amount || 0), 0) || 0
      const lastMonthSales = lastMonthOrders?.reduce((sum, o) => sum + Number(o.paid_amount || 0), 0) || 0

      // Calculate total orders
      const totalOrders = allOrders?.length || 0
      const previousTotalOrders = previousOrders?.length || 0

      // Calculate average order value
      const totalSales = allOrders?.reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0
      const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0
      const previousTotalSales = previousOrders?.reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0
      const previousAvgOrderValue = previousTotalOrders > 0 ? previousTotalSales / previousTotalOrders : 0

      // Calculate percentage changes
      const calculateChange = (current: number, previous: number): number => {
        if (previous === 0) return current > 0 ? 100 : 0
        return ((current - previous) / previous) * 100
      }

      const dailyChange = calculateChange(dailySales, yesterdaySales)
      const weeklyChange = calculateChange(weeklySales, lastWeekSales)
      const monthlyChange = calculateChange(monthlySales, lastMonthSales)
      const ordersChange = calculateChange(totalOrders, previousTotalOrders)
      const avgOrderChange = calculateChange(avgOrderValue, previousAvgOrderValue)
      const customerChange = calculateChange(customerCount || 0, previousCustomerCount || 0)

      setStats({
        dailySales,
        weeklySales,
        monthlySales,
        totalOrders,
        avgOrderValue,
        customerCount: customerCount || 0,
        dailyChange,
        weeklyChange,
        monthlyChange,
        ordersChange,
        avgOrderChange,
        customerChange,
      })
    } catch (error: any) {
      console.error('Error loading report data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadReportData()
  }

  const formatCurrency = (amount: number) => {
    return `₱${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
  }

  const formatNumber = (num: number) => {
    return num.toLocaleString()
  }

  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : ''
    return `${sign}${change.toFixed(0)}%`
  }

  const reportCards = [
    {
      id: 1,
      title: 'Daily Sales',
      value: formatCurrency(stats.dailySales),
      change: formatChange(stats.dailyChange),
      changeType: stats.dailyChange >= 0 ? 'positive' : 'negative',
      icon: 'trending-up',
      color: '#10b981'
    },
    {
      id: 2,
      title: 'Weekly Sales',
      value: formatCurrency(stats.weeklySales),
      change: formatChange(stats.weeklyChange),
      changeType: stats.weeklyChange >= 0 ? 'positive' : 'negative',
      icon: 'bar-chart',
      color: '#3b82f6'
    },
    {
      id: 3,
      title: 'Monthly Sales',
      value: formatCurrency(stats.monthlySales),
      change: formatChange(stats.monthlyChange),
      changeType: stats.monthlyChange >= 0 ? 'positive' : 'negative',
      icon: 'calendar',
      color: '#f59e0b'
    },
    {
      id: 4,
      title: 'Total Orders',
      value: formatNumber(stats.totalOrders),
      change: formatChange(stats.ordersChange),
      changeType: stats.ordersChange >= 0 ? 'positive' : 'negative',
      icon: 'list',
      color: '#8b5cf6'
    },
    {
      id: 5,
      title: 'Avg Order Value',
      value: formatCurrency(stats.avgOrderValue),
      change: formatChange(stats.avgOrderChange),
      changeType: stats.avgOrderChange >= 0 ? 'positive' : 'negative',
      icon: 'cash',
      color: '#06b6d4'
    },
    {
      id: 6,
      title: 'Customer Count',
      value: formatNumber(stats.customerCount),
      change: formatChange(stats.customerChange),
      changeType: stats.customerChange >= 0 ? 'positive' : 'negative',
      icon: 'people',
      color: '#ef4444'
    }
  ]

  const loadReportDetails = async (reportId: string) => {
    if (!currentStore) return

    try {
      setReportLoading(true)
      setSelectedReport(reportId)

      switch (reportId) {
        case 'sales':
          await loadSalesReport()
          break
        case 'orders':
          await loadOrderSummary()
          break
        case 'customers':
          await loadCustomerAnalytics()
          break
        case 'services':
          await loadServicePerformance()
          break
        case 'revenue':
          await loadRevenueTrends()
          break
        case 'transactions':
          await loadTransactions()
          break
        case 'export':
          handleExportData()
          return
      }
    } catch (error: any) {
      console.error('Error loading report:', error)
      Alert.alert('Error', 'Failed to load report data')
    } finally {
      setReportLoading(false)
    }
  }

  const loadSalesReport = async () => {
    if (!currentStore) return

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // Get orders for this store first
    const { data: storeOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id')
      .eq('store_id', currentStore.id)

    if (ordersError) throw ordersError

    const orderIds = storeOrders?.map(o => o.id) || []

    if (orderIds.length === 0) {
      setReportData({
        ...reportData,
        salesReport: {
          byMethod: {},
          daily: {},
          total: 0,
        }
      })
      return
    }

    // Get payments for these orders (exclude cancelled)
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('amount, payment_method, payment_date, order_id')
      .in('order_id', orderIds)
      .gte('payment_date', monthStart.toISOString())
      .or('is_cancelled.eq.false,is_cancelled.is.null')

    if (paymentsError) throw paymentsError

    const storePayments = payments || []

    // Group by payment method
    const salesByMethod: Record<string, number> = {}
    storePayments.forEach((payment: any) => {
      const method = payment.payment_method || 'unknown'
      salesByMethod[method] = (salesByMethod[method] || 0) + Number(payment.amount || 0)
    })

    // Get daily sales for last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: recentPayments, error: recentError } = await supabase
      .from('payments')
      .select('amount, payment_date, order_id')
      .in('order_id', orderIds)
      .gte('payment_date', sevenDaysAgo.toISOString())
      .or('is_cancelled.eq.false,is_cancelled.is.null')

    if (recentError) throw recentError

    const storeRecentPayments = recentPayments || []

    const dailySales: Record<string, number> = {}
    storeRecentPayments.forEach((payment: any) => {
      const date = new Date(payment.payment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      dailySales[date] = (dailySales[date] || 0) + Number(payment.amount || 0)
    })

    setReportData({
      ...reportData,
      salesReport: {
        byMethod: salesByMethod,
        daily: dailySales,
        total: storePayments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0),
      }
    })
  }

  const loadOrderSummary = async () => {
    if (!currentStore) return

    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('store_id', currentStore.id)

    if (ordersError) throw ordersError

    // Group by status
    const byStatus: Record<string, number> = {}
    const byPaymentStatus: Record<string, number> = {}
    let totalRevenue = 0
    let totalPaid = 0

    orders?.forEach(order => {
      byStatus[order.order_status] = (byStatus[order.order_status] || 0) + 1
      byPaymentStatus[order.payment_status] = (byPaymentStatus[order.payment_status] || 0) + 1
      totalRevenue += Number(order.total_amount || 0)
      totalPaid += Number(order.paid_amount || 0)
    })

    setReportData({
      ...reportData,
      orderSummary: {
        byStatus,
        byPaymentStatus,
        total: orders?.length || 0,
        totalRevenue,
        totalPaid,
        outstanding: totalRevenue - totalPaid,
      }
    })
  }

  const loadCustomerAnalytics = async () => {
    if (!currentStore) return

    // Get all customers
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id, first_name, last_name, loyalty_points, created_at')
      .eq('store_id', currentStore.id)
      .eq('is_active', true)

    if (customersError) throw customersError

    // Get customer orders
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('customer_id, total_amount, paid_amount')
      .eq('store_id', currentStore.id)
      .not('customer_id', 'is', null)

    if (ordersError) throw ordersError

    // Calculate customer metrics
    const customerStats: Record<string, { orders: number; totalSpent: number; avgOrder: number }> = {}
    orders?.forEach(order => {
      if (order.customer_id) {
        if (!customerStats[order.customer_id]) {
          customerStats[order.customer_id] = { orders: 0, totalSpent: 0, avgOrder: 0 }
        }
        customerStats[order.customer_id].orders += 1
        customerStats[order.customer_id].totalSpent += Number(order.paid_amount || 0)
      }
    })

    // Calculate averages
    Object.keys(customerStats).forEach(customerId => {
      const stats = customerStats[customerId]
      stats.avgOrder = stats.orders > 0 ? stats.totalSpent / stats.orders : 0
    })

    // Top customers
    const topCustomers = Object.entries(customerStats)
      .map(([customerId, stats]) => {
        const customer = customers?.find(c => c.id === customerId)
        return {
          id: customerId,
          name: customer ? `${customer.first_name} ${customer.last_name}` : 'Unknown',
          ...stats
        }
      })
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10)

    // New customers this month
    const monthStart = new Date()
    monthStart.setDate(1)
    const newCustomers = customers?.filter(c => new Date(c.created_at) >= monthStart).length || 0

    setReportData({
      ...reportData,
      customerAnalytics: {
        total: customers?.length || 0,
        newThisMonth: newCustomers,
        topCustomers,
        avgLoyaltyPoints: customers?.reduce((sum, c) => sum + (c.loyalty_points || 0), 0) / (customers?.length || 1) || 0,
      }
    })
  }

  const loadServicePerformance = async () => {
    if (!currentStore) return

    // Get orders for this store
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id')
      .eq('store_id', currentStore.id)

    if (ordersError) throw ordersError

    const orderIds = orders?.map(o => o.id) || []

    if (orderIds.length === 0) {
      setReportData({
        ...reportData,
        servicePerformance: {
          topServices: [],
          totalServices: 0,
          totalRevenue: 0,
        }
      })
      return
    }

    // Get order items for these orders
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('service_name, quantity, total_price, service_id')
      .in('order_id', orderIds)

    if (itemsError) throw itemsError

    // Group by service
    const serviceStats: Record<string, { name: string; quantity: number; revenue: number; orders: number }> = {}
    
    orderItems?.forEach(item => {
      const serviceName = item.service_name || 'Unknown Service'
      if (!serviceStats[serviceName]) {
        serviceStats[serviceName] = {
          name: serviceName,
          quantity: 0,
          revenue: 0,
          orders: 0
        }
      }
      serviceStats[serviceName].quantity += item.quantity || 0
      serviceStats[serviceName].revenue += Number(item.total_price || 0)
      serviceStats[serviceName].orders += 1
    })

    // Convert to array and sort by revenue
    const topServices = Object.values(serviceStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    setReportData({
      ...reportData,
      servicePerformance: {
        topServices,
        totalServices: Object.keys(serviceStats).length,
        totalRevenue: topServices.reduce((sum, s) => sum + s.revenue, 0),
      }
    })
  }

  const loadRevenueTrends = async () => {
    if (!currentStore) return

    // Get last 30 days of payments
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Get orders for this store first
    const { data: storeOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id')
      .eq('store_id', currentStore.id)

    if (ordersError) throw ordersError

    const orderIds = storeOrders?.map(o => o.id) || []

    if (orderIds.length === 0) {
      setReportData({
        ...reportData,
        revenueTrends: {
          daily: {},
          weekly: {},
          weekLabels: [],
          total: 0,
        }
      })
      return
    }

    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('amount, payment_date, order_id')
      .in('order_id', orderIds)
      .gte('payment_date', thirtyDaysAgo.toISOString())
      .or('is_cancelled.eq.false,is_cancelled.is.null')
      .order('payment_date', { ascending: true })

    if (paymentsError) throw paymentsError

    const storePayments = payments || []

    // Group by date
    const dailyRevenue: Record<string, number> = {}
    storePayments.forEach((payment: any) => {
      const date = new Date(payment.payment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      dailyRevenue[date] = (dailyRevenue[date] || 0) + Number(payment.amount || 0)
    })

    // Calculate weekly totals
    const weeklyRevenue: Record<string, number> = {}
    const weekLabels: string[] = []
    const now = new Date()
    
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now)
      weekStart.setDate(weekStart.getDate() - (i * 7))
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      
      const weekLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      weekLabels.push(weekLabel)
      
      let weekTotal = 0
      storePayments.forEach((payment: any) => {
        const paymentDate = new Date(payment.payment_date)
        if (paymentDate >= weekStart && paymentDate <= weekEnd) {
          weekTotal += Number(payment.amount || 0)
        }
      })
      weeklyRevenue[weekLabel] = weekTotal
    }

    setReportData({
      ...reportData,
      revenueTrends: {
        daily: dailyRevenue,
        weekly: weeklyRevenue,
        weekLabels,
        total: storePayments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0),
      }
    })
  }

  const loadTransactions = async () => {
    if (!currentStore) return

    try {
      // Get orders for this store first
      const { data: storeOrders, error: ordersError } = await supabase
        .from('orders')
        .select('id, order_number, customer_id, customers(first_name, last_name)')
        .eq('store_id', currentStore.id)

      if (ordersError) throw ordersError

      const orderIds = storeOrders?.map(o => o.id) || []
      const orderMap: Record<string, { order_number: string; customer_name: string }> = {}
      
      storeOrders?.forEach(order => {
        orderMap[order.id] = {
          order_number: order.order_number,
          customer_name: order.customers 
            ? `${order.customers.first_name} ${order.customers.last_name}`.trim()
            : 'Walk-in Customer'
        }
      })

      if (orderIds.length === 0) {
        setReportData({
          ...reportData,
          transactions: []
        })
        return
      }

      // Get recent payments (last 30 days, not cancelled)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('id, order_id, amount, payment_method, payment_date, reference_number, card_number, is_cancelled, cancelled_at')
        .in('order_id', orderIds)
        .gte('payment_date', thirtyDaysAgo.toISOString())
        .order('payment_date', { ascending: false })
        .limit(100)

      if (paymentsError) throw paymentsError

      const transactions: Transaction[] = (payments || []).map((payment: any) => ({
        id: payment.id,
        order_id: payment.order_id,
        amount: payment.amount,
        payment_method: payment.payment_method,
        payment_date: payment.payment_date,
        reference_number: payment.reference_number,
        card_number: payment.card_number,
        is_cancelled: payment.is_cancelled || false,
        cancelled_at: payment.cancelled_at,
        order_number: orderMap[payment.order_id]?.order_number || 'N/A',
        customer_name: orderMap[payment.order_id]?.customer_name || 'Unknown'
      }))

      setReportData({
        ...reportData,
        transactions
      })
    } catch (error: any) {
      console.error('Error loading transactions:', error)
      Alert.alert('Error', 'Failed to load transactions')
    }
  }

  const handleCancelTransaction = async () => {
    if (!selectedTransaction || !currentStore) {
      Alert.alert('Error', 'No transaction selected')
      return
    }

    if (!cancellationReason.trim()) {
      Alert.alert('Required Field', 'Please provide a cancellation reason')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        Alert.alert('Error', 'User not authenticated')
        return
      }

      // Update payment to mark as cancelled
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          is_cancelled: true,
          cancelled_at: new Date().toISOString(),
          cancelled_by: user.id,
          cancellation_reason: cancellationReason.trim()
        })
        .eq('id', selectedTransaction.id)

      if (updateError) throw updateError

      // Get the order to update paid_amount
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('paid_amount, total_amount')
        .eq('id', selectedTransaction.order_id)
        .single()

      if (orderError) throw orderError

      // Calculate new paid_amount (subtract cancelled payment)
      const newPaidAmount = Math.max(0, (orderData.paid_amount || 0) - selectedTransaction.amount)
      
      // Determine new payment_status
      let newPaymentStatus = 'unpaid'
      if (newPaidAmount > 0 && newPaidAmount < orderData.total_amount) {
        newPaymentStatus = 'partial'
      } else if (newPaidAmount >= orderData.total_amount) {
        newPaymentStatus = 'paid'
      }

      // Update order's paid_amount and payment_status
      const { error: orderUpdateError } = await supabase
        .from('orders')
        .update({
          paid_amount: newPaidAmount,
          payment_status: newPaymentStatus
        })
        .eq('id', selectedTransaction.order_id)

      if (orderUpdateError) throw orderUpdateError

      Alert.alert('Success', 'Transaction cancelled successfully')
      
      // Reset form and close modal
      setCancellationReason('')
      setShowCancelModal(false)
      setSelectedTransaction(null)
      
      // Reload transactions and report data
      await loadTransactions()
      await loadReportData()
    } catch (error: any) {
      console.error('Error cancelling transaction:', error)
      Alert.alert('Error', `Failed to cancel transaction: ${error.message}`)
    }
  }

  const handleExportData = async () => {
    if (!currentStore) {
      Alert.alert('Error', 'No store selected')
      return
    }

    try {
      setReportLoading(true)
      setSelectedReport('export')

      // Load all report data if not already loaded
      if (!reportData.salesReport) await loadSalesReport()
      if (!reportData.orderSummary) await loadOrderSummary()
      if (!reportData.customerAnalytics) await loadCustomerAnalytics()
      if (!reportData.servicePerformance) await loadServicePerformance()
      if (!reportData.revenueTrends) await loadRevenueTrends()

      // Generate PDF HTML
      const html = generatePDFHTML(stats, reportData, currentStore.name)

      // Generate PDF
      const { uri } = await Print.printToFileAsync({ html })

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
      const sanitizedStoreName = currentStore.name.replace(/[^a-zA-Z0-9]/g, '_')
      const filename = `Reports_${sanitizedStoreName}_${timestamp}.pdf`

      // Determine save directory based on platform
      const documentsPath = Platform.OS === 'ios' 
        ? RNFS.DocumentDirectoryPath 
        : (RNFS.DownloadDirectoryPath || RNFS.DocumentDirectoryPath)
      
      // Ensure directory exists
      const dirExists = await RNFS.exists(documentsPath)
      if (!dirExists) {
        await RNFS.mkdir(documentsPath)
      }
      
      const filePath = `${documentsPath}/${filename}`

      // Copy PDF to permanent location
      await RNFS.copyFile(uri, filePath)

      // Verify file was saved
      const fileExists = await RNFS.exists(filePath)
      if (!fileExists) {
        throw new Error('Failed to save file to device storage')
      }

      // Show success message with options
      const locationDisplay = Platform.OS === 'android' 
        ? 'Downloads folder' 
        : 'Documents folder'
      
      Alert.alert(
        'PDF Exported Successfully',
        `Report saved as:\n${filename}\n\nSaved to: ${locationDisplay}`,
        [
          {
            text: 'Share',
            onPress: async () => {
              try {
                if (await Sharing.isAvailableAsync()) {
                  await Sharing.shareAsync(filePath, {
                    mimeType: 'application/pdf',
                    dialogTitle: 'Share Report PDF',
                  })
                } else {
                  Alert.alert('Info', 'Sharing is not available on this device')
                }
              } catch (shareError: any) {
                Alert.alert('Error', `Failed to share file: ${shareError.message}`)
              }
            }
          },
          {
            text: 'OK',
            style: 'default'
          }
        ]
      )

      setSelectedReport(null)
    } catch (error: any) {
      console.error('Error exporting PDF:', error)
      
      // Check if it's a native module error
      if (error.message?.includes('Cannot find native module') || 
          error.message?.includes('ExpoPrint') ||
          error.code === 'ERR_MODULE_NOT_FOUND') {
        Alert.alert(
          'Rebuild Required',
          'The PDF export feature requires native modules. Please rebuild the app:\n\n' +
          'Android: npx expo run:android\n' +
          'iOS: npx expo run:ios\n\n' +
          'Or create a new development build with EAS Build.',
          [{ text: 'OK' }]
        )
      } else if (error.message?.includes('Failed to save file')) {
        Alert.alert(
          'Save Error',
          `Failed to save PDF file:\n${error.message}\n\nPlease check storage permissions.`,
          [{ text: 'OK' }]
        )
      } else {
        Alert.alert('Error', `Failed to export PDF: ${error.message || 'Unknown error'}`)
      }
    } finally {
      setReportLoading(false)
    }
  }

  const generatePDFHTML = (stats: ReportStats, data: ReportData, storeName: string): string => {
    const formatCurrency = (amount: number) => `₱${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
    const formatNumber = (num: number) => num.toLocaleString()
    const formatChange = (change: number) => {
      const sign = change >= 0 ? '+' : ''
      return `${sign}${change.toFixed(0)}%`
    }
    const formatDate = (date: Date) => date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              color: #333;
            }
            .header {
              text-align: center;
              border-bottom: 3px solid #3b82f6;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .header h1 {
              color: #111827;
              margin: 0;
              font-size: 28px;
            }
            .header p {
              color: #6b7280;
              margin: 5px 0;
            }
            .section {
              margin-bottom: 30px;
              page-break-inside: avoid;
            }
            .section-title {
              background-color: #3b82f6;
              color: white;
              padding: 12px;
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 15px;
              border-radius: 4px;
            }
            .stats-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 15px;
              margin-bottom: 20px;
            }
            .stat-card {
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 15px;
              background-color: #f9fafb;
            }
            .stat-label {
              font-size: 12px;
              color: #6b7280;
              margin-bottom: 5px;
            }
            .stat-value {
              font-size: 20px;
              font-weight: bold;
              color: #111827;
            }
            .stat-change {
              font-size: 11px;
              margin-top: 5px;
            }
            .positive { color: #10b981; }
            .negative { color: #ef4444; }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            th {
              background-color: #f3f4f6;
              padding: 10px;
              text-align: left;
              border-bottom: 2px solid #e5e7eb;
              font-weight: bold;
              color: #111827;
            }
            td {
              padding: 10px;
              border-bottom: 1px solid #e5e7eb;
            }
            tr:last-child td {
              border-bottom: none;
            }
            .summary-row {
              background-color: #f9fafb;
              font-weight: bold;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              color: #6b7280;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Reports & Analytics</h1>
            <p>${storeName}</p>
            <p>Generated on ${formatDate(new Date())}</p>
          </div>

          <!-- Quick Stats -->
          <div class="section">
            <div class="section-title">Quick Statistics</div>
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-label">Daily Sales</div>
                <div class="stat-value">${formatCurrency(stats.dailySales)}</div>
                <div class="stat-change ${stats.dailyChange >= 0 ? 'positive' : 'negative'}">
                  ${formatChange(stats.dailyChange)}
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Weekly Sales</div>
                <div class="stat-value">${formatCurrency(stats.weeklySales)}</div>
                <div class="stat-change ${stats.weeklyChange >= 0 ? 'positive' : 'negative'}">
                  ${formatChange(stats.weeklyChange)}
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Monthly Sales</div>
                <div class="stat-value">${formatCurrency(stats.monthlySales)}</div>
                <div class="stat-change ${stats.monthlyChange >= 0 ? 'positive' : 'negative'}">
                  ${formatChange(stats.monthlyChange)}
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Total Orders</div>
                <div class="stat-value">${formatNumber(stats.totalOrders)}</div>
                <div class="stat-change ${stats.ordersChange >= 0 ? 'positive' : 'negative'}">
                  ${formatChange(stats.ordersChange)}
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Avg Order Value</div>
                <div class="stat-value">${formatCurrency(stats.avgOrderValue)}</div>
                <div class="stat-change ${stats.avgOrderChange >= 0 ? 'positive' : 'negative'}">
                  ${formatChange(stats.avgOrderChange)}
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Customer Count</div>
                <div class="stat-value">${formatNumber(stats.customerCount)}</div>
                <div class="stat-change ${stats.customerChange >= 0 ? 'positive' : 'negative'}">
                  ${formatChange(stats.customerChange)}
                </div>
              </div>
            </div>
          </div>

          ${data.salesReport ? `
          <!-- Sales Report -->
          <div class="section">
            <div class="section-title">Sales Report (This Month)</div>
            <p><strong>Total Sales:</strong> ${formatCurrency(data.salesReport.total)}</p>
            <table>
              <thead>
                <tr>
                  <th>Payment Method</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(data.salesReport.byMethod).map(([method, amount]) => `
                  <tr>
                    <td>${method.toUpperCase()}</td>
                    <td style="text-align: right;">${formatCurrency(amount as number)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <h3 style="margin-top: 20px;">Daily Sales (Last 7 Days)</h3>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(data.salesReport.daily).map(([date, amount]) => `
                  <tr>
                    <td>${date}</td>
                    <td style="text-align: right;">${formatCurrency(amount as number)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}

          ${data.orderSummary ? `
          <!-- Order Summary -->
          <div class="section">
            <div class="section-title">Order Summary</div>
            <p><strong>Total Orders:</strong> ${formatNumber(data.orderSummary.total)}</p>
            <h3>Orders by Status</h3>
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th style="text-align: right;">Count</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(data.orderSummary.byStatus).map(([status, count]) => `
                  <tr>
                    <td>${status.replace('_', ' ').toUpperCase()}</td>
                    <td style="text-align: right;">${formatNumber(count as number)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <h3>Orders by Payment Status</h3>
            <table>
              <thead>
                <tr>
                  <th>Payment Status</th>
                  <th style="text-align: right;">Count</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(data.orderSummary.byPaymentStatus).map(([status, count]) => `
                  <tr>
                    <td>${status.toUpperCase()}</td>
                    <td style="text-align: right;">${formatNumber(count as number)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <h3>Financial Summary</h3>
            <table>
              <tbody>
                <tr>
                  <td><strong>Total Revenue</strong></td>
                  <td style="text-align: right;"><strong>${formatCurrency(data.orderSummary.totalRevenue)}</strong></td>
                </tr>
                <tr>
                  <td>Total Paid</td>
                  <td style="text-align: right;">${formatCurrency(data.orderSummary.totalPaid)}</td>
                </tr>
                <tr class="summary-row">
                  <td>Outstanding</td>
                  <td style="text-align: right; color: #ef4444;">${formatCurrency(data.orderSummary.outstanding)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          ` : ''}

          ${data.customerAnalytics ? `
          <!-- Customer Analytics -->
          <div class="section">
            <div class="section-title">Customer Analytics</div>
            <p><strong>Total Customers:</strong> ${formatNumber(data.customerAnalytics.total)}</p>
            <p><strong>New Customers This Month:</strong> ${formatNumber(data.customerAnalytics.newThisMonth)}</p>
            <p><strong>Average Loyalty Points:</strong> ${formatNumber(Math.round(data.customerAnalytics.avgLoyaltyPoints))}</p>
            <h3>Top 10 Customers</h3>
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Customer Name</th>
                  <th style="text-align: right;">Total Spent</th>
                  <th style="text-align: right;">Orders</th>
                </tr>
              </thead>
              <tbody>
                ${data.customerAnalytics.topCustomers.map((customer: any, index: number) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${customer.name}</td>
                    <td style="text-align: right;">${formatCurrency(customer.totalSpent)}</td>
                    <td style="text-align: right;">${customer.orders}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}

          ${data.servicePerformance ? `
          <!-- Service Performance -->
          <div class="section">
            <div class="section-title">Service Performance</div>
            <p><strong>Total Services:</strong> ${formatNumber(data.servicePerformance.totalServices)}</p>
            <p><strong>Total Service Revenue:</strong> ${formatCurrency(data.servicePerformance.totalRevenue)}</p>
            <h3>Top 10 Services by Revenue</h3>
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Service Name</th>
                  <th style="text-align: right;">Quantity</th>
                  <th style="text-align: right;">Orders</th>
                  <th style="text-align: right;">Revenue</th>
                </tr>
              </thead>
              <tbody>
                ${data.servicePerformance.topServices.map((service: any, index: number) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${service.name}</td>
                    <td style="text-align: right;">${formatNumber(service.quantity)}</td>
                    <td style="text-align: right;">${formatNumber(service.orders)}</td>
                    <td style="text-align: right;">${formatCurrency(service.revenue)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}

          ${data.revenueTrends ? `
          <!-- Revenue Trends -->
          <div class="section">
            <div class="section-title">Revenue Trends (Last 30 Days)</div>
            <p><strong>Total Revenue:</strong> ${formatCurrency(data.revenueTrends.total)}</p>
            <h3>Weekly Revenue</h3>
            <table>
              <thead>
                <tr>
                  <th>Week</th>
                  <th style="text-align: right;">Revenue</th>
                </tr>
              </thead>
              <tbody>
                ${data.revenueTrends.weekLabels.map((week: string) => `
                  <tr>
                    <td>${week}</td>
                    <td style="text-align: right;">${formatCurrency(data.revenueTrends.weekly[week] || 0)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <h3>Daily Revenue (Last 7 Days)</h3>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th style="text-align: right;">Revenue</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(data.revenueTrends.daily).slice(-7).map(([date, amount]) => `
                  <tr>
                    <td>${date}</td>
                    <td style="text-align: right;">${formatCurrency(amount as number)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}

          <div class="footer">
            <p>This report was generated automatically by LaundroPOS Mobile</p>
            <p>© ${new Date().getFullYear()} All rights reserved</p>
          </div>
        </body>
      </html>
    `
  }

  const quickReports = [
    { id: 'sales', title: 'Sales Report', icon: 'trending-up', color: '#10b981' },
    { id: 'orders', title: 'Order Summary', icon: 'list', color: '#3b82f6' },
    { id: 'customers', title: 'Customer Analytics', icon: 'people', color: '#f59e0b' },
    { id: 'services', title: 'Service Performance', icon: 'analytics', color: '#8b5cf6' },
    { id: 'revenue', title: 'Revenue Trends', icon: 'bar-chart', color: '#06b6d4' },
    { id: 'transactions', title: 'Transactions', icon: 'card', color: '#ef4444' },
    { id: 'export', title: 'Export Data', icon: 'download', color: '#6b7280' },
  ]

  if (loading && !refreshing) {
  return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading reports...</Text>
      </View>
    )
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Reports & Analytics</Text>
        <TouchableOpacity style={styles.exportButton} onPress={handleExportData}>
          <Ionicons name="download" size={20} color="#3b82f6" />
          <Text style={styles.exportText}>Export</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        {reportCards.map((card) => (
          <View key={card.id} style={styles.statCard}>
            <View style={styles.statHeader}>
              <View style={[styles.statIcon, { backgroundColor: `${card.color}20` }]}>
                <Ionicons name={card.icon as any} size={24} color={card.color} />
              </View>
              <View style={styles.changeContainer}>
                <Text style={[
                  styles.changeText,
                  { color: card.changeType === 'positive' ? '#10b981' : '#ef4444' }
                ]}>
                  {card.change}
                </Text>
                <Ionicons 
                  name={card.changeType === 'positive' ? 'trending-up' : 'trending-down'} 
                  size={12} 
                  color={card.changeType === 'positive' ? '#10b981' : '#ef4444'} 
                />
              </View>
            </View>
            <Text style={styles.statValue}>{card.value}</Text>
            <Text style={styles.statTitle}>{card.title}</Text>
          </View>
        ))}
      </View>

      {/* Quick Reports */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Reports</Text>
        <View style={styles.reportsGrid}>
          {quickReports.map((report) => (
            <TouchableOpacity 
              key={report.id} 
              style={styles.reportCard}
              onPress={() => loadReportDetails(report.id)}
            >
              <View style={[styles.reportIcon, { backgroundColor: `${report.color}20` }]}>
                <Ionicons name={report.icon as any} size={24} color={report.color} />
              </View>
              <Text style={styles.reportTitle}>{report.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Report Detail Modal */}
      <Modal
        visible={selectedReport !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedReport(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {quickReports.find(r => r.id === selectedReport)?.title || 'Report'}
              </Text>
              <TouchableOpacity onPress={() => setSelectedReport(null)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            {reportLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Loading report data...</Text>
            </View>
            ) : (
              <ScrollView 
                style={styles.modalBody}
                contentContainerStyle={{ paddingBottom: 10 }}
              >
                {selectedReport === 'sales' && reportData.salesReport && (
                  <View>
                    <View style={styles.reportSection}>
                      <Text style={styles.reportSectionTitle}>Total Sales (This Month)</Text>
                      <Text style={styles.reportValue}>{formatCurrency(reportData.salesReport.total)}</Text>
          </View>

                    <View style={styles.reportSection}>
                      <Text style={styles.reportSectionTitle}>Sales by Payment Method</Text>
                      {Object.entries(reportData.salesReport.byMethod).map(([method, amount]) => (
                        <View key={method} style={styles.reportRow}>
                          <Text style={styles.reportLabel}>{method.toUpperCase()}</Text>
                          <Text style={styles.reportAmount}>{formatCurrency(amount as number)}</Text>
            </View>
                      ))}
            </View>

                    <View style={styles.reportSection}>
                      <Text style={styles.reportSectionTitle}>Daily Sales (Last 7 Days)</Text>
                      {Object.entries(reportData.salesReport.daily).map(([date, amount]) => (
                        <View key={date} style={styles.reportRow}>
                          <Text style={styles.reportLabel}>{date}</Text>
                          <Text style={styles.reportAmount}>{formatCurrency(amount as number)}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {selectedReport === 'orders' && reportData.orderSummary && (
                  <View>
                    <View style={styles.reportSection}>
                      <Text style={styles.reportSectionTitle}>Total Orders</Text>
                      <Text style={styles.reportValue}>{formatNumber(reportData.orderSummary.total)}</Text>
                    </View>

                    <View style={styles.reportSection}>
                      <Text style={styles.reportSectionTitle}>Orders by Status</Text>
                      {Object.entries(reportData.orderSummary.byStatus).map(([status, count]) => (
                        <View key={status} style={styles.reportRow}>
                          <Text style={styles.reportLabel}>{status.replace('_', ' ').toUpperCase()}</Text>
                          <Text style={styles.reportAmount}>{formatNumber(count as number)}</Text>
                        </View>
                      ))}
                    </View>

                    <View style={styles.reportSection}>
                      <Text style={styles.reportSectionTitle}>Orders by Payment Status</Text>
                      {Object.entries(reportData.orderSummary.byPaymentStatus).map(([status, count]) => (
                        <View key={status} style={styles.reportRow}>
                          <Text style={styles.reportLabel}>{status.toUpperCase()}</Text>
                          <Text style={styles.reportAmount}>{formatNumber(count as number)}</Text>
                        </View>
                      ))}
                    </View>

                    <View style={styles.reportSection}>
                      <Text style={styles.reportSectionTitle}>Financial Summary</Text>
                      <View style={styles.reportRow}>
                        <Text style={styles.reportLabel}>Total Revenue</Text>
                        <Text style={styles.reportAmount}>{formatCurrency(reportData.orderSummary.totalRevenue)}</Text>
                      </View>
                      <View style={styles.reportRow}>
                        <Text style={styles.reportLabel}>Total Paid</Text>
                        <Text style={styles.reportAmount}>{formatCurrency(reportData.orderSummary.totalPaid)}</Text>
                      </View>
                      <View style={styles.reportRow}>
                        <Text style={styles.reportLabel}>Outstanding</Text>
                        <Text style={[styles.reportAmount, { color: '#ef4444' }]}>
                          {formatCurrency(reportData.orderSummary.outstanding)}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {selectedReport === 'customers' && reportData.customerAnalytics && (
                  <View>
                    <View style={styles.reportSection}>
                      <Text style={styles.reportSectionTitle}>Total Customers</Text>
                      <Text style={styles.reportValue}>{formatNumber(reportData.customerAnalytics.total)}</Text>
                    </View>

                    <View style={styles.reportSection}>
                      <Text style={styles.reportSectionTitle}>New Customers This Month</Text>
                      <Text style={styles.reportValue}>{formatNumber(reportData.customerAnalytics.newThisMonth)}</Text>
                    </View>

                    <View style={styles.reportSection}>
                      <Text style={styles.reportSectionTitle}>Average Loyalty Points</Text>
                      <Text style={styles.reportValue}>{formatNumber(reportData.customerAnalytics.avgLoyaltyPoints)}</Text>
                    </View>

                    <View style={styles.reportSection}>
                      <Text style={styles.reportSectionTitle}>Top 10 Customers</Text>
                      {reportData.customerAnalytics.topCustomers.map((customer: any, index: number) => (
                        <View key={customer.id} style={styles.reportRow}>
                          <View style={styles.customerRank}>
                            <Text style={styles.rankNumber}>{index + 1}</Text>
                            <Text style={styles.reportLabel}>{customer.name}</Text>
                          </View>
                          <View style={styles.customerStats}>
                            <Text style={styles.reportAmount}>{formatCurrency(customer.totalSpent)}</Text>
                            <Text style={styles.reportSubtext}>{customer.orders} orders</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {selectedReport === 'services' && reportData.servicePerformance && (
                  <View>
                    <View style={styles.reportSection}>
                      <Text style={styles.reportSectionTitle}>Total Services</Text>
                      <Text style={styles.reportValue}>{formatNumber(reportData.servicePerformance.totalServices)}</Text>
                    </View>

                    <View style={styles.reportSection}>
                      <Text style={styles.reportSectionTitle}>Total Service Revenue</Text>
                      <Text style={styles.reportValue}>{formatCurrency(reportData.servicePerformance.totalRevenue)}</Text>
                    </View>

                    <View style={styles.reportSection}>
                      <Text style={styles.reportSectionTitle}>Top 10 Services by Revenue</Text>
                      {reportData.servicePerformance.topServices.map((service: any, index: number) => (
                        <View key={service.name} style={styles.reportRow}>
                          <View style={styles.serviceInfo}>
                            <Text style={styles.rankNumber}>{index + 1}</Text>
                            <View>
                              <Text style={styles.reportLabel}>{service.name}</Text>
                              <Text style={styles.reportSubtext}>
                                {service.quantity} sold • {service.orders} orders
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.reportAmount}>{formatCurrency(service.revenue)}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {selectedReport === 'revenue' && reportData.revenueTrends && (
                  <View>
                    <View style={styles.reportSection}>
                      <Text style={styles.reportSectionTitle}>Total Revenue (Last 30 Days)</Text>
                      <Text style={styles.reportValue}>{formatCurrency(reportData.revenueTrends.total)}</Text>
                    </View>

                    <View style={styles.reportSection}>
                      <Text style={styles.reportSectionTitle}>Weekly Revenue</Text>
                      {reportData.revenueTrends.weekLabels.map((week: string) => (
                        <View key={week} style={styles.reportRow}>
                          <Text style={styles.reportLabel}>{week}</Text>
                          <Text style={styles.reportAmount}>
                            {formatCurrency(reportData.revenueTrends.weekly[week] || 0)}
                          </Text>
                        </View>
                      ))}
                    </View>

                    <View style={styles.reportSection}>
                      <Text style={styles.reportSectionTitle}>Daily Revenue (Last 7 Days)</Text>
                      {Object.entries(reportData.revenueTrends.daily).slice(-7).map(([date, amount]) => (
                        <View key={date} style={styles.reportRow}>
                          <Text style={styles.reportLabel}>{date}</Text>
                          <Text style={styles.reportAmount}>{formatCurrency(amount as number)}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {selectedReport === 'transactions' && reportData.transactions && (
                  <View>
                    <View style={styles.reportSection}>
                      <Text style={styles.reportSectionTitle}>Recent Transactions (Last 30 Days)</Text>
                      <Text style={styles.reportSubtext}>
                        {reportData.transactions.length} transactions found
                      </Text>
                    </View>

                    {reportData.transactions.length === 0 ? (
                      <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>No transactions found</Text>
                      </View>
                    ) : (
                      reportData.transactions.map((transaction) => (
                        <View key={transaction.id} style={styles.transactionCard}>
                          <View style={styles.transactionHeader}>
                            <View style={styles.transactionInfo}>
                              <Text style={styles.transactionOrderNumber}>
                                Order: {transaction.order_number}
                              </Text>
                              <Text style={styles.transactionCustomer}>
                                {transaction.customer_name}
                              </Text>
                            </View>
                            <View style={styles.transactionAmountContainer}>
                              <Text style={[
                                styles.transactionAmount,
                                transaction.is_cancelled && styles.cancelledAmount
                              ]}>
                                {formatCurrency(transaction.amount)}
                              </Text>
                              {transaction.is_cancelled && (
                                <Text style={styles.cancelledBadge}>CANCELLED</Text>
                              )}
                            </View>
                          </View>
                          
                          <View style={styles.transactionDetails}>
                            <Text style={styles.transactionDetail}>
                              Method: {transaction.payment_method.toUpperCase()}
                            </Text>
                            <Text style={styles.transactionDetail}>
                              Date: {new Date(transaction.payment_date).toLocaleString()}
                            </Text>
                            {transaction.reference_number && (
                              <Text style={styles.transactionDetail}>
                                Ref: {transaction.reference_number}
                              </Text>
                            )}
                            {transaction.card_number && (
                              <Text style={styles.transactionDetail}>
                                Card: {transaction.card_number}
                              </Text>
                            )}
                            {transaction.is_cancelled && transaction.cancelled_at && (
                              <Text style={[styles.transactionDetail, styles.cancelledText]}>
                                Cancelled: {new Date(transaction.cancelled_at).toLocaleString()}
                              </Text>
                            )}
                          </View>

                          {!transaction.is_cancelled && (
                            <TouchableOpacity
                              style={styles.cancelTransactionButton}
                              onPress={() => {
                                setSelectedTransaction(transaction)
                                setShowCancelModal(true)
                              }}
                            >
                              <Ionicons name="close-circle" size={18} color="#ef4444" />
                              <Text style={styles.cancelTransactionText}>Cancel Transaction</Text>
            </TouchableOpacity>
                          )}
          </View>
                      ))
                    )}
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Cancel Transaction Modal */}
      <Modal
        visible={showCancelModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowCancelModal(false)
          setCancellationReason('')
          setSelectedTransaction(null)
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cancel Transaction</Text>
              <TouchableOpacity onPress={() => {
                setShowCancelModal(false)
                setCancellationReason('')
                setSelectedTransaction(null)
              }}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 10 }}>
              {selectedTransaction && (
                <>
                  <View style={styles.cancelTransactionInfo}>
                    <View style={styles.cancelTransactionInfoRow}>
                      <Text style={styles.cancelTransactionLabel}>Order Number:</Text>
                      <Text style={styles.cancelTransactionValue}>
                        {selectedTransaction.order_number}
                      </Text>
            </View>
                    <View style={styles.cancelTransactionInfoRow}>
                      <Text style={styles.cancelTransactionLabel}>Customer:</Text>
                      <Text style={styles.cancelTransactionValue}>
                        {selectedTransaction.customer_name}
                      </Text>
                    </View>
                    <View style={styles.cancelTransactionInfoRow}>
                      <Text style={styles.cancelTransactionLabel}>Amount:</Text>
                      <Text style={styles.cancelTransactionValue}>
                        {formatCurrency(selectedTransaction.amount)}
                      </Text>
                    </View>
                    <View style={styles.cancelTransactionInfoRow}>
                      <Text style={styles.cancelTransactionLabel}>Payment Method:</Text>
                      <Text style={styles.cancelTransactionValue}>
                        {selectedTransaction.payment_method.toUpperCase()}
                      </Text>
                    </View>
                    <View style={[styles.cancelTransactionInfoRow, styles.refundWarning]}>
                      <Ionicons name="warning" size={20} color="#f59e0b" />
                      <Text style={styles.refundWarningText}>
                        This will reduce the order's paid amount and may change the payment status.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Cancellation Reason *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Enter reason for cancellation"
                      value={cancellationReason}
                      onChangeText={setCancellationReason}
                      multiline
                      numberOfLines={3}
                    />
                  </View>

                  <View style={styles.cancelWarningBox}>
                    <Ionicons name="alert-circle" size={20} color="#ef4444" />
                    <Text style={styles.cancelWarningText}>
                      This action cannot be undone. The payment will be marked as cancelled and the order's payment status will be updated.
                    </Text>
                  </View>
                </>
              )}
            </ScrollView>

            <View style={[styles.modalActions, { paddingBottom: Math.max(insets.bottom, 10) }]}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowCancelModal(false)
                  setCancellationReason('')
                  setSelectedTransaction(null)
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleCancelTransaction}
              >
                <Text style={styles.submitButtonText}>Confirm Cancellation</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      </Modal>
    </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
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
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  exportText: {
    fontSize: 14,
    color: '#3b82f6',
    marginLeft: 4,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeText: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  reportsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  reportCard: {
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
  reportIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  reportTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    textAlign: 'center',
  },
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
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportSection: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  reportSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  reportValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#3b82f6',
    marginBottom: 8,
  },
  reportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  reportLabel: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  reportAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  reportSubtext: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  customerRank: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3b82f6',
    width: 24,
    marginRight: 8,
  },
  customerStats: {
    alignItems: 'flex-end',
  },
  serviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#9ca3af',
  },
  transactionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionOrderNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  transactionCustomer: {
    fontSize: 14,
    color: '#6b7280',
  },
  transactionAmountContainer: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 4,
  },
  cancelledAmount: {
    color: '#ef4444',
    textDecorationLine: 'line-through',
  },
  cancelledBadge: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ef4444',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  transactionDetails: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  transactionDetail: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  cancelledText: {
    color: '#ef4444',
    fontWeight: '500',
  },
  cancelTransactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 10,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  cancelTransactionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
    marginLeft: 6,
  },
  cancelTransactionInfo: {
    marginBottom: 20,
  },
  cancelTransactionInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  cancelTransactionLabel: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  cancelTransactionValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    textAlign: 'right',
  },
  refundWarning: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fffbeb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  refundWarningText: {
    fontSize: 13,
    color: '#92400e',
    marginLeft: 8,
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#ffffff',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  cancelWarningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
    marginBottom: 12,
  },
  cancelWarningText: {
    fontSize: 13,
    color: '#991b1b',
    marginLeft: 8,
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
})

export default ReportsScreen
