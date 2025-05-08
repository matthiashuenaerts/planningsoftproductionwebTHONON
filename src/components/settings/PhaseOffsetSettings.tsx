
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
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
  DialogClose
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Edit, Trash, Loader2 } from 'lucide-react';
import {
  PhaseOffset,
  initializePhaseOffsets,
  getPhaseOffsets,
  addPhaseOffset,
  updatePhaseOffset,
  deletePhaseOffset
} from '@/services/phaseOffsetService';
import { supabase } from '@/integrations/supabase/client';

const PhaseOffsetSettings: React.FC = () => {
  const [phaseOffsets, setPhaseOffsets] = useState<PhaseOffset[]>([]);
  const [phases, setPhases] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOffset, setSelectedOffset] = useState<PhaseOffset | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm({
    defaultValues: {
      phase_id: '',
      days_before_installation: 0
    }
  });

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get all phases
      const { data: phaseData, error: phaseError } = await supabase
        .from('phases')
        .select('id, name')
        .order('name');
      
      if (phaseError) throw phaseError;
      setPhases(phaseData || []);
      
      try {
        // Try to get phase offsets
        const offsetData = await getPhaseOffsets();
        setPhaseOffsets(offsetData || []);
      } catch (error: any) {
        console.error("Error fetching phase offsets:", error);
        setPhaseOffsets([]);
        // If error occurs, table might not exist yet
        if (error.message.includes("does not exist")) {
          toast({
            title: "Database Setup Required",
            description: "The phase_offsets table needs to be created first",
            variant: "destructive"
          });
        }
      }
    } catch (error: any) {
      console.error('Error loading phase offset data:', error);
      toast({
        title: "Error",
        description: `Failed to load data: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenEdit = (offset: PhaseOffset) => {
    setSelectedOffset(offset);
    setIsEditing(true);
    form.reset({
      phase_id: offset.phase_id,
      days_before_installation: offset.days_before_installation
    });
    setDialogOpen(true);
  };

  const handleCreate = async (data: { phase_id: string; days_before_installation: number }) => {
    try {
      // Check if this phase already has an offset
      const existingOffset = phaseOffsets.find(offset => offset.phase_id === data.phase_id);
        
      if (existingOffset) {
        toast({
          title: "Error",
          description: "This phase already has an offset defined",
          variant: "destructive"
        });
        return;
      }
      
      await addPhaseOffset(data.phase_id, data.days_before_installation);
      
      toast({
        title: "Success",
        description: "Phase offset created successfully"
      });
      
      form.reset();
      setDialogOpen(false);
      loadData();
    } catch (error: any) {
      console.error('Error creating phase offset:', error);
      toast({
        title: "Error",
        description: `Failed to create phase offset: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const handleUpdate = async (data: { phase_id: string; days_before_installation: number }) => {
    if (!selectedOffset) return;
    
    try {
      await updatePhaseOffset(selectedOffset.id, data.days_before_installation);
      
      toast({
        title: "Success",
        description: "Phase offset updated successfully"
      });
      
      setIsEditing(false);
      setSelectedOffset(null);
      setDialogOpen(false);
      form.reset();
      loadData();
    } catch (error: any) {
      console.error('Error updating phase offset:', error);
      toast({
        title: "Error",
        description: `Failed to update phase offset: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (offset: PhaseOffset) => {
    try {
      setIsDeleting(true);
      
      await deletePhaseOffset(offset.id);
      
      toast({
        title: "Success",
        description: "Phase offset deleted successfully"
      });
      
      loadData();
    } catch (error: any) {
      console.error('Error deleting phase offset:', error);
      toast({
        title: "Error",
        description: `Failed to delete phase offset: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const setupPhaseOffsetsTable = async () => {
    try {
      setLoading(true);
      
      // Create the phase_offsets table using our service
      const success = await initializePhaseOffsets();
      
      if (success) {
        toast({
          title: "Success", 
          description: "Phase offsets table created successfully"
        });
        
        loadData();
      }
    } catch (error: any) {
      console.error('Error setting up phase offsets table:', error);
      toast({
        title: "Error",
        description: `Failed to setup table: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Phase Day Offsets</CardTitle>
            <CardDescription>Set the number of days before installation date that each phase should be completed</CardDescription>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                form.reset({ phase_id: '', days_before_installation: 0 });
                setIsEditing(false);
              }}>
                <PlusCircle className="mr-2 h-4 w-4" /> 
                Add Offset
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{isEditing ? 'Edit Phase Offset' : 'Add New Phase Offset'}</DialogTitle>
                <DialogDescription>
                  {isEditing 
                    ? 'Update the number of days before installation for this phase' 
                    : 'Set how many days before installation date this phase should be completed'}
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(isEditing ? handleUpdate : handleCreate)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="phase_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phase</FormLabel>
                        <FormControl>
                          <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={isEditing}
                            {...field}
                            required
                          >
                            <option value="" disabled>Select a phase</option>
                            {phases.map(phase => (
                              <option key={phase.id} value={phase.id}>{phase.name}</option>
                            ))}
                          </select>
                        </FormControl>
                        <FormDescription>
                          The phase this offset applies to
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="days_before_installation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Days Before Installation</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} 
                            required
                          />
                        </FormControl>
                        <FormDescription>
                          Number of days before the installation date that this phase should be completed
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end gap-3">
                    <Button
                      type="button" 
                      variant="outline"
                      onClick={() => {
                        setDialogOpen(false);
                        form.reset();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">{isEditing ? 'Update' : 'Create'}</Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="animate-spin h-6 w-6" />
            </div>
          ) : phaseOffsets.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <p className="text-center text-muted-foreground">
                No phase offsets configured yet. You may need to set up the phase_offsets table first.
              </p>
              <Button onClick={setupPhaseOffsetsTable}>
                Setup Phase Offsets Table
              </Button>
            </div>
          )}
          
          {phaseOffsets.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phase Name</TableHead>
                  <TableHead>Days Before Installation</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {phaseOffsets.map((offset) => (
                  <TableRow key={offset.id}>
                    <TableCell>{offset.phase_name}</TableCell>
                    <TableCell>{offset.days_before_installation} days</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleOpenEdit(offset)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDelete(offset)}
                          disabled={isDeleting}
                        >
                          <Trash className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PhaseOffsetSettings;
