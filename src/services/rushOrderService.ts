
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
      .select(`
        *,
        tasks:rush_order_tasks(*),
        assignments:rush_order_assignments(*)
      `)
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
      .select(`
        *,
        tasks:rush_order_tasks(*),
        assignments:rush_order_assignments(*)
      `)
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
        .select(`
          rush_order:rush_orders(
            *,
            tasks:rush_order_tasks(*),
            assignments:rush_order_assignments(*)
          )
        `)
        .in('standard_task_id', taskIds);
      
      if (error) throw error;
      
      // Extract rush orders and remove duplicates
      const rushOrders = data
        .map(item => item.rush_order as RushOrder)
        .filter((order, index, self) => 
          index === self.findIndex(o => o.id === order.id)
        );
      
      return rushOrders;
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
        .insert({
          title: params.title,
          description: params.description,
          deadline: params.deadline.toISOString(),
          image_url: params.imageUrl,
          status: 'pending',
          priority: 'critical',
          created_by: params.createdBy
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Add tasks
      if (params.taskIds.length > 0) {
        const taskInserts = params.taskIds.map(taskId => ({
          rush_order_id: rushOrder.id,
          standard_task_id: taskId
        }));
        
        const { error: tasksError } = await supabase
          .from('rush_order_tasks')
          .insert(taskInserts);
        
        if (tasksError) throw tasksError;
      }
      
      // Add employee assignments
      if (params.assignedEmployeeIds.length > 0) {
        const assignmentInserts = params.assignedEmployeeIds.map(employeeId => ({
          rush_order_id: rushOrder.id,
          employee_id: employeeId
        }));
        
        const { error: assignmentsError } = await supabase
          .from('rush_order_assignments')
          .insert(assignmentInserts);
        
        if (assignmentsError) throw assignmentsError;
      }
      
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
  async updateRushOrderStatus(id: string, status: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('rush_orders')
        .update({ status })
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating rush order status:', error);
      throw new Error('Failed to update rush order status');
    }
  }
}

export const rushOrderService = new RushOrderService();
