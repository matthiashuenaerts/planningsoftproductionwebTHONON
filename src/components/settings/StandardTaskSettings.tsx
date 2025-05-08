
import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Edit, Trash, Loader2, Link } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { taskService } from '@/services/dataService';
import { workstationService } from '@/services/workstationService';
import { TaskWorkstationsManager } from './TaskWorkstationsManager';

// Define types for standard tasks
interface StandardTask {
  id: string;
  name: string;
  category: string;
}

const StandardTaskSettings: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [standardTasks, setStandardTasks] = useState<StandardTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<StandardTask | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [managingWorkstationsTaskId, setManagingWorkstationsTaskId] = useState<string | null>(null);
  const { toast } = useToast();

  const [newTask, setNewTask] = useState({
    id: '',
    name: '',
    category: ''
  });

  // Load standard tasks
  useEffect(() => {
    loadStandardTasks();
  }, []);

  const loadStandardTasks = async () => {
    setLoading(true);
    try {
      // In a real app, we would fetch this from the database
      // For now, using the static data
      const tasks = [
        { id: "01", name: "Prog. Vectorworks", category: "productievoorbereiding" },
        { id: "02", name: "Bestellen E&S + WB", category: "productievoorbereiding" },
        { id: "03", name: "Prog. Korpus", category: "productiesturing" },
        { id: "04", name: "Bestellen lades", category: "" },
        { id: "05", name: "Klaarleggen", category: "beslag, toebehoren, platen, kanten" },
        { id: "06", name: "Bestel", category: "Toebehoren" },
        { id: "07", name: "Bestel", category: "Plaatmateriaal en kanten" },
        { id: "08", name: "Bestel", category: "Fronten" },
        { id: "09", name: "Levering", category: "Kantenband" },
        { id: "10", name: "Levering", category: "Korpusmateriaal" },
        { id: "11", name: "Levering", category: "Frontmateriaal" },
        { id: "12", name: "Korpusmateriaal", category: "Zagen >> Opdeelzaag 1" },
        { id: "13", name: "Korpusmateriaal", category: "Zagen >> Opdeelzaag 2" },
        { id: "14", name: "Frontmateriaal", category: "Zagen >> Opdeelzaag 1" },
        { id: "15", name: "Frontmateriaal", category: "Zagen >> Opdeelzaag 2" },
        { id: "16", name: "Korpusmateriaal", category: "Kanten plakken" },
        { id: "17", name: "Frontmateriaal", category: "Kanten plakken" },
        { id: "18", name: "Korpusmateriaal", category: "Drevelen >> Drevelaar" },
        { id: "19", name: "Korpusmateriaal", category: "Boren - frezen >> CNC" },
        { id: "20", name: "Frontmateriaal", category: "Boren - frezen >> CNC" },
        { id: "21", name: "Levering", category: "Lades" },
        { id: "22", name: "Levering", category: "Toebehoren" },
        { id: "23", name: "Levering", category: "Glas, Spiegel, Verstevigings kader" },
        { id: "24", name: "Levering", category: "Bestelde Fronten" },
        { id: "25", name: "Controleren", category: "Toebehoren >> etiketteren" },
        { id: "26", name: "Controleren", category: "Glas, Spiegel, Verstevigings kader >> etiketteren" },
        { id: "27", name: "Controleren", category: "Fronten >> etiketteren" },
        { id: "28", name: "Controleren", category: "Lak / Fineer >> etiketteren" },
        { id: "29", name: "Controleren", category: "Lakwerk / Fineer BESTELD >> etiketteren" },
        { id: "30", name: "Lakwerk / Fineer BESTELD", category: "Boren - frezen >> CNC" },
        { id: "31", name: "Leggers opkuisen en controleren maatvoering + ev. programmatie", category: "" },
        { id: "32", name: "Controleren", category: "Werkblad" },
        { id: "33", name: "Monteren", category: "Korpus >> Pers" },
        { id: "34", name: "Monteren", category: "Korpus >> Manueel / Speciaal maatwerk" },
        { id: "35", name: "Afwerken", category: "Vervolledigen checklist." },
        { id: "36", name: "Lades", category: "Plaatsen >> Korpus" },
        { id: "37", name: "Fronten", category: "Plaatsen >> Korpus" },
        { id: "38", name: "Levering", category: "Electro >> Controleren - etiketteren" },
        { id: "39", name: "Controleren", category: "Electo en sanitair" },
        { id: "40", name: "Project", category: "Eindcontrole >> Plaatsing (checklist)" },
        { id: "41", name: "Project", category: "Naar bufferzone" },
        { id: "42", name: "Project", category: "Laden vrachtwagen" },
        { id: "43", name: "Project", category: "Plaatsen project" },
        { id: "44", name: "Project", category: "Eindfactuur gemaakt" }
      ];
      
      // In a real application, we would convert these tasks to actual database tasks
      const convertedTasks = tasks.map(task => ({
        ...task,
        // Convert task to database format if needed
      }));
      
      setStandardTasks(tasks);
    } catch (error) {
      console.error('Error loading standard tasks:', error);
      toast({
        title: "Error",
        description: "Failed to load standard tasks",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // This function would create tasks in the database from standard tasks
  const handleCreateTaskInDatabase = async (taskData: StandardTask) => {
    try {
      // First check if task already exists in database
      const { data: existingTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('title', taskData.name)
        .limit(1);
      
      if (existingTasks && existingTasks.length > 0) {
        // Task already exists
        return existingTasks[0].id;
      }
      
      // Create a new task in the database
      const newTaskData = await taskService.create({
        title: taskData.name,
        description: taskData.category ? `Category: ${taskData.category}` : undefined,
        phase_id: '00000000-0000-0000-0000-000000000000', // Placeholder - would be replaced with actual phase in real usage
        due_date: new Date().toISOString().split('T')[0], // Today as default
        status: 'PLANNED',
        priority: 'MEDIUM',
        workstation: 'default'  // Default workstation
      });
      
      toast({
        title: "Task Created",
        description: `Task "${taskData.name}" has been created in the database`
      });
      
      return newTaskData.id;
    } catch (error: any) {
      console.error('Error creating task:', error);
      toast({
        title: "Error",
        description: `Failed to create task: ${error.message}`,
        variant: "destructive"
      });
      return null;
    }
  };

  // Open workstation assignment dialog
  const handleManageWorkstations = async (task: StandardTask) => {
    try {
      // First ensure the task exists in database
      const taskId = await handleCreateTaskInDatabase(task);
      
      if (taskId) {
        setManagingWorkstationsTaskId(taskId);
      }
    } catch (error) {
      console.error('Error preparing workstation management:', error);
    }
  };

  // Close workstation assignment dialog
  const handleCloseWorkstationManager = () => {
    setManagingWorkstationsTaskId(null);
  };

  // This would normally save all changes to the database
  const handleSave = () => {
    toast({
      title: "Information",
      description: "This would save changes to the database. All standard tasks are now available for assignment.",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Standard Tasks</CardTitle>
            <CardDescription>Standard tasks that can be assigned to project phases</CardDescription>
          </div>
          
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="animate-spin h-6 w-6" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">ID</TableHead>
                    <TableHead>Task Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {standardTasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell>{task.id}</TableCell>
                      <TableCell>{task.name}</TableCell>
                      <TableCell>{task.category}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleManageWorkstations(task)}
                          title="Assign to workstations"
                        >
                          <Link className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog for managing workstation assignments */}
      <Dialog open={!!managingWorkstationsTaskId} onOpenChange={(open) => {
        if (!open) handleCloseWorkstationManager();
      }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign Task to Workstations</DialogTitle>
            <DialogDescription>
              Select which workstations this task should be assigned to
            </DialogDescription>
          </DialogHeader>

          {managingWorkstationsTaskId && (
            <div className="py-4">
              <TaskWorkstationsManager 
                taskId={managingWorkstationsTaskId} 
                onClose={handleCloseWorkstationManager}
              />
            </div>
          )}

          <DialogFooter>
            <Button onClick={handleCloseWorkstationManager}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StandardTaskSettings;
