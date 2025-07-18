import { useState, useEffect, useCallback, useRef } from 'react';
import resumableUploadService, { UploadProgress, ResumableUploadResult, UploadSession } from '@/services/resumableUploadService';
import { toast } from 'sonner';

export interface UseResumableUploadOptions {
  folder: string;
  fileName?: string;
  autoRetry?: boolean;
  showToasts?: boolean;
  onSuccess?: (result: ResumableUploadResult) => void;
  onError?: (error: Error) => void;
}

export interface UseResumableUploadReturn {
  upload: (file: File) => Promise<string>;
  pause: (uploadId: string) => boolean;
  resume: (uploadId: string) => boolean;
  cancel: (uploadId: string) => boolean;
  getProgress: (uploadId: string) => UploadProgress | null;
  activeUploads: Map<string, UploadProgress>;
  pendingUploads: UploadSession[];
  isUploading: boolean;
  resumeAllPending: () => void;
  cleanupCompleted: () => void;
}

export const useResumableUpload = (options: UseResumableUploadOptions): UseResumableUploadReturn => {
  const [activeUploads, setActiveUploads] = useState<Map<string, UploadProgress>>(new Map());
  const [pendingUploads, setPendingUploads] = useState<UploadSession[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const progressCallbacksRef = useRef<Map<string, (progress: UploadProgress) => void>>(new Map());

  const {
    folder,
    fileName,
    autoRetry = true,
    showToasts = true,
    onSuccess,
    onError
  } = options;

  // Update pending uploads on mount and when needed
  const updatePendingUploads = useCallback(() => {
    const pending = resumableUploadService.getPendingUploads();
    setPendingUploads(pending);
  }, []);

  // Initialize pending uploads on mount
  useEffect(() => {
    updatePendingUploads();
  }, [updatePendingUploads]);

  // Check if any uploads are active
  useEffect(() => {
    const hasActiveUploads = Array.from(activeUploads.values())
      .some(progress => progress.state === 'running');
    setIsUploading(hasActiveUploads);
  }, [activeUploads]);

  // Create progress callback for an upload
  const createProgressCallback = useCallback((uploadId: string) => {
    return (progress: UploadProgress) => {
      setActiveUploads(prev => {
        const newMap = new Map(prev);
        newMap.set(uploadId, progress);
        return newMap;
      });

      // Show progress toast if enabled
      if (showToasts && progress.state === 'running') {
        const percentage = Math.round(progress.percentage);
        if (percentage % 10 === 0) { // Show toast every 10%
          toast.info(`Upload ${percentage}% complete`);
        }
      }
    };
  }, [showToasts]);

  // Create completion callback for an upload
  const createCompletionCallback = useCallback((uploadId: string) => {
    return (result: ResumableUploadResult) => {
      setActiveUploads(prev => {
        const newMap = new Map(prev);
        newMap.delete(uploadId);
        return newMap;
      });

      updatePendingUploads();

      if (showToasts) {
        toast.success('Upload completed successfully!');
      }

      onSuccess?.(result);
    };
  }, [showToasts, onSuccess, updatePendingUploads]);

  // Create error callback for an upload
  const createErrorCallback = useCallback((uploadId: string) => {
    return (error: Error) => {
      setActiveUploads(prev => {
        const newMap = new Map(prev);
        newMap.delete(uploadId);
        return newMap;
      });

      updatePendingUploads();

      if (showToasts) {
        toast.error(`Upload failed: ${error.message}`);
      }

      onError?.(error);
    };
  }, [showToasts, onError, updatePendingUploads]);

  // Start a new upload
  const upload = useCallback(async (file: File): Promise<string> => {
    try {
      const uploadId = await resumableUploadService.startUpload(
        file,
        folder,
        fileName,
        (progress) => createProgressCallback('temp')(progress),
        (url) => createCompletionCallback('temp')(url),
        (error) => createErrorCallback('temp')(error)
      );

      // Store the callbacks for potential resume operations
      progressCallbacksRef.current.set(uploadId, createProgressCallback(uploadId));

      if (showToasts) {
        toast.info('Upload started');
      }

      return uploadId;
    } catch (error) {
      if (showToasts) {
        toast.error(`Failed to start upload: ${(error as Error).message}`);
      }
      throw error;
    }
  }, [folder, fileName, createProgressCallback, createCompletionCallback, createErrorCallback, showToasts]);

  // Pause an upload
  const pause = useCallback((uploadId: string): boolean => {
    const success = resumableUploadService.pauseUpload(uploadId);
    if (success) {
      setActiveUploads(prev => {
        const newMap = new Map(prev);
        const current = newMap.get(uploadId);
        if (current) {
          newMap.set(uploadId, { ...current, state: 'paused' });
        }
        return newMap;
      });
      updatePendingUploads();
      
      if (showToasts) {
        toast.info('Upload paused');
      }
    }
    return success;
  }, [showToasts, updatePendingUploads]);

  // Resume an upload
  const resume = useCallback((uploadId: string): boolean => {
    const progressCallback = progressCallbacksRef.current.get(uploadId) || createProgressCallback(uploadId);
    const success = resumableUploadService.resumeUpload(
      uploadId,
      progressCallback,
      createCompletionCallback(uploadId),
      createErrorCallback(uploadId)
    );
    
    if (success) {
      updatePendingUploads();
      
      if (showToasts) {
        toast.info('Upload resumed');
      }
    }
    return success;
  }, [createProgressCallback, createCompletionCallback, createErrorCallback, showToasts, updatePendingUploads]);

  // Cancel an upload
  const cancel = useCallback((uploadId: string): boolean => {
    const success = resumableUploadService.cancelUpload(uploadId);
    if (success) {
      setActiveUploads(prev => {
        const newMap = new Map(prev);
        newMap.delete(uploadId);
        return newMap;
      });
      progressCallbacksRef.current.delete(uploadId);
      updatePendingUploads();
      
      if (showToasts) {
        toast.info('Upload canceled');
      }
    }
    return success;
  }, [showToasts, updatePendingUploads]);

  // Get progress for a specific upload
  const getProgress = useCallback((uploadId: string): UploadProgress | null => {
    return resumableUploadService.getUploadProgress(uploadId);
  }, []);

  // Resume all pending uploads
  const resumeAllPending = useCallback(() => {
    const pending = resumableUploadService.getPendingUploads();
    let resumedCount = 0;
    
    pending.forEach(session => {
      if (resume(session.uploadId)) {
        resumedCount++;
      }
    });
    
    if (showToasts && resumedCount > 0) {
      toast.info(`Resumed ${resumedCount} upload(s)`);
    }
  }, [resume, showToasts]);

  // Clean up completed uploads
  const cleanupCompleted = useCallback(() => {
    resumableUploadService.cleanupCompletedUploads();
    updatePendingUploads();
    
    if (showToasts) {
      toast.info('Cleaned up completed uploads');
    }
  }, [showToasts, updatePendingUploads]);

  // Auto-resume pending uploads when coming back online
  useEffect(() => {
    const handleOnline = () => {
      if (autoRetry) {
        setTimeout(() => {
          resumeAllPending();
        }, 1000); // Wait a second for connection to stabilize
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [autoRetry, resumeAllPending]);

  return {
    upload,
    pause,
    resume,
    cancel,
    getProgress,
    activeUploads,
    pendingUploads,
    isUploading,
    resumeAllPending,
    cleanupCompleted
  };
};

export default useResumableUpload;