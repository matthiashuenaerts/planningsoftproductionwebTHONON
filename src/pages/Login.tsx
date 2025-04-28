
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const Login: React.FC = () => {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !password) {
      toast({
        title: "Error",
        description: "Please enter both employee name and password",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      // Query the employees table by name
      const { data: employees, error: queryError } = await supabase
        .from('employees')
        .select('*')
        .eq('name', name)
        .limit(1);
      
      if (queryError) throw queryError;
      
      if (!employees || employees.length === 0) {
        throw new Error('Employee not found');
      }
      
      const employee = employees[0];
      
      // Simple password check (in a real app, you would use proper hashing)
      if (employee.password !== password) {
        throw new Error('Incorrect password');
      }
      
      // Create a session in localStorage
      localStorage.setItem('employeeSession', JSON.stringify({
        id: employee.id,
        name: employee.name,
        role: employee.role,
        workstation: employee.workstation
      }));
      
      toast({
        title: "Login successful",
        description: `Welcome, ${employee.name}!`
      });
      
      navigate('/');
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "An error occurred during login",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-6">
        <Card>
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-3xl font-bold">PhaseFlow</CardTitle>
            <CardDescription>Kitchen Production Management System</CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Employee Name</Label>
                <Input 
                  id="name" 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your employee name"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={loading}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                type="submit"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Login;
