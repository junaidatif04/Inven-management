import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/lib/firebase';

export interface ImageUploadResult {
  url: string;
  path: string;
}

/**
 * Upload an image file to Firebase Storage
 * @param file - The image file to upload
 * @param folder - The folder path in storage (e.g., 'profile-pictures')
 * @param fileName - Optional custom filename, if not provided uses file.name
 * @returns Promise with the download URL and storage path
 */
export const uploadImage = async (
  file: File,
  folder: string,
  fileName?: string
): Promise<ImageUploadResult> => {
  try {
    console.log('Starting image upload...', { fileName: file.name, size: file.size, type: file.type });
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      throw new Error('Image size must be less than 5MB');
    }

    // Generate unique filename if not provided
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const finalFileName = fileName || `${timestamp}.${fileExtension}`;
    
    console.log('Creating storage reference:', `${folder}/${finalFileName}`);
    
    // Create storage reference
    const storageRef = ref(storage, `${folder}/${finalFileName}`);
    
    console.log('Uploading file to Firebase Storage...');
    
    // Upload file
    const snapshot = await uploadBytes(storageRef, file);
    
    console.log('File uploaded successfully, getting download URL...');
    
    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    console.log('Upload completed successfully:', downloadURL);
    
    return {
      url: downloadURL,
      path: snapshot.ref.fullPath
    };
  } catch (error) {
    console.error('Error uploading image:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      const firebaseError = error as any; // Firebase errors have additional properties
      if (error.message.includes('storage/unauthorized') || firebaseError.code === 'storage/unauthorized') {
        throw new Error('Upload failed: Firebase Storage not properly configured. Please contact support.');
      } else if (error.message.includes('storage/unknown') || firebaseError.code === 'storage/unknown') {
        throw new Error('Upload failed: Firebase Storage service unavailable. Please try again later.');
      } else if (firebaseError.code === 'storage/invalid-argument') {
        throw new Error('Upload failed: Invalid file or storage configuration.');
      }
    }
    
    throw error;
  }
};

/**
 * Upload a profile picture for a user
 * @param file - The image file to upload
 * @param userId - The user's ID
 * @returns Promise with the download URL and storage path
 */
export const uploadProfilePicture = async (
  file: File,
  userId: string
): Promise<ImageUploadResult> => {
  const fileName = `${userId}_profile.${file.name.split('.').pop()}`;
  return uploadImage(file, 'profile-pictures', fileName);
};

/**
 * Delete an image from Firebase Storage
 * @param imagePath - The full path of the image in storage
 */
export const deleteImage = async (imagePath: string): Promise<void> => {
  try {
    const imageRef = ref(storage, imagePath);
    await deleteObject(imageRef);
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
};

/**
 * Resize and compress image before upload (client-side)
 * @param file - The original image file
 * @param maxWidth - Maximum width in pixels
 * @param maxHeight - Maximum height in pixels
 * @param quality - JPEG quality (0-1)
 * @returns Promise with the compressed file
 */
export const compressImage = async (
  file: File,
  maxWidth: number = 400,
  maxHeight: number = 400,
  quality: number = 0.8
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }
      
      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/jpeg',
        quality
      );
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Upload profile picture with compression
 * @param file - The image file to upload
 * @param userId - The user's ID
 * @returns Promise with the download URL and storage path
 */
export const uploadCompressedProfilePicture = async (
  file: File,
  userId: string
): Promise<ImageUploadResult> => {
  try {
    // Validate userId
    if (!userId || userId.trim() === '') {
      throw new Error('User ID is required for profile picture upload');
    }
    
    // Compress the image first
    const compressedFile = await compressImage(file);
    
    // Upload the compressed image
    return await uploadProfilePicture(compressedFile, userId);
  } catch (error) {
    console.error('Error uploading compressed profile picture:', error);
    throw error;
  }
};