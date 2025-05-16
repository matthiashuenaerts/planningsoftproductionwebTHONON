
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { rushOrderService } from '@/services/rushOrderService';
import RushOrderWorkstationItem from '@/components/rush-orders/RushOrderWorkstationItem';
import { supabase } from '@/integrations/supabase/client';
import { Task } from '@/services/dataService';

interface WorkstationRushOrdersDisplayProps {
  workstationId: string;
}

const WorkstationRushOrdersDisplay: React.FC<WorkstationRushOrdersDisplayProps> = ({ workstationId }) => {
  const { data: rushOrders, isLoading } = useQuery({
    queryKey: ['workstationRushOrders', workstationId],
    queryFn: () => rushOrderService.getRushOrdersForWorkstation(workstationId),
    enabled: !!workstationId,
  });
  
  // Also fetch any rush tasks directly for this workstation
  const { data: rushTasks, isLoading: isLoadingTasks } = useQuery({
    queryKey: ['rushTasks', workstationId],
    queryFn: async () => {
      try {
        // Get workstation name
        const { data: workstation } = await supabase
          .from('workstations')
          .select('name')
          .eq('id', workstationId)
          .single();
          
        if (!workstation) return [];
        
        // Find rush tasks for this workstation
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('is_rush', true)
          .in('status', ['TODO', 'IN_PROGRESS'])
          .eq('workstation', workstation.name);
          
        if (error) throw error;
        return data as Task[] || [];
      } catch (error) {
        console.error('Error fetching rush tasks:', error);
        return [];
      }
    },
    enabled: !!workstationId,
  });
  
  if (isLoading || isLoadingTasks) {
    return <div className="mt-4 text-sm text-gray-500">Loading rush orders...</div>;
  }
  
  const hasRushTasks = rushTasks && rushTasks.length > 0;
  const hasRushOrders = rushOrders && rushOrders.length > 0;
  
  if (!hasRushOrders && !hasRushTasks) {
    return null;
  }
  
  return (
    <div className="mt-6">
      <h3 className="text-lg font-medium text-red-700 mb-3 flex items-center">
        <span className="bg-red-100 text-red-800 px-2 py-1 rounded-md">RUSH ORDERS</span>
        <span className="ml-2">({(rushOrders?.length || 0) + (rushTasks?.length || 0)})</span>
      </h3>
      
      <div className="grid grid-cols-1 gap-4">
        {rushOrders?.map(rushOrder => (
          <RushOrderWorkstationItem key={rushOrder.id} rushOrder={rushOrder} />
        ))}
        
        {/* Show rush tasks that may not be linked via the old method */}
        {rushTasks?.map(task => (
          <div key={task.id} className="p-4 rounded-md border border-red-200 bg-red-50">
            <div className="flex flex-col">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-red-700">{task.title}</h4>
                  <p className="text-sm text-gray-600">{task.description}</p>
                </div>
                <div>
                  <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded">
                    Due: {new Date(task.due_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="mt-2">
                <span className="text-xs text-gray-500">
                  Status: {task.status}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkstationRushOrdersDisplay;
