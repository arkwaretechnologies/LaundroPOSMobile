import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, ActivityIndicator, RefreshControl } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { useStore } from '../context/StoreContext'

interface DashboardMetrics {
  totalSales: number
  totalOrders: number
  activeOrders: number
  totalCustomers: number
  pendingPickups: number
  paidInFull: { count: number; amount: number }
  partial: { count: number; amount: number }
  payLater: { count: number; amount: number }
}

const DashboardScreen: React.FC = () => {
  const { currentStore } = useStore()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalSales: 0,
    totalOrders: 0,
    activeOrders: 0,
    totalCustomers: 0,
    pendingPickups: 0,
    paidInFull: { count: 0, amount: 0 },
    partial: { count: 0, amount: 0 },
    payLater: { count: 0, amount: 0 },
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (currentStore) {
      loadDashboardData()
    }
  }, [currentStore, selectedDate])

  const loadDashboardData = async () => {
    if (!currentStore) return

    try {
      setLoading(true)
      const startOfDay = new Date(selectedDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(selectedDate)
      endOfDay.setHours(23, 59, 59, 999)

      // Fetch orders for selected date
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('store_id', currentStore.id)
        .gte('order_date', startOfDay.toISOString())
        .lte('order_date', endOfDay.toISOString())

      if (ordersError) throw ordersError

      // Fetch total customers for this store
      const { count: customersCount, error: customersError } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', currentStore.id)
        .eq('is_active', true)

      if (customersError) throw customersError

      // Calculate metrics
      const totalSales = orders?.reduce((sum, order) => sum + Number(order.paid_amount), 0) || 0
      const totalOrders = orders?.length || 0
      const activeOrders = orders?.filter(o => o.order_status !== 'completed' && o.order_status !== 'cancelled').length || 0
      const pendingPickups = orders?.filter(o => o.order_status === 'ready').length || 0

      const paidInFull = orders?.filter(o => o.payment_status === 'paid') || []
      const partial = orders?.filter(o => o.payment_status === 'partial') || []
      const payLater = orders?.filter(o => o.payment_status === 'unpaid') || []

      setMetrics({
        totalSales,
        totalOrders,
        activeOrders,
        totalCustomers: customersCount || 0,
        pendingPickups,
        paidInFull: {
          count: paidInFull.length,
          amount: paidInFull.reduce((sum, o) => sum + Number(o.total_amount), 0),
        },
        partial: {
          count: partial.length,
          amount: partial.reduce((sum, o) => sum + Number(o.paid_amount), 0),
        },
        payLater: {
          count: payLater.length,
          amount: payLater.reduce((sum, o) => sum + Number(o.total_amount), 0),
        },
      })
    } catch (error: any) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadDashboardData()
    setRefreshing(false)
  }

  const formatDate = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const compareDate = new Date(date)
    compareDate.setHours(0, 0, 0, 0)

    if (compareDate.getTime() === today.getTime()) {
      return 'Today'
    }

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (compareDate.getTime() === yesterday.getTime()) {
      return 'Yesterday'
    }

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const [currentMonth, setCurrentMonth] = useState(new Date())

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []
    // Add empty slots for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    return days
  }

  const changeMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentMonth)
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setCurrentMonth(newDate)
  }

  const isToday = (date: Date | null) => {
    if (!date) return false
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isSelected = (date: Date | null) => {
    if (!date) return false
    return date.toDateString() === selectedDate.toDateString()
  }

  const isFutureDate = (date: Date | null) => {
    if (!date) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const compareDate = new Date(date)
    compareDate.setHours(0, 0, 0, 0)
    return compareDate > today
  }

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    )
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.subtitle}>{currentStore?.name}</Text>
        </View>
        <TouchableOpacity 
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Ionicons name="calendar-outline" size={18} color="#3b82f6" />
          <Text style={styles.dateButtonText}>{formatDate(selectedDate)}</Text>
          <Ionicons name="chevron-down" size={16} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <View style={styles.statIcon}>
            <Ionicons name="trending-up" size={24} color="#10b981" />
          </View>
          <Text style={styles.statValue}>₱{metrics.totalSales.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Total Sales</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIcon}>
            <Ionicons name="list" size={24} color="#3b82f6" />
          </View>
          <Text style={styles.statValue}>{metrics.totalOrders}</Text>
          <Text style={styles.statLabel}>Total Orders</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIcon}>
            <Ionicons name="people" size={24} color="#f59e0b" />
          </View>
          <Text style={styles.statValue}>{metrics.totalCustomers}</Text>
          <Text style={styles.statLabel}>Customers</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIcon}>
            <Ionicons name="time" size={24} color="#ef4444" />
          </View>
          <Text style={styles.statValue}>{metrics.pendingPickups}</Text>
          <Text style={styles.statLabel}>Ready for Pickup</Text>
        </View>
      </View>

      {/* Payment Overview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Breakdown</Text>
        <View style={styles.paymentStatsGrid}>
          <View style={styles.paymentStatCard}>
            <View style={styles.paymentStatHeader}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              <Text style={styles.paymentStatTitle}>Paid in Full</Text>
            </View>
            <Text style={styles.paymentStatNumber}>{metrics.paidInFull.count}</Text>
            <Text style={styles.paymentStatAmount}>₱{metrics.paidInFull.amount.toFixed(2)}</Text>
          </View>
          
          <View style={styles.paymentStatCard}>
            <View style={styles.paymentStatHeader}>
              <Ionicons name="card" size={20} color="#f59e0b" />
              <Text style={styles.paymentStatTitle}>Partial</Text>
            </View>
            <Text style={styles.paymentStatNumber}>{metrics.partial.count}</Text>
            <Text style={styles.paymentStatAmount}>₱{metrics.partial.amount.toFixed(2)}</Text>
          </View>
          
          <View style={styles.paymentStatCard}>
            <View style={styles.paymentStatHeader}>
              <Ionicons name="time" size={20} color="#ef4444" />
              <Text style={styles.paymentStatTitle}>Pay Later</Text>
            </View>
            <Text style={styles.paymentStatNumber}>{metrics.payLater.count}</Text>
            <Text style={styles.paymentStatAmount}>₱{metrics.payLater.amount.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      {/* Order Status Overview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Status</Text>
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusInfo}>
              <View style={[styles.statusDot, { backgroundColor: '#f59e0b' }]} />
              <Text style={styles.statusLabel}>Pending</Text>
            </View>
            <Text style={styles.statusValue}>{metrics.totalOrders - metrics.activeOrders}</Text>
          </View>
          <View style={styles.statusRow}>
            <View style={styles.statusInfo}>
              <View style={[styles.statusDot, { backgroundColor: '#3b82f6' }]} />
              <Text style={styles.statusLabel}>Active</Text>
            </View>
            <Text style={styles.statusValue}>{metrics.activeOrders}</Text>
          </View>
          <View style={styles.statusRow}>
            <View style={styles.statusInfo}>
              <View style={[styles.statusDot, { backgroundColor: '#10b981' }]} />
              <Text style={styles.statusLabel}>Ready for Pickup</Text>
            </View>
            <Text style={styles.statusValue}>{metrics.pendingPickups}</Text>
          </View>
        </View>
      </View>

      {/* Date Picker Modal - Calendar View */}
      <Modal
        visible={showDatePicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.calendarModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            {/* Calendar Header */}
            <View style={styles.calendarHeader}>
              <TouchableOpacity 
                style={styles.monthButton}
                onPress={() => changeMonth('prev')}
              >
                <Ionicons name="chevron-back" size={24} color="#3b82f6" />
              </TouchableOpacity>
              <Text style={styles.monthTitle}>
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </Text>
              <TouchableOpacity 
                style={styles.monthButton}
                onPress={() => changeMonth('next')}
              >
                <Ionicons name="chevron-forward" size={24} color="#3b82f6" />
              </TouchableOpacity>
            </View>

            {/* Weekday Headers */}
            <View style={styles.weekdayHeader}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <View key={day} style={styles.weekdayCell}>
                  <Text style={styles.weekdayText}>{day}</Text>
                </View>
              ))}
            </View>

            {/* Calendar Grid */}
            <View style={styles.calendarGrid}>
              {getDaysInMonth(currentMonth).map((date, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayCell,
                    !date && styles.emptyCell,
                    isToday(date) && styles.todayCell,
                    isSelected(date) && styles.selectedCell,
                  ]}
                  disabled={!date || isFutureDate(date)}
                  onPress={() => {
                    if (date && !isFutureDate(date)) {
                      setSelectedDate(date)
                      setShowDatePicker(false)
                    }
                  }}
                >
                  {date && (
                    <Text style={[
                      styles.dayText,
                      isToday(date) && styles.todayText,
                      isSelected(date) && styles.selectedText,
                      isFutureDate(date) && styles.disabledText,
                    ]}>
                      {date.getDate()}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => {
                  setSelectedDate(new Date())
                  setCurrentMonth(new Date())
                  setShowDatePicker(false)
                }}
              >
                <Text style={styles.quickActionText}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => {
                  const yesterday = new Date()
                  yesterday.setDate(yesterday.getDate() - 1)
                  setSelectedDate(yesterday)
                  setCurrentMonth(yesterday)
                  setShowDatePicker(false)
                }}
              >
                <Text style={styles.quickActionText}>Yesterday</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingTop: 60,
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
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    gap: 6,
  },
  dateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
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
  statIcon: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
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
  activityList: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  activityIcon: {
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: '#111827',
    marginBottom: 2,
  },
  paymentStatsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentStatCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  paymentStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentStatTitle: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 6,
    fontWeight: '500',
  },
  paymentStatNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  paymentStatAmount: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  statusCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#374151',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  calendarModal: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
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
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  monthButton: {
    padding: 8,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  weekdayHeader: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  emptyCell: {
    backgroundColor: 'transparent',
  },
  todayCell: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
  },
  selectedCell: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  dayText: {
    fontSize: 16,
    color: '#111827',
  },
  todayText: {
    fontWeight: 'bold',
    color: '#f59e0b',
  },
  selectedText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  disabledText: {
    color: '#d1d5db',
  },
  quickActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  quickActionButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    alignItems: 'center',
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
})

export default DashboardScreen
