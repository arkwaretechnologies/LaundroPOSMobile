import { supabase } from '../../lib/supabase'
import { Session } from '@supabase/supabase-js'

/**
 * Session Manager Utility
 * Handles session expiration detection and management
 */

export interface SessionStatus {
  isValid: boolean
  isExpired: boolean
  expiresAt: number | null
  expiresIn: number | null // seconds until expiration
  timeUntilExpiry: string // human-readable time until expiry
}

/**
 * Check if a session is expired or about to expire
 * @param session - The Supabase session to check
 * @param bufferSeconds - Buffer time in seconds before actual expiration (default: 60)
 * @returns SessionStatus object with expiration information
 */
export const checkSessionStatus = (session: Session | null, bufferSeconds: number = 60): SessionStatus => {
  if (!session || !session.expires_at) {
    return {
      isValid: false,
      isExpired: true,
      expiresAt: null,
      expiresIn: null,
      timeUntilExpiry: 'Expired',
    }
  }

  const now = Math.floor(Date.now() / 1000) // Current time in seconds
  const expiresAt = session.expires_at
  const expiresIn = expiresAt - now
  const isExpired = expiresIn <= bufferSeconds // Consider expired if within buffer time

  // Calculate human-readable time until expiry
  let timeUntilExpiry = 'Expired'
  if (expiresIn > 0) {
    if (expiresIn < 60) {
      timeUntilExpiry = `${Math.floor(expiresIn)} seconds`
    } else if (expiresIn < 3600) {
      timeUntilExpiry = `${Math.floor(expiresIn / 60)} minutes`
    } else {
      timeUntilExpiry = `${Math.floor(expiresIn / 3600)} hours`
    }
  }

  return {
    isValid: !isExpired,
    isExpired,
    expiresAt,
    expiresIn: expiresIn > 0 ? expiresIn : 0,
    timeUntilExpiry,
  }
}

/**
 * Get the current session and check its status
 * @param bufferSeconds - Buffer time in seconds before actual expiration (default: 60)
 * @returns Promise with session status
 */
export const getSessionStatus = async (bufferSeconds: number = 60): Promise<SessionStatus> => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error || !session) {
      return {
        isValid: false,
        isExpired: true,
        expiresAt: null,
        expiresIn: null,
        timeUntilExpiry: 'No session',
      }
    }

    return checkSessionStatus(session, bufferSeconds)
  } catch (error) {
    console.error('Error checking session status:', error)
    return {
      isValid: false,
      isExpired: true,
      expiresAt: null,
      expiresIn: null,
      timeUntilExpiry: 'Error',
    }
  }
}

/**
 * Refresh the current session
 * @returns Promise with the refreshed session or null if refresh failed
 */
export const refreshSession = async (): Promise<Session | null> => {
  try {
    const { data: { session }, error } = await supabase.auth.refreshSession()
    
    if (error) {
      console.error('Error refreshing session:', error)
      return null
    }

    return session
  } catch (error) {
    console.error('Exception refreshing session:', error)
    return null
  }
}

/**
 * Sign out the user and clear the session
 */
export const signOut = async (): Promise<void> => {
  try {
    await supabase.auth.signOut()
  } catch (error) {
    console.error('Error signing out:', error)
  }
}

/**
 * Check if session needs refresh (within 5 minutes of expiration)
 * @param session - The session to check
 * @returns true if session should be refreshed
 */
export const shouldRefreshSession = (session: Session | null): boolean => {
  if (!session || !session.expires_at) {
    return false
  }

  const now = Math.floor(Date.now() / 1000)
  const expiresAt = session.expires_at
  const expiresIn = expiresAt - now
  const fiveMinutes = 5 * 60 // 5 minutes in seconds

  // Refresh if session expires within 5 minutes
  return expiresIn > 0 && expiresIn < fiveMinutes
}

