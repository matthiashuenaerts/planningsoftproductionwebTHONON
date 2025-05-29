
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Order } from '@/types/order';
import { DeliveryConfirmationModal } from './DeliveryConfirmationModal';
import { useState } from 'react';
import { format } from 'date-fns';
import { Package, Building2, Truck } from 'lucide-react';

interface TodaysDeliveriesProps {
  orders: Order[];
  onDeliveryConfirmed: () => void;
}

export const TodaysDeliveries: React.FC<TodaysDeliveriesProps> = ({ 
  orders, 
  onDeliveryConfirmed 
}) => {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'canceled': return 'bg-red-100 text-red-800';
      case 'delayed': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-gray-500">
            <Truck className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No deliveries today</h3>
            <p className="mt-1 text-sm text-gray-500">All caught up for today!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {orders.map((order) => (
          <Card key={order.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Order from {order.supplier}
                </CardTitle>
                <Badge className={getStatusColor(order.status)}>
                  {order.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Project ID</p>
                    <p className="font-medium">{order.project_id}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Order Date</p>
                  <p className="font-medium">{format(new Date(order.order_date), 'PPP')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Expected Delivery</p>
                  <p className="font-medium">{format(new Date(order.expected_delivery), 'PPP')}</p>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button 
                  onClick={() => setSelectedOrder(order)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Confirm Delivery
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedOrder && (
        <DeliveryConfirmationModal
          order={selectedOrder}
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onConfirmed={onDeliveryConfirmed}
        />
      )}
    </>
  );
};
