
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Plus, Trash } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { projectService, phaseService } from '@/services/dataService';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from './ui/scroll-area';
import { Checkbox } from './ui/checkbox';

const formSchema = z.object({
  name: z.string().min(1, { message: 'Project name is required' }),
  client: z.string().min(1, { message: 'Client name is required' }),
  description: z.string().optional(),
  start_date: z.date({ required_error: 'Start date is required' }),
  installation_date: z.date({ required_error: 'Installation date is required' }),
}).refine(
  (data) => {
    return data.installation_date >= data.start_date;
  },
  {
    message: 'Installation date must be after start date',
    path: ['installation_date'],
  }
);

type FormValues = z.infer<typeof formSchema>;

interface NewProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// Standard phases that will always be available for selection
const STANDARD_PHASES = [
  { id: '01', name: 'Prog. Vectorworks', workstation: 'productievoorbereiding' },
  { id: '02', name: 'Bestellen E&S + WB', workstation: 'productievoorbereiding' },
  { id: '03', name: 'Prog. Korpus', workstation: 'productiesturing' },
  { id: '04', name: 'Bestellen lades', workstation: '' },
  { id: '05', name: 'Klaarleggen', workstation: 'beslag, toebehoren, platen, kanten' },
  { id: '06', name: 'Bestel Toebehoren', workstation: '' },
  { id: '07', name: 'Bestel Plaatmateriaal en kanten', workstation: '' },
  { id: '08', name: 'Bestel Fronten', workstation: '' },
  { id: '09', name: 'Levering Kantenband', workstation: '' },
  { id: '10', name: 'Levering Korpusmateriaal', workstation: '' },
  { id: '11', name: 'Levering Frontmateriaal', workstation: '' },
  { id: '12', name: 'Korpusmateriaal Zagen', workstation: 'Opdeelzaag 1' },
  { id: '13', name: 'Korpusmateriaal Zagen', workstation: 'Opdeelzaag 2' },
  { id: '14', name: 'Frontmateriaal Zagen', workstation: 'Opdeelzaag 1' },
  { id: '15', name: 'Frontmateriaal Zagen', workstation: 'Opdeelzaag 2' },
  { id: '16', name: 'Korpusmateriaal Kanten plakken', workstation: '' },
  { id: '17', name: 'Frontmateriaal Kanten plakken', workstation: '' },
  { id: '18', name: 'Korpusmateriaal Drevelen', workstation: 'Drevelaar' },
  { id: '19', name: 'Korpusmateriaal Boren - frezen', workstation: 'CNC' },
  { id: '20', name: 'Frontmateriaal Boren - frezen', workstation: 'CNC' },
  { id: '21', name: 'Levering Lades', workstation: '' },
  { id: '22', name: 'Levering Toebehoren', workstation: '' },
  { id: '23', name: 'Levering Glas, Spiegel, Verstevigings kader', workstation: '' },
  { id: '24', name: 'Levering Bestelde Fronten', workstation: '' },
  { id: '25', name: 'Controleren Toebehoren etiketteren', workstation: '' },
  { id: '26', name: 'Controleren Glas, Spiegel, Verstevigings kader etiketteren', workstation: '' },
  { id: '27', name: 'Controleren Fronten etiketteren', workstation: '' },
  { id: '28', name: 'Controleren Lak / Fineer etiketteren', workstation: '' },
  { id: '29', name: 'Controleren Lakwerk / Fineer BESTELD etiketteren', workstation: '' },
  { id: '30', name: 'Lakwerk / Fineer BESTELD Boren - frezen', workstation: 'CNC' },
  { id: '31', name: 'Leggers opkuisen en controleren maatvoering + ev. programmatie', workstation: '' },
  { id: '32', name: 'Controleren Werkblad', workstation: '' },
  { id: '33', name: 'Monteren Korpus', workstation: 'Pers' },
  { id: '34', name: 'Monteren Korpus Manueel / Speciaal maatwerk', workstation: '' },
  { id: '35', name: 'Afwerken Vervolledigen checklist', workstation: '' },
  { id: '36', name: 'Lades Plaatsen Korpus', workstation: '' },
  { id: '37', name: 'Fronten Plaatsen Korpus', workstation: '' },
  { id: '38', name: 'Levering Electro Controleren - etiketteren', workstation: '' },
  { id: '39', name: 'Controleren Electo en sanitair', workstation: '' },
  { id: '40', name: 'Project Eindcontrole Plaatsing (checklist)', workstation: '' },
  { id: '41', name: 'Project Naar bufferzone', workstation: '' },
  { id: '42', name: 'Project Laden vrachtwagen', workstation: '' },
  { id: '43', name: 'Project Plaatsen project', workstation: '' },
  { id: '44', name: 'Project Eindfactuur gemaakt', workstation: '' },
];

interface PhaseItem {
  id: string;
  name: string;
  workstation: string;
  selected?: boolean;
}

const NewProjectModal: React.FC<NewProjectModalProps> = ({
  open,
  onOpenChange,
  onSuccess
}) => {
  const { toast } = useToast();
  const [phases, setPhases] = useState<PhaseItem[]>(
    STANDARD_PHASES.map(phase => ({ ...phase, selected: true }))
  );
  const [newPhaseName, setNewPhaseName] = useState('');
  const [newPhaseWorkstation, setNewPhaseWorkstation] = useState('');
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      client: '',
      description: '',
      start_date: new Date(),
      installation_date: new Date(),
    },
  });

  const handleAddCustomPhase = () => {
    if (newPhaseName.trim()) {
      const nextId = (phases.length + 1).toString().padStart(2, '0');
      setPhases([
        ...phases, 
        { 
          id: nextId, 
          name: newPhaseName.trim(), 
          workstation: newPhaseWorkstation.trim(),
          selected: true 
        }
      ]);
      setNewPhaseName('');
      setNewPhaseWorkstation('');
    }
  };

  const handleRemovePhase = (index: number) => {
    setPhases(phases.filter((_, i) => i !== index));
  };

  const handleTogglePhase = (index: number) => {
    setPhases(phases.map((phase, i) => 
      i === index ? { ...phase, selected: !phase.selected } : phase
    ));
  };

  const onSubmit = async (data: FormValues) => {
    try {
      // First create the project
      const newProject = await projectService.create({
        name: data.name,
        client: data.client,
        description: data.description || null,
        start_date: format(data.start_date, 'yyyy-MM-dd'),
        installation_date: format(data.installation_date, 'yyyy-MM-dd'),
        status: 'planned',
        progress: 0,
      });
      
      // Then add the selected phases
      const selectedPhases = phases.filter(phase => phase.selected);
      
      // Calculate days between start and installation
      const totalDays = Math.ceil(
        (data.installation_date.getTime() - data.start_date.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      // Calculate phase durations based on the number of phases
      const daysPerPhase = Math.max(1, Math.floor(totalDays / selectedPhases.length));
      
      // Create all the phases with proper timing
      const phasePromises = selectedPhases.map((phase, index) => {
        const phaseStartDate = new Date(data.start_date);
        phaseStartDate.setDate(data.start_date.getDate() + (index * daysPerPhase));
        
        const phaseEndDate = new Date(phaseStartDate);
        // Last phase ends on installation date
        if (index === selectedPhases.length - 1) {
          phaseEndDate.setTime(data.installation_date.getTime());
        } else {
          phaseEndDate.setDate(phaseStartDate.getDate() + daysPerPhase - 1);
        }
        
        return phaseService.create({
          project_id: newProject.id,
          name: `${phase.id} - ${phase.name}${phase.workstation ? ` - ${phase.workstation}` : ''}`,
          start_date: format(phaseStartDate, 'yyyy-MM-dd'),
          end_date: format(phaseEndDate, 'yyyy-MM-dd'),
          progress: 0
        });
      });
      
      await Promise.all(phasePromises);
      
      toast({
        title: "Success",
        description: `Project created successfully with ${selectedPhases.length} phases`,
      });
      
      form.reset();
      setPhases(STANDARD_PHASES.map(phase => ({ ...phase, selected: true })));
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to create project: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh] pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Kitchen Pro - Client XYZ" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="client"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <FormControl>
                      <Input placeholder="Client Name" {...field} />
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
                      <Textarea 
                        placeholder="Project details..." 
                        className="resize-none" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date("1900-01-01")}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="installation_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Installation Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => 
                              date < new Date("1900-01-01") ||
                              (form.getValues("start_date") && date < form.getValues("start_date"))
                            }
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="border rounded-md p-4">
                <h3 className="font-medium mb-2">Project Phases</h3>
                
                <div className="space-y-2 mb-4 max-h-[300px] overflow-y-auto pr-2">
                  {phases.map((phase, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`phase-${index}`} 
                        checked={phase.selected} 
                        onCheckedChange={() => handleTogglePhase(index)} 
                      />
                      <label htmlFor={`phase-${index}`} className="text-sm flex-1">
                        {phase.id} - {phase.name}
                        {phase.workstation && <span className="text-muted-foreground ml-1">({phase.workstation})</span>}
                      </label>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleRemovePhase(index)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-1 gap-2 mt-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="New phase name"
                      value={newPhaseName}
                      onChange={(e) => setNewPhaseName(e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Workstation (optional)"
                      value={newPhaseWorkstation}
                      onChange={(e) => setNewPhaseWorkstation(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      type="button" 
                      size="icon" 
                      onClick={handleAddCustomPhase}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-4">
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit">Create Project</Button>
              </DialogFooter>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default NewProjectModal;
