import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, X, Pause, Play, RotateCcw, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { uploadImageWithResumability } from '@/services/imageUploadService';

interface ResumableImageUploadProps {
  onImageUpdate: (imageUrl: string) => void;
  currentImageUrl?: string;
  uploadType: 'general' | 'product' | 'profile' | 'inventory';
  className?: string;
  maxSizeInMB?: number;
}

interface UploadState {
  file: File | null;
  progress: number;
  status: 'idle' | 'uploading' | 'paused' | 'completed' | 'error';
  error?: string;
  uploadId?: string;
}

const ResumableImageUpload: React.FC<ResumableImageUploadProps> = ({
  onImageUpdate,
  currentImageUrl,
  uploadType,
  className = '',
  maxSizeInMB = 5
}) => {
  const [uploadState, setUploadState] = useState<UploadState>({
    file: null,
    progress: 0,
    status: 'idle'
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      toast.error(`File size must be less than ${maxSizeInMB}MB`);
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    setUploadState({
      file,
      progress: 0,
      status: 'idle'
    });
  }, [maxSizeInMB]);

  const startUpload = useCallback(async () => {
    if (!uploadState.file) return;

    try {
      setUploadState(prev => ({ ...prev, status: 'uploading', error: undefined }));
      
      // Create abort controller for this upload
      abortControllerRef.current = new AbortController();

      const result = await uploadImageWithResumability(
        uploadState.file,
        uploadType,
        {
          onProgress: (progress) => {
            setUploadState(prev => ({ ...prev, progress }));
          },
          signal: abortControllerRef.current.signal
        }
      );

      if (result.success && result.url) {
        setUploadState(prev => ({ ...prev, status: 'completed', progress: 100 }));
        onImageUpdate(result.url);
        toast.success('Image uploaded successfully!');
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setUploadState(prev => ({ ...prev, status: 'paused' }));
        toast.info('Upload paused');
      } else {
        setUploadState(prev => ({ 
          ...prev, 
          status: 'error', 
          error: error.message || 'Upload failed' 
        }));
        toast.error('Upload failed: ' + (error.message || 'Unknown error'));
      }
    }
  }, [uploadState.file, uploadType, onImageUpdate]);

  const pauseUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const resumeUpload = useCallback(() => {
    startUpload();
  }, [startUpload]);

  const resetUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setUploadState({
      file: null,
      progress: 0,
      status: 'idle'
    });
    setPreviewUrl(currentImageUrl || null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [currentImageUrl]);

  const getStatusColor = () => {
    switch (uploadState.status) {
      case 'completed': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'uploading': return 'bg-blue-500';
      case 'paused': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = () => {
    switch (uploadState.status) {
      case 'completed': return <Check className="w-4 h-4" />;
      case 'error': return <AlertCircle className="w-4 h-4" />;
      case 'uploading': return <Upload className="w-4 h-4" />;
      case 'paused': return <Pause className="w-4 h-4" />;
      default: return <Upload className="w-4 h-4" />;
    }
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* File Input */}
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id={`file-input-${uploadType}`}
            />
            <label htmlFor={`file-input-${uploadType}`}>
              <Button variant="outline" className="cursor-pointer" asChild>
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  Select Image
                </span>
              </Button>
            </label>
            {uploadState.file && (
              <Badge variant="secondary">
                {uploadState.file.name}
              </Badge>
            )}
          </div>

          {/* Preview */}
          {previewUrl && (
            <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-full object-cover"
              />
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => {
                  setPreviewUrl(null);
                  onImageUpdate('');
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Upload Controls */}
          {uploadState.file && uploadState.status !== 'completed' && (
            <div className="space-y-3">
              {/* Progress Bar */}
              {uploadState.status === 'uploading' && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Uploading...</span>
                    <span>{Math.round(uploadState.progress)}%</span>
                  </div>
                  <Progress value={uploadState.progress} className="w-full" />
                </div>
              )}

              {/* Status Badge */}
              <div className="flex items-center gap-2">
                <Badge className={`${getStatusColor()} text-white`}>
                  {getStatusIcon()}
                  <span className="ml-1 capitalize">{uploadState.status}</span>
                </Badge>
                {uploadState.error && (
                  <span className="text-sm text-red-600">{uploadState.error}</span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {uploadState.status === 'idle' && (
                  <Button onClick={startUpload} size="sm">
                    <Play className="w-4 h-4 mr-2" />
                    Start Upload
                  </Button>
                )}
                
                {uploadState.status === 'uploading' && (
                  <Button onClick={pauseUpload} variant="outline" size="sm">
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </Button>
                )}
                
                {uploadState.status === 'paused' && (
                  <Button onClick={resumeUpload} size="sm">
                    <Play className="w-4 h-4 mr-2" />
                    Resume
                  </Button>
                )}
                
                {(uploadState.status === 'error' || uploadState.status === 'paused') && (
                  <Button onClick={resetUpload} variant="outline" size="sm">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Success State */}
          {uploadState.status === 'completed' && (
            <div className="flex items-center justify-between">
              <Badge className="bg-green-500 text-white">
                <Check className="w-4 h-4 mr-1" />
                Upload Complete
              </Badge>
              <Button onClick={resetUpload} variant="outline" size="sm">
                Upload New Image
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ResumableImageUpload;