
import { supabase } from "@/integrations/supabase/client";
import { Order, OrderItem } from "@/types/order";

export const orderService = {
  async getByProject(projectId: string): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('project_id', projectId)
      .order('order_date', { ascending: false });
    
    if (error) throw error;
    return data as Order[] || [];
  },
  
  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    const { data, error } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);
    
    if (error) throw error;
    return data as OrderItem[] || [];
  },
  
  async createOrder(order: Omit<Order, 'id' | 'created_at' | 'updated_at'>): Promise<Order> {
    const { data, error } = await supabase
      .from('orders')
      .insert([order])
      .select()
      .single();
    
    if (error) throw error;
    return data as Order;
  },
  
  async createOrderItems(items: Omit<OrderItem, 'id' | 'created_at' | 'updated_at'>[]): Promise<OrderItem[]> {
    const { data, error } = await supabase
      .from('order_items')
      .insert(items)
      .select();
    
    if (error) throw error;
    return data as OrderItem[] || [];
  },
  
  async updateOrderStatus(orderId: string, status: Order['status']): Promise<Order> {
    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId)
      .select()
      .single();
    
    if (error) throw error;
    return data as Order;
  }
};
