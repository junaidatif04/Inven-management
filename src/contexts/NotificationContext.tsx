import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAllInventoryItems } from '@/services/inventoryService';
import { getAllOrders } from '@/services/orderService';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { notificationService, type FirestoreNotification, type NotificationCreateData } from '@/services/notificationService';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  metadata?: {
    orderId?: string;
    productId?: string;
    requestId?: string;
    category?: 'order' | 'inventory' | 'access' | 'system';
  };
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearNotifications: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  refreshNotificationsForRoleChange: () => Promise<void>;
  unreadCount: number;
  pendingAccessRequests: number;
  pendingOrders: number;
  pendingQuantityRequests: number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);



export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pendingAccessRequests, setPendingAccessRequests] = useState<number>(0);
  const [pendingOrders, setPendingOrders] = useState<number>(0);
  const [pendingQuantityRequests, setPendingQuantityRequests] = useState<number>(0);
  const [processedEvents, setProcessedEvents] = useState<Set<string>>(new Set());

  // Clean up processed events periodically to prevent memory leaks
  useEffect(() => {
    const cleanup = setInterval(() => {
      setProcessedEvents(new Set()); // Clear all processed events every hour
    }, 60 * 60 * 1000); // 1 hour

    return () => clearInterval(cleanup);
  }, []);

  // Convert Firestore notification to local notification format
  const convertFirestoreNotification = (fsNotification: FirestoreNotification): Notification => ({
    id: fsNotification.id!,
    title: fsNotification.title,
    message: fsNotification.message,
    type: fsNotification.type,
    timestamp: fsNotification.timestamp.toDate(),
    read: fsNotification.read,
    actionUrl: fsNotification.actionUrl,
    metadata: fsNotification.metadata,
  });

  // Generate role-based system notifications
  const generateRoleBasedSystemNotifications = async (userRole: string, userId: string) => {
    try {
      switch (userRole) {
        case 'admin':
          await generateAdminSystemNotifications(userId);
          break;
        case 'warehouse_staff':
          await generateWarehouseSystemNotifications(userId);
          break;
        case 'supplier':
          await generateSupplierSystemNotifications(userId);
          break;
        case 'internal_user':
          await generateInternalUserSystemNotifications(userId);
          break;
      }
    } catch (error) {
      console.error('Error generating role-based notifications:', error);
    }
  };

  const loadRealNotifications = async () => {
    if (!user || !user.role) {
      console.log('User or user role not available, skipping notification load');
      return;
    }
    
    try {
      await generateRoleBasedSystemNotifications(user.role, user.id);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  // Load notifications from Firestore
  useEffect(() => {
    if (!user?.id) return;

    // Set up real-time listener for user's notifications
    const unsubscribe = notificationService.subscribeToUserNotifications(
      user.id,
      (firestoreNotifications) => {
        const convertedNotifications = firestoreNotifications.map(convertFirestoreNotification);
        setNotifications(convertedNotifications);
      }
    );

    return unsubscribe;
  }, [user?.id, user?.role]); // Added user?.role dependency to refresh when role changes

  // Generate initial notifications based on system data and user role
  useEffect(() => {
    if (!user?.role || !user?.id) return;

    const generateInitialNotifications = async () => {
      try {
        // Clear any existing notifications first to ensure clean slate
        setNotifications([]);
        // Generate new role-appropriate notifications
        await generateRoleBasedSystemNotifications(user.role, user.id);
      } catch (error) {
        console.error('Error generating initial notifications:', error);
      }
    };

    generateInitialNotifications();
  }, [user?.role, user?.id]);

  useEffect(() => {
    if (user && user.role) {
      // Set up role-based real-time listeners for instant updates
      const unsubscribers: (() => void)[] = [];

      // Role-based real-time listeners
      switch (user.role) {
        case 'admin':
          // Admins listen to access requests, all orders, and system-wide events
          setupAdminListeners(unsubscribers);
          break;
          
        case 'warehouse_staff':
          // Warehouse staff listen to pending orders and inventory changes
          setupWarehouseListeners(unsubscribers);
          break;
          
        case 'supplier':
          // Suppliers listen to quantity requests for their products
          if (user.id) {
            setupSupplierListeners(unsubscribers, user.id);
          }
          break;
          
        case 'internal_user':
          // Internal users listen to their own order updates
          if (user.id) {
            setupInternalUserListeners(unsubscribers, user.id);
          }
          break;
      }

      // Refresh notifications every 5 minutes for other data
      const interval = setInterval(loadRealNotifications, 5 * 60 * 1000);

      return () => {
        clearInterval(interval);
        unsubscribers.forEach(unsubscribe => unsubscribe());
      };
    }
  }, [user, user?.role]);

  // Admin real-time listeners
  const setupAdminListeners = (unsubscribers: (() => void)[]) => {
    // Listen for pending access requests
    const accessRequestsQuery = query(
      collection(db, 'accessRequests'),
      where('status', '==', 'pending')
    );
    const unsubscribeAccessRequests = onSnapshot(accessRequestsQuery, (snapshot) => {
      setPendingAccessRequests(snapshot.size);
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const request = { id: change.doc.id, ...change.doc.data() } as any;
          addNotification({
            title: 'New Access Request',
            message: `${request.name} has requested ${request.requestedRole} access`,
            type: 'info',
            actionUrl: '/dashboard/access-requests',
          }, change.doc.id);
        }
      });
    });
    unsubscribers.push(unsubscribeAccessRequests);

    // Listen for all pending orders
    const ordersQuery = query(
      collection(db, 'orders'),
      where('status', '==', 'pending')
    );
    const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
      setPendingOrders(snapshot.size);
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const order = { id: change.doc.id, ...change.doc.data() } as any;
          addNotification({
            title: 'New Pending Order',
            message: `Order ${order.orderNumber} requires approval`,
            type: 'info',
            actionUrl: '/dashboard/orders',
          }, change.doc.id);
        }
      });
    });
    unsubscribers.push(unsubscribeOrders);
  };

  // Warehouse staff real-time listeners
  const setupWarehouseListeners = (unsubscribers: (() => void)[]) => {
    // Listen for pending orders that need processing
    const ordersQuery = query(
      collection(db, 'orders'),
      where('status', '==', 'pending')
    );
    const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
      setPendingOrders(snapshot.size);
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const order = { id: change.doc.id, ...change.doc.data() } as any;
          addNotification({
            title: 'New Order to Process',
            message: `Order ${order.orderNumber} needs warehouse attention`,
            type: 'info',
            actionUrl: '/dashboard/orders',
          }, change.doc.id);
        }
      });
    });
    unsubscribers.push(unsubscribeOrders);
  };

  // Supplier real-time listeners
  const setupSupplierListeners = (unsubscribers: (() => void)[], userId: string) => {
    // Listen for quantity requests related to supplier's products
    const quantityRequestsQuery = query(
      collection(db, 'quantityRequests'),
      where('supplierId', '==', userId),
      where('status', '==', 'pending')
    );
    const unsubscribeQuantityRequests = onSnapshot(quantityRequestsQuery, (snapshot) => {
      setPendingQuantityRequests(snapshot.size);
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const request = { id: change.doc.id, ...change.doc.data() } as any;
          addNotification({
            title: 'New Quantity Request',
            message: `Quantity update requested for ${request.productName}`,
            type: 'info',
            actionUrl: '/dashboard/quantity-requests',
          }, change.doc.id);
        }
      });
    });
    unsubscribers.push(unsubscribeQuantityRequests);
  };

  // Internal user real-time listeners
  const setupInternalUserListeners = (unsubscribers: (() => void)[], userId: string) => {
    // Listen for updates to user's own orders
    const userOrdersQuery = query(
      collection(db, 'orders'),
      where('userId', '==', userId)
    );
    const unsubscribeUserOrders = onSnapshot(userOrdersQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'modified') {
          const order = { id: change.doc.id, ...change.doc.data() } as any;
          addNotification({
            title: `Your Order ${order.status === 'approved' ? 'Approved' : order.status === 'cancelled' ? 'Cancelled' : 'Updated'}`,
            message: `Order ${order.orderNumber} status changed to ${order.status}`,
            type: order.status === 'approved' ? 'success' : order.status === 'cancelled' ? 'error' : 'info',
            actionUrl: '/dashboard/my-orders',
          }, change.doc.id);
        }
      });
    });
    unsubscribers.push(unsubscribeUserOrders);
  };

  // Helper functions to generate system notifications for different roles
  const generateAdminSystemNotifications = async (userId: string) => {
    const inventoryItems = await getAllInventoryItems();
    const lowStockItems = inventoryItems.filter(item => item.quantity <= item.minStockLevel);
    
    for (const item of lowStockItems.slice(0, 3)) {
      const title = 'Low Stock Alert';
      const message = `${item.name} is running low (${item.quantity} units remaining)`;
      
      // Check if this notification already exists
      const exists = await notificationService.notificationExists(userId, title, message);
      if (exists) {
        console.log(`Low stock notification for ${item.name} already exists, skipping creation`);
        continue;
      }
      
      const eventKey = `warning_${title}_${message}_${item.id}`;
      if (processedEvents.has(eventKey)) {
        continue; // Skip if already processed
      }
      
      await notificationService.createNotification({
        userId,
        title,
        message,
        type: 'warning',
        actionUrl: '/dashboard/inventory',
        metadata: { category: 'inventory', productId: item.id },
      });
      
      setProcessedEvents(prev => new Set([...prev, eventKey]));
    }
  };

  const generateWarehouseSystemNotifications = async (userId: string) => {
    const inventoryItems = await getAllInventoryItems();
    const lowStockItems = inventoryItems.filter(item => item.quantity <= item.minStockLevel);
    
    for (const item of lowStockItems.slice(0, 3)) {
      const title = 'Low Stock Alert';
      const message = `${item.name} is running low (${item.quantity} units remaining)`;
      
      // Check if this notification already exists
      const exists = await notificationService.notificationExists(userId, title, message);
      if (exists) {
        console.log(`Low stock notification for ${item.name} already exists, skipping creation`);
        continue;
      }
      
      const eventKey = `warning_${title}_${message}_${item.id}`;
      if (processedEvents.has(eventKey)) {
        continue; // Skip if already processed
      }
      
      await notificationService.createNotification({
        userId,
        title,
        message,
        type: 'warning',
        actionUrl: '/dashboard/inventory',
        metadata: { category: 'inventory', productId: item.id },
      });
      
      setProcessedEvents(prev => new Set([...prev, eventKey]));
    }
  };

  const generateSupplierSystemNotifications = async (userId: string) => {
    const title = 'Supplier Dashboard';
    const message = 'Check your product catalog and quantity requests';
    
    // Check if this notification already exists
    const exists = await notificationService.notificationExists(userId, title, message);
    if (exists) {
      console.log('Supplier system notification already exists, skipping creation');
      return;
    }
    
    await notificationService.createNotification({
      userId,
      title,
      message,
      type: 'info',
      actionUrl: '/dashboard/products',
      metadata: { category: 'system' },
    });
  };

  const generateInternalUserSystemNotifications = async (userId: string) => {
    const orders = await getAllOrders();
    const userOrders = orders
      .filter(order => order.userId === userId)
      .filter(order => {
        const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
        return Date.now() - orderDate.getTime() < 7 * 24 * 60 * 60 * 1000;
      })
      .slice(0, 2);

    for (const order of userOrders) {
      const title = `Your Order ${order.status === 'approved' ? 'Approved' : order.status === 'cancelled' ? 'Cancelled' : 'Updated'}`;
      const message = `Order ${order.orderNumber} is ${order.status}`;
      
      // Check if this notification already exists
      const exists = await notificationService.notificationExists(userId, title, message);
      if (exists) {
        console.log(`Order notification for ${order.orderNumber} already exists, skipping creation`);
        continue;
      }
      
      await notificationService.createNotification({
        userId,
        title,
        message,
        type: order.status === 'approved' ? 'success' : order.status === 'cancelled' ? 'error' : 'info',
        actionUrl: '/dashboard/my-orders',
        metadata: { category: 'order', orderId: order.id },
      });
    }
  };

  // Helper function to generate a unique event key for deduplication
  const generateEventKey = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>, docId?: string): string => {
    const baseKey = `${notification.type}_${notification.title}_${notification.message}`;
    return docId ? `${baseKey}_${docId}` : baseKey;
  };

  const addNotification = async (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>, docId?: string) => {
    if (!user?.id) return;
    
    // Check for duplicates using event key
    const eventKey = generateEventKey(notification, docId);
    if (processedEvents.has(eventKey)) {
      console.log('Duplicate notification prevented:', eventKey);
      return;
    }
    
    try {
      const notificationData: NotificationCreateData = {
        userId: user.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
      };
      
      // Only add optional fields if they have values
      if (notification.actionUrl) {
        notificationData.actionUrl = notification.actionUrl;
      }
      
      if (notification.metadata && Object.keys(notification.metadata).length > 0) {
        notificationData.metadata = notification.metadata;
      }
      
      await notificationService.createNotification(notificationData);
      
      // Mark this event as processed
      setProcessedEvents(prev => new Set([...prev, eventKey]));
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;
    
    try {
      await notificationService.markAllAsRead(user.id);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const clearNotifications = async () => {
    if (!user?.id) return;
    
    try {
      await notificationService.clearAllNotifications(user.id);
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  const refreshNotifications = async () => {
    if (!user?.role || !user?.id) return;
    
    try {
      await generateRoleBasedSystemNotifications(user.role, user.id);
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    }
  };

  const refreshNotificationsForRoleChange = async () => {
    if (!user?.id || !user?.role) return;
    
    try {
      // Clear current notifications
      setNotifications([]);
      // Generate new role-appropriate notifications
      await generateRoleBasedSystemNotifications(user.role, user.id);
    } catch (error) {
      console.error('Error refreshing notifications for role change:', error);
    }
  };

  const value = {
    notifications,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    unreadCount: notifications.filter(n => !n.read).length,
    pendingAccessRequests,
    pendingOrders,
    pendingQuantityRequests,
    refreshNotifications,
    refreshNotificationsForRoleChange,
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