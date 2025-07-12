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
  displayName?: string;
  isEmailVerified?: boolean;
  createdAt?: any;
  lastLoginAt?: any;
}



export const signInWithGoogle = (): Promise<User> => {
  return signInWithPopup(auth, googleProvider)
    .then(result => {
      const firebaseUser = result.user;
      
      // Check if user exists in Firestore
      return getDoc(doc(db, 'users', firebaseUser.uid))
        .then(userDoc => {
          let userData: User;
          
          if (userDoc.exists()) {
            // User exists, update last login
            userData = userDoc.data() as User;
            return setDoc(doc(db, 'users', firebaseUser.uid), {
              ...userData,
              lastLoginAt: serverTimestamp()
            }, { merge: true })
              .then(() => userData);
          } else {
            // Check if email is already registered with a different account
            return checkEmailExists(firebaseUser.email!)
              .then(emailExists => {
                if (emailExists) {
                  throw new Error('ALREADY_SIGNED_UP');
                }
                
                // Check if user has an approved role through request system
                return getUserApprovedData(firebaseUser.email!)
                  .then(approvalResult => {
                    // Create user profile with either approved role or default 'internal_user' role
                    userData = {
                      id: firebaseUser.uid,
                      email: firebaseUser.email || '',
                      name: approvalResult.isApproved ? 
                            (approvalResult.name || firebaseUser.displayName || firebaseUser.email!.split('@')[0]) : 
                            (firebaseUser.displayName || firebaseUser.email!.split('@')[0]),
                      role: approvalResult.isApproved ? approvalResult.role! : 'internal_user', // Use approved role or default to 'internal_user'
                      avatar: firebaseUser.photoURL || undefined,
                      createdAt: serverTimestamp(),
                      lastLoginAt: serverTimestamp()
                    };

                    return setDoc(doc(db, 'users', firebaseUser.uid), userData)
                      .then(() => userData);
                  });
              });
          }
        });
    })
    .catch(error => {
      console.error('Error signing in with Google:', error);
      throw error;
    });
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
  return onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
    if (firebaseUser) {
      // Use a non-async handler for the initial callback
      // This prevents the "message channel closed" error
      getDoc(doc(db, 'users', firebaseUser.uid))
        .then(userDoc => {
          if (userDoc.exists()) {
            callback(userDoc.data() as User);
          } else {
            callback(null);
          }
        })
        .catch(error => {
          console.error('Error in auth state change:', error);
          callback(null);
        });
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

// Helper function to check if email already exists in users collection
export const checkEmailExists = async (email: string): Promise<boolean> => {
  try {
    const q = query(
      collection(db, 'users'),
      where('email', '==', email)
    );
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking email existence:', error);
    return false;
  }
};

// Email/Password Authentication
export const signUpWithEmailAndPassword = async (
  email: string,
  password: string,
  name: string,
  role: UserRole = 'internal_user', // Default to 'internal_user' role for all users
  isVerified: boolean = false
): Promise<User | null> => {
  try {
    // Check if email is already registered
    const emailExists = await checkEmailExists(email);
    if (emailExists) {
      throw new Error('ALREADY_SIGNED_UP');
    }

    // Verify that the email has been verified before creating the account
    const emailVerified = await import('@/services/emailVerificationService').then(module => module.isEmailVerified(email));
    if (!emailVerified && !isVerified) {
      throw new Error('Email verification required. Please verify your email first.');
    }

    const result = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = result.user;

    // Use the provided role (default is now 'internal_user')
    // No need to check for approval since we're giving everyone internal access
    let finalRole = role;

    // Create user profile in Firestore
    const userProfile: User = {
      id: firebaseUser.uid,
      email: firebaseUser.email!,
      name: name,
      role: finalRole,
      isEmailVerified: true, // Mark as verified since we've already verified
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

export const signInWithEmailAndPasswordAuth = (
  email: string,
  password: string
): Promise<User | null> => {
  return signInWithEmailAndPassword(auth, email, password)
    .then(result => {
      const firebaseUser = result.user;

      // Get user profile from Firestore
      return getDoc(doc(db, 'users', firebaseUser.uid))
        .then(userDoc => {
          if (!userDoc.exists()) {
            throw new Error('User profile not found');
          }

          const userData = userDoc.data() as User;

          // Update last login
          return setDoc(doc(db, 'users', firebaseUser.uid), {
            lastLoginAt: serverTimestamp()
          }, { merge: true })
            .then(() => userData);
        });
    })
    .catch(error => {
      console.error('Error signing in with email/password:', error);
      throw error;
    });
};


