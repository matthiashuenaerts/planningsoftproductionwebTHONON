import { supabase } from "@/integrations/supabase/client";
import { RushOrder, RushOrderTask, RushOrderAssignment } from "@/types/rushOrder";
import { toast } from "@/hooks/use-toast";
import { ensureStorageBucket } from "@/integrations/supabase/createBucket";

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
        // Ensure storage bucket exists
        await ensureStorageBucket('attachments');
        
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${data.id}-${Date.now()}.${fileExt}`;
        const filePath = `rush-orders/${fileName}`;
        
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
      // First, create entries in rush_order_tasks for tracking
      const taskAssignments = taskIds.map(taskId => ({
        rush_order_id: rushOrderId,
        standard_task_id: taskId
      }));
      
      const { error: linkError } = await supabase
        .from('rush_order_tasks')
        .insert(taskAssignments);
        
      if (linkError) throw linkError;
      
      // Get rush order details
      const { data: rushOrder, error: rushOrderError } = await supabase
        .from('rush_orders')
        .select('*')
        .eq('id', rushOrderId)
        .single();
      
      if (rushOrderError) throw rushOrderError;
      
      // For each task, create an actual task in the tasks table
      for (const taskId of taskIds) {
        // Get info from the standard task
        const { data: standardTask, error: taskError } = await supabase
          .from('standard_tasks')
          .select('*')
          .eq('id', taskId)
          .single();
        
        if (taskError) throw taskError;
        
        // Get workstations for this standard task
        const { data: workstationLinks, error: workstationError } = await supabase
          .from('standard_task_workstation_links')
          .select('workstations(id, name)')
          .eq('standard_task_id', taskId);
        
        if (workstationError) throw workstationError;
        
        const workstation = workstationLinks && workstationLinks.length > 0 && workstationLinks[0].workstations 
          ? workstationLinks[0].workstations.name 
          : 'Not assigned';
        
        // Get the default phase (most recent)
        const { data: phases, error: phaseError } = await supabase
          .from('phases')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (phaseError) throw phaseError;
        
        const phaseId = phases && phases.length > 0 ? phases[0].id : null;
        
        if (!phaseId) {
          console.error('No phases found for task creation');
          continue;
        }
        
        // Create the task
        const { error: createTaskError } = await supabase
          .from('tasks')
          .insert({
            title: `🚨 RUSH: ${standardTask.task_name}`,
            description: `Rush order task #${standardTask.task_number} from order: ${rushOrder.title}`,
            workstation,
            status: 'TODO',
            priority: 'Urgent',
            due_date: rushOrder.deadline.split('T')[0], // Just get the date part
            phase_id: phaseId,
            rush_order_id: rushOrderId,
            is_rush: true
          });
        
        if (createTaskError) {
          console.error('Error creating task:', createTaskError);
          throw createTaskError;
        }
      }
      
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
  
  async updateRushOrderStatus(id: string, status: "pending" | "in_progress" | "completed"): Promise<boolean> {
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
      // First check for rush order tasks directly in the tasks table
      const { data: rushTasks, error: rushTasksError } = await supabase
        .from('tasks')
        .select('rush_order_id')
        .eq('is_rush', true)
        .in('status', ['TODO', 'IN_PROGRESS'])
        .eq('workstation', (await supabase
          .from('workstations')
          .select('name')
          .eq('id', workstationId)
          .single()).data?.name);
      
      if (rushTasksError) throw rushTasksError;
      
      let rushOrderIds: string[] = [];
      
      if (rushTasks && rushTasks.length > 0) {
        rushOrderIds = rushTasks
          .filter(task => task.rush_order_id) // Filter out nulls
          .map(task => task.rush_order_id as string);
      }
      
      // Also get traditional workstation links as a fallback
      const { data: workstationTasks, error: taskError } = await supabase
        .from('standard_task_workstation_links')
        .select('standard_task_id')
        .eq('workstation_id', workstationId);
      
      if (taskError) throw taskError;
      
      if (workstationTasks && workstationTasks.length > 0) {
        const standardTaskIds = workstationTasks.map(wt => wt.standard_task_id);
        
        // Get rush orders that have tasks associated with this workstation
        const { data: rushOrderTasks, error: rushOrderError } = await supabase
          .from('rush_order_tasks')
          .select('rush_order_id')
          .in('standard_task_id', standardTaskIds);
        
        if (rushOrderError) throw rushOrderError;
        
        if (rushOrderTasks && rushOrderTasks.length > 0) {
          // Add to existing order IDs, ensuring uniqueness
          const additionalOrderIds = rushOrderTasks.map(rot => rot.rush_order_id);
          rushOrderIds = [...new Set([...rushOrderIds, ...additionalOrderIds])];
        }
      }
      
      if (rushOrderIds.length === 0) {
        return [];
      }
      
      // Finally get the rush orders
      const { data: rushOrders, error: ordersError } = await supabase
        .from('rush_orders')
        .select('*')
        .in('id', rushOrderIds)
        .in('status', ['pending', 'in_progress']); // Only active ones
      
      if (ordersError) throw ordersError;
      
      return rushOrders as RushOrder[] || [];
    } catch (error: any) {
      console.error('Error fetching rush orders for workstation:', error);
      return [];
    }
  }
};
