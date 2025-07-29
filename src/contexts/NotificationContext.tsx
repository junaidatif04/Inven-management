import React, { createContext, useContext, useState, useEffect } from 'react';
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
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'timestamp'> & { timestamp?: Date }) => Promise<void>;
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
      // Only clear processed events if they're older than 24 hours to prevent duplicates
      // Keep a smaller set but for longer to ensure better duplicate prevention
      setProcessedEvents(prev => {
        // In a real implementation, you'd want to track timestamps
        // For now, we'll keep the set smaller but clear less frequently
        if (prev.size > 1000) {
          return new Set();
        }
        return prev;
      });
    }, 6 * 60 * 60 * 1000); // 6 hours instead of 1 hour

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

  // // Generate role-based system notifications
  // const generateRoleBasedSystemNotifications = async (userRole: string, userId: string) => {
  //   try {
  //     switch (userRole) {
  //       case 'admin':
  //         await generateAdminSystemNotifications(userId);
  //         break;
  //       case 'warehouse_staff':
  //         await generateWarehouseSystemNotifications(userId);
  //         break;
  //       case 'supplier':
  //         await generateSupplierSystemNotifications(userId);
  //         break;
  //       case 'internal_user':
  //         await generateInternalUserSystemNotifications(userId);
  //         break;
  //     }
  //   } catch (error) {
  //     console.error('Error generating role-based notifications:', error);
  //   }
  // };

  // Note: Removed loadRealNotifications function as it was generating
  // duplicate system notifications on every call. Real-time listeners
  // handle notification generation when actual events occur.

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

  // Note: Removed automatic generation of system notifications on login/role change
  // to prevent duplicate notifications. System notifications should only be generated
  // by real-time listeners when actual events occur (e.g., new low stock items,
  // order status changes, etc.). This prevents the same notifications from
  // reappearing every time a user refreshes or logs in.

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

      // Note: Removed periodic notification refresh to prevent duplicates.
      // Real-time listeners handle all notification updates automatically.

      return () => {
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
          
          // Only create notifications for requests created within the last 5 minutes
          // This prevents notifications for existing requests when the listener first connects
          const requestCreatedAt = request.createdAt?.toDate ? request.createdAt.toDate() : new Date();
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
          
          if (requestCreatedAt > fiveMinutesAgo) {
            addNotification({
              title: 'New Access Request',
              message: `${request.name} has requested ${request.requestedRole} access`,
              type: 'info',
              actionUrl: '/dashboard/access-requests',
            }, change.doc.id);
          }
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
          
          // Only create notifications for orders created within the last 5 minutes
          // This prevents notifications for existing orders when the listener first connects
          const orderCreatedAt = order.createdAt?.toDate ? order.createdAt.toDate() : new Date();
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
          
          if (orderCreatedAt > fiveMinutesAgo) {
            addNotification({
              title: 'New Pending Order',
              message: `Order ${order.orderNumber} requires approval`,
              type: 'info',
              actionUrl: '/dashboard/orders',
              timestamp: orderCreatedAt,
            }, change.doc.id);
          }
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
          
          // Only create notifications for orders created within the last 5 minutes
          // This prevents notifications for existing orders when the listener first connects
          const orderCreatedAt = order.createdAt?.toDate ? order.createdAt.toDate() : new Date();
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
          
          if (orderCreatedAt > fiveMinutesAgo) {
            addNotification({
              title: 'New Order to Process',
              message: `Order ${order.orderNumber} needs warehouse attention`,
              type: 'info',
              actionUrl: '/dashboard/orders',
              timestamp: orderCreatedAt,
            }, change.doc.id);
          }
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
          
          // Only create notifications for requests created within the last 5 minutes
          // This prevents notifications for existing requests when the listener first connects
          const requestCreatedAt = request.createdAt?.toDate ? request.createdAt.toDate() : new Date();
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
          
          if (requestCreatedAt > fiveMinutesAgo) {
            addNotification({
              title: 'New Quantity Request',
              message: `Quantity update requested for ${request.productName}`,
              type: 'info',
              actionUrl: '/dashboard/quantity-requests',
            }, change.doc.id);
          }
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
          
          // Use the order's updatedAt timestamp for when the status actually changed
          const eventTimestamp = order.updatedAt?.toDate ? order.updatedAt.toDate() : new Date();
          
          addNotification({
            title: `Your Order ${order.status === 'approved' ? 'Approved' : order.status === 'cancelled' ? 'Cancelled' : 'Updated'}`,
            message: `Order ${order.orderNumber} status changed to ${order.status}`,
            type: order.status === 'approved' ? 'success' : order.status === 'cancelled' ? 'error' : 'info',
            actionUrl: '/dashboard/my-orders',
            timestamp: eventTimestamp,
          }, change.doc.id);
        }
      });
    });
    unsubscribers.push(unsubscribeUserOrders);
  };

  // Helper function to generate a unique event key for deduplication
  const generateEventKey = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>, docId?: string): string => {
    // Create a more specific key that includes user ID to prevent cross-user conflicts
    const baseKey = `${user?.id}_${notification.type}_${notification.title}_${notification.message}`;
    return docId ? `${baseKey}_${docId}` : baseKey;
  };

  const addNotification = async (notification: Omit<Notification, 'id' | 'read' | 'timestamp'> & { timestamp?: Date }, docId?: string) => {
    if (!user?.id) return;
    
    // Check for duplicates using event key
    const eventKey = generateEventKey(notification, docId);
    if (processedEvents.has(eventKey)) {
      console.log('Duplicate notification prevented:', eventKey);
      return;
    }
    
    // Double-check with database to prevent duplicates across sessions
     // Use shorter time window for real-time notifications (30 minutes)
     try {
       const exists = await notificationService.notificationExists(user.id, notification.title, notification.message, 0.5);
       if (exists) {
         console.log('Notification already exists in database, skipping creation');
         setProcessedEvents(prev => new Set([...prev, eventKey]));
         return;
       }
     } catch (error) {
       console.error('Error checking notification existence:', error);
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
      
      // Use provided timestamp if available
      if (notification.timestamp) {
        notificationData.timestamp = notification.timestamp;
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
    // Note: This function now only refreshes the notification display.
    // System notifications are handled by real-time listeners to prevent duplicates.
    console.log('Notification display refreshed');
  };

  const refreshNotificationsForRoleChange = async () => {
    if (!user?.id || !user?.role) return;
    
    try {
      // Clear current notifications display
      setNotifications([]);
      // Note: Removed automatic generation of system notifications.
      // Real-time listeners will populate notifications based on actual events.
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