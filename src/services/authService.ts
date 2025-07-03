import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  User as FirebaseUser
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  query,
  collection,
  where,
  getDocs
} from 'firebase/firestore';
import { auth, googleProvider, db } from '@/lib/firebase';

export type UserRole = 'admin' | 'warehouse_staff' | 'supplier' | 'internal_user';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  createdAt?: any;
  lastLoginAt?: any;
}



export const signInWithGoogle = async (): Promise<User | null> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const firebaseUser = result.user;
    
    // Check if user exists in Firestore
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    
    let userData: User;
    
    if (userDoc.exists()) {
      // User exists, update last login
      userData = userDoc.data() as User;
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        ...userData,
        lastLoginAt: serverTimestamp()
      }, { merge: true });
    } else {
      // New user - check if they were approved through request system
      const approvalResult = await getUserApprovedData(firebaseUser.email!);

      if (!approvalResult.isApproved) {
        // User not approved - sign them out and throw error
        await auth.signOut();
        throw new Error('UNAUTHORIZED_ACCESS');
      }

      // Approved user - create profile with their approved role and name
      userData = {
        id: firebaseUser.uid,
        email: firebaseUser.email || '',
        name: approvalResult.name || firebaseUser.displayName || firebaseUser.email!.split('@')[0],
        role: approvalResult.role!, // Use the role they were approved for
        avatar: firebaseUser.photoURL || undefined,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp()
      };

      await setDoc(doc(db, 'users', firebaseUser.uid), userData);
    }
    
    return userData;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

export const signOut = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

export const getCurrentUser = async (): Promise<User | null> => {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) return null;
  
  try {
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    if (userDoc.exists()) {
      return userDoc.data() as User;
    }
    return null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
    if (firebaseUser) {
      try {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          callback(userDoc.data() as User);
        } else {
          callback(null);
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
        callback(null);
      }
    } else {
      callback(null);
    }
  });
};

export const updateUserRole = async (userId: string, role: UserRole): Promise<void> => {
  try {
    await setDoc(doc(db, 'users', userId), {
      role,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
};

// Check if user was approved and get their approved role and name
export const getUserApprovedData = async (email: string): Promise<{ isApproved: boolean; role?: UserRole; name?: string }> => {
  try {
    // Special case: Allow the first admin user (you can change this email)
    const ADMIN_EMAIL = 'junaidatif40@gmail.com'; // Your admin email
    if (email === ADMIN_EMAIL) {
      return { isApproved: true, role: 'admin', name: 'Admin' };
    }

    // Check if there's an approved access request for this email
    const q = query(
      collection(db, 'accessRequests'),
      where('email', '==', email),
      where('status', '==', 'approved')
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      // Get the most recent approved request
      const approvedRequest = querySnapshot.docs[0].data();
      return {
        isApproved: true,
        role: approvedRequest.requestedRole as UserRole,
        name: approvedRequest.name // Use the name from the access request
      };
    }

    return { isApproved: false };
  } catch (error) {
    console.error('Error checking user approval status:', error);
    return { isApproved: false };
  }
};

// Legacy function for backward compatibility
export const getUserApprovedRole = async (email: string): Promise<{ isApproved: boolean; role?: UserRole }> => {
  const result = await getUserApprovedData(email);
  return { isApproved: result.isApproved, role: result.role };
};

// Legacy function for backward compatibility
export const checkUserApprovalStatus = async (email: string): Promise<boolean> => {
  const result = await getUserApprovedRole(email);
  return result.isApproved;
};

// Email/Password Authentication
export const signUpWithEmailAndPassword = async (
  email: string,
  password: string,
  name: string,
  role: UserRole
): Promise<User | null> => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = result.user;

    // Create user profile in Firestore
    const userProfile: User = {
      id: firebaseUser.uid,
      email: firebaseUser.email!,
      name: name,
      role: role,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp()
    };

    await setDoc(doc(db, 'users', firebaseUser.uid), userProfile);

    return userProfile;
  } catch (error) {
    console.error('Error creating account with email/password:', error);
    throw error;
  }
};

export const signInWithEmailAndPasswordAuth = async (
  email: string,
  password: string
): Promise<User | null> => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = result.user;

    // Get user profile from Firestore
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

    if (!userDoc.exists()) {
      throw new Error('User profile not found');
    }

    const userData = userDoc.data() as User;

    // Update last login
    await setDoc(doc(db, 'users', firebaseUser.uid), {
      lastLoginAt: serverTimestamp()
    }, { merge: true });

    return userData;
  } catch (error) {
    console.error('Error signing in with email/password:', error);
    throw error;
  }
};


