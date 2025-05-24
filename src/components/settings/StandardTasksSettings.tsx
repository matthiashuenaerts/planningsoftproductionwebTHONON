
import React, { useState, useEffect } from 'react';
import { StandardTask, standardTasksService } from '@/services/standardTasksService';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Save, Plus, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface LimitPhase {
  id: string;
  phase_name: string;
}

const StandardTasksSettings: React.FC = () => {
  const [standardTasks, setStandardTasks] = useState<StandardTask[]>([]);
  const [limitPhases, setLimitPhases] = useState<Record<string, LimitPhase[]>>({});
  const [allPhases, setAllPhases] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const tasks = await standardTasksService.getAll();
        setStandardTasks(tasks);
        
        // Fetch all unique phase names from existing projects
        const phases = await standardTasksService.getAllPhaseNames();
        setAllPhases(phases);
        
        // Fetch limit phases for each standard task
        const limitPhasesData: Record<string, LimitPhase[]> = {};
        for (const task of tasks) {
          const taskLimitPhases = await standardTasksService.getLimitPhases(task.id);
          limitPhasesData[task.id] = taskLimitPhases;
        }
        setLimitPhases(limitPhasesData);
      } catch (error) {
        console.error('Error loading standard tasks:', error);
        toast({
          title: 'Error loading standard tasks',
          description: 'Failed to load standard tasks. Please try again.',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  const getTaskNameParts = (taskName: string): string[] => {
    return standardTasksService.getTaskNameParts(taskName);
  };

  const handleCoefficientChange = (taskId: string, value: string) => {
    const updatedTasks = standardTasks.map(task => {
      if (task.id === taskId) {
        return { ...task, time_coefficient: parseFloat(value) || 0 };
      }
      return task;
    });
    setStandardTasks(updatedTasks);
  };

  const saveTimeCoefficient = async (task: StandardTask) => {
    setSaving(prev => ({ ...prev, [task.id]: true }));
    try {
      await standardTasksService.updateTimeCoefficient(task.id, task.time_coefficient);
      toast({
        title: 'Success',
        description: `Time coefficient for ${task.task_number} updated successfully`,
      });
    } catch (error) {
      console.error('Error updating time coefficient:', error);
      toast({
        title: 'Error',
        description: 'Failed to update time coefficient. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSaving(prev => ({ ...prev, [task.id]: false }));
    }
  };

  const addLimitPhase = async (taskId: string, phaseName: string) => {
    try {
      const newLimitPhase = await standardTasksService.addLimitPhase(taskId, phaseName);
      setLimitPhases(prev => ({
        ...prev,
        [taskId]: [...(prev[taskId] || []), newLimitPhase]
      }));
      toast({
        title: 'Success',
        description: 'Limit phase added successfully',
      });
    } catch (error) {
      console.error('Error adding limit phase:', error);
      toast({
        title: 'Error',
        description: 'Failed to add limit phase. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const removeLimitPhase = async (taskId: string, limitPhaseId: string) => {
    try {
      await standardTasksService.removeLimitPhase(limitPhaseId);
      setLimitPhases(prev => ({
        ...prev,
        [taskId]: prev[taskId]?.filter(phase => phase.id !== limitPhaseId) || []
      }));
      toast({
        title: 'Success',
        description: 'Limit phase removed successfully',
      });
    } catch (error) {
      console.error('Error removing limit phase:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove limit phase. Please try again.',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium">Standard Tasks</h2>
      
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Task #</TableHead>
                <TableHead>Task Name</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="w-32">Time Coefficient</TableHead>
                <TableHead className="w-20">Actions</TableHead>
                <TableHead className="w-64">Limit Phases</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {standardTasks.map((task) => {
                const taskParts = getTaskNameParts(task.task_name);
                const taskLimitPhases = limitPhases[task.id] || [];
                
                return (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.task_number}</TableCell>
                    <TableCell>{task.task_name}</TableCell>
                    <TableCell>
                      {taskParts.length > 1 ? (
                        <div className="text-xs text-muted-foreground">
                          {taskParts.map((part, index) => (
                            <span key={index} className="mr-1">
                              {index > 0 && <span className="mx-1">→</span>}
                              {part}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        step="0.1"
                        min="0"
                        value={task.time_coefficient} 
                        onChange={(e) => handleCoefficientChange(task.id, e.target.value)}
                        className="w-full"
                      />
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => saveTimeCoefficient(task)} 
                        disabled={saving[task.id]}
                        className="w-full"
                      >
                        {saving[task.id] ? (
                          <div className="animate-spin h-4 w-4 border-2 border-b-transparent rounded-full"></div>
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-1">
                          {taskLimitPhases.map((limitPhase) => (
                            <Badge key={limitPhase.id} variant="secondary" className="flex items-center gap-1">
                              {limitPhase.phase_name}
                              <button
                                onClick={() => removeLimitPhase(task.id, limitPhase.id)}
                                className="ml-1 hover:text-red-500"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                        <Select onValueChange={(phaseName) => addLimitPhase(task.id, phaseName)}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Add limit phase" />
                          </SelectTrigger>
                          <SelectContent>
                            {allPhases
                              .filter(phaseName => !taskLimitPhases.some(lp => lp.phase_name === phaseName))
                              .map((phaseName) => (
                                <SelectItem key={phaseName} value={phaseName}>
                                  {phaseName}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default StandardTasksSettings;
