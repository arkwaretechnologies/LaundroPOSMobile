# Troubleshooting: QR Code Not Working

## Issue: Scanning QR Code Does Nothing

If scanning the QR code shows nothing, it means you **don't have a development build installed** on your device.

## Quick Diagnosis

### Check 1: What App Opens When You Scan?

- **Expo Go opens** → ❌ Wrong! You need a development build
- **Nothing happens** → ❌ Development build not installed
- **Development client opens** → ✅ Correct! But might have other issues

## Solution: Build and Install Development Build

### Step 1: Build the Development Client

You need to build the app with your native modules first:

```bash
# Option A: Using Expo CLI (Recommended)
npx expo prebuild
npx expo run:android

# Option B: Using Gradle directly
cd android
./gradlew assembleDebug
./gradlew installDebug
```

### Step 2: Verify Installation

After building, the app should be installed on your device. Look for:
- App name: "LaundroPOSMobile" or "Expo Go" (development build)
- It should have a different icon than regular Expo Go

### Step 3: Open the Development Build

1. **Open the development build app** on your device (not Expo Go!)
2. It should show a screen asking to scan QR code or enter URL
3. **Then** scan the QR code from Metro

## Common Issues

### Issue 1: Using Expo Go Instead

**Symptom**: Expo Go opens but shows "This project requires a development build"

**Solution**: 
- Uninstall Expo Go
- Build and install development build: `npx expo run:android`
- Use the development build app instead

### Issue 2: Development Build Not Installed

**Symptom**: Nothing happens when scanning QR code

**Solution**:
```bash
# Build and install
npx expo prebuild
npx expo run:android
```

### Issue 3: Wrong App Installed

**Symptom**: Old version of app opens

**Solution**:
```bash
# Uninstall old app
adb uninstall com.laundropos.mobile

# Rebuild and install
npx expo run:android
```

### Issue 4: Network Issues

**Symptom**: Development build opens but can't connect

**Solution**:
- Make sure device and computer are on same WiFi network
- Check firewall isn't blocking port 8081
- Try entering URL manually in development build app

## Step-by-Step Fix

### 1. Stop Metro (Ctrl+C)

### 2. Prebuild Native Code
```bash
npx expo prebuild
```

### 3. Build and Install
```bash
npx expo run:android
```

This will:
- Build the app with native modules
- Install it on your connected device/emulator
- Start Metro automatically

### 4. Open Development Build App

On your device, open the **development build app** (not Expo Go):
- Look for "LaundroPOSMobile" or "Expo Development Client"
- It should be a different app than Expo Go

### 5. Scan QR Code

Now scan the QR code from the development build app (not Expo Go).

## Alternative: Manual URL Entry

If QR code still doesn't work:

1. Open development build app
2. Look for "Enter URL manually" option
3. Enter: `exp+laundroposmobile://expo-development-client/?url=http://YOUR_IP:8081`
   - Replace `YOUR_IP` with your computer's IP (shown in Metro output)

## Verify It's Working

After connecting, you should see:
- ✅ App loads in development build
- ✅ Metro shows "Connected" status
- ✅ You can see console logs
- ✅ Hot reload works

## Still Not Working?

1. **Check device connection:**
   ```bash
   adb devices
   ```

2. **Check if app is installed:**
   ```bash
   adb shell pm list packages | grep laundropos
   ```

3. **Reinstall completely:**
   ```bash
   adb uninstall com.laundropos.mobile
   npx expo run:android --clean
   ```

4. **Check Metro is running:**
   - Should show "Metro waiting on exp+laundroposmobile://..."
   - Should show QR code

