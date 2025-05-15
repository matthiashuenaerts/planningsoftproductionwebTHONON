
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const BrokenPartForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentEmployee } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    project_id: '',
    workstation_id: '',
    description: ''
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');

      if (error) throw error;
      return data;
    }
  });

  // Fetch workstations
  const { data: workstations = [] } = useQuery({
    queryKey: ['workstations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workstations')
        .select('id, name')
        .order('name');

      if (error) throw error;
      return data;
    }
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEmployee) {
      toast({
        title: "Error",
        description: "You must be logged in to report a broken part",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Upload image if selected
      let imagePath = null;
      if (selectedImage) {
        const fileExt = selectedImage.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${currentEmployee.id}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('broken_parts')
          .upload(filePath, selectedImage);

        if (uploadError) throw uploadError;
        imagePath = filePath;
      }

      // Insert broken part record
      const { error } = await supabase
        .from('broken_parts')
        .insert({
          project_id: formData.project_id || null,
          workstation_id: formData.workstation_id || null,
          description: formData.description,
          image_path: imagePath,
          reported_by: currentEmployee.id
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Broken part reported successfully",
      });
      
      navigate('/broken-parts');
    } catch (error) {
      console.error('Error reporting broken part:', error);
      toast({
        title: "Error",
        description: "Failed to report broken part",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project">Project</Label>
            <Select
              value={formData.project_id}
              onValueChange={(value) => setFormData({...formData, project_id: value})}
            >
              <SelectTrigger id="project">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project: any) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="workstation">Workstation</Label>
            <Select
              value={formData.workstation_id}
              onValueChange={(value) => setFormData({...formData, workstation_id: value})}
            >
              <SelectTrigger id="workstation">
                <SelectValue placeholder="Select a workstation" />
              </SelectTrigger>
              <SelectContent>
                {workstations.map((workstation: any) => (
                  <SelectItem key={workstation.id} value={workstation.id}>
                    {workstation.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the broken part"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              required
              className="min-h-32"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">Image</Label>
            <Input
              id="image"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="cursor-pointer"
            />
            {imagePreview && (
              <div className="mt-2">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-h-40 rounded-md"
                />
              </div>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Report Broken Part"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default BrokenPartForm;
