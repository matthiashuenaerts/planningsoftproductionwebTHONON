
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
      .from('rush_orders')
      .select('*')
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
      .from('rush_orders')
      .select('*')
      .eq('id', id)
      .single();
    
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
        .from('rush_order_tasks')
        .select('rush_order_id')
        .in('standard_task_id', taskIds);
      
      if (error) throw error;
      
      const rushOrderIds = [...new Set(data.map(item => item.rush_order_id))];
      
      if (rushOrderIds.length === 0) return [];
      
      const { data: rushOrders, error: rushOrdersError } = await supabase
        .from('rush_orders')
        .select('*')
        .in('id', rushOrderIds)
        .order('deadline', { ascending: true });
      
      if (rushOrdersError) throw rushOrdersError;
      
      return rushOrders as RushOrder[];
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
        .from('rush_orders')
        .insert([{
          title: params.title,
          description: params.description,
          deadline: params.deadline.toISOString(),
          image_url: params.imageUrl,
          created_by: params.createdBy,
          status: 'pending',
          priority: 'critical'
        }])
        .select('*')
        .single();
      
      if (error) throw error;
      
      // Create task associations
      const rushOrderTasks = params.taskIds.map(taskId => ({
        rush_order_id: rushOrder.id,
        standard_task_id: taskId
      }));
      
      const { error: taskError } = await supabase
        .from('rush_order_tasks')
        .insert(rushOrderTasks);
      
      if (taskError) throw taskError;
      
      // Create employee assignments
      const rushOrderAssignments = params.assignedEmployeeIds.map(employeeId => ({
        rush_order_id: rushOrder.id,
        employee_id: employeeId
      }));
      
      const { error: assignmentError } = await supabase
        .from('rush_order_assignments')
        .insert(rushOrderAssignments);
      
      if (assignmentError) throw assignmentError;
      
      // Get all employees to notify them
      const { data: employees } = await supabase
        .from('employees')
        .select('id');
      
      if (employees) {
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
      .from('rush_orders')
      .update({ status })
      .eq('id', id);
    
    if (error) {
      console.error('Error updating rush order status:', error);
      throw new Error('Failed to update rush order status');
    }
  }
}

export const rushOrderService = new RushOrderService();
