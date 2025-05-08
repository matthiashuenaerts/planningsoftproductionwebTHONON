
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
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Edit, Trash, Loader2, Link, CheckCircle } from 'lucide-react';
import { StandardTask, standardTaskService } from '@/services/standardTaskService';
import { taskService } from '@/services/dataService';
import { TaskWorkstationsManager } from './TaskWorkstationsManager';
import { Badge } from '@/components/ui/badge';

// Interface for task items in the UI with additional display properties
interface StandardTaskUI {
  id: string;
  name: string;
  category: string;
  existsInDb: boolean;
  dbId?: string;
}

const StandardTaskSettings: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [standardTasks, setStandardTasks] = useState<StandardTaskUI[]>([]);
  const [dbTasks, setDbTasks] = useState<StandardTask[]>([]);
  const [managingWorkstationsTaskId, setManagingWorkstationsTaskId] = useState<string | null>(null);
  const { toast } = useToast();

  // Sample standard tasks for the UI
  const standardTasksList = [
    { id: "01", name: "Prog. Vectorworks", category: "productievoorbereiding" },
    { id: "02", name: "Bestellen E&S + WB", category: "productievoorbereiding" },
    { id: "03", name: "Prog. Korpus", category: "productiesturing" },
    { id: "04", name: "Bestellen lades", category: "productievoorbereiding" },
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
    { id: "31", name: "Leggers opkuisen en controleren maatvoering + ev. programmatie", category: "productievoorbereiding" },
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

  // Load saved standard tasks from database
  useEffect(() => {
    loadStandardTasks();
  }, []);

  const loadStandardTasks = async () => {
    setLoading(true);
    try {
      const tasks = await standardTaskService.getAll();
      setDbTasks(tasks);
      
      // Convert DB tasks to displayed format for the UI
      const uiTasks = standardTasksList.map(task => {
        // Check if this task exists in DB
        const dbTask = tasks.find(t => t.external_id === task.id);
        return {
          id: task.id,
          name: task.name,
          category: task.category,
          existsInDb: !!dbTask,
          dbId: dbTask?.id
        };
      });
      
      setStandardTasks(uiTasks);
    } catch (error: any) {
      console.error('Error loading standard tasks:', error);
      toast({
        title: "Error",
        description: `Failed to load standard tasks: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // This function would create tasks in the database from standard tasks
  const handleCreateTaskInDatabase = async (taskData: { id: string; name: string; category: string }) => {
    try {
      // Check if task already exists in database by external_id
      const existingTask = await standardTaskService.getByExternalId(taskData.id);
      
      if (existingTask) {
        // Task already exists, return its ID
        return existingTask.id;
      }
      
      // Create a new standard task in the database
      const newTaskData = await standardTaskService.create({
        external_id: taskData.id,
        name: taskData.name,
        category: taskData.category || null
      });
      
      toast({
        title: "Task Created",
        description: `Standard task "${taskData.name}" has been saved to the database`
      });
      
      return newTaskData.id;
    } catch (error: any) {
      console.error('Error creating standard task:', error);
      toast({
        title: "Error",
        description: `Failed to create standard task: ${error.message}`,
        variant: "destructive"
      });
      return null;
    }
  };

  // Open workstation assignment dialog
  const handleManageWorkstations = async (task: { id: string; name: string; category: string }) => {
    try {
      // First ensure the task exists in database
      const taskId = await handleCreateTaskInDatabase(task);
      
      if (taskId) {
        // Update UI to show task exists in DB
        setStandardTasks(prev => 
          prev.map(t => t.id === task.id ? { ...t, existsInDb: true, dbId: taskId } : t)
        );
        
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

  // This would save all tasks to the database
  const handleSaveAll = async () => {
    setSaving(true);
    
    try {
      // Convert UI tasks to DB format
      const tasksToSave = standardTasksList.map(task => ({
        external_id: task.id,
        name: task.name,
        category: task.category || null
      }));
      
      // Save all tasks to the database
      await standardTaskService.saveAll(tasksToSave);
      
      toast({
        title: "Success",
        description: "All standard tasks saved to database",
      });
      
      // Refresh the list to update status
      loadStandardTasks();
    } catch (error: any) {
      console.error('Error saving standard tasks:', error);
      toast({
        title: "Error",
        description: `Failed to save tasks: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Standard Tasks</CardTitle>
            <CardDescription>Standard tasks that can be assigned to workstations</CardDescription>
          </div>
          
          <Button 
            onClick={handleSaveAll}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Save All Tasks
              </>
            )}
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
                      <TableCell className="flex items-center gap-2">
                        {task.name}
                        {task.existsInDb && (
                          <Badge variant="outline" className="ml-2 text-xs bg-green-50 text-green-700 border-green-200">
                            Saved
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{task.category}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleManageWorkstations({
                            id: task.id,
                            name: task.name,
                            category: task.category
                          })}
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
