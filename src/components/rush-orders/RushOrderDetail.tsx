
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { rushOrderService } from '@/services/rushOrderService';
import { AlertCircle, CheckCircle, Clock, User, PanelRight } from 'lucide-react';
import { RushOrder } from '@/types/rushOrder';
import { useAuth } from '@/context/AuthContext';
import { Link } from 'react-router-dom';
import { Task } from '@/services/dataService';
import { supabase } from '@/integrations/supabase/client';

interface RushOrderDetailProps {
  rushOrderId: string;
  onStatusChange?: () => void;
}

const RushOrderDetail: React.FC<RushOrderDetailProps> = ({ rushOrderId, onStatusChange }) => {
  const { toast } = useToast();
  const { currentEmployee } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [standardTasks, setStandardTasks] = useState<any[]>([]);
  const [assignees, setAssignees] = useState<any[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const { data: rushOrder, isLoading, error, refetch } = useQuery({
    queryKey: ['rushOrder', rushOrderId],
    queryFn: () => rushOrderService.getRushOrderById(rushOrderId),
  });
  
  // Fetch actual tasks linked to this rush order
  useEffect(() => {
    const fetchTasks = async () => {
      if (!rushOrderId) return;
      
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select(`
            *,
            phases:phase_id(name, project_id),
            projects:phases(project_id(name))
          `)
          .eq('rush_order_id', rushOrderId);
        
        if (error) throw error;
        
        if (data) {
          setTasks(data as Task[]);
        }
      } catch (error) {
        console.error('Error fetching rush order tasks:', error);
      }
    };
    
    fetchTasks();
  }, [rushOrderId]);
  
  // Fetch standard tasks and assignees for context
  useEffect(() => {
    if (!rushOrder) return;
    
    const fetchContextData = async () => {
      try {
        // Fetch standard task info
        if (rushOrder.tasks && rushOrder.tasks.length > 0) {
          const standardTaskIds = rushOrder.tasks.map(task => task.standard_task_id);
          
          const { data: stdTasks, error: stdTaskError } = await supabase
            .from('standard_tasks')
            .select('*')
            .in('id', standardTaskIds);
            
          if (stdTaskError) throw stdTaskError;
          
          setStandardTasks(stdTasks || []);
        }
        
        // Fetch assignee info
        if (rushOrder.assignments && rushOrder.assignments.length > 0) {
          const employeeIds = rushOrder.assignments.map(assign => assign.employee_id);
          
          const { data: employees, error: empError } = await supabase
            .from('employees')
            .select('id, name, role')
            .in('id', employeeIds);
            
          if (empError) throw empError;
          
          setAssignees(employees || []);
        }
      } catch (error) {
        console.error('Error fetching context data:', error);
      }
    };
    
    fetchContextData();
  }, [rushOrder]);
  
  const handleStatusChange = async (newStatus: "pending" | "in_progress" | "completed") => {
    if (!rushOrder || !currentEmployee) return;
    
    setIsUpdating(true);
    
    try {
      const success = await rushOrderService.updateRushOrderStatus(rushOrderId, newStatus);
      
      if (!success) throw new Error("Failed to update status");
      
      // Create notification for all users when status changes
      let message = '';
      
      switch(newStatus) {
        case 'in_progress':
          message = `Rush order "${rushOrder.title}" has been started`;
          break;
        case 'completed':
          message = `Rush order "${rushOrder.title}" has been completed`;
          break;
        default:
          message = `Rush order "${rushOrder.title}" status changed to ${newStatus}`;
      }
      
      await rushOrderService.notifyAllUsers(rushOrderId, message);
      
      toast({
        description: `Rush order status updated to ${newStatus}`
      });
      
      refetch();
      if (onStatusChange) onStatusChange();
    } catch (error) {
      console.error('Error updating rush order status:', error);
      toast({
        title: "Error",
        description: "Failed to update rush order status",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (error || !rushOrder) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <AlertCircle className="h-10 w-10 text-destructive mb-2" />
            <p className="text-destructive">Failed to load rush order details</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      <Card className="w-full">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                {rushOrder.title}
                <Badge 
                  className={
                    rushOrder.status === 'pending' 
                      ? 'bg-yellow-500' 
                      : rushOrder.status === 'in_progress' 
                        ? 'bg-blue-500' 
                        : 'bg-green-500'
                  }
                >
                  {rushOrder.status}
                </Badge>
              </CardTitle>
              <CardDescription className="text-sm mt-2">
                Created on {format(new Date(rushOrder.created_at), 'MMMM d, yyyy')}
              </CardDescription>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {rushOrder.status === 'pending' && (
                <Button 
                  onClick={() => handleStatusChange('in_progress')}
                  disabled={isUpdating}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Start Work
                </Button>
              )}
              {rushOrder.status === 'in_progress' && (
                <Button 
                  onClick={() => handleStatusChange('completed')}
                  disabled={isUpdating}
                  variant="default"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark Completed
                </Button>
              )}
              {rushOrder.status === 'completed' && (
                <Button 
                  onClick={() => handleStatusChange('in_progress')}
                  disabled={isUpdating}
                  variant="outline"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Reopen
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-medium mb-2">Description</h3>
            <p className="text-gray-600 dark:text-gray-300">{rushOrder.description}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Deadline</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-semibold flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-amber-500" />
                  {format(new Date(rushOrder.deadline), 'MMMM d, yyyy')}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Priority</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="destructive">
                  {rushOrder.priority}
                </Badge>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Assigned Team Members</CardTitle>
              </CardHeader>
              <CardContent>
                {assignees.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {assignees.map(emp => (
                      <Badge key={emp.id} variant="outline" className="flex items-center">
                        <User className="h-3 w-3 mr-1" />
                        {emp.name}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No team members assigned</p>
                )}
              </CardContent>
            </Card>
          </div>
          
          {rushOrder.image_url && (
            <div>
              <h3 className="font-medium mb-2">Image</h3>
              <div className="max-w-md border rounded overflow-hidden">
                <img 
                  src={rushOrder.image_url} 
                  alt="Rush order reference" 
                  className="w-full h-auto object-contain"
                />
              </div>
            </div>
          )}
          
          <div>
            <h3 className="font-medium mb-2">Tasks</h3>
            <div className="space-y-2">
              {tasks.length > 0 ? (
                tasks.map(task => (
                  <Card key={task.id} className="bg-red-50 border border-red-100">
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:justify-between gap-2">
                        <div>
                          <h4 className="font-medium text-red-700">{task.title}</h4>
                          <p className="text-sm text-gray-600">{task.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            task.status === 'COMPLETED' 
                              ? 'default' 
                              : task.status === 'IN_PROGRESS'
                                ? 'secondary'
                                : 'outline'
                          }>
                            {task.status}
                          </Badge>
                          <Badge variant="outline">{task.workstation}</Badge>
                          <Link to="/personal-tasks">
                            <Button variant="ghost" size="sm">
                              <PanelRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p className="text-gray-500 text-sm">No tasks associated with this rush order</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RushOrderDetail;
