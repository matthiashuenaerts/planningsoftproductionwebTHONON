import { supabase } from "@/integrations/supabase/client";
import { RushOrder, RushOrderTask, RushOrderAssignment, RushOrderMessage, RushOrderMessageRead } from "@/types/rushOrder";

export const rushOrderService = {
  async getAllRushOrders(): Promise<RushOrder[]> {
    const { data, error } = await supabase
      .from('rush_orders')
      .select(`
        *,
        tasks:rush_order_tasks(id, rush_order_id, standard_task_id, created_at),
        assignments:rush_order_assignments(id, rush_order_id, employee_id, created_at),
        messages:rush_order_messages(id, rush_order_id, employee_id, message, created_at, updated_at)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching rush orders:", error);
      throw error;
    }

    return data as RushOrder[];
  },

  async getRushOrderById(id: string): Promise<RushOrder | null> {
    const { data, error } = await supabase
      .from('rush_orders')
      .select(`
        *,
        tasks:rush_order_tasks(id, rush_order_id, standard_task_id, created_at),
        assignments:rush_order_assignments(id, rush_order_id, employee_id, created_at),
        messages:rush_order_messages(id, rush_order_id, employee_id, message, created_at, updated_at, employee_name:employee_id(name), employee_role:employee_id(role))
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error("Error fetching rush order by ID:", error);
      throw error;
    }

    return data as RushOrder;
  },

  async createRushOrder(rushOrder: Omit<RushOrder, 'id' | 'created_at' | 'updated_at'>): Promise<RushOrder> {
    const { data, error } = await supabase
      .from('rush_orders')
      .insert([rushOrder])
      .select('*')
      .single();

    if (error) {
      console.error("Error creating rush order:", error);
      throw error;
    }

    return data as RushOrder;
  },

  async updateRushOrder(id: string, updates: Partial<RushOrder>): Promise<RushOrder | null> {
    const { data, error } = await supabase
      .from('rush_orders')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error("Error updating rush order:", error);
      throw error;
    }

    return data as RushOrder;
  },

  async deleteRushOrder(id: string): Promise<void> {
    const { error } = await supabase
      .from('rush_orders')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Error deleting rush order:", error);
      throw error;
    }
  },

  // Rush Order Tasks
  async getRushOrderTasks(rushOrderId: string): Promise<RushOrderTask[]> {
    const { data, error } = await supabase
      .from('rush_order_tasks')
      .select('*')
      .eq('rush_order_id', rushOrderId);

    if (error) {
      console.error("Error fetching rush order tasks:", error);
      throw error;
    }

    return data as RushOrderTask[];
  },

  async addRushOrderTask(rushOrderId: string, standardTaskId: string): Promise<RushOrderTask> {
    const { data, error } = await supabase
      .from('rush_order_tasks')
      .insert([{ rush_order_id: rushOrderId, standard_task_id: standardTaskId }])
      .select('*')
      .single();

    if (error) {
      console.error("Error adding rush order task:", error);
      throw error;
    }

    return data as RushOrderTask;
  },

  async deleteRushOrderTask(id: string): Promise<void> {
    const { error } = await supabase
      .from('rush_order_tasks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Error deleting rush order task:", error);
      throw error;
    }
  },

  // Rush Order Assignments
  async getRushOrderAssignments(rushOrderId: string): Promise<RushOrderAssignment[]> {
    const { data, error } = await supabase
      .from('rush_order_assignments')
      .select('*, employee_name:employee_id(name)')
      .eq('rush_order_id', rushOrderId);

    if (error) {
      console.error("Error fetching rush order assignments:", error);
      throw error;
    }

    return data as RushOrderAssignment[];
  },

  async assignEmployeeToRushOrder(rushOrderId: string, employeeId: string): Promise<RushOrderAssignment> {
    const { data, error } = await supabase
      .from('rush_order_assignments')
      .insert([{ rush_order_id: rushOrderId, employee_id: employeeId }])
      .select('*, employee_name:employee_id(name)')
      .single();

    if (error) {
      console.error("Error assigning employee to rush order:", error);
      throw error;
    }

    return data as RushOrderAssignment;
  },

  async removeEmployeeFromRushOrder(id: string): Promise<void> {
    const { error } = await supabase
      .from('rush_order_assignments')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Error removing employee from rush order:", error);
      throw error;
    }
  },

  // Rush Order Messages
  async getRushOrderMessages(rushOrderId: string): Promise<RushOrderMessage[]> {
    const { data, error } = await supabase
      .from('rush_order_messages')
      .select('*, employee_name:employee_id(name), employee_role:employee_id(role)')
      .eq('rush_order_id', rushOrderId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error("Error fetching rush order messages:", error);
      throw error;
    }

    return data as RushOrderMessage[];
  },

  async addRushOrderMessage(rushOrderId: string, employeeId: string, message: string): Promise<RushOrderMessage> {
    const { data, error } = await supabase
      .from('rush_order_messages')
      .insert([{ rush_order_id: rushOrderId, employee_id: employeeId, message }])
      .select('*, employee_name:employee_id(name), employee_role:employee_id(role)')
      .single();

    if (error) {
      console.error("Error adding rush order message:", error);
      throw error;
    }

    return data as RushOrderMessage;
  },

   async getRushOrdersForWorkstation(workstationId: string): Promise<RushOrder[]> {
    try {
      // First get all standard tasks linked to this workstation
      const { data: linkedTasks, error: linkError } = await supabase
        .from('standard_task_workstation_links')
        .select('standard_task_id')
        .eq('workstation_id', workstationId);
      
      if (linkError) throw linkError;
      
      if (!linkedTasks || linkedTasks.length === 0) {
        return [];
      }
      
      const standardTaskIds = linkedTasks.map(link => link.standard_task_id);
      
      // Then get all rush order tasks that use these standard tasks
      const { data: rushOrderTasks, error: taskError } = await supabase
        .from('rush_order_tasks')
        .select('rush_order_id, standard_task_id')
        .in('standard_task_id', standardTaskIds);
      
      if (taskError) throw taskError;
      
      if (!rushOrderTasks || rushOrderTasks.length === 0) {
        return [];
      }
      
      const rushOrderIds = [...new Set(rushOrderTasks.map(rot => rot.rush_order_id))];
      
      // Fetch the rush orders by their IDs
      const { data: rushOrders, error: rushOrderError } = await supabase
        .from('rush_orders')
        .select('*')
        .in('id', rushOrderIds);
      
      if (rushOrderError) throw rushOrderError;
      
      return rushOrders as RushOrder[];
    } catch (error) {
      console.error('Error fetching rush orders for workstation:', error);
      return [];
    }
  },
  
  async markMessagesAsRead(rushOrderId: string, employeeId: string): Promise<void> {
    const now = new Date().toISOString();
    
    // Check if there's already a read receipt
    const { data: existingRead } = await supabase
      .from('rush_order_message_reads')
      .select('*')
      .eq('rush_order_id', rushOrderId)
      .eq('employee_id', employeeId)
      .maybeSingle();
    
    if (existingRead) {
      // Update existing read receipt
      await supabase
        .from('rush_order_message_reads')
        .update({ last_read_at: now })
        .eq('rush_order_id', rushOrderId)
        .eq('employee_id', employeeId);
    } else {
      // Create new read receipt
      await supabase
        .from('rush_order_message_reads')
        .insert({
          rush_order_id: rushOrderId,
          employee_id: employeeId,
          last_read_at: now
        });
    }
  },

  async getUnreadMessagesCount(rushOrderId: string, employeeId: string): Promise<number> {
    try {
      // Get the last read timestamp for the employee
      const { data: readData, error: readError } = await supabase
        .from('rush_order_message_reads')
        .select('last_read_at')
        .eq('rush_order_id', rushOrderId)
        .eq('employee_id', employeeId)
        .maybeSingle();

      if (readError) {
        console.error("Error fetching last read timestamp:", readError);
        throw readError;
      }

      const lastReadAt = readData ? new Date(readData.last_read_at) : null;

      // Fetch all messages for the rush order
      const { data: messages, error: messagesError } = await supabase
        .from('rush_order_messages')
        .select('created_at')
        .eq('rush_order_id', rushOrderId);

      if (messagesError) {
        console.error("Error fetching messages:", messagesError);
        throw messagesError;
      }

      // Count the unread messages
      let unreadCount = 0;
      if (lastReadAt) {
        unreadCount = messages.filter(message => new Date(message.created_at) > lastReadAt).length;
      } else {
        // If no read timestamp exists, all messages are unread
        unreadCount = messages.length;
      }

      return unreadCount;
    } catch (error) {
      console.error("Error getting unread messages count:", error);
      return 0;
    }
  },
};
