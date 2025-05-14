
import { supabase } from '@/integrations/supabase/client';
import { Notification, CreateNotificationParams } from '@/types/notification';

class NotificationService {
  /**
   * Get all notifications for a specific user
   */
  async getUserNotifications(userId: string): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching notifications:', error);
      throw new Error('Failed to fetch notifications');
    }
    
    return data as Notification[];
  }
  
  /**
   * Get unread notifications count for a user
   */
  async getUnreadNotificationsCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);
    
    if (error) {
      console.error('Error fetching unread notifications count:', error);
      throw new Error('Failed to fetch unread notifications count');
    }
    
    return count || 0;
  }
  
  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);
    
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
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId);
    
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
      .from('notifications')
      .insert([params])
      .select('*')
      .single();
    
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
    const notifications = userIds.map(user_id => ({
      user_id,
      message,
      rush_order_id,
      read: false
    }));
    
    const { error } = await supabase
      .from('notifications')
      .insert(notifications);
    
    if (error) {
      console.error('Error creating multiple notifications:', error);
      throw new Error('Failed to create notifications');
    }
  }
}

export const notificationService = new NotificationService();
