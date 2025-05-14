
import { supabase } from "@/integrations/supabase/client";
import { RushOrder, RushOrderTask, RushOrderAssignment } from "@/types/rushOrder";
import { toast } from "@/hooks/use-toast";

export const rushOrderService = {
  async createRushOrder(
    title: string,
    description: string,
    deadline: string,
    createdBy: string,
    imageFile?: File
  ): Promise<RushOrder | null> {
    try {
      // Create rush order record
      const { data, error } = await supabase
        .from('rush_orders')
        .insert({
          title,
          description,
          deadline,
          status: 'pending',
          priority: 'critical',
          created_by: createdBy
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Upload image if provided
      if (imageFile && data) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${data.id}-${Date.now()}.${fileExt}`;
        const filePath = `rush-orders/${fileName}`;
        
        // First check if storage bucket exists, create if needed
        const { data: buckets } = await supabase
          .storage
          .listBuckets();
        
        if (!buckets?.find(bucket => bucket.name === 'attachments')) {
          const { error: createBucketError } = await supabase
            .storage
            .createBucket('attachments', { public: true });
            
          if (createBucketError) {
            console.error('Error creating bucket:', createBucketError);
            throw createBucketError;
          }
        }
        
        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(filePath, imageFile);
          
        if (uploadError) throw uploadError;
        
        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from('attachments')
          .getPublicUrl(filePath);
          
        // Update rush order with image URL
        const { error: updateError } = await supabase
          .from('rush_orders')
          .update({ image_url: publicUrlData.publicUrl })
          .eq('id', data.id);
          
        if (updateError) throw updateError;
        
        data.image_url = publicUrlData.publicUrl;
      }
      
      return data as RushOrder;
    } catch (error: any) {
      console.error('Error creating rush order:', error);
      toast({
        title: "Error",
        description: `Failed to create rush order: ${error.message}`,
        variant: "destructive"
      });
      return null;
    }
  },
  
  async assignTasksToRushOrder(rushOrderId: string, taskIds: string[]): Promise<boolean> {
    try {
      const taskAssignments = taskIds.map(taskId => ({
        rush_order_id: rushOrderId,
        standard_task_id: taskId
      }));
      
      const { error } = await supabase
        .from('rush_order_tasks')
        .insert(taskAssignments);
        
      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error('Error assigning tasks to rush order:', error);
      toast({
        title: "Error",
        description: `Failed to assign tasks: ${error.message}`,
        variant: "destructive"
      });
      return false;
    }
  },
  
  async assignUsersToRushOrder(rushOrderId: string, userIds: string[]): Promise<boolean> {
    try {
      const userAssignments = userIds.map(userId => ({
        rush_order_id: rushOrderId,
        employee_id: userId
      }));
      
      const { error } = await supabase
        .from('rush_order_assignments')
        .insert(userAssignments);
        
      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error('Error assigning users to rush order:', error);
      toast({
        title: "Error",
        description: `Failed to assign users: ${error.message}`,
        variant: "destructive"
      });
      return false;
    }
  },

  async getAllRushOrders(): Promise<RushOrder[]> {
    try {
      const { data, error } = await supabase
        .from('rush_orders')
        .select(`
          *,
          tasks:rush_order_tasks(
            id,
            rush_order_id,
            standard_task_id
          ),
          assignments:rush_order_assignments(
            id,
            rush_order_id,
            employee_id
          )
        `)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data as RushOrder[] || [];
    } catch (error: any) {
      console.error('Error fetching rush orders:', error);
      toast({
        title: "Error",
        description: `Failed to fetch rush orders: ${error.message}`,
        variant: "destructive"
      });
      return [];
    }
  },
  
  async getRushOrderById(id: string): Promise<RushOrder | null> {
    try {
      const { data, error } = await supabase
        .from('rush_orders')
        .select(`
          *,
          tasks:rush_order_tasks(
            id,
            rush_order_id,
            standard_task_id
          ),
          assignments:rush_order_assignments(
            id,
            rush_order_id,
            employee_id
          )
        `)
        .eq('id', id)
        .single();
        
      if (error) throw error;
      return data as RushOrder;
    } catch (error: any) {
      console.error(`Error fetching rush order ${id}:`, error);
      toast({
        title: "Error",
        description: `Failed to fetch rush order: ${error.message}`,
        variant: "destructive"
      });
      return null;
    }
  },
  
  async updateRushOrderStatus(id: string, status: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('rush_orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
        
      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error('Error updating rush order status:', error);
      toast({
        title: "Error",
        description: `Failed to update status: ${error.message}`,
        variant: "destructive"
      });
      return false;
    }
  },
  
  async createNotification(userId: string, rushOrderId: string, message: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          message,
          rush_order_id: rushOrderId,
          read: false
        });
        
      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error('Error creating notification:', error);
      return false;
    }
  },
  
  async notifyAllUsers(rushOrderId: string, message: string): Promise<boolean> {
    try {
      // Get all users with specified roles
      const { data: users, error } = await supabase
        .from('employees')
        .select('id')
        .in('role', ['admin', 'manager', 'worker', 'installation_team']);
        
      if (error) throw error;
      
      // Create notifications for each user
      if (users && users.length > 0) {
        const notifications = users.map(user => ({
          user_id: user.id,
          message,
          rush_order_id: rushOrderId,
          read: false
        }));
        
        const { error: notifyError } = await supabase
          .from('notifications')
          .insert(notifications);
          
        if (notifyError) throw notifyError;
      }
      
      return true;
    } catch (error: any) {
      console.error('Error notifying users:', error);
      return false;
    }
  },
  
  async getRushOrdersForWorkstation(workstationId: string): Promise<RushOrder[]> {
    try {
      // First get the standard task IDs associated with this workstation
      const { data: workstationTasks, error: taskError } = await supabase
        .from('standard_task_workstation_links')
        .select('standard_task_id')
        .eq('workstation_id', workstationId);
      
      if (taskError) throw taskError;
      
      if (!workstationTasks || workstationTasks.length === 0) {
        return [];
      }
      
      const standardTaskIds = workstationTasks.map(wt => wt.standard_task_id);
      
      // Now get rush orders that have tasks associated with this workstation
      const { data: rushOrderTasks, error: rushOrderError } = await supabase
        .from('rush_order_tasks')
        .select('rush_order_id')
        .in('standard_task_id', standardTaskIds);
      
      if (rushOrderError) throw rushOrderError;
      
      if (!rushOrderTasks || rushOrderTasks.length === 0) {
        return [];
      }
      
      const rushOrderIds = [...new Set(rushOrderTasks.map(rot => rot.rush_order_id))];
      
      // Finally get the rush orders
      const { data: rushOrders, error: ordersError } = await supabase
        .from('rush_orders')
        .select('*')
        .in('id', rushOrderIds);
      
      if (ordersError) throw ordersError;
      
      return rushOrders as RushOrder[] || [];
    } catch (error: any) {
      console.error('Error fetching rush orders for workstation:', error);
      return [];
    }
  }
};
