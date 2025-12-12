# Session Expiration Configuration

This document explains how session expiration is handled in the LaundroPOS Mobile application.

## Overview

The app implements automatic session expiration detection and handling to ensure security and proper user authentication. When a user's session expires, they are automatically signed out and prompted to log in again.

## How It Works

### 1. Session Status Checking

The app periodically checks the session status every 30 seconds to detect if:
- The session has expired
- The session is about to expire (within 5 minutes)
- The session needs to be refreshed

### 2. Automatic Token Refresh

Supabase automatically refreshes access tokens when they're about to expire. The app also proactively attempts to refresh tokens when they're within 5 minutes of expiration.

### 3. Session Expiration Handling

When a session expires:
1. The app detects the expiration
2. Shows an alert to the user: "Your session has expired. Please log in again to continue."
3. Automatically signs out the user
4. Returns to the login screen

## Configuration

### JWT Secret

The JWT secret is configured on the Supabase backend. The legacy JWT secret is stored in environment variables for reference:

**Environment Variable:**
- `JWT_SECRET` - The JWT secret (configured in `.env` file)

**Important Notes:**
1. The JWT secret is configured in your Supabase project dashboard under **Authentication > Settings**
2. The JWT secret is stored in `.env` for reference/documentation purposes only
3. **JWT secrets should NEVER be used in client-side code** - they are server-side only
4. The mobile app uses the `EXPO_PUBLIC_SUPABASE_ANON_KEY` (anon key), not the JWT secret
5. Never commit `.env` files to version control (already in `.gitignore`)

**To configure:**
1. Copy `.env.example` to `.env`
2. Add your JWT secret to the `JWT_SECRET` variable in `.env`
3. The JWT secret is primarily for server-side operations and reference

### Configuring JWT Expiration in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** > **Settings**
3. Find the **JWT Settings** section
4. Configure:
   - **JWT expiry**: Default is 3600 seconds (1 hour)
   - **Refresh token expiry**: Default is 30 days
   - **JWT secret**: Use the legacy secret provided above if migrating from an older system

### Session Expiration Settings

The app uses the following settings:

- **Session check interval**: 30 seconds
- **Expiration buffer**: 60 seconds (session is considered expired 60 seconds before actual expiration)
- **Refresh threshold**: 5 minutes (attempts to refresh when session expires within 5 minutes)

These settings are configured in:
- `src/utils/sessionManager.ts` - Session management utilities
- `App.tsx` - Main app component with session checking logic

## Code Structure

### Session Manager (`src/utils/sessionManager.ts`)

Provides utilities for:
- `checkSessionStatus()` - Check if a session is expired
- `getSessionStatus()` - Get current session status
- `refreshSession()` - Manually refresh the session
- `signOut()` - Sign out the user
- `shouldRefreshSession()` - Check if session needs refresh

### App Component (`App.tsx`)

Implements:
- Periodic session expiration checks
- Automatic session refresh
- Session expiration alerts
- Automatic sign-out on expiration

## Testing Session Expiration

### Manual Testing

1. **Test session expiration detection:**
   - Log in to the app
   - Wait for the session to expire (or manually expire it in Supabase)
   - The app should detect expiration and show an alert

2. **Test automatic refresh:**
   - Log in to the app
   - Wait until the session is within 5 minutes of expiration
   - The app should automatically refresh the token

3. **Test expiration alert:**
   - Force session expiration
   - Verify the alert appears
   - Verify the user is signed out after clicking OK

### Simulating Expiration

To test session expiration without waiting:

1. **Using Supabase Dashboard:**
   - Go to Authentication > Users
   - Find the user
   - Revoke their session

2. **Using Supabase API:**
   ```javascript
   // In Supabase SQL Editor or API
   // Revoke all sessions for a user
   DELETE FROM auth.refresh_tokens WHERE user_id = 'user-id';
   ```

## Troubleshooting

### Session Expires Too Quickly

**Problem:** Sessions expire faster than expected.

**Solution:**
- Check JWT expiry settings in Supabase Dashboard
- Verify the JWT secret is correctly configured
- Check if there are any custom JWT settings overriding defaults

### Session Not Refreshing

**Problem:** Session doesn't refresh automatically.

**Solution:**
- Verify `autoRefreshToken: true` is set in `lib/supabase.ts`
- Check network connectivity
- Verify Supabase credentials are correct
- Check console logs for refresh errors

### User Not Signed Out on Expiration

**Problem:** User remains logged in after session expires.

**Solution:**
- Verify the session check interval is running (check console logs)
- Check if `handleSessionExpiration()` is being called
- Verify Alert is working (may be blocked on some devices)

### False Expiration Alerts

**Problem:** User sees expiration alert even though session is valid.

**Solution:**
- Check the expiration buffer setting (default: 60 seconds)
- Verify system clock is correct on the device
- Check if JWT expiry time matches between Supabase and app

## Security Considerations

1. **JWT Secret Security:**
   - Never commit JWT secrets to version control
   - Store secrets in environment variables or secure vaults
   - Rotate secrets periodically

2. **Session Storage:**
   - Sessions are stored in AsyncStorage (encrypted on iOS, plain on Android)
   - Consider additional encryption for sensitive apps

3. **Token Refresh:**
   - Refresh tokens are automatically rotated on use
   - Old refresh tokens are invalidated when new ones are issued

4. **Expiration Buffer:**
   - The 60-second buffer prevents edge cases where tokens expire during API calls
   - Adjust buffer based on your app's needs

## Best Practices

1. **Always check session status** before making authenticated API calls
2. **Handle expiration gracefully** - show clear messages to users
3. **Refresh proactively** - don't wait until the last second
4. **Log session events** for debugging and monitoring
5. **Test expiration scenarios** regularly

## Related Files

- `lib/supabase.ts` - Supabase client configuration
- `src/utils/sessionManager.ts` - Session management utilities
- `App.tsx` - Main app with session expiration handling
- `src/screens/LoginScreen.tsx` - Login screen

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)
- [React Native Security Guide](https://reactnative.dev/docs/security)

