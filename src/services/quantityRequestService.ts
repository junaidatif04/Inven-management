import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
  onSnapshot
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  QuantityRequest,
  CreateQuantityRequest,
  QuantityResponse
} from '@/types/quantityRequest';

// Re-export types for external use
export type { 
  QuantityRequest,
  CreateQuantityRequest,
  QuantityResponse 
};
import { createInventoryItem, findExistingInventoryItem, addStockToExistingItem } from './inventoryService';
import { CreateInventoryItem } from '@/types/inventory';
import { getProduct } from './productService';

const QUANTITY_REQUESTS_COLLECTION = 'quantityRequests';

// Display Request Functions removed - workflow simplified to direct quantity requests

// Quantity Request Functions
export const getAllQuantityRequests = async (): Promise<QuantityRequest[]> => {
  try {
    const q = query(
      collection(db, QUANTITY_REQUESTS_COLLECTION),
      orderBy('requestedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as QuantityRequest[];
  } catch (error) {
    console.error('Error fetching quantity requests:', error);
    throw new Error('Failed to fetch quantity requests');
  }
};

export const getQuantityRequestsBySupplier = async (supplierId: string): Promise<QuantityRequest[]> => {
  try {
    const q = query(
      collection(db, QUANTITY_REQUESTS_COLLECTION),
      where('supplierId', '==', supplierId),
      orderBy('requestedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as QuantityRequest[];
  } catch (error) {
    console.error('Error fetching supplier quantity requests:', error);
    throw new Error('Failed to fetch supplier quantity requests');
  }
};

// Get quantity requests by requester (warehouse staff)
export const getQuantityRequestsByRequester = async (requesterId: string): Promise<QuantityRequest[]> => {
  try {
    const q = query(
      collection(db, QUANTITY_REQUESTS_COLLECTION),
      where('requestedBy', '==', requesterId),
      orderBy('requestedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as QuantityRequest[];
  } catch (error) {
    console.error('Error fetching requester quantity requests:', error);
    throw new Error('Failed to fetch requester quantity requests');
  }
};

export const getPendingQuantityRequests = async (): Promise<QuantityRequest[]> => {
  try {
    const q = query(
      collection(db, QUANTITY_REQUESTS_COLLECTION),
      where('status', '==', 'pending'),
      orderBy('requestedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as QuantityRequest[];
  } catch (error) {
    console.error('Error fetching pending quantity requests:', error);
    throw new Error('Failed to fetch pending quantity requests');
  }
};

export const respondToQuantityRequest = async (
  requestId: string,
  response: QuantityResponse,
  userId: string
): Promise<void> => {
  try {
    const batch = writeBatch(db);
    
    // Update quantity request
    const quantityRequestRef = doc(db, QUANTITY_REQUESTS_COLLECTION, requestId);
    batch.update(quantityRequestRef, {
      status: response.status,
      approvedQuantity: response.approvedQuantity || null,
      rejectionReason: response.rejectionReason || null,
      notes: response.notes || null,
      respondedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    await batch.commit();
    
    // If approved (full or partial), create inventory item after batch commit
    if ((response.status === 'approved_full' || response.status === 'approved_partial') && response.approvedQuantity) {
      console.log('🔄 Processing approved quantity request for inventory creation:', {
        requestId,
        status: response.status,
        approvedQuantity: response.approvedQuantity,
        userId
      });
      
      const quantityRequest = await getDoc(quantityRequestRef);
      if (quantityRequest.exists()) {
        const qrData = quantityRequest.data() as QuantityRequest;
        console.log('📋 Quantity request data retrieved:', {
          productId: qrData.productId,
          productName: qrData.productName,
          supplierId: qrData.supplierId,
          supplierName: qrData.supplierName
        });
        
        let inventoryData: CreateInventoryItem;
        
        // Get product details for inventory creation
        let productCategory = 'Uncategorized'; // Fallback category
        let productPrice = 0;
        let productDescription = '';
        let productSku = qrData.productId; // Default SKU
        let productImageUrl = '';
        
        try {
          const productData = await getProduct(qrData.productId);
          if (productData) {
            productCategory = productData.category || 'Uncategorized';
            productPrice = productData.price || 0;
            productDescription = productData.description || '';
            productSku = productData.sku || qrData.productId;
            productImageUrl = productData.imageUrl || '';
          }
        } catch (error) {
          console.warn('Could not fetch product details, using fallback values:', error);
        }
        
        inventoryData = {
          productId: qrData.productId,
          name: qrData.productName,
          description: productDescription,
          sku: productSku,
          category: productCategory,
          quantity: response.approvedQuantity,
          minStockLevel: Math.max(1, Math.floor(response.approvedQuantity * 0.1)), // 10% of initial stock
          maxStockLevel: response.approvedQuantity * 2, // 200% of initial stock
          unitPrice: productPrice,
          supplierId: qrData.supplierId,
          supplierName: qrData.supplierName,
          ...(productImageUrl && { imageUrl: productImageUrl }),
          location: 'Main Warehouse', // Default location
          isPublished: false // Default to unpublished, requires manual curation
        };
        
        // Check if an inventory item already exists for this product and supplier
        console.log('🔍 Checking for existing inventory item:', {
          productId: qrData.productId,
          productName: inventoryData.name,
          supplierId: inventoryData.supplierId,
          sku: inventoryData.sku
        });
        
        const existingItem = await findExistingInventoryItem(
          qrData.productId,
          inventoryData.supplierId!,
          inventoryData.sku
        );
        
        if (existingItem) {
          // Add stock to existing item instead of creating a new one
          console.log('✅ Found existing inventory item, adding stock:', {
            itemId: existingItem.id,
            currentQuantity: existingItem.quantity,
            addingQuantity: response.approvedQuantity
          });
          await addStockToExistingItem(
            existingItem.id,
            response.approvedQuantity,
            userId,
            `Stock replenishment from approved quantity request (Request ID: ${requestId})`
          );
          console.log('✅ Successfully added stock to existing inventory item:', existingItem.id);
        } else {
          // Create new inventory item if none exists
          console.log('🆕 No existing item found. Creating new inventory item with data:', inventoryData);
          console.log('User ID for inventory creation:', userId);
          try {
            console.log('🚀 Calling createInventoryItem with:', {
              inventoryData: {
                name: inventoryData.name,
                productId: inventoryData.productId,
                supplierId: inventoryData.supplierId,
                quantity: inventoryData.quantity,
                category: inventoryData.category
              },
              userId
            });
            
            const inventoryItemId = await createInventoryItem(inventoryData, userId);
            
            console.log('✅ Successfully created new inventory item:', {
              inventoryId: inventoryItemId,
              productName: inventoryData.name,
              quantity: inventoryData.quantity
            });
          } catch (error) {
            console.error('❌ Error creating inventory item:', {
              error: error,
              inventoryData: inventoryData,
              userId
            });
            console.error('Error details:', {
              errorMessage: error instanceof Error ? error.message : 'Unknown error',
              errorCode: (error as any)?.code || 'Unknown code',
              inventoryData,
              userId,
              requestId
            });
            throw error;
          }
        }
      }
    }
  } catch (error) {
    console.error('Error responding to quantity request:', error);
    throw new Error('Failed to respond to quantity request');
  }
};

// Display request functionality removed - no longer needed

// Helper function to check for existing pending quantity requests
const checkForExistingPendingRequest = async (
  productId: string,
  supplierId: string
): Promise<QuantityRequest | null> => {
  try {
    const q = query(
      collection(db, QUANTITY_REQUESTS_COLLECTION),
      where('productId', '==', productId),
      where('supplierId', '==', supplierId),
      where('status', '==', 'pending')
    );
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const existingRequest = querySnapshot.docs[0];
      return {
        id: existingRequest.id,
        ...existingRequest.data()
      } as QuantityRequest;
    }
    
    return null;
  } catch (error) {
    console.error('Error checking for existing pending requests:', error);
    return null;
  }
};

// Public function to check if a product has active quantity requests
export const hasActiveQuantityRequests = async (productId: string, supplierId?: string): Promise<boolean> => {
  try {
    let q;
    if (supplierId) {
      // If supplierId is provided, filter by supplier (for supplier users)
      q = query(
        collection(db, QUANTITY_REQUESTS_COLLECTION),
        where('productId', '==', productId),
        where('supplierId', '==', supplierId),
        where('status', '==', 'pending')
      );
    } else {
      // If no supplierId, query all (for admin/warehouse users)
      q = query(
        collection(db, QUANTITY_REQUESTS_COLLECTION),
        where('productId', '==', productId),
        where('status', '==', 'pending')
      );
    }
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking for active quantity requests:', error);
    return false;
  }
};

// Create a standalone quantity request (for warehouse to request from suppliers)
export const createQuantityRequest = async (
  requestData: CreateQuantityRequest,
  userId: string,
  userName: string
): Promise<string> => {
  try {
    // Check for existing pending requests for the same product and supplier
    console.log('Checking for existing pending quantity requests:', {
      productId: requestData.productId,
      supplierId: requestData.supplierId
    });
    
    const existingRequest = await checkForExistingPendingRequest(
      requestData.productId,
      requestData.supplierId
    );
    
    if (existingRequest) {
      console.log('Found existing pending request:', existingRequest.id);
      
      // Update the existing request with the new quantity (combine quantities)
      const combinedQuantity = (existingRequest.requestedQuantity || 0) + requestData.requestedQuantity;
      
      await updateDoc(doc(db, QUANTITY_REQUESTS_COLLECTION, existingRequest.id), {
         requestedQuantity: combinedQuantity,
         updatedAt: serverTimestamp(),
         // Add a note about the combination
         notes: `Combined request: Original ${existingRequest.requestedQuantity} + New ${requestData.requestedQuantity} = ${combinedQuantity} units`
       });
       
       // Create notification for the original requester about the combination
       try {
         await addDoc(collection(db, 'notifications'), {
           title: 'Quantity Request Combined',
           message: `Your quantity request for ${requestData.productName} was combined with another request. Total quantity: ${combinedQuantity} units`,
           type: 'info',
           userId: existingRequest.requestedBy,
           read: false,
           actionUrl: '/dashboard',
           createdAt: serverTimestamp(),
           metadata: {
             requestId: existingRequest.id,
             productName: requestData.productName,
             originalQuantity: existingRequest.requestedQuantity,
             addedQuantity: requestData.requestedQuantity,
             totalQuantity: combinedQuantity
           }
         });
         
         // Also notify the new requester
         await addDoc(collection(db, 'notifications'), {
           title: 'Quantity Request Combined',
           message: `Your quantity request for ${requestData.productName} was combined with an existing request. Total quantity: ${combinedQuantity} units`,
           type: 'info',
           userId: userId,
           read: false,
           actionUrl: '/dashboard',
           createdAt: serverTimestamp(),
           metadata: {
             requestId: existingRequest.id,
             productName: requestData.productName,
             yourQuantity: requestData.requestedQuantity,
             existingQuantity: existingRequest.requestedQuantity,
             totalQuantity: combinedQuantity
           }
         });
       } catch (notificationError) {
         console.error('Error creating combination notifications:', notificationError);
         // Don't fail the main operation if notifications fail
       }
       
       console.log('Updated existing request with combined quantity:', combinedQuantity);
       return existingRequest.id;
    }
    
    console.log('No existing pending request found, creating new request');
    const docRef = await addDoc(collection(db, QUANTITY_REQUESTS_COLLECTION), {
      ...requestData,
      requestedBy: userId,
      requesterName: userName,
      status: 'pending',
      requestedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // Notification will be created by NotificationContext real-time listener
    // to prevent duplicates
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating quantity request:', error);
    throw new Error('Failed to create quantity request');
  }
};

// Helper function to get quantity request by ID
export const getQuantityRequest = async (requestId: string): Promise<QuantityRequest | null> => {
  try {
    const docRef = doc(db, QUANTITY_REQUESTS_COLLECTION, requestId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as QuantityRequest;
    }
    return null;
  } catch (error) {
    console.error('Error fetching quantity request:', error);
    throw new Error('Failed to fetch quantity request');
  }
};

// Real-time subscription for quantity requests by supplier
export const subscribeToQuantityRequestsBySupplier = (
  supplierId: string, 
  callback: (requests: QuantityRequest[]) => void
): (() => void) => {
  if (!supplierId || typeof supplierId !== 'string') {
    console.warn('Invalid supplierId provided to subscribeToQuantityRequestsBySupplier:', supplierId);
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, QUANTITY_REQUESTS_COLLECTION),
    where('supplierId', '==', supplierId),
    orderBy('requestedAt', 'desc')
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const requests = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as QuantityRequest[];
    callback(requests);
  }, (error) => {
    console.error('Error in quantity requests subscription:', error);
    callback([]);
  });
};

// Real-time subscription for quantity requests by requester
export const subscribeToQuantityRequestsByRequester = (
  requesterId: string, 
  callback: (requests: QuantityRequest[]) => void
): (() => void) => {
  if (!requesterId || typeof requesterId !== 'string') {
    console.warn('Invalid requesterId provided to subscribeToQuantityRequestsByRequester:', requesterId);
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, QUANTITY_REQUESTS_COLLECTION),
    where('requestedBy', '==', requesterId),
    orderBy('requestedAt', 'desc')
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const requests = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as QuantityRequest[];
    callback(requests);
  }, (error) => {
    console.error('Error in quantity requests subscription:', error);
    callback([]);
  });
};

// Cancel quantity request
export const cancelQuantityRequest = async (requestId: string): Promise<void> => {
  try {
    const docRef = doc(db, QUANTITY_REQUESTS_COLLECTION, requestId);
    await updateDoc(docRef, {
      status: 'cancelled',
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error cancelling quantity request:', error);
    throw new Error('Failed to cancel quantity request');
  }
};

// Display request deletion removed

// Display request subscriptions removed

// Delete quantity request (cancel first if active, then delete)
export const deleteQuantityRequest = async (requestId: string, requesterId: string): Promise<void> => {
  try {
    // First verify the request belongs to the requester
    const quantityRequest = await getQuantityRequest(requestId);
    
    if (!quantityRequest) {
      throw new Error('Quantity request not found');
    }
    
    if (quantityRequest.requestedBy !== requesterId) {
      throw new Error('Unauthorized: You can only delete your own requests');
    }
    
    // If the request is still active (pending or awaiting response), cancel it first
    if (quantityRequest.status === 'pending') {
      await updateDoc(doc(db, QUANTITY_REQUESTS_COLLECTION, requestId), {
        status: 'cancelled',
        updatedAt: serverTimestamp()
      });
    }
    
    // Delete the quantity request
    const docRef = doc(db, QUANTITY_REQUESTS_COLLECTION, requestId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting quantity request:', error);
    throw new Error('Failed to delete quantity request');
  }
};