# Building with Expo Development Client (for Custom Native Modules)

## ⚠️ Important: Expo Go Limitation

**Expo Go cannot run custom native modules!** Since we've added the `POSTerminalPrinterModule` with AIDL files, you **must** use a development build instead of Expo Go.

## Solution: Create a Development Build

You already have `expo-dev-client` installed, which is perfect! Here's how to build and run:

### Option 1: Local Development Build (Recommended for Testing)

#### Step 1: Prebuild Native Code
```bash
npx expo prebuild
```
This generates the native Android/iOS folders with your custom native module.

#### Step 2: Build and Run on Android
```bash
# Build and install on connected device/emulator
npx expo run:android

# Or if you prefer using Gradle directly
cd android
./gradlew assembleDebug
./gradlew installDebug
```

#### Step 3: Start Metro Bundler
```bash
npx expo start --dev-client
```

The app will open with the development client that includes your custom native module!

### Option 2: EAS Build (Cloud Build)

#### Step 1: Install EAS CLI (if not already installed)
```bash
npm install -g eas-cli
```

#### Step 2: Login to Expo
```bash
eas login
```

#### Step 3: Build Development Client
```bash
# Build for Android
eas build --profile development --platform android

# This will create a development build APK that you can install
```

#### Step 4: Install the Development Build
- Download the APK from the EAS build page
- Install it on your device
- Then run: `npx expo start --dev-client`

### Option 3: Quick Test Build

For fastest testing:

```bash
# 1. Prebuild (one time, or when native code changes)
npx expo prebuild

# 2. Build and run
npx expo run:android

# Metro will start automatically
```

## What's Different from Expo Go?

1. **Development Build**: Includes your custom native code
2. **Native Modules**: All custom modules (like POSTerminalPrinter) are included
3. **AIDL Files**: Compiled and linked into the app
4. **Hot Reload**: Still works! You can develop normally

## After Building

Once you have the development build installed:

1. **Start Metro**: `npx expo start --dev-client`
2. **Open App**: The development client will open (not Expo Go)
3. **Test Printer**: The IPOS printer should now be detectable!

## Troubleshooting

### "Module not found" errors
- Make sure you ran `npx expo prebuild` after adding native code
- Rebuild: `npx expo run:android --clean`

### AIDL compilation errors
- Check that AIDL files are in `android/app/src/main/aidl/com/iposprinter/iposprinterservice/`
- Clean build: `cd android && ./gradlew clean && cd .. && npx expo run:android`

### Development client not opening
- Make sure you installed the development build (not Expo Go)
- Check: `npx expo start --dev-client` (not just `expo start`)

## Quick Reference

```bash
# First time setup
npx expo prebuild
npx expo run:android

# Daily development
npx expo start --dev-client

# When native code changes
npx expo prebuild --clean
npx expo run:android
```

## Notes

- **Development builds** are larger than Expo Go (~50-100MB)
- You need to rebuild when native code changes
- JavaScript changes still hot-reload instantly
- The development client looks similar to Expo Go but includes your native code

