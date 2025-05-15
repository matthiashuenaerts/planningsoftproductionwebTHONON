
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { brokenPartsService } from '@/services/brokenPartsService';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent } from '@/components/ui/card';

// Form validation schema
const formSchema = z.object({
  project_id: z.string().optional(),
  workstation_id: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  image: z.instanceof(FileList).optional().transform(val => val && val.length > 0 ? val[0] : undefined),
});

const BrokenPartForm = () => {
  const navigate = useNavigate();
  const { currentEmployee } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      project_id: undefined,
      workstation_id: undefined,
      description: "",
      image: undefined,
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await fetch('/api/projects');
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    },
    enabled: false, // Disabled for now, would need to implement API
  });

  const { data: workstations = [] } = useQuery({
    queryKey: ['workstations'],
    queryFn: async () => {
      const response = await fetch('/api/workstations');
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    },
    enabled: false, // Disabled for now, would need to implement API
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    // Validate file type
    if (!file.type.includes('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    setSelectedFile(file);
    
    // Create preview URL
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
    
    // Update form
    form.setValue('image', e.target.files as FileList);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!currentEmployee) {
      toast.error('You must be logged in to report a broken part');
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("Form values before submission:", values);
      const file = values.image;
      let imagePath = null;

      // Upload image if selected
      if (file) {
        console.log("Attempting to upload file:", file.name, file.size, file.type);
        imagePath = await brokenPartsService.uploadImage(file, currentEmployee.id);
        console.log("Image upload result:", imagePath);
        
        if (!imagePath) {
          toast.error('Failed to upload image');
          setIsSubmitting(false);
          return;
        }
      }

      // Create broken part record
      const brokenPart = {
        project_id: values.project_id || null,
        workstation_id: values.workstation_id || null,
        description: values.description,
        image_path: imagePath,
        reported_by: currentEmployee.id,
      };

      console.log("Sending broken part data:", brokenPart);
      const result = await brokenPartsService.create(brokenPart);
      console.log("Broken part creation result:", result);

      if (result) {
        toast.success('Broken part reported successfully');
        navigate('/broken-parts');
      } else {
        toast.error('Failed to report broken part');
      }
    } catch (error) {
      console.error('Error reporting broken part:', error);
      toast.error('An error occurred while reporting the broken part');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="project_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project (Optional)</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {projects.map((project: any) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="workstation_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Workstation (Optional)</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a workstation" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {workstations.map((workstation: any) => (
                        <SelectItem key={workstation.id} value={workstation.id}>
                          {workstation.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the broken part..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="image"
              render={({ field: { value, onChange, ...field } }) => (
                <FormItem>
                  <FormLabel>Image (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept="image/*"
                      {...field}
                      onChange={handleFileChange}
                      className="cursor-pointer"
                    />
                  </FormControl>
                  {previewUrl && (
                    <div className="mt-2">
                      <img 
                        src={previewUrl} 
                        alt="Preview" 
                        className="max-h-40 rounded-md" 
                      />
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/broken-parts')}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default BrokenPartForm;
