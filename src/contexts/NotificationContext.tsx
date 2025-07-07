import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAllInventoryItems } from '@/services/inventoryService';
import { getAllOrders } from '@/services/orderService';
import { getPendingAccessRequests } from '@/services/accessRequestService';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  unreadCount: number;
  pendingAccessRequests: number;
  refreshNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Generate real notifications based on system data
const generateRealNotifications = async (): Promise<Notification[]> => {
  const notifications: Notification[] = [];

  try {
    // Get real inventory data for low stock alerts
    const inventoryItems = await getAllInventoryItems();
    const lowStockItems = inventoryItems.filter(item => item.quantity <= item.minStockLevel);

    lowStockItems.slice(0, 3).forEach((item, index) => {
      notifications.push({
        id: `low-stock-${item.id}`,
        title: 'Low Stock Alert',
        message: `${item.name} is running low (${item.quantity} units remaining)`,
        type: 'warning',
        timestamp: new Date(Date.now() - 1000 * 60 * (30 + index * 10)),
        read: false,
        actionUrl: '/dashboard/inventory',
      });
    });

    // Get real order data for recent orders
    const orders = await getAllOrders();
    const recentOrders = orders
      .filter(order => {
        const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
        return Date.now() - orderDate.getTime() < 24 * 60 * 60 * 1000; // Last 24 hours
      })
      .slice(0, 2);

    recentOrders.forEach((order) => {
      const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
      notifications.push({
        id: `order-${order.id}`,
        title: `Order ${order.status === 'approved' ? 'Approved' : 'Updated'}`,
        message: `Order ${order.orderNumber} has been ${order.status}`,
        type: order.status === 'approved' ? 'success' : 'info',
        timestamp: orderDate,
        read: false,
        actionUrl: '/dashboard/orders',
      });
    });

    // Get access requests for notifications
    try {
      const accessRequests = await getPendingAccessRequests();
      accessRequests.slice(0, 2).forEach((request) => {
        const requestDate = request.createdAt?.toDate ? request.createdAt.toDate() : new Date(request.createdAt);
        notifications.push({
          id: `access-${request.id}`,
          title: 'New Access Request',
          message: `${request.name} has requested ${request.requestedRole} access`,
          type: 'info',
          timestamp: requestDate,
          read: false,
          actionUrl: '/dashboard/access-requests',
        });
      });
    } catch (accessError) {
      console.warn('Could not load access request notifications:', accessError);
      // Continue without access request notifications
    }

  } catch (error) {
    console.error('Error generating notifications:', error);
    // Fallback notification
    notifications.push({
      id: 'system-notice',
      title: 'System Notice',
      message: 'Real-time notifications are loading...',
      type: 'info',
      timestamp: new Date(),
      read: false,
    });
  }

  return notifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pendingAccessRequests, setPendingAccessRequests] = useState<number>(0);

  const loadRealNotifications = async () => {
    try {
      const realNotifications = await generateRealNotifications();
      setNotifications(realNotifications);

      // Update pending access requests count
      const accessRequests = await getPendingAccessRequests();
      setPendingAccessRequests(accessRequests.length);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  useEffect(() => {
    loadRealNotifications();

    // Refresh notifications every 5 minutes
    const interval = setInterval(loadRealNotifications, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      read: false,
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const value = {
    notifications,
    addNotification,
    markAsRead,
    markAllAsRead,
    unreadCount,
    pendingAccessRequests,
    refreshNotifications: loadRealNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}