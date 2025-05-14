
export interface Notification {
  id: string;
  user_id: string;
  message: string;
  read: boolean;
  rush_order_id?: string;
  created_at: string;
}

export interface CreateNotificationParams {
  user_id: string;
  message: string;
  rush_order_id?: string;
}
