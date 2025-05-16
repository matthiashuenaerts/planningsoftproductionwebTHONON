
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { rushOrderService } from '@/services/rushOrderService';
import RushOrderWorkstationItem from '@/components/rush-orders/RushOrderWorkstationItem';

interface WorkstationRushOrdersDisplayProps {
  workstationId: string;
}

const WorkstationRushOrdersDisplay: React.FC<WorkstationRushOrdersDisplayProps> = ({ workstationId }) => {
  const { data: rushOrders, isLoading } = useQuery({
    queryKey: ['workstationRushOrders', workstationId],
    queryFn: () => rushOrderService.getRushOrdersForWorkstation(workstationId),
    enabled: !!workstationId,
  });
  
  if (isLoading) {
    return <div className="mt-4 text-sm text-gray-500">Loading rush orders...</div>;
  }
  
  if (!rushOrders || rushOrders.length === 0) {
    return null;
  }
  
  return (
    <div className="mt-6">
      <h3 className="text-lg font-medium text-red-700 mb-3 flex items-center">
        <span className="bg-red-100 text-red-800 px-2 py-1 rounded-md">RUSH ORDERS</span>
        <span className="ml-2">({rushOrders.length})</span>
      </h3>
      
      <div className="grid grid-cols-1 gap-4">
        {rushOrders.map(rushOrder => (
          <RushOrderWorkstationItem key={rushOrder.id} rushOrder={rushOrder} />
        ))}
      </div>
    </div>
  );
};

export default WorkstationRushOrdersDisplay;
