
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import NewRushOrderForm from '@/components/rush-orders/NewRushOrderForm';
import RushOrderList from '@/components/rush-orders/RushOrderList';
import { useQueryClient } from '@tanstack/react-query';

const RushOrders = () => {
  const { currentEmployee } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  const canCreateRushOrder = currentEmployee && ['admin', 'manager', 'installation_team'].includes(currentEmployee.role);
  
  const handleCreateSuccess = () => {
    setIsCreateDialogOpen(false);
    // Refresh the rush orders list
    queryClient.invalidateQueries({ queryKey: ['rushOrders'] });
  };
  
  return (
    <div className="flex min-h-screen">
      <div className="w-64 bg-sidebar fixed top-0 bottom-0">
        <Navbar />
      </div>
      <div className="ml-64 w-full p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Rush Orders</h1>
            
            {canCreateRushOrder && (
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-red-600 hover:bg-red-700">
                    <Plus className="mr-1 h-4 w-4" /> New Rush Order
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Rush Order</DialogTitle>
                    <DialogDescription>
                      Rush orders receive the highest priority and will be completed as quickly as possible.
                    </DialogDescription>
                  </DialogHeader>
                  <NewRushOrderForm onSuccess={handleCreateSuccess} />
                </DialogContent>
              </Dialog>
            )}
          </div>
          
          <Tabs defaultValue="all" className="mb-6">
            <TabsList>
              <TabsTrigger value="all">All Rush Orders</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="in_progress">In Progress</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-6">
              <RushOrderList statusFilter="all" />
            </TabsContent>
            <TabsContent value="pending" className="mt-6">
              <RushOrderList statusFilter="pending" />
            </TabsContent>
            <TabsContent value="in_progress" className="mt-6">
              <RushOrderList statusFilter="in_progress" />
            </TabsContent>
            <TabsContent value="completed" className="mt-6">
              <RushOrderList statusFilter="completed" />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default RushOrders;
