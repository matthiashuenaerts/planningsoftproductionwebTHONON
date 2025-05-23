import React, { useState, useEffect } from 'react';
import { workstationService, Workstation } from '@/services/workstationService';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Edit, Trash2, Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { TaskWorkstationsManager } from './TaskWorkstationsManager';

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Workstation name must be at least 2 characters.",
  }),
  description: z.string().optional(),
})

interface WorkstationFormValues extends z.infer<typeof formSchema> {}

const WorkstationSettings: React.FC = () => {
  const [workstations, setWorkstations] = useState<Workstation[]>([]);
  const [open, setOpen] = useState(false);
  const [editingWorkstation, setEditingWorkstation] = useState<Workstation | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<WorkstationFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
    },
    mode: "onChange",
  });

  useEffect(() => {
    const loadWorkstations = async () => {
      try {
        const data = await workstationService.getAll();
        setWorkstations(data);
      } catch (error: any) {
        toast({
          title: "Error",
          description: `Failed to load workstations: ${error.message}`,
          variant: "destructive"
        });
      }
    };

    loadWorkstations();
  }, [toast]);

  const handleCreateWorkstation = async (values: WorkstationFormValues) => {
    try {
      setIsSubmitting(true);
      
      // Extract name and description from values
      const { name, description } = values;
      
      const workstation = await workstationService.create(name, description || undefined);
      
      setWorkstations([...workstations, workstation]);
      form.reset({ name: '', description: '' });
      setOpen(false);
      
      toast({
        title: "Success",
        description: `Workstation "${name}" created successfully`,
      });
    } catch (error: any) {
      console.error('Error creating workstation:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create workstation",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateWorkstation = async (values: WorkstationFormValues) => {
    if (!editingWorkstation) return;
    
    try {
      setIsSubmitting(true);
      
      // Extract name and description from values
      const { name, description } = values;
      
      const updated = await workstationService.update(
        editingWorkstation.id,
        name,
        description || undefined
      );
      
      // Update the workstations list
      setWorkstations(workstations.map(w => 
        w.id === editingWorkstation.id ? updated : w
      ));
      
      setEditingWorkstation(null);
      
      toast({
        title: "Success",
        description: `Workstation "${name}" updated successfully`,
      });
    } catch (error: any) {
      console.error('Error updating workstation:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update workstation",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteWorkstation = async (id: string, name: string) => {
    try {
      await workstationService.delete(id);
      setWorkstations(workstations.filter(w => w.id !== id));
      toast({
        title: "Success",
        description: `Workstation "${name}" deleted successfully`,
      });
    } catch (error: any) {
      console.error('Error deleting workstation:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete workstation",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Workstations</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Add Workstation
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Workstation</DialogTitle>
              <DialogDescription>
                Create a new workstation to manage tasks.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateWorkstation)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Workstation Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input placeholder="Workstation Description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Creating..." : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardContent>
          <Table>
            <TableCaption>A list of your workstations.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workstations.map((workstation) => (
                <TableRow key={workstation.id}>
                  <TableCell className="font-medium">{workstation.name}</TableCell>
                  <TableCell>{workstation.description}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={() => setEditingWorkstation(workstation)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Edit Workstation</DialogTitle>
                            <DialogDescription>
                              Edit the details of the workstation.
                            </DialogDescription>
                          </DialogHeader>
                          <Form {...form}>
                            <form onSubmit={form.handleSubmit(handleUpdateWorkstation)} className="space-y-4">
                              <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Workstation Name" defaultValue={workstation.name} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Workstation Description" defaultValue={workstation.description || ""} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <DialogFooter>
                                <Button type="submit" disabled={isSubmitting}>
                                  {isSubmitting ? "Updating..." : "Update"}
                                </Button>
                              </DialogFooter>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteWorkstation(workstation.id, workstation.name)}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {workstations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">
                    No workstations found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {workstations.map((workstation) => (
        <Card key={workstation.id}>
          <CardHeader>
            <CardTitle>Manage Tasks for {workstation.name}</CardTitle>
            <CardDescription>
              Assign standard tasks to this workstation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TaskWorkstationsManager workstationId={workstation.id} workstationName={workstation.name} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default WorkstationSettings;
