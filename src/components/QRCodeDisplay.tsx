import React from 'react'
import { View, Text, StyleSheet, Dimensions } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface QRCodeDisplayProps {
  data: string
  orderNumber: string
  size?: number
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ 
  data, 
  orderNumber, 
  size = 200 
}) => {
  const screenWidth = Dimensions.get('window').width
  const qrSize = Math.min(size, screenWidth - 40)

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Order Tracking QR Code</Text>
      
      <View style={[styles.qrCodePlaceholder, { width: qrSize, height: qrSize }]}>
        <Ionicons name="qr-code" size={qrSize * 0.6} color="#3b82f6" />
        <Text style={styles.orderNumber}>{orderNumber}</Text>
        <Text style={styles.scanText}>Scan to track order</Text>
      </View>
      
      <View style={styles.dataContainer}>
        <Text style={styles.dataLabel}>Order Data:</Text>
        <Text style={styles.dataText} numberOfLines={3}>
          {data}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
  },
  qrCodePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 8,
  },
  scanText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  dataContainer: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    width: '100%',
    maxWidth: 300,
  },
  dataLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  dataText: {
    fontSize: 10,
    color: '#6b7280',
    fontFamily: 'monospace',
  },
})

export default QRCodeDisplay




