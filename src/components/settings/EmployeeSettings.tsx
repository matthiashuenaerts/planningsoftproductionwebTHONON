
import React, { useState, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, UserCog, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { employeeService } from '@/services/dataService';
import { EmployeeWorkstationsManager } from './EmployeeWorkstationsManager';
import { Employee } from '@/services/dataService';
import UserManagement from '../UserManagement';

const EmployeeSettings: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showWorkstationMapping, setShowWorkstationMapping] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const { toast } = useToast();

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const data = await employeeService.getAll();
      setEmployees(data);
    } catch (error: any) {
      console.error('Error loading employees:', error);
      toast({
        title: "Error",
        description: `Failed to load employees: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'manager': return 'default';
      case 'worker': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Employees</CardTitle>
            <CardDescription>Manage employee workstation assignments</CardDescription>
          </div>
          <Button onClick={() => setShowAddUser(true)}>
            <UserPlus className="mr-2 h-4 w-4" /> 
            Add User
          </Button>
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="animate-spin h-6 w-6" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No employees found
                    </TableCell>
                  </TableRow>
                ) : (
                  employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>{employee.name}</TableCell>
                      <TableCell className="hidden md:table-cell">{employee.email || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(employee.role)}>{employee.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedEmployee(employee);
                            setShowWorkstationMapping(true);
                          }}
                        >
                          <UserCog className="mr-2 h-4 w-4" />
                          Workstations
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new employee account
            </DialogDescription>
          </DialogHeader>
          <UserManagement onUserAdded={() => {
            loadEmployees();
            setShowAddUser(false);
          }}/>
        </DialogContent>
      </Dialog>

      {/* Workstation Mapping Dialog */}
      {selectedEmployee && (
        <Dialog open={showWorkstationMapping} onOpenChange={setShowWorkstationMapping}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Manage Workstations for {selectedEmployee.name}</DialogTitle>
              <DialogDescription>
                Select which workstations this employee is assigned to
              </DialogDescription>
            </DialogHeader>
            
            <EmployeeWorkstationsManager 
              employeeId={selectedEmployee.id} 
              employeeName={selectedEmployee.name} 
            />
            
            <div className="flex justify-end">
              <DialogClose asChild>
                <Button type="button" variant="outline">Close</Button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default EmployeeSettings;
