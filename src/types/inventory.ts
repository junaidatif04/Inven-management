export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  sku: string;
  category: string;
  quantity: number;
  reservedQuantity?: number; // Quantity reserved by pending orders
  minStockLevel: number;
  maxStockLevel: number;
  unitPrice: number;
  supplier: string; // Legacy field for backward compatibility
  supplierId?: string; // New supplier ID field
  supplierName?: string; // New supplier name field
  location: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'discontinued';
  isPublished: boolean; // Whether item is published to end-user catalog
  imageUrl?: string;
  imagePath?: string;
  // Curation fields for publishing workflow
  salePrice?: number; // Customer-facing price (required for publishing)
  customerFacingDescription?: string; // Override description for customers
  images?: string[]; // Array of image URLs
  visibilityTags?: string[]; // Tags like "Featured", "On Sale", etc.
  detailsSaved?: boolean; // Whether curation details have been saved
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
  reservedQuantity?: number; // Quantity reserved by pending orders
  minStockLevel: number;
  maxStockLevel: number;
  unitPrice: number;
  supplier?: string; // Legacy field for backward compatibility
  supplierId?: string; // New supplier ID field
  supplierName?: string; // New supplier name field
  location: string;
  isPublished?: boolean; // Whether item is published to end-user catalog
  imageUrl?: string;
  imagePath?: string;
  // Curation fields for publishing workflow
  salePrice?: number;
  customerFacingDescription?: string;
  images?: string[];
  visibilityTags?: string[];
  detailsSaved?: boolean;
}

export interface UpdateInventoryItem extends Partial<CreateInventoryItem> {
  id: string;
  status?: 'in_stock' | 'low_stock' | 'out_of_stock' | 'discontinued';
  reservedQuantity?: number; // Quantity reserved by pending orders
  isPublished?: boolean; // Whether item is published to end-user catalog
  imageUrl?: string;
  imagePath?: string;
  // Curation fields for publishing workflow
  salePrice?: number;
  customerFacingDescription?: string;
  images?: string[];
  visibilityTags?: string[];
  detailsSaved?: boolean;
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
  email: string;
  phone: string;
  contactPerson: string;
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
