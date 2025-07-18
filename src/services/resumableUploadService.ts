import { ref, uploadBytesResumable, getDownloadURL, UploadTask } from 'firebase/storage';
import { storage } from '@/lib/firebase';

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  percentage: number;
  state: 'running' | 'paused' | 'success' | 'error' | 'canceled';
}

export interface ResumableUploadResult {
  url: string;
  path: string;
  uploadId: string;
}

export interface UploadSession {
  uploadId: string;
  file: File;
  folder: string;
  fileName: string;
  bytesTransferred: number;
  totalBytes: number;
  createdAt: number;
  lastUpdated: number;
  state: 'running' | 'paused' | 'success' | 'error' | 'canceled';
  storageRef: string;
}

class ResumableUploadService {
  private activeUploads: Map<string, UploadTask> = new Map();
  private uploadSessions: Map<string, UploadSession> = new Map();
  private readonly STORAGE_KEY = 'resumable_uploads';
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY = 2000; // 2 seconds

  constructor() {
    this.loadStoredSessions();
    this.setupNetworkListeners();
  }

  /**
   * Load stored upload sessions from localStorage
   */
  private loadStoredSessions(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const sessions: UploadSession[] = JSON.parse(stored);
        sessions.forEach(session => {
          // Only load sessions that are not completed or older than 24 hours
          const isRecent = Date.now() - session.createdAt < 24 * 60 * 60 * 1000;
          if (session.state !== 'success' && isRecent) {
            this.uploadSessions.set(session.uploadId, session);
          }
        });
      }
    } catch (error) {
      console.error('Error loading stored upload sessions:', error);
    }
  }

  /**
   * Save upload sessions to localStorage
   */
  private saveStoredSessions(): void {
    try {
      const sessions = Array.from(this.uploadSessions.values());
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
    } catch (error) {
      console.error('Error saving upload sessions:', error);
    }
  }

  /**
   * Setup network listeners for offline/online detection
   */
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      console.log('Network connection restored, resuming uploads...');
      this.resumeAllPausedUploads();
    });

    window.addEventListener('offline', () => {
      console.log('Network connection lost, pausing uploads...');
      this.pauseAllActiveUploads();
    });
  }

  /**
   * Generate a unique upload ID
   */
  private generateUploadId(): string {
    return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start a resumable upload
   */
  async startUpload(
    file: File,
    folder: string,
    fileName?: string,
    onProgress?: (progress: UploadProgress) => void,
    onComplete?: (result: ResumableUploadResult) => void,
    onError?: (error: Error) => void
  ): Promise<string> {
    const uploadId = this.generateUploadId();
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const finalFileName = fileName || `${timestamp}.${fileExtension}`;
    const storageRefPath = `${folder}/${finalFileName}`;

    // Validate file
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error('Image size must be less than 5MB');
    }

    // Create upload session
    const session: UploadSession = {
      uploadId,
      file,
      folder,
      fileName: finalFileName,
      bytesTransferred: 0,
      totalBytes: file.size,
      createdAt: timestamp,
      lastUpdated: timestamp,
      state: 'running',
      storageRef: storageRefPath
    };

    this.uploadSessions.set(uploadId, session);
    this.saveStoredSessions();

    // Start the upload
    await this.executeUpload(uploadId, onProgress, onComplete, onError);

    return uploadId;
  }

  /**
   * Execute the actual upload
   */
  private async executeUpload(
    uploadId: string,
    onProgress?: (progress: UploadProgress) => void,
    onComplete?: (result: ResumableUploadResult) => void,
    onError?: (error: Error) => void,
    retryCount: number = 0
  ): Promise<void> {
    const session = this.uploadSessions.get(uploadId);
    if (!session) {
      throw new Error('Upload session not found');
    }

    try {
      const storageRef = ref(storage, session.storageRef);
      const uploadTask = uploadBytesResumable(storageRef, session.file);
      
      this.activeUploads.set(uploadId, uploadTask);

      // Monitor upload progress
      uploadTask.on('state_changed',
        (snapshot) => {
          const progress: UploadProgress = {
            bytesTransferred: snapshot.bytesTransferred,
            totalBytes: snapshot.totalBytes,
            percentage: (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
            state: snapshot.state as any
          };

          // Update session
          session.bytesTransferred = snapshot.bytesTransferred;
          session.lastUpdated = Date.now();
          session.state = snapshot.state as any;
          this.saveStoredSessions();

          onProgress?.(progress);
        },
        (error) => {
          console.error('Upload error:', error);
          session.state = 'error';
          session.lastUpdated = Date.now();
          this.saveStoredSessions();
          this.activeUploads.delete(uploadId);

          // Retry logic
          if (retryCount < this.MAX_RETRY_ATTEMPTS) {
            console.log(`Retrying upload ${uploadId}, attempt ${retryCount + 1}`);
            setTimeout(() => {
              this.executeUpload(uploadId, onProgress, onComplete, onError, retryCount + 1);
            }, this.RETRY_DELAY * (retryCount + 1));
          } else {
            onError?.(new Error(`Upload failed after ${this.MAX_RETRY_ATTEMPTS} attempts: ${error.message}`));
          }
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            
            const result: ResumableUploadResult = {
              url: downloadURL,
              path: uploadTask.snapshot.ref.fullPath,
              uploadId
            };

            // Update session
            session.state = 'success';
            session.lastUpdated = Date.now();
            this.saveStoredSessions();
            this.activeUploads.delete(uploadId);

            onComplete?.(result);
          } catch (error) {
            console.error('Error getting download URL:', error);
            onError?.(error as Error);
          }
        }
      );
    } catch (error) {
      console.error('Error starting upload:', error);
      session.state = 'error';
      session.lastUpdated = Date.now();
      this.saveStoredSessions();
      onError?.(error as Error);
    }
  }

  /**
   * Pause an upload
   */
  pauseUpload(uploadId: string): boolean {
    const uploadTask = this.activeUploads.get(uploadId);
    const session = this.uploadSessions.get(uploadId);
    
    if (uploadTask && session) {
      uploadTask.pause();
      session.state = 'paused';
      session.lastUpdated = Date.now();
      this.saveStoredSessions();
      return true;
    }
    return false;
  }

  /**
   * Resume an upload
   */
  resumeUpload(
    uploadId: string,
    onProgress?: (progress: UploadProgress) => void,
    onComplete?: (result: ResumableUploadResult) => void,
    onError?: (error: Error) => void
  ): boolean {
    const uploadTask = this.activeUploads.get(uploadId);
    const session = this.uploadSessions.get(uploadId);
    
    if (uploadTask && session) {
      uploadTask.resume();
      session.state = 'running';
      session.lastUpdated = Date.now();
      this.saveStoredSessions();
      return true;
    } else if (session && session.state === 'paused') {
      // Restart the upload if task is not active
      this.executeUpload(uploadId, onProgress, onComplete, onError);
      return true;
    }
    return false;
  }

  /**
   * Cancel an upload
   */
  cancelUpload(uploadId: string): boolean {
    const uploadTask = this.activeUploads.get(uploadId);
    const session = this.uploadSessions.get(uploadId);
    
    if (uploadTask) {
      uploadTask.cancel();
      this.activeUploads.delete(uploadId);
    }
    
    if (session) {
      session.state = 'canceled';
      session.lastUpdated = Date.now();
      this.uploadSessions.delete(uploadId);
      this.saveStoredSessions();
      return true;
    }
    return false;
  }

  /**
   * Get upload progress
   */
  getUploadProgress(uploadId: string): UploadProgress | null {
    const session = this.uploadSessions.get(uploadId);
    if (!session) return null;

    return {
      bytesTransferred: session.bytesTransferred,
      totalBytes: session.totalBytes,
      percentage: (session.bytesTransferred / session.totalBytes) * 100,
      state: session.state
    };
  }

  /**
   * Get all pending uploads
   */
  getPendingUploads(): UploadSession[] {
    return Array.from(this.uploadSessions.values())
      .filter(session => session.state === 'paused' || session.state === 'error');
  }

  /**
   * Resume all paused uploads
   */
  private resumeAllPausedUploads(): void {
    const pausedUploads = Array.from(this.uploadSessions.values())
      .filter(session => session.state === 'paused');
    
    pausedUploads.forEach(session => {
      this.resumeUpload(session.uploadId);
    });
  }

  /**
   * Pause all active uploads
   */
  private pauseAllActiveUploads(): void {
    this.activeUploads.forEach((_, uploadId) => {
      this.pauseUpload(uploadId);
    });
  }

  /**
   * Clean up completed uploads from storage
   */
  cleanupCompletedUploads(): void {
    const completedUploads = Array.from(this.uploadSessions.entries())
      .filter(([_, session]) => session.state === 'success' || session.state === 'canceled');
    
    completedUploads.forEach(([uploadId]) => {
      this.uploadSessions.delete(uploadId);
    });
    
    this.saveStoredSessions();
  }

  /**
   * Get upload session info
   */
  getUploadSession(uploadId: string): UploadSession | null {
    return this.uploadSessions.get(uploadId) || null;
  }
}

// Export singleton instance
export const resumableUploadService = new ResumableUploadService();
export default resumableUploadService;