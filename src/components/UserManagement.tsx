
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { employeeService } from '@/services/dataService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

interface UserManagementProps {
  onUserAdded?: () => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ onUserAdded }) => {
  const { currentEmployee } = useAuth();
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'worker',
    workstation: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const { refetch } = useQuery({
    queryKey: ['employees'],
    queryFn: employeeService.getAll,
    enabled: false // Don't fetch automatically
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.password) {
      toast({
        title: "Validation Error",
        description: "Name and password are required",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      await employeeService.create(newUser);
      toast({
        title: "Success",
        description: "New user has been added successfully",
      });
      
      // Reset form
      setNewUser({
        name: '',
        email: '',
        password: '',
        role: 'worker',
        workstation: '',
      });
      
      // Refresh employee list
      refetch();
      
      // Call callback if provided
      if (onUserAdded) {
        onUserAdded();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || 'Failed to create user',
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (currentEmployee?.role !== 'admin') {
    return <p className="text-center text-muted-foreground py-4">You don't have permission to add users</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          value={newUser.name}
          onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email (optional)</Label>
        <Input
          id="email"
          type="email"
          value={newUser.email}
          onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password *</Label>
        <Input
          id="password"
          type="password"
          value={newUser.password}
          onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Select
          value={newUser.role}
          onValueChange={(value) => setNewUser(prev => ({ ...prev, role: value }))}>
          <SelectTrigger>
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="worker">Worker</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="workstation">Workstation (optional)</Label>
        <Select
          value={newUser.workstation}
          onValueChange={(value) => setNewUser(prev => ({ ...prev, workstation: value }))}>
          <SelectTrigger>
            <SelectValue placeholder="Select workstation" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CUTTING">Cutting</SelectItem>
            <SelectItem value="WELDING">Welding</SelectItem>
            <SelectItem value="PAINTING">Painting</SelectItem>
            <SelectItem value="ASSEMBLY">Assembly</SelectItem>
            <SelectItem value="PACKAGING">Packaging</SelectItem>
            <SelectItem value="SHIPPING">Shipping</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button 
        type="submit" 
        className="w-full" 
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
            Adding User...
          </>
        ) : (
          'Add User'
        )}
      </Button>
    </form>
  );
};

export default UserManagement;
