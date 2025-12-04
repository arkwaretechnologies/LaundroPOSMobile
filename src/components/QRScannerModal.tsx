import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Modal, TouchableOpacity, Alert, Dimensions, ActivityIndicator, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

// Try to import vision camera modules - will be null if not available
let Camera: any = null
let useCameraDevice: any = null
let useCodeScanner: any = null
let useCameraPermission: any = null

try {
  const visionCamera = require('react-native-vision-camera')
  Camera = visionCamera.Camera
  useCameraDevice = visionCamera.useCameraDevice
  useCodeScanner = visionCamera.useCodeScanner
  useCameraPermission = visionCamera.useCameraPermission
} catch (error) {
  console.warn('⚠️ react-native-vision-camera module not available - native module not linked yet. Rebuild required.')
}

interface QRScannerModalProps {
  visible: boolean
  onClose: () => void
  onScan: (data: {
    type: string
    orderId: string
    orderNumber: string
    customerName?: string
    totalAmount?: number
    date?: string
  }) => void
}

// Camera scanner component (only renders if camera is available)
const CameraScanner: React.FC<{
  onScan: (data: string) => void
  scanned: boolean
}> = ({ onScan, scanned }) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  
  // Check camera availability
  if (!Camera || !useCameraPermission || !useCodeScanner || !useCameraDevice) {
    return (
      <View style={styles.cameraPlaceholder}>
        <Text style={styles.placeholderText}>Camera module not available</Text>
        <Text style={[styles.placeholderText, { fontSize: 12, marginTop: 8 }]}>
          Please rebuild the app: npx expo run:android
        </Text>
      </View>
    )
  }

  const { hasPermission: permission, requestPermission } = useCameraPermission()
  const device = useCameraDevice('back')

  useEffect(() => {
    if (permission === null) {
      requestPermission().then((granted: boolean) => {
        setHasPermission(granted)
      })
    } else {
      setHasPermission(permission)
    }
  }, [permission])

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: (codes: any[]) => {
      if (scanned || codes.length === 0) return
      const code = codes[0]
      if (code?.value) {
        onScan(code.value)
      }
    },
  })

  if (hasPermission === null) {
    return (
      <View style={styles.cameraPlaceholder}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.placeholderText}>Checking camera permission...</Text>
      </View>
    )
  }

  if (hasPermission === false) {
    return (
      <View style={styles.cameraPlaceholder}>
        <Ionicons name="camera-outline" size={64} color="#9ca3af" />
        <Text style={styles.placeholderText}>Camera permission required</Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={() => requestPermission()}
        >
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (!device) {
    return (
      <View style={styles.cameraPlaceholder}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.placeholderText}>Loading camera...</Text>
      </View>
    )
  }

  return (
    <Camera
      style={StyleSheet.absoluteFill}
      device={device}
      isActive={!scanned}
      codeScanner={codeScanner}
    />
  )
}

const QRScannerModal: React.FC<QRScannerModalProps> = ({ visible, onClose, onScan }) => {
  const [scanned, setScanned] = useState(false)
  const insets = useSafeAreaInsets()
  
  const isCameraAvailable = Camera !== null && useCameraPermission !== null && useCodeScanner !== null && useCameraDevice !== null

  useEffect(() => {
    if (visible) {
      setScanned(false)
    }
  }, [visible])

  const handleBarCodeScanned = (data: string) => {
    if (scanned) return

    setScanned(true)
    
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(data)
      
      // Validate it's an order QR code (check for orderId or orderNumber)
      if ((parsed.type === 'order' || parsed.orderId || parsed.orderNumber) && (parsed.orderId || parsed.orderNumber)) {
        console.log('✅ Scanned order QR code:', parsed)
        // Ensure we have the required fields
        const orderData = {
          type: parsed.type || 'order',
          orderId: parsed.orderId || parsed.orderNumber,
          orderNumber: parsed.orderNumber || parsed.orderId,
          customerName: parsed.customerName,
          totalAmount: parsed.totalAmount,
          date: parsed.date,
        }
        onScan(orderData)
        onClose()
      } else {
        Alert.alert('Invalid QR Code', 'This QR code is not a valid order tracking code.')
        setScanned(false)
      }
    } catch (error) {
      // If parsing fails, check if it's a plain order ID or order number
      console.log('⚠️ QR code is not JSON, trying as order ID/number:', data)
      
      // Try to find by order ID or order number
      if (data && data.length > 0) {
        // Assume it might be an order ID or order number
        onScan({
          type: 'order',
          orderId: data,
          orderNumber: data,
        })
        onClose()
      } else {
        Alert.alert('Invalid QR Code', 'Could not read order information from this QR code.')
        setScanned(false)
      }
    }
  }

  // Show rebuild required message if camera module is not available
  if (!isCameraAvailable) {
    return (
      <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={styles.permissionContainer}>
            <Ionicons name="camera-outline" size={64} color="#f59e0b" />
            <Text style={styles.permissionTitle}>Camera Module Not Available</Text>
            <Text style={styles.permissionText}>
              The camera module requires a rebuild of the development client to work.
            </Text>
            <Text style={[styles.permissionText, { marginTop: 8, fontSize: 14, fontFamily: 'monospace' }]}>
              Please rebuild the app using:{'\n'}
              <Text style={{ fontWeight: 'bold' }}>npx expo run:android</Text>
            </Text>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    )
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.scannerContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Scan QR Code</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Camera View */}
          <View style={styles.cameraWrapper}>
            <CameraScanner onScan={handleBarCodeScanned} scanned={scanned} />
            
            {/* Overlay with scanning frame */}
            <View style={styles.overlay}>
              <View style={styles.scanArea}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
            </View>
          </View>

          {/* Instructions */}
          <View style={styles.footer}>
            <Text style={styles.instructionText}>
              Position the QR code within the frame to scan
            </Text>
            {scanned && (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="small" color="#3b82f6" />
                <Text style={styles.processingText}>Processing...</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  )
}

const { width, height } = Dimensions.get('window')
const scanAreaSize = Math.min(width - 80, 300)

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerContainer: {
    width: width,
    height: height,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  closeButton: {
    padding: 4,
  },
  cameraWrapper: {
    flex: 1,
    position: 'relative',
  },
  cameraPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  placeholderText: {
    color: '#ffffff',
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  scanArea: {
    width: scanAreaSize,
    height: scanAreaSize,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#3b82f6',
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  footer: {
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  processingText: {
    fontSize: 14,
    color: '#3b82f6',
  },
  permissionContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    margin: 20,
    maxWidth: 400,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  permissionButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 8,
  },
  permissionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '500',
  },
})

export default QRScannerModal
