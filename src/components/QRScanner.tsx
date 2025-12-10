import React, { useRef, useState, useEffect } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Vibration,
  PermissionsAndroid,
  Platform,
  Alert,
} from 'react-native'
import { Camera } from 'react-native-camera-kit'

interface QRScannerProps {
  onScan?: (code: string) => void
  onClose?: () => void
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const cameraRef = useRef<Camera>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [isScanning, setIsScanning] = useState(true)
  const [scannedData, setScannedData] = useState('')

  // Request camera permission
  useEffect(() => {
    requestCameraPermission()
  }, [])

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'LaundroPOS needs access to your camera to scan QR codes',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        )
        setHasPermission(granted === PermissionsAndroid.RESULTS.GRANTED)
      } catch (err) {
        console.warn('Camera permission error:', err)
        setHasPermission(false)
      }
    } else {
      // iOS - CameraKit handles permissions automatically
      setHasPermission(true)
    }
  }

  const handleBarcodeScan = (event: any) => {
    if (!isScanning) return

    const { codeStringValue } = event.nativeEvent
    if (codeStringValue) {
      setScannedData(codeStringValue)
      Vibration.vibrate(100) // Haptic feedback
      setIsScanning(false) // Stop after first scan
      onScan?.(codeStringValue) // Callback for order lookup
    }
  }

  const restartScan = () => {
    setIsScanning(true)
    setScannedData('')
  }

  if (hasPermission === null) {
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

  if (hasPermission === false) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Camera permission is required to scan QR codes.</Text>
        <Text style={[styles.text, { marginTop: 10, fontSize: 14 }]}>
          Please enable camera permission in your device settings.
        </Text>
        <TouchableOpacity style={styles.button} onPress={requestCameraPermission}>
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
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        cameraType="back"
        scanBarcode={isScanning}
        showFrame={true}
        laserColor="#00FF00"
        frameColor="#00FF00"
        onReadCode={handleBarcodeScan}
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
      <View style={styles.overlay}>
        <View style={styles.scanFrame} />
        <Text style={styles.instruction}>Align QR Code Here</Text>
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
      ) : null}
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#00FF00',
    borderRadius: 10,
    backgroundColor: 'transparent',
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
})
