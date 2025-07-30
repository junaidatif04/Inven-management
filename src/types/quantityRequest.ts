// Display Request interfaces removed - no longer needed in simplified workflow

export interface QuantityRequest {
  id: string;
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