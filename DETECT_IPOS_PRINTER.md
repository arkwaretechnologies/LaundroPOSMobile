# How to Use detectIPOSPrinter()

This guide shows you how to detect if the IPOS printer service is available on your device.

## Quick Usage

```typescript
import { NativeModules } from 'react-native';

const { POSTerminalPrinter } = NativeModules;

// Detect IPOS printer service
const result = await POSTerminalPrinter.detectIPOSPrinter();

console.log('Detection Result:', result);
// {
//   found: boolean,              // Is the service package found?
//   serviceAvailable: boolean,   // Can the service be resolved?
//   aidlConnected: boolean,      // Is AIDL connection established?
//   isConnected: boolean,         // Same as aidlConnected
//   packageName: string | null,  // Package name if found
//   action: string | null        // Service action if found
// }
```

## Using the Service Wrapper

```typescript
import POSTerminalPrinterService from './services/POSTerminalPrinterService';

// Detect IPOS printer service
const result = await POSTerminalPrinterService.detectIPOSPrinter();

if (result.found) {
  console.log('✅ IPOS printer service found!');
  console.log(`Package: ${result.packageName}`);
  console.log(`AIDL Connected: ${result.aidlConnected}`);
  
  if (result.aidlConnected) {
    // Service is connected, you can now initialize and print
    await POSTerminalPrinterService.initializePrinter();
    await POSTerminalPrinterService.printText('Hello!');
  } else {
    // Try to connect
    await POSTerminalPrinterService.connectPrinterService();
  }
} else {
  console.log('❌ IPOS printer service not found');
  console.log('Please install the IPOS printer service app on your device');
}
```

## Complete Example

```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, Button } from 'react-native';
import POSTerminalPrinterService from './services/POSTerminalPrinterService';

export default function PrinterDetectionExample() {
  const [detectionResult, setDetectionResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const detectPrinter = async () => {
    setLoading(true);
    try {
      const result = await POSTerminalPrinterService.detectIPOSPrinter();
      setDetectionResult(result);
    } catch (error) {
      console.error('Detection failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    detectPrinter();
  }, []);

  return (
    <View>
      <Button title="Detect IPOS Printer" onPress={detectPrinter} />
      
      {loading && <Text>Detecting...</Text>}
      
      {detectionResult && (
        <View>
          <Text>Found: {detectionResult.found ? '✅ Yes' : '❌ No'}</Text>
          <Text>Service Available: {detectionResult.serviceAvailable ? '✅' : '❌'}</Text>
          <Text>AIDL Connected: {detectionResult.aidlConnected ? '✅' : '❌'}</Text>
          <Text>Package: {detectionResult.packageName || 'N/A'}</Text>
        </View>
      )}
    </View>
  );
}
```

## What the Detection Checks

1. **Package Installation**: Checks if `com.iposprinter.iposprinterservice` (or variants) is installed
2. **Service Resolution**: Verifies the service can be resolved via Intent
3. **AIDL Connection**: Checks if the AIDL connection is already established
4. **Package Search**: Searches all installed packages for IPOS-related services

## Expected Results

### ✅ Service Found and Connected
```javascript
{
  found: true,
  serviceAvailable: true,
  aidlConnected: true,
  isConnected: true,
  packageName: "com.iposprinter.iposprinterservice",
  action: "com.iposprinter.iposprinterservice.IPosPrinterService"
}
```

### ❌ Service Not Found
```javascript
{
  found: false,
  serviceAvailable: false,
  aidlConnected: false,
  isConnected: false,
  packageName: null,
  action: null
}
```

## Troubleshooting

If detection returns `found: false`:

1. **Check if service is installed**:
   ```bash
   adb shell pm list packages | grep ipos
   ```

2. **Install the IPOS printer service app**:
   - The service is usually pre-installed on GZPDA03/POSPDA01 devices
   - If not installed, contact the device manufacturer for the service APK
   - Package name should be: `com.iposprinter.iposprinterservice`

3. **Try connecting manually**:
   ```typescript
   await POSTerminalPrinterService.connectPrinterService();
   ```

4. **Check device compatibility**:
   - This service is for GZPDA03/POSPDA01 POS terminals
   - It requires a built-in thermal printer
   - Standard Android devices won't have this service

## Next Steps

After successful detection:

1. **Connect** (if not already connected):
   ```typescript
   await POSTerminalPrinterService.connectPrinterService();
   ```

2. **Initialize**:
   ```typescript
   await POSTerminalPrinterService.initializePrinter();
   ```

3. **Print**:
   ```typescript
   await POSTerminalPrinterService.printText('Hello World!');
   ```
