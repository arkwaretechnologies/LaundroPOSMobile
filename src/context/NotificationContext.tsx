import React, { createContext, useContext, ReactNode } from 'react'
import { useNotificationBadges } from '../hooks/useNotificationBadges'

interface NotificationContextType {
  ordersBadge: number
  settingsBadge: number
  refreshBadges: () => Promise<void>
  markOrdersAsViewed: (orderIds: string[]) => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

interface NotificationProviderProps {
  children: ReactNode
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const badges = useNotificationBadges()

  return (
    <NotificationContext.Provider value={badges}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

