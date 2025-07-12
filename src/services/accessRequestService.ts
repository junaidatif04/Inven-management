import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  orderBy,

} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserRole } from './authService';

// Function to create system notification for access request status changes
const createAccessNotification = async (requestData: any, status: 'approved' | 'rejected') => {
  try {
    await addDoc(collection(db, 'notifications'), {
      title: `Access Request ${status === 'approved' ? 'Approved' : 'Rejected'}`,
      message: `Your request for ${requestData.requestedRole} access has been ${status}`,
      type: status === 'approved' ? 'success' : 'error',
      userId: requestData.email,
      read: false,
      createdAt: serverTimestamp(),
      actionUrl: status === 'approved' ? '/signup' : null
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

export interface AccessRequest {
  id?: string;
  name: string;
  email: string;
  requestedRole: UserRole;
  company?: string; // For suppliers
  department?: string; // For warehouse staff
  reason?: string; // Why they need access
  experience?: string; // Experience level with similar systems
  referral?: string; // How they heard about the system
  expectedUsage?: string; // How often they expect to use the system
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
  updatedAt?: any;
  approvedBy?: string; // Admin user ID who approved/rejected
  signupToken?: string; // One-time signup token
  tokenExpiry?: any; // Token expiration date
}

export const submitAccessRequest = async (request: Omit<AccessRequest, 'id' | 'status' | 'createdAt'>): Promise<string> => {
  try {
    // Filter out undefined values to avoid Firebase errors
    const cleanRequest = Object.fromEntries(
      Object.entries(request).filter(([_, value]) => value !== undefined)
    );

    const docRef = await addDoc(collection(db, 'accessRequests'), {
      ...cleanRequest,
      status: 'pending',
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error submitting access request:', error);
    throw error;
  }
};

export const getPendingAccessRequests = async (): Promise<AccessRequest[]> => {
  try {
    const q = query(
      collection(db, 'accessRequests'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as AccessRequest));
  } catch (error) {
    console.error('Error getting pending requests:', error);
    throw error;
  }
};

export const getAllAccessRequests = async (): Promise<AccessRequest[]> => {
  try {
    const q = query(
      collection(db, 'accessRequests'),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as AccessRequest));
  } catch (error) {
    console.error('Error getting all requests:', error);
    throw error;
  }
};

export const approveAccessRequest = async (
  requestId: string,
  adminUserId: string
): Promise<string> => {
  try {
    // Get the request data first for notification
    const requestDoc = await getDocs(query(
      collection(db, 'accessRequests'),
      where('__name__', '==', requestId)
    ));

    const requestData = requestDoc.docs[0]?.data();

    // Generate one-time signup token
    const signupToken = generateSignupToken();
    const tokenExpiry = new Date();
    tokenExpiry.setDate(tokenExpiry.getDate() + 7); // Token expires in 7 days

    await updateDoc(doc(db, 'accessRequests', requestId), {
      status: 'approved',
      approvedBy: adminUserId,
      updatedAt: serverTimestamp(),
      signupToken,
      tokenExpiry
    });

    // Create notification for the user
    if (requestData) {
      await createAccessNotification(requestData, 'approved');
    }

    return signupToken;
  } catch (error) {
    console.error('Error approving access request:', error);
    throw error;
  }
};

export const rejectAccessRequest = async (
  requestId: string,
  adminUserId: string,
  reason?: string
): Promise<void> => {
  try {
    // Get the request data first for notification
    const requestDoc = await getDocs(query(
      collection(db, 'accessRequests'),
      where('__name__', '==', requestId)
    ));

    const requestData = requestDoc.docs[0]?.data();

    await updateDoc(doc(db, 'accessRequests', requestId), {
      status: 'rejected',
      approvedBy: adminUserId,
      updatedAt: serverTimestamp(),
      rejectionReason: reason
    });

    // Create notification for the user
    if (requestData) {
      await createAccessNotification(requestData, 'rejected');
    }
  } catch (error) {
    console.error('Error rejecting access request:', error);
    throw error;
  }
};

export const getAccessRequestByToken = async (token: string): Promise<AccessRequest | null> => {
  try {
    const q = query(
      collection(db, 'accessRequests'),
      where('signupToken', '==', token),
      where('status', '==', 'approved')
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    const request = { id: doc.id, ...doc.data() } as AccessRequest;
    
    // Check if token is expired
    if (request.tokenExpiry && request.tokenExpiry.toDate() < new Date()) {
      return null;
    }

    return request;
  } catch (error) {
    console.error('Error getting request by token:', error);
    throw error;
  }
};

const generateSignupToken = (): string => {
  return Math.random().toString(36).substring(2) + 
         Math.random().toString(36).substring(2) + 
         Date.now().toString(36);
};
