import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { useNotifications } from '@/contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Check
} from 'lucide-react';





interface NotificationPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationPanel({ open, onOpenChange }: NotificationPanelProps) {
  const { notifications, markAsRead, markAllAsRead, unreadCount } = useNotifications();
  const navigate = useNavigate();

  const handleNotificationClick = async (notification: any) => {
    try {
      await markAsRead(notification.id);
      if (notification.actionUrl) {
        navigate(notification.actionUrl);
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-96 flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-l border-slate-200/60 dark:border-slate-700/60">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
              <Bell className="h-5 w-5 text-white" />
            </div>
            <span className="text-slate-800 dark:text-slate-200">Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs bg-red-500 text-white">
                {unreadCount}
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription className="text-slate-600 dark:text-slate-400">
            View and manage your notifications. Click on any notification to mark it as read and navigate to the related page.
          </SheetDescription>
        </SheetHeader>

        <Separator className="mb-4 bg-slate-200 dark:bg-slate-700" />

        <div className="flex-1 flex flex-col min-h-0">
          <ScrollArea className="flex-1">
            <div className="space-y-4 pr-4">
              {notifications.length === 0 ? (
                <div className="text-center py-12">
                  <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit mx-auto mb-4">
                    <Bell className="h-12 w-12 text-slate-400" />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`relative p-4 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md ${
                      !notification.read 
                        ? 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 shadow-sm' 
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-medium truncate text-slate-800 dark:text-slate-200">
                            {notification.title}
                          </h4>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500 dark:text-slate-500">
                            {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                          </span>
                          {!notification.read && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-100 dark:text-blue-400 dark:hover:text-blue-200 dark:hover:bg-blue-900/30 rounded-full border border-blue-200 dark:border-blue-700 shadow-sm transition-all duration-200"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    {!notification.read && (
                      <div className="absolute top-3 right-3 w-2 h-2 bg-blue-500 rounded-full shadow-sm"></div>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {unreadCount > 0 && (
            <>
              <Separator className="my-4 bg-slate-200 dark:bg-slate-700" />
              <div className="pt-2">
                <Button 
                  onClick={handleMarkAllAsRead}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-elegant transition-all duration-200"
                  size="sm"
                >
                  Mark All as Read
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}