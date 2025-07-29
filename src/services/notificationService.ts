import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  getDocs,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface FirestoreNotification {
  id?: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  read: boolean;
  timestamp: Timestamp;
  actionUrl?: string;
  metadata?: {
    orderId?: string;
    productId?: string;
    requestId?: string;
    category?: 'order' | 'inventory' | 'access' | 'system';
  };
}

export interface NotificationCreateData {
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  actionUrl?: string;
  timestamp?: Timestamp | Date; // Optional timestamp for when the event actually occurred
  metadata?: {
    orderId?: string;
    productId?: string;
    requestId?: string;
    category?: 'order' | 'inventory' | 'access' | 'system';
  };
}

class NotificationService {
  private readonly collectionName = 'notifications';

  // Create a new notification
  async createNotification(data: NotificationCreateData): Promise<string> {
    try {
      // Filter out undefined values to prevent Firestore errors
      const cleanData = this.removeUndefinedFields(data);
      
      // Use provided timestamp or current time
      let notificationTimestamp: Timestamp;
      if (data.timestamp) {
        notificationTimestamp = data.timestamp instanceof Date 
          ? Timestamp.fromDate(data.timestamp)
          : data.timestamp;
      } else {
        notificationTimestamp = Timestamp.now();
      }
      
      const notificationData: Omit<FirestoreNotification, 'id'> = {
        ...cleanData,
        read: false,
        timestamp: notificationTimestamp,
      };
      
      // Remove timestamp from cleanData to avoid duplication
      delete (notificationData as any).timestamp;
      notificationData.timestamp = notificationTimestamp;

      const docRef = await addDoc(collection(db, this.collectionName), notificationData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Helper method to remove undefined fields
  private removeUndefinedFields(obj: any): any {
    const cleaned: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          const cleanedNested = this.removeUndefinedFields(value);
          if (Object.keys(cleanedNested).length > 0) {
            cleaned[key] = cleanedNested;
          }
        } else {
          cleaned[key] = value;
        }
      }
    }
    
    return cleaned;
  }

  // Create notifications for multiple users (bulk operation)
  async createBulkNotifications(notifications: NotificationCreateData[]): Promise<string[]> {
    try {
      const promises = notifications.map(notification => this.createNotification(notification));
      return await Promise.all(promises);
    } catch (error) {
      console.error('Error creating bulk notifications:', error);
      throw error;
    }
  }

  // Get notifications for a specific user
  async getUserNotifications(userId: string, limitCount: number = 50): Promise<FirestoreNotification[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FirestoreNotification[];
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      throw error;
    }
  }

  // Get unread notifications count for a user
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId),
        where('read', '==', false)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.size;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  }

  // Check if a similar notification already exists for a user
  async notificationExists(userId: string, title: string, message: string, withinHours: number = 24): Promise<boolean> {
    try {
      // Check for notifications with same title and message within the specified time frame
      const timeThreshold = new Date();
      timeThreshold.setHours(timeThreshold.getHours() - withinHours);
      
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId),
        where('title', '==', title),
        where('message', '==', message),
        where('timestamp', '>=', Timestamp.fromDate(timeThreshold))
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.size > 0;
    } catch (error) {
      console.error('Error checking notification existence:', error);
      return false;
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const notificationRef = doc(db, this.collectionName, notificationId);
      await updateDoc(notificationRef, {
        read: true
        // Removed timestamp update to preserve original notification time
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId: string): Promise<void> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId),
        where('read', '==', false)
      );

      const querySnapshot = await getDocs(q);
      const updatePromises = querySnapshot.docs.map(doc => 
        updateDoc(doc.ref, { 
          read: true
          // Removed timestamp update to preserve original notification times
        })
      );

      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Delete a notification
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      const notificationRef = doc(db, this.collectionName, notificationId);
      await deleteDoc(notificationRef);
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  // Delete all notifications for a user
  async deleteAllUserNotifications(userId: string): Promise<void> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId)
      );

      const querySnapshot = await getDocs(q);
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error deleting all user notifications:', error);
      throw error;
    }
  }

  // Clear all notifications for a user (alias for deleteAllUserNotifications)
  async clearAllNotifications(userId: string): Promise<void> {
    return this.deleteAllUserNotifications(userId);
  }

  // Set up real-time listener for user notifications
  subscribeToUserNotifications(
    userId: string, 
    callback: (notifications: FirestoreNotification[]) => void,
    limitCount: number = 50
  ): () => void {
    const q = query(
      collection(db, this.collectionName),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    return onSnapshot(q, (querySnapshot) => {
      const notifications = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FirestoreNotification[];
      
      callback(notifications);
    }, (error) => {
      console.error('Error in notifications subscription:', error);
    });
  }

  // Role-based notification creation helpers
  async createAdminNotification(title: string, message: string, type: 'info' | 'warning' | 'success' | 'error', actionUrl?: string): Promise<void> {
    // Get all admin users and create notifications for them
    // This would require a user service to get admin users
    console.log('Admin notification created:', { title, message, type, actionUrl });
  }

  async createWarehouseNotification(title: string, message: string, type: 'info' | 'warning' | 'success' | 'error', actionUrl?: string): Promise<void> {
    // Get all warehouse staff and create notifications for them
    console.log('Warehouse notification created:', { title, message, type, actionUrl });
  }

  async createSupplierNotification(supplierId: string, title: string, message: string, type: 'info' | 'warning' | 'success' | 'error', actionUrl?: string): Promise<void> {
    await this.createNotification({
      userId: supplierId,
      title,
      message,
      type,
      actionUrl,
      metadata: { category: 'system' }
    });
  }

  async createUserOrderNotification(userId: string, orderId: string, title: string, message: string, type: 'info' | 'success' | 'error', timestamp?: Date | Timestamp): Promise<void> {
    await this.createNotification({
      userId,
      title,
      message,
      type,
      actionUrl: '/dashboard/my-orders',
      timestamp,
      metadata: { 
        orderId,
        category: 'order'
      }
    });
  }
}

export const notificationService = new NotificationService();
export default notificationService;