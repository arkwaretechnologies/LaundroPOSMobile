# Rebuild Instructions for IPOS Printer Integration

## ⚠️ Important: Using Expo Development Build

**You cannot use Expo Go with custom native modules!** You must use a development build.

## Quick Start (Expo Development Build)

### 1. Prebuild Native Code
```bash
npx expo prebuild
```
This generates the native Android code with your custom module.

### 2. Build and Run
```bash
npx expo run:android
```
This will:
- Build the Android app with native modules
- Install it on your device/emulator
- Start Metro bundler automatically

### 3. Start Development Server
```bash
npx expo start --dev-client
```
Use `--dev-client` flag (not regular Expo Go)!

## Alternative: Direct Gradle Build

If you prefer using Gradle directly:

### 1. Clean Build
```bash
cd android
./gradlew clean
```

### 2. Rebuild the App
```bash
# Option A: Build debug APK
./gradlew assembleDebug

# Option B: Install directly to device
./gradlew installDebug
```

### 3. Start Metro with Dev Client
```bash
# From project root
npx expo start --dev-client
```

### 4. Reinstall the App (if needed)
Uninstall the old app from your device and reinstall:
```bash
adb uninstall com.laundropos.mobile
./gradlew installDebug
```

### 5. Verify Module Registration
After rebuilding, check the console logs when opening Printer Configuration screen. You should see:
- `✅ POSTerminalPrinter found via direct access`
- `✅ IPOS POS Terminal printer added to list`

## Troubleshooting

If the module still doesn't appear:

1. **Check for compilation errors:**
   ```bash
   cd android
   ./gradlew assembleDebug --stacktrace
   ```

2. **Verify AIDL files are being compiled:**
   Check `android/app/build/generated/source/aidl/` directory after build

3. **Check MainApplication.kt:**
   Ensure `POSTerminalPrinterPackage()` is added to the packages list

4. **Verify module name:**
   The module name should be "POSTerminalPrinter" (matches `getName()` return value)

## Expected Result
After rebuilding, the "IPOS Printer (GZPDA03)" should appear in the Printer Configuration screen, even if the printer service is not connected (it will show as "unavailable" but still be selectable).

## Using Expo Go? ❌ Not Possible!

**Expo Go cannot run custom native modules.** You must:
1. Use `npx expo run:android` to create a development build
2. Or use EAS Build to create a development build
3. Install the development build on your device
4. Then use `npx expo start --dev-client` (not regular Expo Go)

See `EXPO_DEVELOPMENT_BUILD.md` for detailed instructions.

