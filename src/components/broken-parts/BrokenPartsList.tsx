
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { brokenPartsService } from '@/services/brokenPartsService';
import { Button } from "@/components/ui/button";
import { Plus, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { AspectRatio } from '@/components/ui/aspect-ratio';

const BrokenPartsList: React.FC = () => {
  const { data: brokenParts = [], isLoading, error } = useQuery({
    queryKey: ['broken-parts'],
    queryFn: async () => {
      return brokenPartsService.getAll();
    }
  });

  const getImageUrl = (path: string) => {
    const { data } = supabase.storage.from('broken_parts').getPublicUrl(path);
    return data.publicUrl;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center">
            <p>Loading broken parts...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center text-red-500">
            <p>Failed to load broken parts</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Broken Parts
        </CardTitle>
        <Button asChild>
          <Link to="/broken-parts/new">
            <Plus className="mr-2 h-4 w-4" />
            Report Broken Part
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {brokenParts.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Workstation</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Reported By</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brokenParts.map((part: any) => (
                  <TableRow key={part.id}>
                    <TableCell>
                      {part.image_path && (
                        <div className="w-20 h-20 relative overflow-hidden rounded-md">
                          <AspectRatio ratio={1/1}>
                            <img
                              src={getImageUrl(part.image_path)}
                              alt="Broken part"
                              className="object-cover w-full h-full"
                            />
                          </AspectRatio>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{part.projects?.name || "Not specified"}</TableCell>
                    <TableCell>{part.workstations?.name || "Not specified"}</TableCell>
                    <TableCell className="max-w-xs">
                      <div className="truncate">{part.description}</div>
                    </TableCell>
                    <TableCell>{part.employees?.name}</TableCell>
                    <TableCell>
                      {part.created_at && format(new Date(part.created_at), 'MMM d, yyyy HH:mm')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-10">
            <AlertTriangle className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No broken parts reported</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new broken part report.
            </p>
            <div className="mt-6">
              <Button asChild>
                <Link to="/broken-parts/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Report Broken Part
                </Link>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BrokenPartsList;
