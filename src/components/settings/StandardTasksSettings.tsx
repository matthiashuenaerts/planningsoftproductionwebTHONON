
import React, { useState, useEffect } from 'react';
import { StandardTask, StandardTaskLimitPhase, standardTasksService } from '@/services/standardTasksService';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { Save, Plus, X } from 'lucide-react';

const StandardTasksSettings: React.FC = () => {
  const [standardTasks, setStandardTasks] = useState<StandardTask[]>([]);
  const [limitPhases, setLimitPhases] = useState<Record<string, StandardTaskLimitPhase[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [availablePhases, setAvailablePhases] = useState<string[]>([
    'Design', 'Production', 'Assembly', 'Quality Control', 'Packaging', 'Installation'
  ]);
  const { toast } = useToast();

  const form = useForm({
    defaultValues: {
      phase: '',
    }
  });

  useEffect(() => {
    const fetchStandardTasks = async () => {
      try {
        const tasks = await standardTasksService.getAll();
        setStandardTasks(tasks);
        
        // Fetch limit phases for each task
        const limitPhasesData: Record<string, StandardTaskLimitPhase[]> = {};
        for (const task of tasks) {
          const phases = await standardTasksService.getLimitPhases(task.id);
          limitPhasesData[task.id] = phases;
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

    fetchStandardTasks();
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

  const handleAddLimitPhase = async (taskId: string, phaseName: string) => {
    try {
      const newPhase = await standardTasksService.addLimitPhase(taskId, phaseName);
      setLimitPhases(prev => ({
        ...prev,
        [taskId]: [...(prev[taskId] || []), newPhase]
      }));
      form.reset();
      
      toast({
        title: 'Success',
        description: `Added "${phaseName}" as a limit phase`,
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

  const handleRemoveLimitPhase = async (taskId: string, phaseId: string) => {
    try {
      await standardTasksService.removeLimitPhase(phaseId);
      setLimitPhases(prev => ({
        ...prev,
        [taskId]: prev[taskId].filter(phase => phase.id !== phaseId)
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
                <TableHead className="w-32">Limit Phases</TableHead>
                <TableHead className="w-20">Actions</TableHead>
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
                      <div className="flex flex-wrap gap-1 mb-2">
                        {taskLimitPhases.map(phase => (
                          <Badge key={phase.id} variant="outline" className="flex items-center gap-1">
                            {phase.phase_name}
                            <button 
                              className="ml-1 hover:text-destructive"
                              onClick={() => handleRemoveLimitPhase(task.id, phase.id)}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full flex items-center justify-center"
                          >
                            <Plus className="h-4 w-4 mr-1" /> Add Limit Phase
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Limit Phase</DialogTitle>
                            <DialogDescription>
                              Select a phase that must be completed before this task can be shown as "to do".
                            </DialogDescription>
                          </DialogHeader>
                          <Form {...form}>
                            <form 
                              onSubmit={form.handleSubmit((values) => {
                                handleAddLimitPhase(task.id, values.phase);
                              })}
                              className="space-y-4"
                            >
                              <FormField
                                control={form.control}
                                name="phase"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Phase</FormLabel>
                                    <FormControl>
                                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select a phase" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {availablePhases.map(phase => (
                                            <SelectItem key={phase} value={phase}>{phase}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <DialogFooter>
                                <Button type="submit">Add Phase</Button>
                              </DialogFooter>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
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
