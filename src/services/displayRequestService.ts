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
  DisplayRequest,
  CreateDisplayRequest,
  QuantityRequest,
  CreateQuantityRequest,
  QuantityResponse
} from '@/types/displayRequest';

// Re-export types for external use
export type { 
  DisplayRequest,
  CreateDisplayRequest,
  QuantityRequest,
  CreateQuantityRequest,
  QuantityResponse 
};
import { createInventoryItem, findExistingInventoryItem, addStockToExistingItem } from './inventoryService';
import { CreateInventoryItem } from '@/types/inventory';

const DISPLAY_REQUESTS_COLLECTION = 'displayRequests';
const QUANTITY_REQUESTS_COLLECTION = 'quantityRequests';

// Display Request Functions
export const createDisplayRequest = async (requestData: CreateDisplayRequest): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, DISPLAY_REQUESTS_COLLECTION), {
      ...requestData,
      status: 'pending',
      requestedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating display request:', error);
    throw new Error('Failed to create display request');
  }
};

export const getAllDisplayRequests = async (): Promise<DisplayRequest[]> => {
  try {
    const q = query(
      collection(db, DISPLAY_REQUESTS_COLLECTION),
      orderBy('requestedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as DisplayRequest[];
  } catch (error) {
    console.error('Error fetching display requests:', error);
    throw new Error('Failed to fetch display requests');
  }
};

export const getDisplayRequestsBySupplier = async (supplierId: string): Promise<DisplayRequest[]> => {
  try {
    const q = query(
      collection(db, DISPLAY_REQUESTS_COLLECTION),
      where('supplierId', '==', supplierId),
      orderBy('requestedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as DisplayRequest[];
  } catch (error) {
    console.error('Error fetching supplier display requests:', error);
    throw new Error('Failed to fetch supplier display requests');
  }
};

export const getPendingDisplayRequests = async (): Promise<DisplayRequest[]> => {
  try {
    const q = query(
      collection(db, DISPLAY_REQUESTS_COLLECTION),
      where('status', '==', 'pending'),
      orderBy('requestedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as DisplayRequest[];
  } catch (error) {
    console.error('Error fetching pending display requests:', error);
    throw new Error('Failed to fetch pending display requests');
  }
};

export const reviewDisplayRequest = async (
  requestId: string,
  status: 'accepted' | 'rejected',
  reviewerId: string,
  reviewerName: string,
  rejectionReason?: string
): Promise<string | null> => {
  try {
    const batch = writeBatch(db);
    
    // Update display request
    const displayRequestRef = doc(db, DISPLAY_REQUESTS_COLLECTION, requestId);
    batch.update(displayRequestRef, {
      status,
      reviewedAt: serverTimestamp(),
      reviewedBy: reviewerId,
      reviewerName,
      rejectionReason: rejectionReason || null,
      updatedAt: serverTimestamp()
    });
    
    let quantityRequestId = null;
    
    // If accepted, create quantity request
    if (status === 'accepted') {
      const displayRequest = await getDoc(displayRequestRef);
      if (displayRequest.exists()) {
        const data = displayRequest.data() as DisplayRequest;
        
        const quantityRequestRef = doc(collection(db, QUANTITY_REQUESTS_COLLECTION));
        batch.set(quantityRequestRef, {
          displayRequestId: requestId,
          productId: data.productId,
          productName: data.productName,
          supplierId: data.supplierId,
          supplierName: data.supplierName,
          supplierEmail: data.supplierEmail,
          requestedBy: reviewerId,
          requesterName: reviewerName,
          requestedQuantity: 1, // Default quantity for display requests
          status: 'pending',
          requestedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        // Link quantity request to display request
        batch.update(displayRequestRef, {
          quantityRequestId: quantityRequestRef.id
        });
        
        quantityRequestId = quantityRequestRef.id;
      }
    }
    
    await batch.commit();
    return quantityRequestId;
  } catch (error) {
    console.error('Error reviewing display request:', error);
    throw new Error('Failed to review display request');
  }
};

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
      console.log('Processing approved quantity request for inventory creation:', {
        requestId,
        status: response.status,
        approvedQuantity: response.approvedQuantity
      });
      
      const quantityRequest = await getDoc(quantityRequestRef);
      if (quantityRequest.exists()) {
        const qrData = quantityRequest.data() as QuantityRequest;
        console.log('Quantity request data:', qrData);
        
        let inventoryData: CreateInventoryItem;
        
        if (qrData.displayRequestId && typeof qrData.displayRequestId === 'string') {
          // Get display request data for product details
          const displayRequestRef = doc(db, DISPLAY_REQUESTS_COLLECTION, qrData.displayRequestId);
          const displayRequest = await getDoc(displayRequestRef);
          
          if (displayRequest.exists()) {
            const drData = displayRequest.data() as DisplayRequest;
            
            inventoryData = {
              name: drData.productName,
              description: drData.productDescription || '',
              sku: drData.productSku || '',
              category: 'Supplier Product', // Default category
              quantity: response.approvedQuantity,
              minStockLevel: Math.max(1, Math.floor(response.approvedQuantity * 0.1)), // 10% of initial stock
              maxStockLevel: response.approvedQuantity * 2, // 200% of initial stock
              unitPrice: drData.productPrice,
              supplierId: drData.supplierId,
              supplierName: drData.supplierName,
              ...(drData.productImageUrl && { imageUrl: drData.productImageUrl }),
              location: 'Main Warehouse', // Default location
              isPublished: false // Default to unpublished, requires manual curation
            };
          } else {
            throw new Error('Display request not found');
          }
        } else {
          // Direct quantity request - use quantity request data
          inventoryData = {
            name: qrData.productName,
            description: '', // No description available for direct requests
            sku: qrData.productId, // Use productId as SKU
            category: 'Supplier Product', // Default category
            quantity: response.approvedQuantity,
            minStockLevel: Math.max(1, Math.floor(response.approvedQuantity * 0.1)), // 10% of initial stock
            maxStockLevel: response.approvedQuantity * 2, // 200% of initial stock
            unitPrice: 0, // Price not available for direct requests
            supplierId: qrData.supplierId,
            supplierName: qrData.supplierName,
            location: 'Main Warehouse', // Default location
            isPublished: false // Default to unpublished, requires manual curation
          };
        }
        
        // Check if an inventory item already exists for this product and supplier
        const existingItem = await findExistingInventoryItem(
          inventoryData.name,
          inventoryData.supplierId!,
          inventoryData.sku
        );
        
        console.log('Checking for existing inventory item:', {
          productName: inventoryData.name,
          supplierId: inventoryData.supplierId,
          sku: inventoryData.sku
        });
        
        if (existingItem) {
          // Add stock to existing item instead of creating a new one
          console.log('Found existing inventory item, adding stock:', existingItem.id);
          await addStockToExistingItem(
            existingItem.id,
            response.approvedQuantity,
            userId,
            `Stock replenishment from approved quantity request (Request ID: ${requestId})`
          );
          console.log('Successfully added stock to existing inventory item:', existingItem.id);
        } else {
          // Create new inventory item if none exists
          console.log('No existing item found. Creating new inventory item with data:', inventoryData);
          console.log('User ID for inventory creation:', userId);
          try {
            const inventoryItemId = await createInventoryItem(inventoryData, userId);
            console.log('Successfully created inventory item with ID:', inventoryItemId);
          } catch (error) {
            console.error('Error creating inventory item:', error);
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

// Helper function to get display request by ID
export const getDisplayRequest = async (requestId: string): Promise<DisplayRequest | null> => {
  try {
    const docRef = doc(db, DISPLAY_REQUESTS_COLLECTION, requestId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as DisplayRequest;
    }
    return null;
  } catch (error) {
    console.error('Error fetching display request:', error);
    throw new Error('Failed to fetch display request');
  }
};

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
    
    // Create notification for supplier
    try {
      await addDoc(collection(db, 'notifications'), {
        title: 'New Quantity Request',
        message: `Admin has requested ${requestData.requestedQuantity} units of ${requestData.productName}`,
        type: 'info',
        userId: requestData.supplierEmail,
        supplierId: requestData.supplierId,
        read: false,
        actionUrl: '/dashboard',
        createdAt: serverTimestamp(),
        metadata: {
          requestId: docRef.id,
          productName: requestData.productName,
          requestedQuantity: requestData.requestedQuantity
        }
      });
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
      // Don't fail the main request if notification fails
    }
    
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

// Delete display request (only allowed for pending requests)
export const deleteDisplayRequest = async (requestId: string, supplierId: string): Promise<void> => {
  try {
    // First verify the request belongs to the supplier and is pending
    const displayRequest = await getDisplayRequest(requestId);
    
    if (!displayRequest) {
      throw new Error('Display request not found');
    }
    
    if (displayRequest.supplierId !== supplierId) {
      throw new Error('Unauthorized: You can only delete your own requests');
    }
    
    if (displayRequest.status !== 'pending') {
      throw new Error('Cannot delete request that has already been reviewed');
    }
    
    // Delete the display request
    const docRef = doc(db, DISPLAY_REQUESTS_COLLECTION, requestId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting display request:', error);
    throw new Error('Failed to delete display request');
  }
};

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