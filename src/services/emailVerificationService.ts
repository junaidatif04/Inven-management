import { doc, setDoc, getDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { sendEmailViaWebService } from './emailService';

interface VerificationData {
  email: string;
  code: string;
  expiresAt: any; // Can be Timestamp, Date, or serialized timestamp object
  verified: boolean;
  seconds?: number;
  nanoseconds?: number;
}

// Generate a random 6-digit verification code
export const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Create and store a verification code for a user
export const createVerificationCode = async (email: string): Promise<string> => {
  try {
    // Generate a verification code
    const code = generateVerificationCode();
    
    // Set expiration time (24 hours from now)
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours in milliseconds
    
    console.log('Creating verification code for:', email);
    console.log('Code:', code);
    console.log('Current time:', now);
    console.log('Expires at (JS Date):', expiresAt);
    
    // Convert the JavaScript Date to a Firestore Timestamp
    const firestoreExpiresAt = new Timestamp(
      Math.floor(expiresAt.getTime() / 1000),
      0
    );
    
    console.log('Expires at (Firestore Timestamp):', firestoreExpiresAt);
    console.log('Timestamp seconds:', firestoreExpiresAt.seconds);
    console.log('Timestamp nanoseconds:', firestoreExpiresAt.nanoseconds);

    // Store the verification data in Firestore
    await setDoc(doc(db, 'emailVerifications', email), {
      email,
      code,
      expiresAt: firestoreExpiresAt,
      verified: false,
      createdAt: serverTimestamp()
    });
    
    return code;
  } catch (error) {
    console.error('Error creating verification code:', error);
    throw error;
  }
};

// Verify a code provided by the user
export const verifyCode = async (email: string, code: string): Promise<boolean> => {
  try {
    console.log('Verifying code for email:', email);
    const verificationDoc = await getDoc(doc(db, 'emailVerifications', email));
    
    if (!verificationDoc.exists()) {
      console.log('No verification record found for email:', email);
      return false; // No verification record found
    }

    const verificationData = verificationDoc.data() as VerificationData;
    console.log('Verification data:', verificationData);
    console.log('Provided code:', code);
    console.log('Stored code:', verificationData.code);
    console.log('Expiration:', verificationData.expiresAt);
    console.log('Current time:', new Date());
    
    // Check if the code matches what's stored
    const codeMatches = verificationData.code === code;
    if (!codeMatches) {
      console.log('Code does not match stored code');
      return false;
    }
    
    // If the code is already verified and matches, we can consider this a success
    // This handles the case where a user tries to verify the same code multiple times
    if (verificationData.verified) {
      console.log('Code is already verified and matches the provided code');
      return true;
    }
    
    // Handle expiresAt which could be a Timestamp or Date
    let expirationDate: Date;
    if (verificationData.expiresAt instanceof Timestamp) {
      expirationDate = verificationData.expiresAt.toDate();
    } else if (verificationData.expiresAt instanceof Date) {
      expirationDate = verificationData.expiresAt;
    } else if (typeof verificationData.expiresAt === 'object' && verificationData.expiresAt !== null && 'seconds' in verificationData.expiresAt) {
      // Handle Firestore Timestamp object that might be serialized
      expirationDate = new Timestamp(
        (verificationData.expiresAt as any).seconds || 0,
        (verificationData.expiresAt as any).nanoseconds || 0
      ).toDate();
    } else {
      console.error('Invalid expiresAt format:', verificationData.expiresAt);
      return false;
    }
    
    console.log('Expiration date after conversion:', expirationDate);
    
    // Check if the code is expired
    const notExpired = expirationDate > new Date();
    if (!notExpired) {
      console.log('Code is expired');
      return false;
    }
    
    console.log('Code matches and is not expired, marking as verified');
    
    // Mark as verified
    await setDoc(doc(db, 'emailVerifications', email), {
      verified: true,
      verifiedAt: serverTimestamp()
    }, { merge: true });

    return true;
  } catch (error) {
    console.error('Error verifying code:', error);
    return false;
  }
};

// Verify a code and create user account in one step
export const verifyCodeAndCreateUser = async (
  email: string, 
  code: string, 
  name: string, 
  password: string
): Promise<boolean> => {
  try {
    console.log('Starting verification and user creation process');
    console.log('Email:', email);
    console.log('Code:', code);
    console.log('Name:', name);
    
    // First check if the verification code is valid
    const isCodeValid = await verifyCode(email, code);
    console.log('Is code valid:', isCodeValid);
    
    if (!isCodeValid) {
      // Check if the code was already verified
      const verificationDoc = await getDoc(doc(db, 'emailVerifications', email));
      if (verificationDoc.exists() && verificationDoc.data().verified) {
        // The code was already verified, so check if the user account exists
        try {
          // Import auth service dynamically to avoid circular dependency
          const authService = await import('./authService');
          
          // Try to sign in with the provided credentials to see if the account exists
          await authService.signInWithEmailAndPasswordAuth(email, password);
          
          // If we get here, the account exists and the credentials are correct
          console.log('User account already exists and credentials are valid');
          return true;
        } catch (authError: any) {
          // If the error is 'auth/user-not-found', the account doesn't exist yet
          if (authError.code === 'auth/user-not-found') {
            console.log('Code was verified but account not created yet, creating now');
            
            // Create the account now
            const authService = await import('./authService');
            await authService.signUpWithEmailAndPassword(
              email,
              password,
              name,
              'internal_user',
              true
            );
            
            // Clean up verification record after successful user creation
            await deleteVerificationRecord(email);
            
            console.log('User account created successfully');
            return true;
          } else if (authError.code === 'auth/wrong-password') {
            // Account exists but password is wrong
            console.error('Account exists but password is incorrect');
            throw new Error('An account with this email already exists. Please use the correct password or reset it.');
          } else if (authError.code === 'auth/email-already-in-use') {
            // Account exists
            console.error('Account already exists');
            throw new Error('An account with this email already exists. Please log in or reset your password.');
          } else {
            // Some other auth error
            console.error('Authentication error:', authError);
            throw new Error('Authentication error: ' + authError.message);
          }
        }
      } else {
        // Code is invalid and not previously verified
        console.error('Verification failed: Invalid or expired code');
        throw new Error('Invalid or expired verification code');
      }
    }
    
    console.log('Code verified successfully, creating user account');
    
    // Import auth service dynamically to avoid circular dependency
    const authService = await import('./authService');
    
    try {
      // Create user account with verified email
      await authService.signUpWithEmailAndPassword(
        email,
        password,
        name,
        'internal_user', // Default role for all users
        true // Mark as verified
      );
      
      // Clean up verification record after successful user creation
      await deleteVerificationRecord(email);
      
      console.log('User account created successfully');
      return true;
    } catch (createError: any) {
      if (createError.code === 'auth/email-already-in-use') {
        console.error('Email already in use');
        throw new Error('An account with this email already exists. Please log in or reset your password.');
      }
      throw createError;
    }
  } catch (error) {
    console.error('Error verifying code and creating user:', error);
    throw error;
  }
};

// Delete verification record after successful user creation
export const deleteVerificationRecord = async (email: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'emailVerifications', email));
    console.log('Verification record deleted for email:', email);
  } catch (error) {
    console.error('Error deleting verification record:', error);
    // Don't throw error as this is cleanup - user creation was successful
  }
};

// Check if an email is verified
export const isEmailVerified = async (email: string): Promise<boolean> => {
  try {
    const verificationDoc = await getDoc(doc(db, 'emailVerifications', email));
    
    if (!verificationDoc.exists()) {
      return false;
    }

    return verificationDoc.data().verified === true;
  } catch (error) {
    console.error('Error checking verification status:', error);
    return false;
  }
};

// Send verification email
export const sendVerificationEmail = async (email: string, name: string): Promise<void> => {
  try {
    // Generate a new verification code
    const code = await createVerificationCode(email);
    
    const emailContent = `
Dear ${name},

Thank you for registering with our Inventory Management System.

Your email verification code is: ${code}

This code will expire in 24 hours.

Please enter this code on the verification page to complete your registration.

If you did not request this verification, please ignore this email.

Best regards,
Inventory Management Team
    `;

    await sendEmailViaWebService({
      to_email: email,
      to_name: name,
      from_name: 'Inventory Management System',
      subject: 'Email Verification Code',
      message: emailContent,
      verification_code: code
    });
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
};