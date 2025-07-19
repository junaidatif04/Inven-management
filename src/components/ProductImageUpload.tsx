import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Camera, Upload, X, Image as ImageIcon } from 'lucide-react';
import { uploadProductImage, updateProductImage } from '@/services/productService';
import ResumableImageUpload from './ResumableImageUpload';

interface ProductImageUploadProps {
  currentImageUrl?: string;
  productName: string;
  productId?: string;
  size?: 'sm' | 'md' | 'lg';
  showUploadButton?: boolean;
  onImageUpdate?: (newImageUrl: string) => void;
  mode?: 'add' | 'update';
  useResumableUpload?: boolean;
}

export default function ProductImageUpload({
  currentImageUrl,
  productName,
  productId,
  size = 'md',
  showUploadButton = true,
  onImageUpdate,
  mode = 'add',
  useResumableUpload = false
}: ProductImageUploadProps) {
  
  // Use resumable upload component if enabled
  if (useResumableUpload) {
    return (
      <ResumableImageUpload
        currentImageUrl={currentImageUrl}
        uploadType="product"
        onImageUpdate={(newImageUrl: string) => {
          onImageUpdate?.(newImageUrl);
        }}
        className="max-w-md"
        maxSizeInMB={5}
      />
    );
  }
  const [isUploading, setIsUploading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: 'h-16 w-16',
    md: 'h-24 w-24',
    lg: 'h-32 w-32'
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setSelectedFile(file);
    
    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      let result;
      
      if (mode === 'update' && productId) {
        // Update existing product image
        await updateProductImage(productId, selectedFile);
        // For update mode, we need to get the new URL from the service
        result = await uploadProductImage(selectedFile, productId);
      } else {
        // Upload new product image
        result = await uploadProductImage(selectedFile, productId);
      }
      
      // Call callback if provided
      if (onImageUpdate) {
        onImageUpdate(result.url);
      }
      
      toast.success(`Product image ${mode === 'update' ? 'updated' : 'uploaded'} successfully`);
      setIsDialogOpen(false);
      setPreviewUrl(null);
      setSelectedFile(null);
    } catch (error) {
      console.error('Error uploading product image:', error);
      toast.error(`Failed to ${mode === 'update' ? 'update' : 'upload'} product image`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    if (onImageUpdate) {
      onImageUpdate('');
    }
    setPreviewUrl(null);
    setSelectedFile(null);
    toast.success('Product image removed');
    setIsDialogOpen(false);
  };

  const resetDialog = () => {
    setPreviewUrl(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const displayImageUrl = previewUrl || currentImageUrl;

  return (
    <div className="flex items-center space-x-4">
      <div className="relative">
        <div className={`${sizeClasses[size]} border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden`}>
          {displayImageUrl ? (
            <img 
              src={displayImageUrl} 
              alt={productName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-400">
              <ImageIcon className="h-6 w-6 mb-1" />
              <span className="text-xs">No Image</span>
            </div>
          )}
        </div>
        
        {showUploadButton && (
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetDialog();
          }}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
              >
                <Camera className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{mode === 'update' ? 'Update' : 'Add'} Product Image</DialogTitle>
                <DialogDescription>
                  {mode === 'update' ? 'Update the product image or remove the current one.' : 'Upload an image for this product.'}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* Current/Preview Image */}
                <div className="flex justify-center">
                  <div className="h-32 w-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden">
                    {displayImageUrl ? (
                      <img 
                        src={displayImageUrl} 
                        alt={productName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-gray-400">
                        <ImageIcon className="h-8 w-8 mb-2" />
                        <span className="text-sm">No Image</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* File Input */}
                <div className="space-y-2">
                  <Label htmlFor="product-image">Choose image</Label>
                  <input
                    ref={fileInputRef}
                    id="product-image"
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Supported formats: JPG, PNG, GIF. Max size: 5MB.
                  </p>
                </div>
                
                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setIsDialogOpen(false)}
                    disabled={isUploading}
                  >
                    Cancel
                  </Button>
                  
                  {(currentImageUrl || previewUrl) && (
                    <Button
                      variant="destructive"
                      onClick={handleRemoveImage}
                      disabled={isUploading}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  )}
                  
                  <Button
                    onClick={handleUpload}
                    disabled={!selectedFile || isUploading}
                    className="flex-1"
                  >
                    {isUploading ? (
                      <>
                        <Upload className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        {mode === 'update' ? 'Update' : 'Upload'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}