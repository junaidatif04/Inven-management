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
  limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplierName: string;
  items: OrderItem[];
  status: 'pending' | 'approved' | 'shipped' | 'delivered' | 'cancelled';
  totalAmount: number;
  orderDate: any;
  expectedDelivery?: any;
  actualDelivery?: any;
  requestedBy: string;
  approvedBy?: string;
  notes?: string;
  createdAt: any;
  updatedAt: any;
}

export interface CreateOrder {
  supplierId: string;
  supplierName: string;
  items: Omit<OrderItem, 'id'>[];
  expectedDelivery?: Date;
  notes?: string;
  requestedBy: string;
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
    const orderNumber = `ORD-${Date.now()}`;
    const totalAmount = order.items.reduce((sum, item) => sum + item.totalPrice, 0);
    
    const docRef = await addDoc(collection(db, 'orders'), {
      ...order,
      orderNumber,
      totalAmount,
      status: 'pending',
      orderDate: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating order:', error);
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

export const updateOrderStatus = async (id: string, status: Order['status']): Promise<void> => {
  try {
    await updateDoc(doc(db, 'orders', id), {
      status,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
};

export const deleteOrder = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'orders', id));
  } catch (error) {
    console.error('Error deleting order:', error);
    throw error;
  }
};

// Real-time subscriptions
export const subscribeToOrders = (callback: (orders: Order[]) => void) => {
  const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (querySnapshot) => {
    const orders = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Order[];
    callback(orders);
  });
};

export const subscribeToOrdersByStatus = (status: Order['status'], callback: (orders: Order[]) => void) => {
  const q = query(
    collection(db, 'orders'), 
    where('status', '==', status),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (querySnapshot) => {
    const orders = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Order[];
    callback(orders);
  });
};

export const subscribeToRecentOrders = (callback: (orders: Order[]) => void) => {
  const q = query(
    collection(db, 'orders'), 
    orderBy('createdAt', 'desc'),
    limit(10)
  );
  return onSnapshot(q, (querySnapshot) => {
    const orders = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Order[];
    callback(orders);
  });
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
