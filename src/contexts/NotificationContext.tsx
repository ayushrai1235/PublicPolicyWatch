import { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  markAsRead: (id: string) => void;
  clearAll: () => void;
}

interface Notification {
  id: string;
  type: 'policy' | 'deadline' | 'draft' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  policyId?: string;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
    };

    setNotifications(prev => [newNotification, ...prev]);
    
    // Show toast notification
    toast(notification.title, {
      description: notification.message,
      duration: 5000,
    });
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  const clearAll = () => {
    setNotifications([]);
  };

  // Simulate receiving notifications
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate random notifications for demo
      const notificationTypes = [
        {
          type: 'policy' as const,
          title: 'New Policy Found',
          message: 'A new animal welfare policy consultation has been discovered',
        },
        {
          type: 'deadline' as const,
          title: 'Deadline Approaching',
          message: 'Policy consultation deadline is in 3 days',
        },
        {
          type: 'draft' as const,
          title: 'Drafts Generated',
          message: 'AI has generated 3 response drafts for your review',
        },
      ];

      if (Math.random() < 0.3) { // 30% chance every 30 seconds
        const randomNotification = notificationTypes[Math.floor(Math.random() * notificationTypes.length)];
        addNotification(randomNotification);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications,
      addNotification,
      markAsRead,
      clearAll
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};