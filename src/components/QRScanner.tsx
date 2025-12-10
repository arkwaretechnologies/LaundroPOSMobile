import React, { useState, useEffect } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Vibration,
} from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'

interface QRScannerProps {
  onScan?: (code: string) => void
  onClose?: () => void
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const [permission, requestPermission] = useCameraPermissions()
  const [isScanning, setIsScanning] = useState(true)
  const [scannedData, setScannedData] = useState('')
  const [scanned, setScanned] = useState(false)

  // Reset scanning state when component mounts
  useEffect(() => {
    setIsScanning(true)
    setScannedData('')
    setScanned(false)
    console.log('📷 QR Scanner initialized, scanning enabled:', isScanning)
  }, [])

  // Log when scanning state changes
  useEffect(() => {
    console.log('📷 Scanning state changed:', isScanning)
  }, [isScanning])

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned || !isScanning) {
      console.log('⚠️ Already scanned or scanning disabled, ignoring')
      return
    }

    console.log('📷 QR Code scanned:', data)
    
    if (data && data.trim()) {
      const scannedCode = data.trim()
      console.log('✅ Successfully scanned QR code:', scannedCode)
      setScannedData(scannedCode)
      setScanned(true)
      setIsScanning(false)
      Vibration.vibrate(100) // Haptic feedback
      onScan?.(scannedCode) // Callback for order lookup
    }
  }

  const restartScan = () => {
    setIsScanning(true)
    setScannedData('')
    setScanned(false)
  }

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Requesting camera permission...</Text>
        {onClose && (
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.buttonText}>Close</Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Camera permission is required to scan QR codes.</Text>
        <Text style={[styles.text, { marginTop: 10, fontSize: 14 }]}>
          Please grant camera permission to continue.
        </Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
        {onClose && (
          <TouchableOpacity style={[styles.button, { marginTop: 10, backgroundColor: '#6b7280' }]} onPress={onClose}>
            <Text style={styles.buttonText}>Close</Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      />

      {/* Header with close button */}
      {onClose && (
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Scan overlay: Center square guide for QR */}
      <View style={styles.overlay} pointerEvents="none">
        {/* Top dark area */}
        <View style={styles.overlayTop} />
        {/* Middle section with transparent center */}
        <View style={styles.overlayMiddle}>
          <View style={styles.overlaySide} />
          <View style={styles.scanFrameContainer}>
            <View style={styles.scanFrame} />
            <Text style={styles.instruction}>Align QR Code Here</Text>
          </View>
          <View style={styles.overlaySide} />
        </View>
        {/* Bottom dark area */}
        <View style={styles.overlayBottom} />
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {scannedData ? (
          <TouchableOpacity style={styles.button} onPress={restartScan}>
            <Text style={styles.buttonText}>Scan Again</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Last scan info */}
      {scannedData ? (
        <View style={styles.result}>
          <Text style={styles.resultText}>Scanned: {scannedData}</Text>
        </View>
      ) : (
        <View style={styles.debugInfo}>
          <Text style={styles.debugText}>
            Scanning: {isScanning ? 'Active' : 'Inactive'}
          </Text>
          <Text style={styles.debugText}>
            Camera: {permission?.granted ? 'Ready' : 'Not Ready'}
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    padding: 20,
  },
  text: {
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  header: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  closeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 10,
    borderRadius: 20,
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  overlayMiddle: {
    flexDirection: 'row',
    height: 300,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  scanFrameContainer: {
    width: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: '#3b82f6',
    borderRadius: 10,
    backgroundColor: 'transparent',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  instruction: {
    marginTop: 20,
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
  controls: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  button: {
    backgroundColor: '#00FF00',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 30,
    elevation: 5,
  },
  buttonText: {
    color: 'black',
    fontWeight: 'bold',
    fontSize: 16,
  },
  result: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    borderRadius: 5,
  },
  resultText: {
    color: 'white',
    fontSize: 14,
  },
  debugInfo: {
    position: 'absolute',
    top: 100,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    borderRadius: 5,
  },
  debugText: {
    color: 'white',
    fontSize: 12,
    marginBottom: 4,
  },
})
