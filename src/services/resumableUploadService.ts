import { ref, uploadBytesResumable, getDownloadURL, UploadTask } from 'firebase/storage';
import { storage } from '@/lib/firebase';

interface UploadOptions {
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
}

interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

// Enhanced image upload service with resumability
export const uploadImageWithResumability = async (
  file: File,
  uploadType: 'general' | 'product' | 'profile' | 'inventory',
  options: UploadOptions = {}
): Promise<UploadResult> => {
  try {
    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop();
    const fileName = `${uploadType}_${timestamp}_${randomString}.${fileExtension}`;
    
    // Create storage reference
    const storageRef = ref(storage, `images/${uploadType}/${fileName}`);
    
    // Create upload task
    const uploadTask = uploadBytesResumable(storageRef, file);
    
    return new Promise((resolve, reject) => {
      // Handle abort signal
      if (options.signal) {
        options.signal.addEventListener('abort', () => {
          uploadTask.cancel();
          reject(new Error('Upload aborted'));
        });
      }
      
      // Monitor upload progress
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          options.onProgress?.(progress);
        },
        (error) => {
          console.error('Upload error:', error);
          resolve({
            success: false,
            error: error.message || 'Upload failed'
          });
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({
              success: true,
              url: downloadURL
            });
          } catch (error: any) {
            resolve({
              success: false,
              error: error.message || 'Failed to get download URL'
            });
          }
        }
      );
    });
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Upload initialization failed'
    };
  }
};

// Utility function to check if resumable upload is supported
export const isResumableUploadSupported = (): boolean => {
  return typeof window !== 'undefined' && 'AbortController' in window;
};

// Utility function to get upload progress from storage task
export const getUploadProgress = (uploadTask: UploadTask): number => {
  const snapshot = uploadTask.snapshot;
  return (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
};

// Utility function to pause/resume upload
export const pauseUpload = (uploadTask: UploadTask): boolean => {
  try {
    return uploadTask.pause();
  } catch (error) {
    console.error('Failed to pause upload:', error);
    return false;
  }
};

export const resumeUpload = (uploadTask: UploadTask): boolean => {
  try {
    return uploadTask.resume();
  } catch (error) {
    console.error('Failed to resume upload:', error);
    return false;
  }
};

export const cancelUpload = (uploadTask: UploadTask): boolean => {
  try {
    return uploadTask.cancel();
  } catch (error) {
    console.error('Failed to cancel upload:', error);
    return false;
  }
};

// Enhanced upload with retry mechanism
export const uploadWithRetry = async (
  file: File,
  uploadType: 'general' | 'product' | 'profile' | 'inventory',
  options: UploadOptions & { maxRetries?: number } = {}
): Promise<UploadResult> => {
  const maxRetries = options.maxRetries || 3;
  let lastError: string = '';
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await uploadImageWithResumability(file, uploadType, options);
      
      if (result.success) {
        return result;
      }
      
      lastError = result.error || 'Unknown error';
      
      // Don't retry if it was aborted
      if (lastError.includes('aborted')) {
        return result;
      }
      
      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    } catch (error: any) {
      lastError = error.message || 'Upload failed';
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }
  
  return {
    success: false,
    error: `Upload failed after ${maxRetries} attempts: ${lastError}`
  };
};

// Batch upload with progress tracking
export const uploadMultipleImages = async (
  files: File[],
  uploadType: 'general' | 'product' | 'profile' | 'inventory',
  options: UploadOptions & { 
    onFileProgress?: (fileIndex: number, progress: number) => void;
    onFileComplete?: (fileIndex: number, result: UploadResult) => void;
  } = {}
): Promise<UploadResult[]> => {
  const results: UploadResult[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    try {
      const result = await uploadImageWithResumability(file, uploadType, {
        ...options,
        onProgress: (progress) => {
          options.onFileProgress?.(i, progress);
        }
      });
      
      results.push(result);
      options.onFileComplete?.(i, result);
    } catch (error: any) {
      const errorResult: UploadResult = {
        success: false,
        error: error.message || 'Upload failed'
      };
      results.push(errorResult);
      options.onFileComplete?.(i, errorResult);
    }
  }
  
  return results;
};