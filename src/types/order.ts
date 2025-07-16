export interface CustomerOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  items: CustomerOrderItem[];
  status: 'pending' | 'accepted' | 'cancelled' | 'shipped' | 'delivered';
  totalAmount: number;
  orderDate: any; // Firestore Timestamp
  acceptedDate?: any; // Firestore Timestamp
  shippedDate?: any; // Firestore Timestamp
  deliveredDate?: any; // Firestore Timestamp
  cancellationReason?: string;
  notes?: string;
  shippingAddress?: string;
  createdAt: any;
  updatedAt: any;
}

export interface CustomerOrderItem {
  itemId: string;
  itemName: string;
  itemSku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  supplierId?: string;
  supplierName?: string;
}

export interface CreateCustomerOrder {
  customerId: string;
  customerName: string;
  customerEmail: string;
  items: Omit<CustomerOrderItem, 'totalPrice'>[];
  shippingAddress?: string;
  notes?: string;
}

export interface UpdateCustomerOrder {
  status?: 'pending' | 'accepted' | 'cancelled' | 'shipped' | 'delivered';
  cancellationReason?: string;
  notes?: string;
  shippedDate?: Date;
  deliveredDate?: Date;
}