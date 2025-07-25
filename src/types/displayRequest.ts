export interface DisplayRequest {
  id: string;
  productId: string;
  productName: string;
  productDescription?: string;
  productSku?: string;
  productPrice: number;
  productImageUrl?: string;
  supplierId: string;
  supplierName: string;
  supplierEmail: string;
  status: 'pending' | 'accepted' | 'rejected';
  requestedAt: any; // Firestore Timestamp
  reviewedAt?: any; // Firestore Timestamp
  reviewedBy?: string; // Admin/Warehouse staff user ID
  reviewerName?: string;
  rejectionReason?: string;
  quantityRequestId?: string; // Link to quantity request if accepted
  createdAt: any;
  updatedAt: any;
}

export interface CreateDisplayRequest {
  productId: string;
  productName: string;
  productDescription?: string;
  productSku?: string;
  productPrice: number;
  productImageUrl?: string;
  supplierId: string;
  supplierName: string;
  supplierEmail: string;
}

export interface QuantityRequest {
  id: string;
  displayRequestId?: string; // Optional for direct quantity requests
  productId: string;
  productName: string;
  supplierId: string;
  supplierName: string;
  supplierEmail: string;
  requestedBy: string; // Admin/Warehouse staff user ID
  requesterName: string;
  requestedQuantity: number;
  status: 'pending' | 'approved_full' | 'approved_partial' | 'rejected';
  requestedAt: any; // Firestore Timestamp
  respondedAt?: any; // Firestore Timestamp
  approvedQuantity?: number;
  rejectionReason?: string;
  notes?: string;
  createdAt: any;
  updatedAt: any;
}

export interface CreateQuantityRequest {
  displayRequestId?: string; // Optional for direct quantity requests
  productId: string;
  productName: string;
  supplierId: string;
  supplierName: string;
  supplierEmail: string;
  requestedBy: string;
  requesterName: string;
  requestedQuantity: number;
}

export interface QuantityResponse {
  quantityRequestId: string;
  status: 'approved_full' | 'approved_partial' | 'rejected';
  approvedQuantity?: number;
  rejectionReason?: string;
  notes?: string;
}