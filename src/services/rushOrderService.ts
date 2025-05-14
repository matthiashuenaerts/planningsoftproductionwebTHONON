
import { supabase } from '@/integrations/supabase/client';
import { RushOrder, CreateRushOrderParams } from '@/types/rushOrder';
import { notificationService } from './notificationService';
import { dataService } from './dataService';

class RushOrderService {
  /**
   * Get all rush orders
   */
  async getAllRushOrders(): Promise<RushOrder[]> {
    const { data, error } = await supabase
      .rpc('get_rush_orders_with_details')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching rush orders:', error);
      throw new Error('Failed to fetch rush orders');
    }
    
    return data as RushOrder[];
  }
  
  /**
   * Get a rush order by ID
   */
  async getRushOrderById(id: string): Promise<RushOrder> {
    const { data, error } = await supabase
      .rpc('get_rush_order_with_details', { rush_order_id_param: id });
    
    if (error) {
      console.error('Error fetching rush order:', error);
      throw new Error('Failed to fetch rush order');
    }
    
    return data as RushOrder;
  }
  
  /**
   * Get rush orders for a specific workstation
   */
  async getRushOrdersForWorkstation(workstationId: string): Promise<RushOrder[]> {
    try {
      // Get tasks in this workstation
      const workstationTasks = await dataService.getStandardTasksByWorkstation(workstationId);
      const taskIds = workstationTasks.map(task => task.id);
      
      // Get rush orders that have tasks in this workstation
      if (taskIds.length === 0) return [];
      
      const { data, error } = await supabase
        .rpc('get_rush_orders_for_workstation', { task_ids_param: taskIds });
      
      if (error) throw error;
      
      return data as RushOrder[];
    } catch (error) {
      console.error('Error fetching rush orders for workstation:', error);
      throw new Error('Failed to fetch rush orders for workstation');
    }
  }
  
  /**
   * Upload an image for a rush order
   */
  async uploadRushOrderImage(file: File): Promise<{ url: string }> {
    // Generate a unique file name
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}-${Date.now()}.${fileExt}`;
    const filePath = `rush-orders/${fileName}`;
    
    const { error } = await supabase.storage
      .from('attachments')
      .upload(filePath, file);
    
    if (error) {
      console.error('Error uploading rush order image:', error);
      throw new Error('Failed to upload image');
    }
    
    const { data } = supabase.storage
      .from('attachments')
      .getPublicUrl(filePath);
    
    return { url: data.publicUrl };
  }
  
  /**
   * Create a new rush order
   */
  async createRushOrder(params: CreateRushOrderParams): Promise<RushOrder> {
    try {
      // Create the rush order
      const { data: rushOrder, error } = await supabase
        .rpc('create_rush_order', {
          title_param: params.title,
          description_param: params.description,
          deadline_param: params.deadline.toISOString(),
          image_url_param: params.imageUrl,
          created_by_param: params.createdBy,
          task_ids_param: params.taskIds,
          assigned_employee_ids_param: params.assignedEmployeeIds
        });
      
      if (error) throw error;
      
      // Get all employees to notify them
      const { data: employees } = await supabase
        .from('employees')
        .select('id');
      
      if (employees && employees.length > 0) {
        const employeeIds = employees.map(emp => emp.id);
        
        // Create a notification for all employees
        await notificationService.createNotificationsForUsers(
          employeeIds,
          `New rush order created: ${params.title}`,
          rushOrder.id
        );
      }
      
      return rushOrder as RushOrder;
    } catch (error) {
      console.error('Error creating rush order:', error);
      throw new Error('Failed to create rush order');
    }
  }
  
  /**
   * Update a rush order's status
   */
  async updateRushOrderStatus(id: string, status: string): Promise<void> {
    const { error } = await supabase
      .rpc('update_rush_order_status', { 
        rush_order_id_param: id, 
        status_param: status 
      });
    
    if (error) {
      console.error('Error updating rush order status:', error);
      throw new Error('Failed to update rush order status');
    }
  }
}

export const rushOrderService = new RushOrderService();
