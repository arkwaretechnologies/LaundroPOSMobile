# Version Bumping Guide

Quick reference guide for bumping app versions.

## Quick Commands

```bash
# Patch version (1.0.0 → 1.0.1) - Bug fixes
npm run version:patch

# Minor version (1.0.0 → 1.1.0) - New features
npm run version:minor

# Major version (1.0.0 → 2.0.0) - Breaking changes
npm run version:major

# Default (patch) - Same as version:patch
npm run version
```

## What Gets Updated

When you run a version bump command, the following files are automatically updated:

1. **`package.json`**
   - Updates the `version` field

2. **`app.json`**
   - Updates `expo.version`
   - Increments `expo.android.versionCode` (required for Google Play)

## Example

**Before:**
```json
// package.json
"version": "1.0.0"

// app.json
"version": "1.0.0",
"android": {
  "versionCode": 5
}
```

**After running `npm run version:patch`:**
```json
// package.json
"version": "1.0.1"

// app.json
"version": "1.0.1",
"android": {
  "versionCode": 6
}
```

## Typical Workflow

1. Make your code changes
2. Bump the version:
   ```bash
   npm run version:patch  # or minor/major
   ```
3. Commit the changes:
   ```bash
   git add package.json app.json
   git commit -m "Bump version to 1.0.1"
   git tag v1.0.1
   ```
4. Build and release:
   ```bash
   eas build --platform android --profile production
   ```

## Version Types

- **Patch** (`1.0.0` → `1.0.1`): Bug fixes, small improvements
- **Minor** (`1.0.0` → `1.1.0`): New features, backward compatible
- **Major** (`1.0.0` → `2.0.0`): Breaking changes, major updates

## Notes

- The Android `versionCode` always increments, regardless of version type
- Each new APK must have a higher `versionCode` than the previous one
- The semantic version (1.0.0) is what users see
- The version code is what Google Play uses internally
- **Important**: `runtimeVersion` in `app.json` must always match `version` for OTA updates to work correctly

---

# OTA (Over-The-Air) Updates Guide

This project uses **EAS Update** for OTA updates, allowing you to push JavaScript/TypeScript changes to installed devices without rebuilding the native app.

## When to Use OTA vs New Build

### Use OTA Updates When:
- ✅ JavaScript/TypeScript code changes only
- ✅ UI/UX improvements
- ✅ Bug fixes in React Native code
- ✅ Business logic changes
- ✅ API endpoint updates
- ✅ Configuration changes

### Use New Native Build When:
- ❌ Adding new native modules/dependencies
- ❌ Changing native code (Java/Kotlin, Objective-C/Swift)
- ❌ Updating `app.json` native configuration (permissions, plugins, etc.)
- ❌ Changing `runtimeVersion` (requires new build with matching runtimeVersion)
- ❌ First-time app installation

## Prerequisites

1. **EAS CLI installed**:
   ```bash
   npm install -g eas-cli
   ```

2. **Logged into EAS**:
   ```bash
   eas login
   ```

3. **EAS project configured** (already done - project ID in `app.json`)

## OTA Update Workflow

### Step 1: Make Your Code Changes
Make your JavaScript/TypeScript changes as needed.

### Step 2: (Optional) Bump Version
If you want to track version changes:
```bash
npm run version:patch  # or minor/major
```

**Note**: For OTA updates, version bumping is optional. The `runtimeVersion` must match the version that was used when the native app was built.

### Step 3: Test Update on Preview Branch (Recommended)
Before pushing to production, test on the preview branch:

```bash
npm run update:preview "Test update message"
```

Or manually:
```bash
eas update --branch preview --message "Your update message"
```

### Step 4: Publish to Production
Once tested, publish to production:

```bash
npm run publish:ota
```

Or with a custom message:
```bash
npm run update:production "Your update message"
```

Or manually:
```bash
eas update --branch production --message "Your update message"
```

### Step 5: Verify Update
- Users will receive the update automatically on next app open
- Updates are downloaded in the background
- App reloads with new code when update is ready

## Available Scripts

```bash
# Publish OTA update to production
npm run publish:ota

# Publish to production with custom message
npm run update:production "Your message here"

# Publish to preview branch for testing
npm run update:preview "Test message"
```

## Important Rules for OTA Updates

1. **`runtimeVersion` Must Match**: The `runtimeVersion` in `app.json` must match the `version` that was used when the native app was built. If you change `runtimeVersion`, you must build a new native app.

2. **No Native Changes**: OTA updates only work for JavaScript/TypeScript changes. Any native changes require a new build.

3. **Version Bumping**: When you bump the version using `npm run version:patch/minor/major`, the script automatically updates `runtimeVersion` to match. If you've already distributed a native build with a different `runtimeVersion`, you'll need to build a new native app.

## Complete Workflow Examples

### Example 1: JavaScript-Only Bug Fix (OTA Update)

```bash
# 1. Make code changes
# ... edit your files ...

# 2. (Optional) Bump version
npm run version:patch

# 3. Test on preview
npm run update:preview "Fix payment processing bug"

# 4. Publish to production
npm run publish:ota
```

### Example 2: Adding New Native Module (New Build Required)

```bash
# 1. Install new native module
npm install some-native-module

# 2. Update native code/config if needed
# ... make changes ...

# 3. Bump version (runtimeVersion will change)
npm run version:minor

# 4. Build new native app
eas build --platform android --profile production

# 5. Distribute new APK
# ... distribute to users ...

# 6. Future JS-only changes can use OTA
npm run publish:ota
```

## Troubleshooting

### Update Not Appearing
- Verify `runtimeVersion` in `app.json` matches the version used in the native build
- Check that you're publishing to the correct branch (`production` or `preview`)
- Ensure users have internet connection
- Check EAS dashboard for update status

### Runtime Version Mismatch
If you see errors about runtime version mismatch:
1. Check current `runtimeVersion` in `app.json`
2. Check what `runtimeVersion` was used in the native build
3. If they don't match, you need to build a new native app with the current `runtimeVersion`

### Viewing Update History
```bash
eas update:list --branch production
```

### Rolling Back an Update
```bash
eas update:rollback --branch production
```

## Best Practices

1. **Always test on preview branch first** before pushing to production
2. **Keep `runtimeVersion` stable** - only change it when you need a new native build
3. **Use descriptive update messages** to track what changed
4. **Monitor update status** in EAS dashboard
5. **Test updates on real devices** before wide distribution

