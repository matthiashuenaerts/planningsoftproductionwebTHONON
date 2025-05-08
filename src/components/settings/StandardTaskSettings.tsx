
import React, { useState } from 'react';
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
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Edit, Trash, Loader2 } from 'lucide-react';

const standardTasks = [
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

const StandardTaskSettings: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState<typeof standardTasks[0] | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const [newTask, setNewTask] = useState({
    id: '',
    name: '',
    category: ''
  });

  // This would normally save to the database, but for now it just shows a toast
  const handleSave = () => {
    toast({
      title: "Information",
      description: "This would save changes to the database. Feature not implemented yet.",
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {standardTasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell>{task.id}</TableCell>
                      <TableCell>{task.name}</TableCell>
                      <TableCell>{task.category}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StandardTaskSettings;
