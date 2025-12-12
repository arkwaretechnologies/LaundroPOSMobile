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

