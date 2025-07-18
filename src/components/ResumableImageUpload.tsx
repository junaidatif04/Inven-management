import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { 
  Camera, 
  Upload, 
  X, 
  Image as ImageIcon, 
  Pause, 
  Play, 
  Trash2, 
  Wifi, 
  WifiOff,
  RefreshCw,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useResumableUpload } from '@/hooks/useResumableUpload';
import { ResumableUploadResult } from '@/services/resumableUploadService';

interface ResumableImageUploadProps {
  currentImageUrl?: string;
  folder: string;
  fileName?: string;
  size?: 'sm' | 'md' | 'lg';
  showUploadButton?: boolean;
  onImageUpdate?: (newImageUrl: string) => void;
  title?: string;
  description?: string;
}

export default function ResumableImageUpload({
  currentImageUrl,
  folder,
  fileName,
  size = 'md',
  showUploadButton = true,
  onImageUpdate,
  title = 'Upload Image',
  description = 'Select an image to upload with resumable functionality'
}: ResumableImageUploadProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentUploadId, setCurrentUploadId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    upload,
    pause,
    resume,
    cancel,
    getProgress,
    pendingUploads,
    isUploading,
    resumeAllPending,
    cleanupCompleted
  } = useResumableUpload({
    folder,
    fileName,
    showToasts: true,
    onSuccess: handleUploadSuccess,
    onError: handleUploadError
  });

  const sizeClasses = {
    sm: 'h-16 w-16',
    md: 'h-24 w-24',
    lg: 'h-32 w-32'
  };

  // Monitor online/offline status
  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  function handleUploadSuccess(result: ResumableUploadResult) {
    onImageUpdate?.(result.url);
    setIsDialogOpen(false);
    setPreviewUrl(null);
    setSelectedFile(null);
    setCurrentUploadId(null);
    toast.success('Image uploaded successfully!');
  }

  function handleUploadError(error: Error) {
    toast.error(`Upload failed: ${error.message}`);
  }

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      const uploadId = await upload(selectedFile);
      setCurrentUploadId(uploadId);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const handlePause = () => {
    if (currentUploadId) {
      pause(currentUploadId);
    }
  };

  const handleResume = () => {
    if (currentUploadId) {
      resume(currentUploadId);
    }
  };

  const handleCancel = () => {
    if (currentUploadId) {
      cancel(currentUploadId);
      setCurrentUploadId(null);
      setPreviewUrl(null);
      setSelectedFile(null);
    }
  };

  const getCurrentProgress = () => {
    if (!currentUploadId) return null;
    return getProgress(currentUploadId);
  };

  const currentProgress = getCurrentProgress();

  return (
    <div className="space-y-4">
      {/* Current Image Display */}
      <div className="flex items-center space-x-4">
        <div className={`${sizeClasses[size]} rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50`}>
          {currentImageUrl ? (
            <img
              src={currentImageUrl}
              alt="Current image"
              className="w-full h-full object-cover"
            />
          ) : (
            <ImageIcon className="h-8 w-8 text-gray-400" />
          )}
        </div>
        
        {showUploadButton && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Camera className="h-4 w-4 mr-2" />
                {currentImageUrl ? 'Change Image' : 'Upload Image'}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {title}
                  {isOnline ? (
                    <Wifi className="h-4 w-4 text-green-500" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-red-500" />
                  )}
                </DialogTitle>
                <DialogDescription>
                  {description}
                  {!isOnline && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
                      You're offline. Uploads will resume automatically when connection is restored.
                    </div>
                  )}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* File Selection */}
                <div className="space-y-2">
                  <Label htmlFor="file-upload">Select Image</Label>
                  <div className="flex items-center space-x-2">
                    <input
                      ref={fileInputRef}
                      id="file-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Choose File
                    </Button>
                    {selectedFile && (
                      <span className="text-sm text-gray-600">
                        {selectedFile.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Preview */}
                {previewUrl && (
                  <div className="space-y-2">
                    <Label>Preview</Label>
                    <div className="w-full h-48 border rounded-lg overflow-hidden bg-gray-50">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                )}

                {/* Upload Progress */}
                {currentProgress && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center justify-between">
                        Upload Progress
                        <Badge variant={currentProgress.state === 'running' ? 'default' : 
                                     currentProgress.state === 'paused' ? 'secondary' :
                                     currentProgress.state === 'success' ? 'default' : 'destructive'}>
                          {currentProgress.state}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Progress value={currentProgress.percentage} className="w-full" />
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>{Math.round(currentProgress.percentage)}%</span>
                        <span>
                          {Math.round(currentProgress.bytesTransferred / 1024)} KB / {Math.round(currentProgress.totalBytes / 1024)} KB
                        </span>
                      </div>
                      
                      {/* Upload Controls */}
                      <div className="flex space-x-2">
                        {currentProgress.state === 'running' && (
                          <Button size="sm" variant="outline" onClick={handlePause}>
                            <Pause className="h-4 w-4 mr-1" />
                            Pause
                          </Button>
                        )}
                        {currentProgress.state === 'paused' && (
                          <Button size="sm" variant="outline" onClick={handleResume}>
                            <Play className="h-4 w-4 mr-1" />
                            Resume
                          </Button>
                        )}
                        <Button size="sm" variant="destructive" onClick={handleCancel}>
                          <Trash2 className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Upload Button */}
                {selectedFile && !currentProgress && (
                  <Button
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Start Upload
                  </Button>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Pending Uploads Panel */}
      {pendingUploads.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              Pending Uploads ({pendingUploads.length})
              <div className="flex space-x-2">
                <Button size="sm" variant="outline" onClick={resumeAllPending}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Resume All
                </Button>
                <Button size="sm" variant="outline" onClick={cleanupCompleted}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Cleanup
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingUploads.map((session) => {
                const progress = getProgress(session.uploadId);
                return (
                  <div key={session.uploadId} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center space-x-2">
                      {session.state === 'error' ? (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      ) : session.state === 'success' ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Pause className="h-4 w-4 text-yellow-500" />
                      )}
                      <span className="text-sm font-medium">{session.fileName}</span>
                      <Badge variant="secondary" className="text-xs">
                        {session.state}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      {progress && (
                        <span className="text-xs text-gray-500">
                          {Math.round(progress.percentage)}%
                        </span>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resume(session.uploadId)}
                        disabled={session.state === 'running'}
                      >
                        <Play className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => cancel(session.uploadId)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}