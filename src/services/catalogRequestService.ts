import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

const CATALOG_REQUESTS_COLLECTION = 'catalogRequests';

export interface CatalogRequestItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  category: string;
  supplier?: string;
}

export interface CatalogRequest {
  id?: string;
  userId: string;
  userEmail: string;
  userName: string;
  items: CatalogRequestItem[];
  totalAmount: number;
  location: string;
  justification: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'pending' | 'approved' | 'rejected' | 'fulfilled' | 'cancelled';
  requestNumber: string;
  requestDate: Timestamp;
  approvedBy?: string;
  approvedDate?: Timestamp;
  fulfilledDate?: Timestamp;
  rejectionReason?: string;
  notes?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface CreateCatalogRequest {
  userId: string;
  userEmail: string;
  userName: string;
  items: CatalogRequestItem[];
  location: string;
  justification: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
}

// Create a new catalog request
export const createCatalogRequest = async (requestData: CreateCatalogRequest): Promise<string> => {
  try {
    const requestNumber = `CAT-${Date.now()}`;
    const totalAmount = requestData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const now = serverTimestamp();

    const docRef = await addDoc(collection(db, CATALOG_REQUESTS_COLLECTION), {
      ...requestData,
      requestNumber,
      totalAmount,
      status: 'pending',
      requestDate: now,
      createdAt: now,
      updatedAt: now
    });

    return docRef.id;
  } catch (error) {
    console.error('Error creating catalog request:', error);
    throw new Error('Failed to create catalog request');
  }
};

// Get all catalog requests
export const getAllCatalogRequests = async (): Promise<CatalogRequest[]> => {
  try {
    const q = query(
      collection(db, CATALOG_REQUESTS_COLLECTION),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CatalogRequest[];
  } catch (error) {
    console.error('Error fetching catalog requests:', error);
    throw new Error('Failed to fetch catalog requests');
  }
};

// Get catalog requests by user
export const getCatalogRequestsByUser = async (userId: string): Promise<CatalogRequest[]> => {
  try {
    const q = query(
      collection(db, CATALOG_REQUESTS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CatalogRequest[];
  } catch (error) {
    console.error('Error fetching user catalog requests:', error);
    throw new Error('Failed to fetch user catalog requests');
  }
};

// Get pending catalog requests
export const getPendingCatalogRequests = async (): Promise<CatalogRequest[]> => {
  try {
    const q = query(
      collection(db, CATALOG_REQUESTS_COLLECTION),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CatalogRequest[];
  } catch (error) {
    console.error('Error fetching pending catalog requests:', error);
    throw new Error('Failed to fetch pending catalog requests');
  }
};

// Update catalog request status
export const updateCatalogRequestStatus = async (
  requestId: string,
  status: CatalogRequest['status'],
  approvedBy?: string,
  rejectionReason?: string,
  notes?: string
): Promise<void> => {
  try {
    const updateData: any = {
      status,
      updatedAt: serverTimestamp()
    };

    if (status === 'approved' && approvedBy) {
      updateData.approvedBy = approvedBy;
      updateData.approvedDate = serverTimestamp();
    }

    if (status === 'fulfilled') {
      updateData.fulfilledDate = serverTimestamp();
    }

    if (status === 'rejected' && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    if (notes) {
      updateData.notes = notes;
    }

    await updateDoc(doc(db, CATALOG_REQUESTS_COLLECTION, requestId), updateData);
  } catch (error) {
    console.error('Error updating catalog request status:', error);
    throw new Error('Failed to update catalog request status');
  }
};

// Delete catalog request
export const deleteCatalogRequest = async (requestId: string): Promise<void> => {
  try {
    const docRef = doc(db, CATALOG_REQUESTS_COLLECTION, requestId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting catalog request:', error);
    throw new Error('Failed to delete catalog request');
  }
};

// Get catalog request by ID
export const getCatalogRequest = async (requestId: string): Promise<CatalogRequest | null> => {
  try {
    const docSnap = await getDoc(doc(db, CATALOG_REQUESTS_COLLECTION, requestId));
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as CatalogRequest;
    }
    return null;
  } catch (error) {
    console.error('Error fetching catalog request:', error);
    throw new Error('Failed to fetch catalog request');
  }
};

// Real-time listener for catalog requests
export const subscribeToCatalogRequests = (
  callback: (requests: CatalogRequest[]) => void,
  userId?: string
) => {
  let q;
  if (userId) {
    q = query(
      collection(db, CATALOG_REQUESTS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
  } else {
    q = query(
      collection(db, CATALOG_REQUESTS_COLLECTION),
      orderBy('createdAt', 'desc')
    );
  }

  return onSnapshot(q, 
    (querySnapshot) => {
      const requests = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CatalogRequest[];
      callback(requests);
    },
    (error) => {
      console.error('Error in catalog requests snapshot listener:', error);
      
      // If it's a permission error, try to fallback to getAllCatalogRequests
      if (error.code === 'permission-denied') {
        console.warn('Permission denied for real-time listener, falling back to one-time fetch');
        getAllCatalogRequests()
          .then(requests => callback(requests))
          .catch(fallbackError => {
            console.error('Fallback fetch also failed:', fallbackError);
            callback([]);
          });
      } else {
        // Call callback with empty array on other errors to prevent crashes
        callback([]);
      }
    }
  );
};

// Search catalog requests
export const searchCatalogRequests = async (searchTerm: string): Promise<CatalogRequest[]> => {
  try {
    const allRequests = await getAllCatalogRequests();
    return allRequests.filter(request => 
      request.requestNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.items.some(item => 
        item.productName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  } catch (error) {
    console.error('Error searching catalog requests:', error);
    throw new Error('Failed to search catalog requests');
  }
};

// Get catalog request statistics
export const getCatalogRequestStats = async (userId?: string) => {
  try {
    let requests: CatalogRequest[];
    if (userId) {
      requests = await getCatalogRequestsByUser(userId);
    } else {
      requests = await getAllCatalogRequests();
    }

    const stats = {
      total: requests.length,
      pending: requests.filter(r => r.status === 'pending').length,
      approved: requests.filter(r => r.status === 'approved').length,
      fulfilled: requests.filter(r => r.status === 'fulfilled').length,
      rejected: requests.filter(r => r.status === 'rejected').length,
      totalAmount: requests.reduce((sum, r) => sum + r.totalAmount, 0),
      averageAmount: requests.length > 0 ? requests.reduce((sum, r) => sum + r.totalAmount, 0) / requests.length : 0
    };

    return stats;
  } catch (error) {
    console.error('Error getting catalog request stats:', error);
    throw new Error('Failed to get catalog request statistics');
  }
};