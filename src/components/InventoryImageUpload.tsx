import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Camera, Upload, X, Image as ImageIcon } from 'lucide-react';
import { uploadInventoryImage, updateInventoryImage } from '@/services/inventoryService';
import ResumableImageUpload from './ResumableImageUpload';

interface InventoryImageUploadProps {
  currentImageUrl?: string;
  itemName: string;
  itemId?: string;
  size?: 'sm' | 'md' | 'lg';
  showUploadButton?: boolean;
  onImageUpdate?: (newImageUrl: string) => void;
  mode?: 'add' | 'update';
  useResumableUpload?: boolean;
  userId: string;
}

export default function InventoryImageUpload({
  currentImageUrl,
  itemName,
  itemId,
  size = 'md',
  showUploadButton = true,
  onImageUpdate,
  mode = 'add',
  useResumableUpload = false,
  userId
}: InventoryImageUploadProps) {
  
  // Use resumable upload component if enabled
  if (useResumableUpload) {
    return (
      <ResumableImageUpload
        currentImageUrl={currentImageUrl}
        uploadType="inventory"
        onImageUpdate={(newImageUrl: string) => {
          onImageUpdate?.(newImageUrl);
        }}
        className="max-w-md"
        maxSizeInMB={5}
      />
    );
  }

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      let result;
      
      if (mode === 'update' && itemId) {
        // Update existing inventory item image
        await updateInventoryImage(itemId, selectedFile, userId);
        // For update mode, we need to get the new URL from the service
        result = await uploadInventoryImage(selectedFile, itemId);
      } else {
        // Upload new inventory item image
        result = await uploadInventoryImage(selectedFile, itemId);
      }
      
      // Call callback if provided
      if (onImageUpdate) {
        onImageUpdate(result.url);
      }
      
      toast.success('Image uploaded successfully!');
      setIsDialogOpen(false);
      setSelectedFile(null);
      setPreviewUrl('');
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-16 h-16';
      case 'lg':
        return 'w-32 h-32';
      default:
        return 'w-24 h-24';
    }
  };

  const getButtonSize = () => {
    switch (size) {
      case 'sm':
        return 'sm';
      case 'lg':
        return 'default';
      default:
        return 'sm';
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <div className="relative group cursor-pointer">
          {currentImageUrl ? (
            <div className={`${getSizeClasses()} rounded-lg overflow-hidden border-2 border-slate-200 dark:border-slate-700 group-hover:border-blue-300 dark:group-hover:border-blue-600 transition-colors`}>
              <img
                src={currentImageUrl}
                alt={itemName}
                className="w-full h-full object-cover"
              />
              {showUploadButton && (
                <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="h-6 w-6 text-white" />
                </div>
              )}
            </div>
          ) : (
            <div className={`${getSizeClasses()} rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 group-hover:border-blue-300 dark:group-hover:border-blue-600 transition-colors flex items-center justify-center bg-slate-50 dark:bg-slate-800`}>
              <div className="text-center">
                <ImageIcon className="h-6 w-6 text-slate-400 mx-auto mb-1" />
                {showUploadButton && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">Add Image</p>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Inventory Image</DialogTitle>
          <DialogDescription>
            Upload an image for {itemName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="inventory-image">Select Image</Label>
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center">
              {previewUrl ? (
                <div className="space-y-4">
                  <div className="relative inline-block">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                      onClick={handleRemoveFile}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {selectedFile?.name}
                  </p>
                </div>
              ) : (
                <div>
                  <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                    Click to select an image
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size={getButtonSize()}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Choose File
                  </Button>
                </div>
              )}
              <input
                ref={fileInputRef}
                id="inventory-image"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
            >
              {isUploading ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}