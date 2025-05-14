
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RushOrder } from '@/types/rushOrder';
import { format, parseISO } from 'date-fns';
import { AlertTriangle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RushOrderWorkstationItemProps {
  rushOrder: RushOrder;
}

const RushOrderWorkstationItem: React.FC<RushOrderWorkstationItemProps> = ({ rushOrder }) => {
  const navigate = useNavigate();
  
  return (
    <Card className="bg-red-50 border-red-300 transition-shadow hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
            <CardTitle className="text-red-700">{rushOrder.title}</CardTitle>
          </div>
          <Badge className="bg-red-100 text-red-800 border-red-300">
            RUSH ORDER
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <p className="text-sm text-red-800 line-clamp-2 mb-2">{rushOrder.description}</p>
        
        <div className="flex items-center mt-2">
          <Clock className="h-4 w-4 text-red-500 mr-1" />
          <p className="text-sm text-red-600 font-medium">
            Deadline: {format(parseISO(rushOrder.deadline), 'MMM d, yyyy')}
          </p>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full bg-red-600 hover:bg-red-700 text-white"
          onClick={() => navigate(`/rush-orders/${rushOrder.id}`)}
        >
          View Rush Order
        </Button>
      </CardFooter>
    </Card>
  );
};

export default RushOrderWorkstationItem;
