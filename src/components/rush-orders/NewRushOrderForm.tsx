import React, { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';
import { rushOrderService } from '@/services/rushOrderService';
import { MultiSelect } from '@/components/ui/multi-select';
import { DatePicker } from '@/components/ui/date-picker';
import { useQuery } from '@tanstack/react-query';
import { standardTasksService } from '@/services/standardTasksService';
import { dataService } from '@/services/dataService';

// Define the form schema
const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  deadline: z.date({
    required_error: 'Deadline is required',
  }),
  taskIds: z.array(z.string()).min(1, 'At least one task must be selected'),
  assignedEmployeeIds: z.array(z.string()).min(1, 'At least one employee must be assigned'),
  image: z.any().optional(),
});

// Define the form data type based on the schema
type RushOrderFormData = z.infer<typeof formSchema>;

interface NewRushOrderFormProps {
  onSuccess: () => void;
}

const NewRushOrderForm: React.FC<NewRushOrderFormProps> = ({ onSuccess }) => {
  const { currentEmployee } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
    watch,
  } = useForm<RushOrderFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      taskIds: [],
      assignedEmployeeIds: [],
    },
  });
  
  // Fetch standard tasks
  const { data: standardTasks } = useQuery({
    queryKey: ['standardTasks'],
    queryFn: () => standardTasksService.getAllStandardTasks(),
  });
  
  // Fetch employees
  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => dataService.getEmployees(),
  });
  
  // Handle image upload
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
      setValue('image', file);
    }
  };
  
  const onSubmit = async (formData: RushOrderFormData) => {
    if (!currentEmployee) return;
    
    setIsSubmitting(true);
    
    try {
      // Handle image upload first if there's an image
      let imageUrl = null;
      if (formData.image instanceof File) {
        const { url } = await rushOrderService.uploadRushOrderImage(formData.image);
        imageUrl = url;
      }
      
      // Create the rush order
      await rushOrderService.createRushOrder({
        title: formData.title,
        description: formData.description,
        deadline: formData.deadline,
        taskIds: formData.taskIds,
        assignedEmployeeIds: formData.assignedEmployeeIds,
        imageUrl,
        createdBy: currentEmployee.id,
      });
      
      toast({
        title: 'Rush Order Created',
        description: 'The rush order has been successfully created.',
      });
      
      reset();
      setImagePreview(null);
      onSuccess();
    } catch (error) {
      console.error('Error creating rush order:', error);
      toast({
        title: 'Error',
        description: 'Failed to create rush order. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const taskOptions = standardTasks?.map(task => ({
    value: task.id,
    label: task.name,
  })) || [];
  
  const employeeOptions = employees?.map(emp => ({
    value: emp.id,
    label: emp.name,
  })) || [];
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            {...register('title')}
            placeholder="Enter rush order title"
          />
          {errors.title && (
            <p className="text-sm text-red-500">{errors.title.message}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            {...register('description')}
            placeholder="Describe the rush order in detail"
            className="min-h-[100px]"
          />
          {errors.description && (
            <p className="text-sm text-red-500">{errors.description.message}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="deadline">Deadline</Label>
          <DatePicker
            value={watch('deadline')}
            onChange={(date) => setValue('deadline', date)}
          />
          {errors.deadline && (
            <p className="text-sm text-red-500">{errors.deadline.message}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="taskIds">Required Tasks</Label>
          <MultiSelect
            options={taskOptions}
            value={watch('taskIds')}
            onChange={(values) => setValue('taskIds', values as string[])}
            placeholder="Select required tasks"
          />
          {errors.taskIds && (
            <p className="text-sm text-red-500">{errors.taskIds.message}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="assignedEmployeeIds">Assign To</Label>
          <MultiSelect
            options={employeeOptions}
            value={watch('assignedEmployeeIds')}
            onChange={(values) => setValue('assignedEmployeeIds', values as string[])}
            placeholder="Select employees to assign"
          />
          {errors.assignedEmployeeIds && (
            <p className="text-sm text-red-500">{errors.assignedEmployeeIds.message}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="image">Image (Optional)</Label>
          <Input
            id="image"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
          />
          
          {imagePreview && (
            <div className="mt-2">
              <img
                src={imagePreview}
                alt="Rush order preview"
                className="max-h-[200px] object-contain border rounded"
              />
            </div>
          )}
        </div>
      </div>
      
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting} className="bg-red-600 hover:bg-red-700">
          {isSubmitting ? 'Creating...' : 'Create Rush Order'}
        </Button>
      </div>
    </form>
  );
};

export default NewRushOrderForm;
