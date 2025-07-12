export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  sku: string;
  category: string;
  quantity: number;
  minStockLevel: number;
  maxStockLevel: number;
  unitPrice: number;
  supplier: string;
  location: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'discontinued';
  imageUrl?: string;
  imagePath?: string;
  lastUpdated: any;
  createdAt: any;
  updatedBy: string;
}

export interface CreateInventoryItem {
  name: string;
  description: string;
  sku: string;
  category: string;
  quantity: number;
  minStockLevel: number;
  maxStockLevel: number;
  unitPrice: number;
  supplier: string;
  location: string;
  imageUrl?: string;
  imagePath?: string;
}

export interface UpdateInventoryItem extends Partial<CreateInventoryItem> {
  id: string;
  status?: 'in_stock' | 'low_stock' | 'out_of_stock' | 'discontinued';
  imageUrl?: string;
  imagePath?: string;
}

export interface StockMovement {
  id: string;
  itemId: string;
  itemName: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reason: string;
  performedBy: string;
  timestamp: any;
  notes?: string;
}

export interface Supplier {
  id: string;
  name: string;
  companyName?: string;
  email: string;
  phone: string;
  address: string;
  contactPerson: string;
  businessType?: string;
  website?: string;
  taxId?: string;
  status: 'active' | 'inactive';
  createdAt: any;
  updatedAt: any;
  accessRequest?: any;
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
  createdBy: string;
  notes?: string;
}

export interface OrderItem {
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}
