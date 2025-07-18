import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, Wifi, WifiOff } from 'lucide-react';
import ResumableImageUpload from '@/components/ResumableImageUpload';
import ProductImageUpload from '@/components/ProductImageUpload';
import ProfilePictureUpload from '@/components/ProfilePictureUpload';
import { useAuth } from '@/contexts/AuthContext';

export default function UploadDemoPage() {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [productImageUrl, setProductImageUrl] = useState<string>('');
  const [profileImageUrl, setProfileImageUrl] = useState<string>('');
  const [demoImageUrl, setDemoImageUrl] = useState<string>('');

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

  const simulateOffline = () => {
    // This is just for demo purposes - in real scenarios, network issues happen naturally
    window.dispatchEvent(new Event('offline'));
    setTimeout(() => {
      window.dispatchEvent(new Event('online'));
    }, 5000); // Come back online after 5 seconds
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Resumable Upload Demo</h1>
          <p className="text-muted-foreground">
            Test the new offline sync functionality for file uploads
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={isOnline ? 'default' : 'destructive'} className="flex items-center gap-1">
            {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {isOnline ? 'Online' : 'Offline'}
          </Badge>
          <Button variant="outline" size="sm" onClick={simulateOffline}>
            Simulate Offline
          </Button>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>How it works</AlertTitle>
        <AlertDescription>
          The resumable upload system automatically handles network interruptions. If your connection drops during an upload,
          the system will pause the upload and resume it when the connection is restored. Upload progress is saved locally
          and persists even if you refresh the page or close the browser.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="demo" className="space-y-4">
        <TabsList>
          <TabsTrigger value="demo">Demo Upload</TabsTrigger>
          <TabsTrigger value="product">Product Image</TabsTrigger>
          <TabsTrigger value="profile">Profile Picture</TabsTrigger>
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="demo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resumable Image Upload Demo</CardTitle>
              <CardDescription>
                Upload an image with full resumable functionality. Try disconnecting your internet during upload to see the offline sync in action.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResumableImageUpload
                currentImageUrl={demoImageUrl}
                folder="demo"
                size="lg"
                onImageUpdate={setDemoImageUrl}
                title="Demo Upload"
                description="Upload any image to test the resumable functionality"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="product" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Standard Product Upload</CardTitle>
                <CardDescription>
                  Traditional upload without resumable functionality
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProductImageUpload
                  currentImageUrl={productImageUrl}
                  productName="Demo Product"
                  productId="demo-product-1"
                  size="lg"
                  onImageUpdate={setProductImageUrl}
                  useResumableUpload={false}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resumable Product Upload</CardTitle>
                <CardDescription>
                  Enhanced upload with offline sync and resumable functionality
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProductImageUpload
                  currentImageUrl={productImageUrl}
                  productName="Demo Product"
                  productId="demo-product-2"
                  size="lg"
                  onImageUpdate={setProductImageUrl}
                  useResumableUpload={true}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="profile" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Standard Profile Upload</CardTitle>
                <CardDescription>
                  Traditional profile picture upload
                </CardDescription>
              </CardHeader>
              <CardContent>
                {user && (
                  <ProfilePictureUpload
                    currentImageUrl={profileImageUrl}
                    userName={user.name || 'User'}
                    size="lg"
                    onImageUpdate={setProfileImageUrl}
                    useResumableUpload={false}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resumable Profile Upload</CardTitle>
                <CardDescription>
                  Enhanced profile picture upload with offline sync
                </CardDescription>
              </CardHeader>
              <CardContent>
                {user && (
                  <ProfilePictureUpload
                    currentImageUrl={profileImageUrl}
                    userName={user.name || 'User'}
                    size="lg"
                    onImageUpdate={setProfileImageUrl}
                    useResumableUpload={true}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Standard Upload</CardTitle>
                <CardDescription>Traditional upload behavior</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    <span>Upload fails if connection is lost</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    <span>Must restart from beginning</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    <span>No progress persistence</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    <span>No offline detection</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resumable Upload</CardTitle>
                <CardDescription>Enhanced upload with offline sync</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span>Automatically pauses when offline</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span>Resumes from last position</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span>Progress saved in localStorage</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span>Real-time network status</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span>Manual pause/resume controls</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span>Automatic retry with backoff</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span>Pending uploads management</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Testing Instructions</CardTitle>
              <CardDescription>
                How to test the offline sync functionality
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Start uploading a large image file (preferably over 1MB)</li>
                <li>While the upload is in progress, disconnect your internet or click "Simulate Offline"</li>
                <li>Notice the upload automatically pauses and shows offline status</li>
                <li>Reconnect your internet - the upload will automatically resume</li>
                <li>Try refreshing the page during an upload to see persistence</li>
                <li>Use the manual pause/resume controls to test user control</li>
                <li>Check the pending uploads panel to manage interrupted uploads</li>
              </ol>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}