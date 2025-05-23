
import React, { useState, useEffect } from 'react';
import {
  CheckboxCard
} from '@/components/settings/CheckboxCard';
import { useToast } from '@/hooks/use-toast';
import { workstationService, Workstation } from '@/services/workstationService';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface EmployeeWorkstationsManagerProps {
  employeeId: string;
  employeeName: string;
}

export const EmployeeWorkstationsManager: React.FC<EmployeeWorkstationsManagerProps> = ({ 
  employeeId,
  employeeName
}) => {
  const [loading, setLoading] = useState(true);
  const [workstations, setWorkstations] = useState<Workstation[]>([]);
  const [workstationLinks, setWorkstationLinks] = useState<Record<string, boolean>>({});
  const [processingWorkstation, setProcessingWorkstation] = useState<string | null>(null);
  const { toast } = useToast();

  // Load all workstations and the linked workstations for this employee
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Get all workstations
        const allWorkstations = await workstationService.getAll();
        setWorkstations(allWorkstations);
        
        // Get all employee-workstation links for this employee
        const links = await supabase
          .from('employee_workstation_links')
          .select('workstation_id')
          .eq('employee_id', employeeId);
        
        if (links.error) throw links.error;
        
        // Create a map of workstation IDs to boolean (true if linked)
        const linkMap: Record<string, boolean> = {};
        links.data.forEach(link => {
          linkMap[link.workstation_id] = true;
        });
        
        setWorkstationLinks(linkMap);
      } catch (error: any) {
        console.error('Error loading employee workstation data:', error);
        toast({
          title: "Error",
          description: `Failed to load data: ${error.message}`,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [employeeId]);
  
  const handleToggleWorkstation = async (workstationId: string, checked: boolean) => {
    try {
      setProcessingWorkstation(workstationId);
      
      if (checked) {
        // Link employee to workstation
        await workstationService.linkEmployeeToWorkstation(employeeId, workstationId);
        setWorkstationLinks(prev => ({ ...prev, [workstationId]: true }));
      } else {
        // Unlink employee from workstation
        await workstationService.unlinkEmployeeFromWorkstation(employeeId, workstationId);
        setWorkstationLinks(prev => ({ ...prev, [workstationId]: false }));
      }
      
      toast({
        title: "Success",
        description: checked 
          ? `Employee assigned to workstation` 
          : `Employee removed from workstation`
      });
    } catch (error: any) {
      console.error('Error updating employee workstation:', error);
      toast({
        title: "Error",
        description: `Failed to update: ${error.message}`,
        variant: "destructive"
      });
      // Revert UI change
      setWorkstationLinks(prev => ({ ...prev, [workstationId]: !checked }));
    } finally {
      setProcessingWorkstation(null);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="py-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workstations.length === 0 ? (
          <p className="col-span-full text-center text-muted-foreground py-8">
            No workstations found in the system
          </p>
        ) : (
          workstations.map(workstation => (
            <CheckboxCard
              key={workstation.id}
              id={workstation.id}
              title={workstation.name}
              description={workstation.description || 'No description'}
              checked={!!workstationLinks[workstation.id]}
              onCheckedChange={(checked) => handleToggleWorkstation(workstation.id, checked)}
              disabled={processingWorkstation === workstation.id}
            />
          ))
        )}
      </div>
    </div>
  );
};
