import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  serverTimestamp,
  where,
  onSnapshot,
  limit,
  writeBatch,
  startAfter,
  getCountFromServer
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { reserveStock, releaseReservation, confirmStockDeduction, adjustStock } from './inventoryService';

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  supplier: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  supplierId?: string;
  supplierName: string;
  items: OrderItem[];
  status: 'pending' | 'approved' | 'shipped' | 'delivered' | 'cancelled';
  totalAmount: number;
  orderDate: any;
  expectedDelivery?: any;
  actualDelivery?: any;
  requestedBy: string;
  userId: string;
  approvedBy?: string;
  notes?: string;
  cancellationReason?: string;
  priority?: 'low' | 'medium' | 'high';
  deliveryLocation?: string;
  createdAt: any;
  updatedAt: any;
}

export interface CreateOrder {
  supplierId?: string;
  supplierName: string;
  items: OrderItem[];
  expectedDelivery?: Date;
  notes?: string;
  requestedBy: string;
  userId: string;
  priority?: 'low' | 'medium' | 'high';
  deliveryLocation?: string;
  orderNumber: string;
  totalAmount: number;
  status: 'pending' | 'approved' | 'shipped' | 'delivered' | 'cancelled';
  orderDate: Date;
}

export interface UpdateOrder extends Partial<CreateOrder> {
  id: string;
  status?: Order['status'];
  approvedBy?: string;
  actualDelivery?: Date;
  totalAmount?: number;
}

// Order CRUD Operations
export const getAllOrders = async (): Promise<Order[]> => {
  try {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Order[];
  } catch (error) {
    console.error('Error fetching orders:', error);
    throw error;
  }
};

export const getOrder = async (id: string): Promise<Order | null> => {
  try {
    const docRef = doc(db, 'orders', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Order;
    }
    return null;
  } catch (error) {
    console.error('Error fetching order:', error);
    throw error;
  }
};

export const createOrder = async (order: CreateOrder): Promise<string> => {
  try {
    // Reserve stock for all items in the order
    for (const item of order.items) {
      await reserveStock(item.productId, item.quantity, order.userId);
    }

    const docRef = await addDoc(collection(db, 'orders'), {
      ...order,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating order:', error);
    // If order creation fails, release any reservations that were made
    try {
      for (const item of order.items) {
        await releaseReservation(item.productId, item.quantity, order.userId);
      }
    } catch (releaseError) {
      console.error('Error releasing reservations after failed order creation:', releaseError);
    }
    throw error;
  }
};

export const updateOrder = async (order: UpdateOrder): Promise<void> => {
  try {
    const { id, ...updateData } = order;

    // Recalculate total if items are updated
    if (updateData.items) {
      updateData.totalAmount = updateData.items.reduce((sum, item) => sum + item.totalPrice, 0);
    }

    await updateDoc(doc(db, 'orders', id), {
      ...updateData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating order:', error);
    throw error;
  }
};

export const updateOrderStatus = async (
  id: string, 
  status: Order['status'], 
  userId: string, 
  cancellationReason?: string
): Promise<void> => {
  try {
    const order = await getOrder(id);
    if (!order) {
      throw new Error('Order not found');
    }

    // Validate cancellation reason for cancelled orders
    if (status === 'cancelled' && !cancellationReason?.trim()) {
      throw new Error('Cancellation reason is required when cancelling an order');
    }

    const previousStatus = order.status;

    // Handle stock reservations based on status change
    if (previousStatus === 'pending' && (status === 'approved' || status === 'shipped' || status === 'delivered')) {
      // Order approved/shipped/delivered: deduct stock and release reservations
      for (const item of order.items) {
        await confirmStockDeduction(item.productId, item.quantity, userId);
      }
    } else if (previousStatus === 'pending' && status === 'cancelled') {
      // Order cancelled: release reservations without deducting stock
      for (const item of order.items) {
        await releaseReservation(item.productId, item.quantity, userId);
      }
    } else if (previousStatus === 'approved' && (status === 'shipped' || status === 'delivered')) {
      // Already approved orders moving to shipped/delivered: no inventory changes needed
      // Stock was already deducted when approved
    } else if ((previousStatus === 'approved' || previousStatus === 'shipped') && status === 'cancelled') {
      // Cancelling an already processed order: need to restore stock
      for (const item of order.items) {
        await adjustStock(item.productId, item.quantity, 'in', 'Order cancellation - stock restoration', userId);
      }
    }

    const updateData: any = {
      status,
      updatedAt: serverTimestamp(),
      ...(status === 'approved' && { approvedBy: userId }),
      ...(status === 'cancelled' && cancellationReason && { 
        cancellationReason,
        cancelledBy: userId,
        cancelledAt: serverTimestamp()
      })
    };

    await updateDoc(doc(db, 'orders', id), updateData);
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
};

// Bulk update order status
export const bulkUpdateOrderStatus = async (
  orderIds: string[],
  status: Order['status'],
  userId: string,
  cancellationReason?: string
): Promise<void> => {
  try {
    if (orderIds.length === 0) {
      throw new Error('No orders selected for bulk update');
    }

    // Validate cancellation reason for cancelled orders
    if (status === 'cancelled' && !cancellationReason?.trim()) {
      throw new Error('Cancellation reason is required when cancelling orders');
    }

    const batch = writeBatch(db);
    const errors: string[] = [];

    // Process each order
    for (const orderId of orderIds) {
      try {
        const order = await getOrder(orderId);
        if (!order) {
          errors.push(`Order ${orderId} not found`);
          continue;
        }

        const previousStatus = order.status;

        // Handle stock reservations based on status change
        if (previousStatus === 'pending' && (status === 'approved' || status === 'shipped' || status === 'delivered')) {
          // Order approved/shipped/delivered: deduct stock and release reservations
          for (const item of order.items) {
            await confirmStockDeduction(item.productId, item.quantity, userId);
          }
        } else if (previousStatus === 'pending' && status === 'cancelled') {
          // Order cancelled: release reservations without deducting stock
          for (const item of order.items) {
            await releaseReservation(item.productId, item.quantity, userId);
          }
        } else if (previousStatus === 'approved' && (status === 'shipped' || status === 'delivered')) {
          // Already approved orders moving to shipped/delivered: no inventory changes needed
          // Stock was already deducted when approved
        } else if ((previousStatus === 'approved' || previousStatus === 'shipped') && status === 'cancelled') {
          // Cancelling an already processed order: need to restore stock
          for (const item of order.items) {
            await adjustStock(item.productId, item.quantity, 'in', 'Order cancellation - stock restoration', userId);
          }
        }

        const updateData: any = {
          status,
          updatedAt: serverTimestamp(),
          ...(status === 'approved' && { approvedBy: userId }),
          ...(status === 'cancelled' && cancellationReason && { 
            cancellationReason,
            cancelledBy: userId,
            cancelledAt: serverTimestamp()
          })
        };

        const orderRef = doc(db, 'orders', orderId);
        batch.update(orderRef, updateData);
      } catch (error) {
        errors.push(`Error processing order ${orderId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Commit the batch
    await batch.commit();

    // If there were any errors, throw them
    if (errors.length > 0) {
      throw new Error(`Bulk update completed with errors: ${errors.join(', ')}`);
    }
  } catch (error) {
    console.error('Error in bulk update order status:', error);
    throw error;
  }
};

export const deleteOrder = async (id: string, userId: string): Promise<void> => {
  try {
    const order = await getOrder(id);
    if (!order) {
      throw new Error('Order not found');
    }

    // Release stock reservations if order is pending
    if (order.status === 'pending') {
      for (const item of order.items) {
        await releaseReservation(item.productId, item.quantity, userId);
      }
    }

    await deleteDoc(doc(db, 'orders', id));
  } catch (error) {
    console.error('Error deleting order:', error);
    throw error;
  }
};

// Real-time subscriptions
export const subscribeToOrders = (callback: (orders: Order[]) => void) => {
  const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, 
    (querySnapshot) => {
      const orders = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      callback(orders);
    },
    (error) => {
      console.error('Error in orders subscription:', error);
      callback([]);
    }
  );
};

export const subscribeToOrdersByStatus = (status: Order['status'], callback: (orders: Order[]) => void) => {
  const q = query(
    collection(db, 'orders'), 
    where('status', '==', status),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, 
    (querySnapshot) => {
      const orders = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      callback(orders);
    },
    (error) => {
      console.error('Error in orders by status subscription:', error);
      callback([]);
    }
  );
};

export const subscribeToRecentOrders = (callback: (orders: Order[]) => void) => {
  const q = query(
    collection(db, 'orders'), 
    orderBy('createdAt', 'desc'),
    limit(10)
  );
  return onSnapshot(q, 
    (querySnapshot) => {
      const orders = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      callback(orders);
    },
    (error) => {
      console.error('Error in recent orders subscription:', error);
      callback([]);
    }
  );
};

// Analytics and Statistics
export const getOrderStats = async () => {
  try {
    const orders = await getAllOrders();
    
    const stats = {
      total: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      approved: orders.filter(o => o.status === 'approved').length,
      shipped: orders.filter(o => o.status === 'shipped').length,
      delivered: orders.filter(o => o.status === 'delivered').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length,
      totalValue: orders.reduce((sum, order) => sum + order.totalAmount, 0),
      averageOrderValue: orders.length > 0 ? orders.reduce((sum, order) => sum + order.totalAmount, 0) / orders.length : 0
    };
    
    return stats;
  } catch (error) {
    console.error('Error getting order stats:', error);
    throw error;
  }
};

export const getOrdersBySupplier = async (supplierId: string): Promise<Order[]> => {
  try {
    const q = query(
      collection(db, 'orders'), 
      where('supplierId', '==', supplierId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Order[];
  } catch (error) {
    console.error('Error fetching orders by supplier:', error);
    throw error;
  }
};

export const getOrdersByDateRange = async (startDate: Date, endDate: Date): Promise<Order[]> => {
  try {
    const q = query(
      collection(db, 'orders'),
      where('orderDate', '>=', startDate),
      where('orderDate', '<=', endDate),
      orderBy('orderDate', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Order[];
  } catch (error) {
    console.error('Error fetching orders by date range:', error);
    throw error;
  }
};

// Get orders by user ID
export const getOrdersByUser = async (userId: string): Promise<Order[]> => {
  try {
    const q = query(
      collection(db, 'orders'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Order[];
  } catch (error) {
    console.error('Error fetching orders by user:', error);
    throw error;
  }
};

// Subscribe to orders by user ID
export const subscribeToOrdersByUser = (userId: string, callback: (orders: Order[]) => void) => {
  const q = query(
    collection(db, 'orders'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q,
    (querySnapshot) => {
      const orders = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      callback(orders);
    },
    (error) => {
      console.error('Error in user orders subscription:', error);
      callback([]);
    }
  );
};

// Pagination interfaces and functions
export interface PaginatedOrdersResult {
  orders: Order[];
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  currentPage: number;
  totalPages: number;
}

export interface OrdersFilter {
  status?: Order['status'] | 'all';
  searchTerm?: string;
  supplierId?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
}

// Get paginated orders with filters
export const getPaginatedOrders = async (
  page: number = 1,
  pageSize: number = 10,
  filters: OrdersFilter = {}
): Promise<PaginatedOrdersResult> => {
  try {
    // Build base query
    let baseQuery = collection(db, 'orders');
    const constraints: any[] = [];

    // Add filters
    if (filters.status && filters.status !== 'all') {
      constraints.push(where('status', '==', filters.status));
    }
    if (filters.supplierId) {
      constraints.push(where('supplierId', '==', filters.supplierId));
    }
    if (filters.userId) {
      constraints.push(where('userId', '==', filters.userId));
    }
    if (filters.startDate && filters.endDate) {
      constraints.push(where('orderDate', '>=', filters.startDate));
      constraints.push(where('orderDate', '<=', filters.endDate));
    }

    // Add ordering
    constraints.push(orderBy('createdAt', 'desc'));

    // Get total count for pagination
    const countQuery = query(baseQuery, ...constraints);
    const countSnapshot = await getCountFromServer(countQuery);
    const totalCount = countSnapshot.data().count;

    // Calculate pagination
    const totalPages = Math.ceil(totalCount / pageSize);
    const offset = (page - 1) * pageSize;

    // Get paginated data
    const dataQuery = query(
      baseQuery,
      ...constraints,
      limit(pageSize)
    );

    // If not first page, we need to get the starting point
    let finalQuery = dataQuery;
    if (page > 1) {
      // Get the last document from previous page
      const prevPageQuery = query(
        baseQuery,
        ...constraints,
        limit(offset)
      );
      const prevSnapshot = await getDocs(prevPageQuery);
      if (prevSnapshot.docs.length > 0) {
        const lastDoc = prevSnapshot.docs[prevSnapshot.docs.length - 1];
        finalQuery = query(
          baseQuery,
          ...constraints,
          startAfter(lastDoc),
          limit(pageSize)
        );
      }
    }

    const querySnapshot = await getDocs(finalQuery);
    let orders = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Order[];

    // Apply client-side search filter if needed (since Firestore doesn't support full-text search)
    if (filters.searchTerm && filters.searchTerm.trim()) {
      const searchLower = filters.searchTerm.toLowerCase().trim();
      orders = orders.filter(order => 
        order.orderNumber.toLowerCase().includes(searchLower) ||
        order.supplierName.toLowerCase().includes(searchLower) ||
        order.requestedBy.toLowerCase().includes(searchLower) ||
        order.status.toLowerCase().includes(searchLower)
      );
    }

    return {
      orders,
      totalCount,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      currentPage: page,
      totalPages
    };
  } catch (error) {
    console.error('Error fetching paginated orders:', error);
    throw error;
  }
};

// Subscribe to paginated orders with real-time updates
export const subscribeToPaginatedOrders = (
  page: number = 1,
  pageSize: number = 10,
  filters: OrdersFilter = {},
  callback: (result: PaginatedOrdersResult) => void
) => {
  // Build query constraints
  const constraints: any[] = [];
  
  if (filters.status && filters.status !== 'all') {
    constraints.push(where('status', '==', filters.status));
  }
  if (filters.supplierId) {
    constraints.push(where('supplierId', '==', filters.supplierId));
  }
  if (filters.userId) {
    constraints.push(where('userId', '==', filters.userId));
  }
  if (filters.startDate && filters.endDate) {
    constraints.push(where('orderDate', '>=', filters.startDate));
    constraints.push(where('orderDate', '<=', filters.endDate));
  }

  constraints.push(orderBy('createdAt', 'desc'));

  // For real-time subscription, we'll get more data and handle pagination client-side
  // This is a simplified approach - for production, you might want to implement server-side pagination
  const q = query(
    collection(db, 'orders'),
    ...constraints,
    limit(pageSize * 5) // Get more data for better real-time experience
  );

  return onSnapshot(q,
    async (querySnapshot) => {
      try {
        let orders = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Order[];

        // Apply client-side search filter
        if (filters.searchTerm && filters.searchTerm.trim()) {
          const searchLower = filters.searchTerm.toLowerCase().trim();
          orders = orders.filter(order => 
            order.orderNumber.toLowerCase().includes(searchLower) ||
            order.supplierName.toLowerCase().includes(searchLower) ||
            order.requestedBy.toLowerCase().includes(searchLower) ||
            order.status.toLowerCase().includes(searchLower)
          );
        }

        // Calculate pagination
        const totalCount = orders.length;
        const totalPages = Math.ceil(totalCount / pageSize);
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedOrders = orders.slice(startIndex, endIndex);

        const result: PaginatedOrdersResult = {
          orders: paginatedOrders,
          totalCount,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
          currentPage: page,
          totalPages
        };

        callback(result);
      } catch (error) {
        console.error('Error processing paginated orders subscription:', error);
        callback({
          orders: [],
          totalCount: 0,
          hasNextPage: false,
          hasPreviousPage: false,
          currentPage: 1,
          totalPages: 0
        });
      }
    },
    (error) => {
      console.error('Error in paginated orders subscription:', error);
      callback({
        orders: [],
        totalCount: 0,
        hasNextPage: false,
        hasPreviousPage: false,
        currentPage: 1,
        totalPages: 0
      });
    }
  );
};
