
import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  ArrowLeft, 
  ChevronDown, 
  ChevronUp, 
  Paperclip,
  Trash2,
  UploadCloud,
  FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { orderService } from '@/services/orderService';
import { projectService } from '@/services/dataService';
import { useAuth } from '@/context/AuthContext';
import NewOrderModal from '@/components/NewOrderModal';
import { Order, OrderItem, OrderAttachment } from '@/types/order';
import { format } from 'date-fns';

const ProjectOrders: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentEmployee } = useAuth();
  const [loading, setLoading] = useState(true);
  const [projectName, setProjectName] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [orderItems, setOrderItems] = useState<Record<string, OrderItem[]>>({});
  const [orderAttachments, setOrderAttachments] = useState<Record<string, OrderAttachment[]>>({});
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [uploadingForOrder, setUploadingForOrder] = useState<string | null>(null);
  
  const isAdmin = currentEmployee?.role === 'admin';
  
  useEffect(() => {
    if (!projectId) {
      navigate('/projects');
      return;
    }
    
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load project details
        const project = await projectService.getById(projectId);
        if (!project) {
          toast({
            title: "Error",
            description: "Project not found",
            variant: "destructive"
          });
          navigate('/projects');
          return;
        }
        
        setProjectName(project.name);
        
        // Load orders for the project
        const ordersData = await orderService.getByProject(projectId);
        setOrders(ordersData);
      } catch (error: any) {
        toast({
          title: "Error",
          description: `Failed to load data: ${error.message}`,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [projectId, navigate, toast]);
  
  const toggleOrderExpansion = async (orderId: string) => {
    // Close if already open
    if (expandedOrder === orderId) {
      setExpandedOrder(null);
      return;
    }
    
    // Open and load order items if they haven't been loaded yet
    setExpandedOrder(orderId);
    
    if (!orderItems[orderId]) {
      try {
        const items = await orderService.getOrderItems(orderId);
        setOrderItems(prev => ({
          ...prev,
          [orderId]: items
        }));
        
        // Also load attachments
        const attachments = await orderService.getOrderAttachments(orderId);
        setOrderAttachments(prev => ({
          ...prev,
          [orderId]: attachments
        }));
      } catch (error: any) {
        toast({
          title: "Error",
          description: `Failed to load order details: ${error.message}`,
          variant: "destructive"
        });
      }
    }
  };
  
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (error) {
      return 'Invalid date';
    }
  };
  
  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">Pending</Badge>;
      case 'delivered':
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">Delivered</Badge>;
      case 'canceled':
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">Canceled</Badge>;
      case 'delayed':
        return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">Delayed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    try {
      await orderService.updateOrderStatus(orderId, newStatus);
      
      // Update local state
      setOrders(prev => 
        prev.map(order => 
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );
      
      toast({
        title: "Success",
        description: `Order status updated to ${newStatus}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to update order status: ${error.message}`,
        variant: "destructive"
      });
    }
  };
  
  const refreshOrders = async () => {
    try {
      if (!projectId) return;
      
      const ordersData = await orderService.getByProject(projectId);
      setOrders(ordersData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to refresh orders: ${error.message}`,
        variant: "destructive"
      });
    }
  };
  
  const handleFileUpload = async (orderId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setUploadingForOrder(orderId);
    
    try {
      const file = files[0];
      const attachment = await orderService.uploadOrderAttachment(orderId, file);
      
      // Update local state
      setOrderAttachments(prev => ({
        ...prev,
        [orderId]: [...(prev[orderId] || []), attachment]
      }));
      
      toast({
        title: "Success",
        description: "File uploaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to upload file: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setUploadingForOrder(null);
      
      // Reset the file input
      e.target.value = '';
    }
  };
  
  const handleDeleteAttachment = async (orderId: string, attachmentId: string) => {
    if (!confirm("Are you sure you want to delete this attachment?")) return;
    
    try {
      await orderService.deleteOrderAttachment(attachmentId);
      
      // Update local state
      setOrderAttachments(prev => ({
        ...prev,
        [orderId]: prev[orderId].filter(attachment => attachment.id !== attachmentId)
      }));
      
      toast({
        title: "Success",
        description: "Attachment deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to delete attachment: ${error.message}`,
        variant: "destructive"
      });
    }
  };
  
  if (loading) {
    return (
      <div className="flex min-h-screen">
        <div className="w-64 bg-sidebar fixed top-0 bottom-0">
          <Navbar />
        </div>
        <div className="ml-64 w-full p-6 flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex min-h-screen">
      <div className="w-64 bg-sidebar fixed top-0 bottom-0">
        <Navbar />
      </div>
      <div className="ml-64 w-full p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                onClick={() => navigate(`/projects`)}
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Projects
              </Button>
              <h1 className="text-2xl font-bold">Orders for {projectName}</h1>
            </div>
            
            {isAdmin && (
              <Button
                onClick={() => setIsNewOrderModalOpen(true)}
                className="flex items-center gap-1"
              >
                <Plus className="h-4 w-4" /> Add Order
              </Button>
            )}
          </div>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Project Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {orders.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Order Date</TableHead>
                        <TableHead>Expected Delivery</TableHead>
                        <TableHead>Status</TableHead>
                        {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <React.Fragment key={order.id}>
                          <TableRow className="cursor-pointer hover:bg-muted/50">
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => toggleOrderExpansion(order.id)}
                                className="h-8 w-8"
                              >
                                {expandedOrder === order.id ? 
                                  <ChevronUp className="h-4 w-4" /> : 
                                  <ChevronDown className="h-4 w-4" />
                                }
                              </Button>
                            </TableCell>
                            <TableCell 
                              className="font-medium"
                              onClick={() => toggleOrderExpansion(order.id)}
                            >
                              {order.supplier}
                            </TableCell>
                            <TableCell onClick={() => toggleOrderExpansion(order.id)}>
                              {formatDate(order.order_date)}
                            </TableCell>
                            <TableCell onClick={() => toggleOrderExpansion(order.id)}>
                              {formatDate(order.expected_delivery)}
                            </TableCell>
                            <TableCell onClick={() => toggleOrderExpansion(order.id)}>
                              {getStatusBadge(order.status)}
                            </TableCell>
                            {isAdmin && (
                              <TableCell className="text-right">
                                <select 
                                  value={order.status}
                                  onChange={(e) => updateOrderStatus(order.id, e.target.value as Order['status'])}
                                  className="p-1 text-xs rounded border border-gray-300"
                                >
                                  <option value="pending">Pending</option>
                                  <option value="delivered">Delivered</option>
                                  <option value="delayed">Delayed</option>
                                  <option value="canceled">Canceled</option>
                                </select>
                              </TableCell>
                            )}
                          </TableRow>
                          
                          {expandedOrder === order.id && (
                            <TableRow>
                              <TableCell colSpan={isAdmin ? 6 : 5} className="p-0">
                                <div className="bg-muted/30 p-3">
                                  <h4 className="font-medium mb-2">Order Items</h4>
                                  {orderItems[order.id] ? (
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Description</TableHead>
                                          <TableHead className="text-right">Quantity</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {orderItems[order.id].map((item) => (
                                          <TableRow key={item.id}>
                                            <TableCell>{item.description}</TableCell>
                                            <TableCell className="text-right">{item.quantity}</TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  ) : (
                                    <div className="flex justify-center p-4">
                                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                                    </div>
                                  )}
                                  
                                  <div className="mt-6">
                                    <div className="flex justify-between items-center mb-2">
                                      <h4 className="font-medium">Attachments</h4>
                                      <div className="relative">
                                        <input
                                          type="file"
                                          id={`file-upload-${order.id}`}
                                          onChange={(e) => handleFileUpload(order.id, e)}
                                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                          disabled={uploadingForOrder === order.id}
                                        />
                                        <Button 
                                          variant="outline" 
                                          size="sm"
                                          disabled={uploadingForOrder === order.id}
                                        >
                                          {uploadingForOrder === order.id ? (
                                            <div className="flex items-center">
                                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></div>
                                              <span>Uploading...</span>
                                            </div>
                                          ) : (
                                            <>
                                              <UploadCloud className="h-4 w-4 mr-2" />
                                              <span>Upload File</span>
                                            </>
                                          )}
                                        </Button>
                                      </div>
                                    </div>
                                    
                                    {orderAttachments[order.id] && (
                                      <div className="space-y-2 mt-2">
                                        {orderAttachments[order.id].length === 0 ? (
                                          <p className="text-sm text-muted-foreground">No attachments found</p>
                                        ) : (
                                          orderAttachments[order.id].map((attachment) => (
                                            <div 
                                              key={attachment.id}
                                              className="flex items-center gap-2 p-2 bg-background rounded border"
                                            >
                                              <Paperclip className="h-4 w-4 text-muted-foreground" />
                                              <span className="flex-1 truncate">{attachment.file_name}</span>
                                              <div className="flex gap-1">
                                                <Button 
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-8 w-8 p-0"
                                                  onClick={() => window.open(attachment.file_path, '_blank')}
                                                >
                                                  <FileText className="h-4 w-4" />
                                                  <span className="sr-only">View file</span>
                                                </Button>
                                                {isAdmin && (
                                                  <Button 
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 hover:text-red-500"
                                                    onClick={() => handleDeleteAttachment(order.id, attachment.id)}
                                                  >
                                                    <Trash2 className="h-4 w-4" />
                                                    <span className="sr-only">Delete file</span>
                                                  </Button>
                                                )}
                                              </div>
                                            </div>
                                          ))
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="p-6 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <p className="text-muted-foreground">No orders found for this project.</p>
                  {isAdmin && (
                    <Button 
                      variant="outline"
                      className="mt-4"
                      onClick={() => setIsNewOrderModalOpen(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" /> Create Order
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {isAdmin && projectId && (
        <NewOrderModal 
          open={isNewOrderModalOpen} 
          onOpenChange={setIsNewOrderModalOpen} 
          projectId={projectId}
          onSuccess={refreshOrders}
        />
      )}
    </div>
  );
};

export default ProjectOrders;
