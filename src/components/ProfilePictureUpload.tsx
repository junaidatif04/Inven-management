import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Camera, Upload, X } from 'lucide-react';
import { uploadCompressedProfilePicture } from '@/services/imageUploadService';
import { updateUserProfilePicture } from '@/services/authService';
import { useAuth } from '@/contexts/AuthContext';

interface ProfilePictureUploadProps {
  currentImageUrl?: string;
  userName: string;
  size?: 'sm' | 'md' | 'lg';
  showUploadButton?: boolean;
  onImageUpdate?: (newImageUrl: string) => void;
}

export default function ProfilePictureUpload({
  currentImageUrl,
  userName,
  size = 'md',
  showUploadButton = true,
  onImageUpdate
}: ProfilePictureUploadProps) {
  const { user, refreshUser } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: 'h-12 w-12',
    md: 'h-24 w-24',
    lg: 'h-32 w-32'
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
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
    if (!selectedFile || !user) return;

    setIsUploading(true);
    try {
      // Upload the compressed image
      const result = await uploadCompressedProfilePicture(selectedFile, user.id);
      
      // Update user profile in Firestore
      await updateUserProfilePicture(user.id, result.url);
      
      // Refresh user data in context
      await refreshUser();
      
      // Call callback if provided
      if (onImageUpdate) {
        onImageUpdate(result.url);
      }
      
      toast.success('Profile picture updated successfully');
      setIsDialogOpen(false);
      setPreviewUrl(null);
      setSelectedFile(null);
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      toast.error('Failed to upload profile picture');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!user || !currentImageUrl) return;

    setIsUploading(true);
    try {
      // Update user profile to remove picture
      await updateUserProfilePicture(user.id, '');
      
      // Refresh user data in context
      await refreshUser();
      
      // Call callback if provided
      if (onImageUpdate) {
        onImageUpdate('');
      }
      
      toast.success('Profile picture removed successfully');
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error removing profile picture:', error);
      toast.error('Failed to remove profile picture');
    } finally {
      setIsUploading(false);
    }
  };

  const resetDialog = () => {
    setPreviewUrl(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex items-center space-x-4">
      <div className="relative">
        <Avatar className={sizeClasses[size]}>
          <AvatarImage 
            src={currentImageUrl || user?.profilePicture || user?.avatar} 
            alt={userName}
          />
          <AvatarFallback className="text-lg font-semibold">
            {getInitials(userName)}
          </AvatarFallback>
        </Avatar>
        
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
                <DialogTitle>Update Profile Picture</DialogTitle>
                <DialogDescription>
                  Upload a new profile picture or remove the current one.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* Current/Preview Image */}
                <div className="flex justify-center">
                  <Avatar className="h-32 w-32">
                    <AvatarImage 
                      src={previewUrl || currentImageUrl || user?.profilePicture || user?.avatar} 
                      alt={userName}
                    />
                    <AvatarFallback className="text-2xl font-semibold">
                      {getInitials(userName)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                
                {/* File Input */}
                <div className="space-y-2">
                  <Label htmlFor="picture">Choose new picture</Label>
                  <input
                    ref={fileInputRef}
                    id="picture"
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
                <div className="flex justify-between space-x-2">
                  <div>
                    {(currentImageUrl || user?.profilePicture) && (
                      <Button
                        variant="outline"
                        onClick={handleRemoveImage}
                        disabled={isUploading}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
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
                      {isUploading ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Uploading...
                        </div>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}