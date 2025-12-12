# LaundroPOS Mobile - Installation Guide

A React Native mobile application for managing laundry POS operations, built with Expo and Supabase.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation Steps](#installation-steps)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [Building for Production](#building-for-production)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before installing the application, ensure you have the following installed:

### Required Software

1. **Node.js** (v18 or higher)
   - Download from [nodejs.org](https://nodejs.org/)
   - Verify installation: `node --version`

2. **npm** or **yarn**
   - Usually comes with Node.js
   - Verify installation: `npm --version`

3. **Expo CLI**
   ```bash
   npm install -g expo-cli
   ```

4. **Git**
   - Download from [git-scm.com](https://git-scm.com/)

### For Android Development

5. **Android Studio**
   - Download from [developer.android.com/studio](https://developer.android.com/studio)
   - Install Android SDK (API level 26 or higher)
   - Set up Android emulator or connect a physical device

6. **Java Development Kit (JDK)**
   - JDK 17 or higher
   - Set `JAVA_HOME` environment variable

### For iOS Development (macOS only)

7. **Xcode** (macOS only)
   - Download from Mac App Store
   - Install Xcode Command Line Tools: `xcode-select --install`
   - Install CocoaPods: `sudo gem install cocoapods`

### Supabase Account

8. **Supabase Account**
   - Sign up at [supabase.com](https://supabase.com)
   - Create a new project

## Installation Steps

### 1. Clone the Repository

```bash
git clone <repository-url>
cd LaundroPOSMobile
```

### 2. Install Dependencies

```bash
npm install
```

or

```bash
yarn install
```

### 3. Environment Configuration

Create a `.env` file in the root directory (copy from `.env.example`):

```bash
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# JWT Secret (Legacy/Server-side secret - for reference only)
# Note: JWT secrets are server-side only and not used in client apps
JWT_SECRET=your_jwt_secret
```

**To get your Supabase credentials:**
1. Go to your Supabase project dashboard
2. Navigate to **Settings** > **API**
3. Copy the **Project URL** and **anon/public** key
4. Paste them into your `.env` file

**JWT Secret:**
- The JWT secret is configured in **Supabase Dashboard > Authentication > Settings**
- It's primarily for server-side use and reference
- The client app uses the anon key, not the JWT secret
- See `.env.example` for the legacy JWT secret value

Alternatively, you can configure these in `app.json` under `expo.extra`:

```json
{
  "expo": {
    "extra": {
      "supabaseUrl": "your_supabase_project_url",
      "supabaseKey": "your_supabase_anon_key",
      "jwtSecret": "your_jwt_secret"
    }
  }
}
```

**Note:** See `.env.example` for a template of all required environment variables.

### 4. Database Setup

#### 4.1 Run Database Migrations

The application requires several database tables. Run the migrations in your Supabase SQL Editor:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run the following migration files in order:

   **a. Payment Methods Table:**
   ```sql
   -- Copy and run: supabase/migrations/create_payment_methods_table.sql
   ```

   **b. Cancelled Orders Table:**
   ```sql
   -- Copy and run: supabase/migrations/create_cancelled_orders_table.sql
   ```

   **c. Inventory Items Columns:**
   ```sql
   -- Copy and run: supabase/migrations/add_missing_inventory_columns.sql
   ```

#### 4.2 Verify Database Schema

Ensure your database has the following tables:
- `stores`
- `users`
- `user_store_assignments`
- `customers`
- `orders`
- `order_items`
- `payments`
- `services`
- `inventory_items`
- `payment_methods`
- `cancelled_orders`

### 5. Running the Application

#### Development Mode

Start the Expo development server:

```bash
npm start
```

or

```bash
expo start
```

This will open the Expo DevTools. You can then:

- Press `a` to open on Android emulator/device
- Press `i` to open on iOS simulator (macOS only)
- Scan the QR code with Expo Go app on your physical device

#### Running on Android

```bash
npm run android
```

or

```bash
expo run:android
```

**Note:** This requires Android Studio and an Android device/emulator.

#### Running on iOS (macOS only)

```bash
npm run ios
```

or

```bash
expo run:ios
```

**Note:** This requires Xcode and macOS.

## Icon Configuration

The app icon is configured in `app.json`. Ensure you have the following icon files in the `assets/` directory:

### Required Icon Files

1. **`icon.png`** (1024x1024 pixels)
   - Main app icon
   - Used for iOS and as fallback for Android
   - Should be square with no transparency

2. **`adaptive-icon.png`** (1024x1024 pixels)
   - Android adaptive icon foreground
   - Should have a safe zone (keep important content within 66% of the center)
   - Transparent background is supported

3. **`splash-icon.png`** (1284x2778 pixels recommended)
   - Splash screen image
   - Used when app is launching

### Icon Specifications

- **Format**: PNG
- **Main Icon**: 1024x1024 pixels, square, no transparency
- **Adaptive Icon**: 1024x1024 pixels, can have transparency
- **Background Color**: White (#ffffff) - configured in `app.json`

### Verifying Icons

Before building, verify your icon files exist:
```bash
ls -la assets/icon.png
ls -la assets/adaptive-icon.png
ls -la assets/splash-icon.png
```

If icons are missing or incorrect, the build will fail or show a default Expo icon.

## Version Management

The project uses a custom version bumping script (inspired by `react-native-version`) that automatically updates version numbers across all necessary files with a single command. This solution is optimized for Expo projects and handles both semantic versioning and Android version codes.

### How It Works

The version bumping script updates:
- `package.json` - The main version field
- `app.json` - The Expo version (`expo.version`)
- `app.json` - Android version code (`expo.android.versionCode`) - automatically increments

### Bumping Versions

#### Patch Version (Bug Fixes)
Increments the patch version (e.g., `1.0.0` → `1.0.1`):

```bash
npm run version:patch
```

or simply:

```bash
npm run version
```

#### Minor Version (New Features)
Increments the minor version (e.g., `1.0.0` → `1.1.0`):

```bash
npm run version:minor
```

#### Major Version (Breaking Changes)
Increments the major version (e.g., `1.0.0` → `2.0.0`):

```bash
npm run version:major
```

### Version Format

The project follows [Semantic Versioning](https://semver.org/) (SemVer):
- **Major**: Breaking changes that are incompatible with previous versions
- **Minor**: New features that are backward compatible
- **Patch**: Bug fixes and small changes that are backward compatible

### Example Workflow

1. **Before releasing a new version:**
   ```bash
   # Bump patch version for bug fixes
   npm run version:patch
   ```

2. **Check the updated files:**
   ```bash
   # Verify package.json
   cat package.json | grep version
   
   # Verify app.json
   cat app.json | grep version
   ```

3. **Commit the version changes:**
   ```bash
   git add package.json app.json
   git commit -m "Bump version to 1.0.1"
   git tag v1.0.1
   ```

4. **Build and release:**
   ```bash
   eas build --platform android --profile production
   ```

### Android Version Code

The Android `versionCode` is automatically incremented each time you bump the version. This is required by Google Play Store - each new APK must have a higher `versionCode` than the previous one.

- The `versionCode` starts at `1` and increments by `1` with each version bump
- It's independent of the semantic version (e.g., version `1.0.1` might have `versionCode: 5`)

### Current Version

To check the current version:

```bash
# From package.json
npm run version --dry-run  # (if supported)
# Or simply check the files:
cat package.json | grep '"version"'
cat app.json | grep '"version"'
```

### Troubleshooting

**Version not updating:**
- Ensure you're running the command from the project root
- Check that `scripts/bump-version.js` exists and is executable
- Verify `package.json` and `app.json` are valid JSON files
- Make sure Node.js is installed and accessible

**Version code not incrementing:**
- The script automatically creates `android.versionCode` if it doesn't exist
- Check `app.json` to verify the `versionCode` was updated
- Ensure `app.json` has the correct structure with `expo.android` section

**Script errors:**
- Verify you have write permissions for `package.json` and `app.json`
- Check that both files are valid JSON (no syntax errors)
- Run `node scripts/bump-version.js patch` directly to see detailed error messages

### Quick Reference

For a quick reference guide, see [`VERSION_GUIDE.md`](./VERSION_GUIDE.md) in the project root.

## Building for Production

### Android APK

1. **Install EAS CLI:**
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo:**
   ```bash
   eas login
   ```

3. **Verify Icon Configuration:**
   - Ensure `assets/icon.png` exists (1024x1024)
   - Ensure `assets/adaptive-icon.png` exists (1024x1024)
   - Check `app.json` has correct icon paths

4. **Configure EAS Build:**
   The `eas.json` file is already configured. You can modify build profiles if needed.

5. **Build APK:**
   ```bash
   eas build --platform android --profile preview
   ```

   For production build:
   ```bash
   eas build --platform android --profile production
   ```

6. **Download and Install:**
   - EAS will provide a download link
   - Download the APK and install on Android devices
   - The app icon will appear on the device home screen

### iOS Build (macOS only)

```bash
eas build --platform ios --profile production
```

## Features

### Core Features

- ✅ **Point of Sale (POS)**: Create orders, process payments
- ✅ **Order Management**: Track orders, update status, cancel orders
- ✅ **Customer Management**: Add, search, and manage customers
- ✅ **Inventory Management**: Track stock levels, manage items
- ✅ **Services & Pricing**: Configure laundry services and prices
- ✅ **Payment Methods**: Manage payment methods (Cash, Card, GCash, PayMaya, etc.)
- ✅ **Reports**: View sales reports, analytics, and export data
- ✅ **QR Code Scanning**: Scan QR codes to find orders
- ✅ **Receipt Printing**: Print claim tickets and receipts
- ✅ **Multi-Store Support**: Switch between multiple stores

### Technical Features

- Real-time data synchronization with Supabase
- Offline-capable with local storage
- Secure authentication and authorization
- Row-level security (RLS) for data protection
- Pagination for large datasets
- Date range filtering for orders
- PDF export for reports

## Project Structure

```
LaundroPOSMobile/
├── src/
│   ├── components/       # Reusable UI components
│   ├── context/          # React context providers
│   ├── hooks/            # Custom React hooks
│   ├── screens/          # Screen components
│   ├── services/         # Business logic services
│   ├── types/            # TypeScript type definitions
│   └── utils/             # Utility functions
├── supabase/
│   └── migrations/       # Database migration files
├── assets/               # Images and static assets
├── lib/                  # Library configurations
├── app.json              # Expo configuration
├── package.json          # Dependencies
└── tsconfig.json         # TypeScript configuration
```

## Session Expiration

The app includes automatic session expiration detection and handling. When a user's session expires, they are automatically signed out and prompted to log in again.

**Key Features:**
- Automatic session status checking (every 30 seconds)
- Proactive token refresh when session is about to expire
- User-friendly expiration alerts
- Automatic sign-out on expiration

**JWT Secret Configuration:**
The JWT secret is configured on the Supabase backend. The legacy JWT secret is documented in the code comments and should be configured in your Supabase project dashboard under **Authentication > Settings**.

For detailed information about session expiration, JWT configuration, and troubleshooting, see [`docs/SESSION_EXPIRATION.md`](./docs/SESSION_EXPIRATION.md).

## Troubleshooting

### Common Issues

#### 1. "Cannot find native module" Error

**Solution:** Rebuild the native app:
```bash
npx expo run:android
# or
npx expo run:ios
```

#### 2. Supabase Connection Issues

**Solution:**
- Verify your `.env` file has correct Supabase credentials
- Check that your Supabase project is active
- Ensure RLS policies are correctly configured

#### 3. Metro Bundler Cache Issues

**Solution:** Clear cache and restart:
```bash
npx expo start --clear
```

#### 4. Android Build Errors

**Solution:**
- Ensure Android SDK is properly installed
- Check `ANDROID_HOME` environment variable
- Update Gradle: `cd android && ./gradlew wrapper --gradle-version 8.0`

#### 5. iOS Build Errors (macOS)

**Solution:**
- Run `pod install` in `ios/` directory
- Clean Xcode build: `Product > Clean Build Folder`
- Update CocoaPods: `sudo gem install cocoapods`

#### 6. QR Code Scanner Not Working

**Solution:**
- Ensure camera permissions are granted
- Rebuild the app with native modules:
  ```bash
  npx expo run:android
  ```

#### 7. Printer Not Detected

**Solution:**
- For Android POS devices, ensure printer drivers are installed
- Check printer service configuration in Settings
- Rebuild app to link native printer modules

#### 8. Session Expiration Issues

**Solution:**
- Check JWT expiry settings in Supabase Dashboard (Authentication > Settings)
- Verify the JWT secret is correctly configured
- Ensure `autoRefreshToken: true` is set in Supabase client config
- Check network connectivity for token refresh
- See [`docs/SESSION_EXPIRATION.md`](./docs/SESSION_EXPIRATION.md) for detailed troubleshooting

### Getting Help

If you encounter issues not listed here:

1. Check the console logs for error messages
2. Review Supabase logs in the dashboard
3. Check Expo documentation: [docs.expo.dev](https://docs.expo.dev)
4. Review React Native documentation: [reactnative.dev](https://reactnative.dev)

## Development Notes

### Native Modules

This app uses several native modules that require rebuilding:
- `expo-camera` - For QR code scanning
- `expo-print` - For PDF generation
- `react-native-fs` - For file system operations
- `@diiix7/react-native-pos-print` - For POS printer support

**Important:** After installing or updating these packages, rebuild the app:
```bash
npx expo run:android
# or
npx expo run:ios
```

### Database Migrations

Always run migrations in order:
1. `create_payment_methods_table.sql`
2. `create_cancelled_orders_table.sql`
3. `add_missing_inventory_columns.sql`

### Environment Variables

For production builds, set environment variables in EAS:
```bash
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "your_url"
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your_key"
```

## License

[Add your license information here]

## Support

For support and questions, please contact [your support email/contact].

---

**Version:** 1.0.0  
**Last Updated:** 2024

