import React from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

const ReportsScreen: React.FC = () => {
  const reportCards = [
    {
      id: 1,
      title: 'Daily Sales',
      value: '₱2,450',
      change: '+12%',
      changeType: 'positive',
      icon: 'trending-up',
      color: '#10b981'
    },
    {
      id: 2,
      title: 'Weekly Sales',
      value: '₱15,230',
      change: '+8%',
      changeType: 'positive',
      icon: 'bar-chart',
      color: '#3b82f6'
    },
    {
      id: 3,
      title: 'Monthly Sales',
      value: '₱58,900',
      change: '-3%',
      changeType: 'negative',
      icon: 'calendar',
      color: '#f59e0b'
    },
    {
      id: 4,
      title: 'Total Orders',
      value: '1,245',
      change: '+15%',
      changeType: 'positive',
      icon: 'list',
      color: '#8b5cf6'
    },
    {
      id: 5,
      title: 'Avg Order Value',
      value: '₱47.30',
      change: '+5%',
      changeType: 'positive',
      icon: 'cash',
      color: '#06b6d4'
    },
    {
      id: 6,
      title: 'Customer Count',
      value: '856',
      change: '+22%',
      changeType: 'positive',
      icon: 'people',
      color: '#ef4444'
    }
  ]

  const quickReports = [
    { title: 'Sales Report', icon: 'trending-up', color: '#10b981' },
    { title: 'Order Summary', icon: 'list', color: '#3b82f6' },
    { title: 'Customer Analytics', icon: 'people', color: '#f59e0b' },
    { title: 'Service Performance', icon: 'analytics', color: '#8b5cf6' },
    { title: 'Revenue Trends', icon: 'bar-chart', color: '#06b6d4' },
    { title: 'Export Data', icon: 'download', color: '#6b7280' },
  ]

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Reports & Analytics</Text>
        <TouchableOpacity style={styles.exportButton}>
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
          {quickReports.map((report, index) => (
            <TouchableOpacity key={index} style={styles.reportCard}>
              <View style={[styles.reportIcon, { backgroundColor: `${report.color}20` }]}>
                <Ionicons name={report.icon as any} size={24} color={report.color} />
              </View>
              <Text style={styles.reportTitle}>{report.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Recent Reports */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Reports</Text>
        <View style={styles.recentReports}>
          <View style={styles.reportItem}>
            <View style={styles.reportItemIcon}>
              <Ionicons name="document-text" size={20} color="#3b82f6" />
            </View>
            <View style={styles.reportItemContent}>
              <Text style={styles.reportItemTitle}>Daily Sales Report</Text>
              <Text style={styles.reportItemDate}>Generated 2 hours ago</Text>
            </View>
            <TouchableOpacity style={styles.downloadButton}>
              <Ionicons name="download" size={16} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.reportItem}>
            <View style={styles.reportItemIcon}>
              <Ionicons name="document-text" size={20} color="#10b981" />
            </View>
            <View style={styles.reportItemContent}>
              <Text style={styles.reportItemTitle}>Weekly Summary</Text>
              <Text style={styles.reportItemDate}>Generated yesterday</Text>
            </View>
            <TouchableOpacity style={styles.downloadButton}>
              <Ionicons name="download" size={16} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.reportItem}>
            <View style={styles.reportItemIcon}>
              <Ionicons name="document-text" size={20} color="#f59e0b" />
            </View>
            <View style={styles.reportItemContent}>
              <Text style={styles.reportItemTitle}>Monthly Analytics</Text>
              <Text style={styles.reportItemDate}>Generated 3 days ago</Text>
            </View>
            <TouchableOpacity style={styles.downloadButton}>
              <Ionicons name="download" size={16} color="#6b7280" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
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
  recentReports: {
    backgroundColor: '#ffffff',
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
  reportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  reportItemIcon: {
    marginRight: 12,
  },
  reportItemContent: {
    flex: 1,
  },
  reportItemTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  reportItemDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  downloadButton: {
    padding: 8,
  },
})

export default ReportsScreen
