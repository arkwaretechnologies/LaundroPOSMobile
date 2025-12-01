# Fix: QR Code Not Working - Build Development Client First

## The Problem

When you scan the QR code and **nothing happens**, it means:
- ❌ You don't have a **development build** installed on your device
- ❌ You're probably trying to use **Expo Go** (which won't work)

## The Solution

You need to **BUILD and INSTALL** the development build **FIRST**, then scan the QR code.

## Step-by-Step Fix

### Step 1: Stop Metro (if running)
Press `Ctrl+C` in the terminal where Metro is running.

### Step 2: Prebuild Native Code
```bash
npx expo prebuild
```
This generates the Android native code with your custom modules.

### Step 3: Build and Install Development Build
```bash
npx expo run:android
```

This will:
- ✅ Build the app with your native modules
- ✅ Install it on your connected device/emulator
- ✅ Start Metro automatically
- ✅ Open the app automatically

**Important**: Make sure your Android device/emulator is connected!

### Step 4: Verify Installation

After `npx expo run:android` completes:
- ✅ The app should be **installed** on your device
- ✅ The app should **open automatically**
- ✅ You should see your app running (not Expo Go)

### Step 5: If Metro Started Automatically

If Metro started automatically, you're done! The app should already be connected.

### Step 6: If You Need to Scan QR Code Later

1. **Open the development build app** on your device (not Expo Go!)
   - Look for "LaundroPOSMobile" or "Expo Development Client"
   - It's a different app than Expo Go

2. **Then scan the QR code** from within the development build app

## Common Mistakes

### ❌ Mistake 1: Using Expo Go
**Symptom**: Expo Go opens but shows error or nothing happens

**Fix**: 
- Uninstall Expo Go
- Build development build: `npx expo run:android`
- Use the development build app instead

### ❌ Mistake 2: Scanning Before Building
**Symptom**: Nothing happens when scanning

**Fix**: 
- Build first: `npx expo run:android`
- Then scan from the development build app

### ❌ Mistake 3: Device Not Connected
**Symptom**: Build fails or can't find device

**Fix**:
```bash
# Check if device is connected
# On Windows, you might need to use:
# - Android Studio's device manager
# - Or connect via USB with USB debugging enabled
```

## Quick Command Reference

```bash
# First time setup (or when native code changes)
npx expo prebuild
npx expo run:android

# Daily development (after build is installed)
npx expo start --dev-client
# Then open development build app and scan QR code
```

## How to Tell If You Have Development Build

**Development Build App:**
- ✅ Shows "Expo Development Client" or your app name
- ✅ Has your app icon
- ✅ Can load your custom native modules

**Expo Go:**
- ❌ Shows "Expo Go" branding
- ❌ Cannot load custom native modules
- ❌ Will show errors for custom modules

## Still Not Working?

1. **Check device is connected:**
   - Open Android Studio
   - Check Device Manager
   - Make sure device shows as "Connected"

2. **Uninstall old versions:**
   ```bash
   # If using adb (Android SDK tools)
   adb uninstall com.laundropos.mobile
   
   # Then rebuild
   npx expo run:android
   ```

3. **Clean build:**
   ```bash
   cd android
   ./gradlew clean
   cd ..
   npx expo run:android
   ```

## Summary

**The QR code is for CONNECTING to an already-installed development build, not for installing it!**

**You must:**
1. ✅ Build: `npx expo run:android`
2. ✅ Install: (happens automatically)
3. ✅ Then scan: (from development build app)

