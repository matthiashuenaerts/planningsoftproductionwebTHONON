
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BrokenPart, brokenPartsService } from "@/services/brokenPartsService";
import { useAuth } from '@/context/AuthContext';
import { projectService } from '@/services/dataService';
import { AlertTriangle, Upload } from 'lucide-react';
import { toast } from "sonner";

// Form schema
const formSchema = z.object({
  project_id: z.string().nullable(),
  workstation_id: z.string().nullable(),
  description: z.string().min(10, { message: "Description must be at least 10 characters" }),
  image: z.instanceof(FileList).refine(files => files.length > 0, {
    message: "Image is required",
  })
});

type FormValues = z.infer<typeof formSchema>;

const BrokenPartForm: React.FC = () => {
  const { currentEmployee } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const navigate = useNavigate();
  
  // Get projects
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const projects = await projectService.getAll();
      return projects;
    }
  });
  
  // Get workstations
  const { data: workstations = [] } = useQuery({
    queryKey: ['workstations'],
    queryFn: async () => {
      // Call your workstations API
      const { data } = await supabase.from('workstations').select('*');
      return data || [];
    }
  });
  
  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      project_id: null,
      workstation_id: null,
      description: '',
      image: undefined
    }
  });
  
  // Handle image preview
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      form.setValue('image', files);
    }
  };
  
  // Handle form submission
  const onSubmit = async (values: FormValues) => {
    if (!currentEmployee) {
      toast.error("You must be logged in to report broken parts");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Upload the image
      const imageFile = values.image[0];
      const imagePath = await brokenPartsService.uploadImage(imageFile, currentEmployee.id);
      
      if (!imagePath) {
        throw new Error("Failed to upload image");
      }
      
      // Create the broken part record
      const brokenPart: BrokenPart = {
        project_id: values.project_id,
        workstation_id: values.workstation_id,
        description: values.description,
        image_path: imagePath,
        reported_by: currentEmployee.id
      };
      
      const result = await brokenPartsService.create(brokenPart);
      
      if (result) {
        navigate('/broken-parts');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error("Failed to report broken part");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Report Broken Part
        </CardTitle>
        <CardDescription>
          Report a damaged or broken workpiece by filling out this form
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Project selection */}
            <FormField
              control={form.control}
              name="project_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project</FormLabel>
                  <Select 
                    value={field.value || ""} 
                    onValueChange={(value) => field.onChange(value || null)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {projects.map((project) => (
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
            
            {/* Workstation selection */}
            <FormField
              control={form.control}
              name="workstation_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Workstation</FormLabel>
                  <Select
                    value={field.value || ""} 
                    onValueChange={(value) => field.onChange(value || null)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a workstation" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {workstations.map((workstation) => (
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
            
            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the damage or issue..."
                      className="min-h-32"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Image upload */}
            <FormField
              control={form.control}
              name="image"
              render={() => (
                <FormItem>
                  <FormLabel>Image</FormLabel>
                  <FormControl>
                    <div className="grid w-full gap-4">
                      <Input
                        id="image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                      <div className="flex flex-col items-center gap-4">
                        {previewUrl ? (
                          <div className="relative w-full max-h-[300px] rounded-lg overflow-hidden">
                            <img
                              src={previewUrl}
                              alt="Preview"
                              className="object-contain w-full h-full"
                              style={{ maxHeight: "300px" }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="absolute top-2 right-2 bg-white"
                              onClick={() => {
                                setPreviewUrl(null);
                                form.resetField('image');
                              }}
                            >
                              Change
                            </Button>
                          </div>
                        ) : (
                          <label
                            htmlFor="image"
                            className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                          >
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <Upload className="w-10 h-10 text-gray-400 mb-3" />
                              <p className="mb-2 text-sm text-gray-500">
                                <span className="font-semibold">Click to upload</span> or drag and drop
                              </p>
                              <p className="text-xs text-gray-500">PNG, JPG or JPEG (MAX. 10MB)</p>
                            </div>
                          </label>
                        )}
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/broken-parts')}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Report"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default BrokenPartForm;
