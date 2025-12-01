import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Modal } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import AsyncStorage from '@react-native-async-storage/async-storage'
import PrinterConfigScreen from './PrinterConfigScreen'

interface SettingsScreenProps {
  navigation?: {
    navigate: (screen: string) => void
    goBack: () => void
  }
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false)
  const [showServicesModal, setShowServicesModal] = useState(false)
  const [userData, setUserData] = useState<{
    firstName: string
    lastName: string
    email: string
    role: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPrinterConfig, setShowPrinterConfig] = useState(false)

  useEffect(() => {
    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        console.log('No user found')
        return
      }

      // Get user details from the users table
      const { data: userDetails, error } = await supabase
        .from('users')
        .select('first_name, last_name, email, role')
        .eq('email', user.email)
        .single()

      if (error) {
        console.error('Error fetching user details:', error)
        return
      }

      setUserData({
        firstName: userDetails.first_name || 'User',
        lastName: userDetails.last_name || '',
        email: userDetails.email || user.email,
        role: userDetails.role || 'User'
      })
    } catch (error) {
      console.error('Error fetching user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const settingsSections = [
    {
      title: 'Account',
      items: [
        { icon: 'person', title: 'Profile Settings', subtitle: 'Manage your account', color: '#3b82f6' },
        { icon: 'key', title: 'Change Password', subtitle: 'Update your password', color: '#6b7280' },
        { icon: 'shield-checkmark', title: 'Security', subtitle: 'Two-factor authentication', color: '#10b981' },
      ]
    },
    {
      title: 'Store Settings',
      items: [
        { icon: 'storefront', title: 'Store Information', subtitle: 'Business details', color: '#f59e0b' },
        { icon: 'pricetag', title: 'Services & Pricing', subtitle: 'Manage laundry services', color: '#10b981', action: 'services' },
        { icon: 'receipt', title: 'Receipt Settings', subtitle: 'Print and email options', color: '#8b5cf6' },
        { icon: 'print', title: 'Printer Configuration', subtitle: 'Setup and select printer', color: '#8b5cf6', action: 'printer' },
        { icon: 'time', title: 'Business Hours', subtitle: 'Operating schedule', color: '#06b6d4' },
        { icon: 'card', title: 'Payment Methods', subtitle: 'Accept payment types', color: '#ef4444' },
      ]
    },
    {
      title: 'App Settings',
      items: [
        { 
          icon: 'notifications', 
          title: 'Push Notifications', 
          subtitle: 'Order updates and alerts',
          color: '#3b82f6',
          type: 'switch',
          value: notificationsEnabled,
          onValueChange: setNotificationsEnabled
        },
        { 
          icon: 'sync', 
          title: 'Auto Sync', 
          subtitle: 'Sync data automatically',
          color: '#10b981',
          type: 'switch',
          value: autoSyncEnabled,
          onValueChange: setAutoSyncEnabled
        },
        { icon: 'language', title: 'Language', subtitle: 'English', color: '#6b7280' },
        { icon: 'moon', title: 'Dark Mode', subtitle: 'System', color: '#4b5563' },
      ]
    },
    {
      title: 'Support',
      items: [
        { icon: 'help-circle', title: 'Help Center', subtitle: 'FAQs and guides', color: '#3b82f6' },
        { icon: 'chatbubble', title: 'Contact Support', subtitle: 'Get help from our team', color: '#10b981' },
        { icon: 'document-text', title: 'Terms & Privacy', subtitle: 'Legal information', color: '#6b7280' },
        { icon: 'information-circle', title: 'About', subtitle: 'Version 1.0.0', color: '#f59e0b' },
      ]
    }
  ]

  const handleSettingPress = (item: any) => {
    if (item.action === 'services' && navigation) {
      navigation.navigate('ServicesManagement')
    } else if (item.action === 'printer') {
      setShowPrinterConfig(true)
    }
  }

  const handleSignOut = async () => {
    console.log('Sign out button pressed')
    
    try {
      console.log('Calling supabase.auth.signOut()')
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Sign out error:', error)
        Alert.alert('Error', 'Failed to sign out. Please try again.')
      } else {
        console.log('Sign out successful')
        
        // Manually clear AsyncStorage
        try {
          await AsyncStorage.multiRemove([
            'supabase.auth.token',
            'sb-huwqsicrwqhxfinhpxsg-auth-token',
            'supabase.auth.session'
          ])
          console.log('AsyncStorage cleared')
        } catch (e) {
          console.log('AsyncStorage clear error:', e)
        }
      }
    } catch (error) {
      console.error('Sign out error:', error)
      Alert.alert('Error', 'Failed to sign out. Please try again.')
    }
  }

  const renderSettingItem = (item: any) => {
    return (
      <TouchableOpacity 
        key={item.title} 
        style={styles.settingItem}
        onPress={() => handleSettingPress(item)}
      >
        <View style={styles.settingLeft}>
          <View style={[styles.settingIcon, { backgroundColor: `${item.color}20` }]}>
            <Ionicons name={item.icon as any} size={20} color={item.color} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>{item.title}</Text>
            <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
          </View>
        </View>
        <View style={styles.settingRight}>
          {item.type === 'switch' ? (
            <Switch
              value={item.value}
              onValueChange={item.onValueChange}
              trackColor={{ false: '#d1d5db', true: `${item.color}50` }}
              thumbColor={item.value ? item.color : '#ffffff'}
            />
          ) : (
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          )}
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={32} color="#ffffff" />
          </View>
          <TouchableOpacity style={styles.editButton}>
            <Ionicons name="camera" size={16} color="#3b82f6" />
          </TouchableOpacity>
        </View>
        {loading ? (
          <Text style={styles.userName}>Loading...</Text>
        ) : userData ? (
          <>
            <Text style={styles.userName}>
              {userData.firstName} {userData.lastName}
            </Text>
            <Text style={styles.userRole}>
              {userData.role === 'super_admin' ? 'Super Admin' : 
               userData.role === 'store_owner' ? 'Store Owner' :
               userData.role === 'manager' ? 'Store Manager' :
               userData.role === 'cashier' ? 'Cashier' : 'User'}
            </Text>
            <Text style={styles.userEmail}>{userData.email}</Text>
          </>
        ) : (
          <Text style={styles.userName}>User</Text>
        )}
      </View>

      {/* Settings Sections */}
      {settingsSections.map((section, sectionIndex) => (
        <View key={sectionIndex} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.sectionContent}>
            {section.items.map((item, itemIndex) => (
              <View key={itemIndex}>
                {renderSettingItem(item)}
                {itemIndex < section.items.length - 1 && <View style={styles.separator} />}
              </View>
            ))}
          </View>
        </View>
      ))}

      {/* Logout Button */}
      <View style={styles.logoutSection}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
          <Ionicons name="log-out" size={20} color="#ef4444" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* App Version */}
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>LaundroPOS v1.0.0</Text>
        <Text style={styles.versionSubtext}>Powered by ArkWare Technologies</Text>
      </View>

      {/* Printer Configuration Modal */}
      <Modal
        visible={showPrinterConfig}
        animationType="slide"
        onRequestClose={() => setShowPrinterConfig(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowPrinterConfig(false)}
            >
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
          </View>
          <PrinterConfigScreen />
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
  profileHeader: {
    backgroundColor: '#ffffff',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 8,
  },
  userEmail: {
    fontSize: 14,
    color: '#9ca3af',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  sectionContent: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
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
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  settingRight: {
    marginLeft: 12,
  },
  separator: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginLeft: 64,
  },
  logoutSection: {
    padding: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ef4444',
    marginLeft: 8,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  versionText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  versionSubtext: {
    fontSize: 12,
    color: '#9ca3af',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalCloseButton: {
    padding: 8,
  },
})

export default SettingsScreen
