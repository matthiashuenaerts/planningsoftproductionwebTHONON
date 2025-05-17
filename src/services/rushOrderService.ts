
import { supabase } from "@/integrations/supabase/client";
import { RushOrder, RushOrderTask, RushOrderAssignment, RushOrderMessage, RushOrderMessageRead } from "@/types/rushOrder";
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
      // First, get the information about the standard tasks to create actual tasks
      const { data: standardTasks, error: tasksError } = await supabase
        .from('standard_tasks')
        .select('id, task_name, task_number, time_coefficient')
        .in('id', taskIds);
        
      if (tasksError) throw tasksError;
      
      // Get the rush order information
      const { data: rushOrder, error: rushOrderError } = await supabase
        .from('rush_orders')
        .select('deadline')
        .eq('id', rushOrderId)
        .single();
        
      if (rushOrderError) throw rushOrderError;
      
      // Map standard tasks to task records
      const taskAssignments = taskIds.map(taskId => ({
        rush_order_id: rushOrderId,
        standard_task_id: taskId
      }));
      
      // Create entries in rush_order_tasks as before
      const { error } = await supabase
        .from('rush_order_tasks')
        .insert(taskAssignments);
        
      if (error) throw error;
      
      // Create actual tasks in the tasks table as we do for projects
      if (standardTasks && standardTasks.length > 0) {
        // Find a phase for these tasks, or create a dummy phase if needed
        // For rush orders, we'll create tasks directly without a phase
        const tasksToCreate = standardTasks.map(standardTask => {
          const taskName = standardTask.task_name;
          const taskNumber = standardTask.task_number;
          
          return {
            title: `Rush: ${taskName} #${taskNumber}`,
            description: `Rush order task: ${taskName}`,
            status: 'pending',
            priority: 'high',
            due_date: rushOrder.deadline.split('T')[0], // Use just the date part
            workstation: 'Any', // Default workstation, can be updated later
            phase_id: null, // Rush order tasks don't have a phase
          };
        });
        
        // Insert tasks into the tasks table
        const { data: createdTasks, error: createTasksError } = await supabase
          .from('tasks')
          .insert(tasksToCreate)
          .select('id');
          
        if (createTasksError) throw createTasksError;
        
        // Link the created tasks to the rush order
        if (createdTasks && createdTasks.length > 0) {
          const taskLinks = createdTasks.map(task => ({
            rush_order_id: rushOrderId,
            task_id: task.id
          }));
          
          const { error: linkError } = await supabase
            .from('rush_order_task_links')
            .insert(taskLinks);
            
          if (linkError) throw linkError;
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

      // Fetch messages for this rush order
      const { data: messagesData, error: messagesError } = await supabase
        .from('rush_order_messages')
        .select('*')
        .eq('rush_order_id', id)
        .order('created_at', { ascending: true });
        
      if (messagesError) throw messagesError;
      
      // Add messages to the rush order object
      const rushOrderWithMessages = {
        ...data,
        messages: messagesData || []
      } as RushOrder;
      
      return rushOrderWithMessages;
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
  },
  
  async sendRushOrderMessage(rushOrderId: string, employeeId: string, message: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('rush_order_messages')
        .insert({
          rush_order_id: rushOrderId,
          employee_id: employeeId,
          message
        });
        
      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error('Error sending rush order message:', error);
      toast({
        title: "Error",
        description: `Failed to send message: ${error.message}`,
        variant: "destructive"
      });
      return false;
    }
  },
  
  async getRushOrderMessages(rushOrderId: string): Promise<RushOrderMessage[]> {
    try {
      const { data, error } = await supabase
        .from('rush_order_messages')
        .select('*, employees(name, role)')
        .eq('rush_order_id', rushOrderId)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      
      // Format the data to match our type
      const messages = data.map(msg => ({
        id: msg.id,
        rush_order_id: msg.rush_order_id,
        employee_id: msg.employee_id,
        message: msg.message,
        created_at: msg.created_at,
        updated_at: msg.updated_at,
        employee_name: msg.employees?.name,
        employee_role: msg.employees?.role
      }));
      
      return messages;
    } catch (error: any) {
      console.error('Error fetching rush order messages:', error);
      return [];
    }
  },
  
  async markMessagesAsRead(rushOrderId: string): Promise<boolean> {
    try {
      // Get the current user ID from the session
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      
      if (!userId) return false;
      
      // Update the read status of the user's messages for this rush order
      // Here we just track that the user has read the messages up to this point
      // by adding an entry to track when the user last read the rush order's messages
      const { error } = await supabase
        .from('rush_order_message_reads')
        .upsert({
          rush_order_id: rushOrderId,
          employee_id: userId,
          last_read_at: new Date().toISOString()
        }, {
          onConflict: 'rush_order_id,employee_id'
        });
        
      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error('Error marking rush order messages as read:', error);
      return false;
    }
  }
};
