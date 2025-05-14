import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rushOrderService } from '@/services/rushOrderService';
import { RushOrder } from '@/types/rushOrder';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from '@/components/ui/button';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { notificationService } from "@/services/notificationService";

interface RushOrderListProps {
  statusFilter?: "pending" | "in_progress" | "completed";
}

const RushOrderList: React.FC<RushOrderListProps> = ({ statusFilter }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const { data: rushOrders, isLoading, isError } = useQuery({
    queryKey: ['rushOrders', statusFilter],
    queryFn: rushOrderService.getAllRushOrders,
  });
  
  const filteredOrders = statusFilter
    ? rushOrders?.filter(order => order.status === statusFilter)
    : rushOrders;
  
  const handleStatusChange = async (order: RushOrder, newStatus: "pending" | "in_progress" | "completed") => {
    try {
      const success = await rushOrderService.updateRushOrderStatus(order.id, newStatus);
      
      if (success) {
        notificationService.showNotification(
          `Rush order "${order.title}" status updated to ${newStatus.replace('_', ' ')}`,
          "default",
          "Status Updated"
        );
        
        // Refresh data
        queryClient.invalidateQueries({ queryKey: ['rushOrders'] });
      }
    } catch (error) {
      console.error('Error updating rush order status:', error);
      notificationService.showNotification(
        "Failed to update rush order status. Please try again.",
        "destructive",
        "Error"
      );
    }
  };

  const handleDelete = async (orderId: string, orderTitle: string) => {
    try {
      // Optimistically update the cache
      queryClient.setQueryData(['rushOrders', statusFilter], (old: RushOrder[] | undefined) => {
        if (!old) return [];
        return old.filter(order => order.id !== orderId);
      });
  
      // Call the delete API
      await rushOrderService.deleteNotification(orderId);
  
      // Show success notification
      notificationService.showNotification(
        `Rush order "${orderTitle}" deleted successfully`,
        "default",
        "Order Deleted"
      );
  
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['rushOrders'] });
    } catch (error) {
      console.error('Error deleting rush order:', error);
      notificationService.showNotification(
        "Failed to delete rush order. Please try again.",
        "destructive",
        "Error"
      );
      // On error, rollback the optimistic update
      queryClient.invalidateQueries({ queryKey: ['rushOrders'] });
    }
  };
  
  if (isLoading) {
    return <div>Loading rush orders...</div>;
  }
  
  if (isError) {
    return <div>Error fetching rush orders.</div>;
  }
  
  return (
    <div className="container mx-auto">
      <Table>
        <TableCaption>A list of your rush orders.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Order #</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Deadline</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredOrders?.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-medium">{order.id}</TableCell>
              <TableCell>{order.title}</TableCell>
              <TableCell>{order.description}</TableCell>
              <TableCell>{new Date(order.deadline).toLocaleDateString()}</TableCell>
              <TableCell>
                <Badge variant="outline">{order.status}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => navigate(`/rush-orders/${order.id}`)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      <span>Edit</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem>
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Delete</span>
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the rush
                              order and remove all of its data.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(order.id, order.title)}>Continue</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default RushOrderList;
