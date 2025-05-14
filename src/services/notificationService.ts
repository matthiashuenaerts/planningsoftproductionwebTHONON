
import { supabase } from '@/integrations/supabase/client';
import { Notification, CreateNotificationParams } from '@/types/notification';

class NotificationService {
  /**
   * Get all notifications for a specific user
   */
  async getUserNotifications(userId: string): Promise<Notification[]> {
    const { data, error } = await supabase
      .rpc('get_user_notifications', { user_id_param: userId })
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching notifications:', error);
      throw new Error('Failed to fetch notifications');
    }
    
    return (data || []) as Notification[];
  }
  
  /**
   * Get unread notifications count for a user
   */
  async getUnreadNotificationsCount(userId: string): Promise<number> {
    const { data, error } = await supabase
      .rpc('get_unread_notifications_count', { user_id_param: userId });
    
    if (error) {
      console.error('Error fetching unread notifications count:', error);
      throw new Error('Failed to fetch unread notifications count');
    }
    
    return data || 0;
  }
  
  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .rpc('mark_notification_as_read', { notification_id_param: notificationId });
    
    if (error) {
      console.error('Error marking notification as read:', error);
      throw new Error('Failed to mark notification as read');
    }
  }
  
  /**
   * Mark all notifications for a user as read
   */
  async markAllAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .rpc('mark_all_notifications_as_read', { user_id_param: userId });
    
    if (error) {
      console.error('Error marking all notifications as read:', error);
      throw new Error('Failed to mark all notifications as read');
    }
  }
  
  /**
   * Create a new notification
   */
  async createNotification(params: CreateNotificationParams): Promise<Notification> {
    const { data, error } = await supabase
      .rpc('create_notification', {
        user_id_param: params.user_id,
        message_param: params.message,
        rush_order_id_param: params.rush_order_id || null
      });
    
    if (error) {
      console.error('Error creating notification:', error);
      throw new Error('Failed to create notification');
    }
    
    return data as Notification;
  }
  
  /**
   * Create notifications for multiple users with the same message
   */
  async createNotificationsForUsers(userIds: string[], message: string, rush_order_id?: string): Promise<void> {
    const { error } = await supabase
      .rpc('create_notifications_for_users', { 
        user_ids_param: userIds,
        message_param: message,
        rush_order_id_param: rush_order_id || null
      });
    
    if (error) {
      console.error('Error creating multiple notifications:', error);
      throw new Error('Failed to create notifications');
    }
  }
}

export const notificationService = new NotificationService();
