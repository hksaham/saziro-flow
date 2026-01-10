import { Bell, ChevronRight } from 'lucide-react';

interface Notification {
  id: string;
  message: string;
  isNew?: boolean;
}

interface NotificationsCardProps {
  title: string;
  notifications: Notification[];
  emptyMessage: string;
}

/**
 * NotificationsCard Component
 * Displays a list of notifications
 * 
 * Future Hook Notes:
 * - Notifications → /notifications/{userId}
 * - Will be connected to Firebase for realtime updates
 */
const NotificationsCard = ({ title, notifications, emptyMessage }: NotificationsCardProps) => {
  return (
    <div className="rounded-xl bg-card border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-display font-semibold text-lg text-foreground">{title}</h3>
        </div>
        {notifications.length > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-sm font-medium">
            {notifications.length}
          </span>
        )}
      </div>
      
      {/* Notifications List */}
      <div className="divide-y divide-border">
        {notifications.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center mb-3">
              <Bell className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">{emptyMessage}</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className="group flex items-center justify-between px-6 py-4 hover:bg-secondary/30 transition-colors duration-200 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                {notification.isNew && (
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                )}
                <p className="text-foreground">{notification.message}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationsCard;
