
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription,
  CardFooter 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Trash2, FileUp, File, Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from '@/context/AuthContext';

interface ProjectFileManagerProps {
  projectId: string;
}

// Updated interface to match Supabase response structure
interface FileObject {
  id: string;
  name: string;
  size: number;
  created_at: string;
  metadata: {
    mimetype?: string;
    size?: number;
    [key: string]: any;
  };
}

const ProjectFileManager: React.FC<ProjectFileManagerProps> = ({ projectId }) => {
  const { toast } = useToast();
  const { currentEmployee } = useAuth();
  const [files, setFiles] = useState<FileObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const projectFolderPath = `${projectId}/`;

  useEffect(() => {
    fetchFiles();
  }, [projectId]);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .storage
        .from('project_files')
        .list(projectFolderPath);

      if (error) {
        throw error;
      }

      // Filter out folders and format file data
      const fileObjects = data
        .filter(item => !item.id.endsWith('/'))
        .map(item => ({
          id: item.id,
          name: item.name,
          size: item.metadata?.size || 0,
          created_at: item.created_at,
          metadata: item.metadata || {}
        }));

      setFiles(fileObjects);
    } catch (error: any) {
      console.error('Error fetching files:', error);
      toast({
        title: "Error",
        description: `Failed to load files: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);
    
    try {
      // Log to debug
      console.log("Starting file upload for project:", projectId);
      console.log("Current authenticated user:", currentEmployee);
      
      const uploadPromises = Array.from(selectedFiles).map(async (file) => {
        const filePath = `${projectFolderPath}${file.name}`;
        
        // Log detailed request info
        console.log("Uploading file:", file.name);
        console.log("To path:", filePath);
        
        const { data, error } = await supabase
          .storage
          .from('project_files')
          .upload(filePath, file, {
            upsert: true,
            // Adding cacheControl for appropriate caching
            cacheControl: '3600',
          });

        if (error) {
          console.error("Upload error details:", error);
          throw error;
        }
        
        return data;
      });

      await Promise.all(uploadPromises);
      
      toast({
        title: "Success",
        description: "Files uploaded successfully",
      });
      
      fetchFiles(); // Refresh file list
    } catch (error: any) {
      console.error('Error uploading files:', error);
      toast({
        title: "Error",
        description: `Failed to upload files: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      // Clear the input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const downloadFile = async (fileName: string) => {
    try {
      const filePath = `${projectFolderPath}${fileName}`;
      
      const { data, error } = await supabase
        .storage
        .from('project_files')
        .download(filePath);

      if (error) {
        throw error;
      }

      // Create a download link and trigger it
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      console.error('Error downloading file:', error);
      toast({
        title: "Error",
        description: `Failed to download file: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const confirmDeleteFile = () => {
    if (!fileToDelete) return;
    
    deleteFile(fileToDelete);
    setFileToDelete(null);
  };

  const deleteFile = async (fileName: string) => {
    try {
      const filePath = `${projectFolderPath}${fileName}`;
      
      const { error } = await supabase
        .storage
        .from('project_files')
        .remove([filePath]);

      if (error) {
        throw error;
      }

      setFiles(prevFiles => prevFiles.filter(file => file.name !== fileName));
      
      toast({
        title: "Success",
        description: "File deleted successfully",
      });
    } catch (error: any) {
      console.error('Error deleting file:', error);
      toast({
        title: "Error",
        description: `Failed to delete file: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Byte';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i))} ${sizes[i]}`;
  };

  return (
    <div>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Project Files</CardTitle>
          <CardDescription>
            Manage files associated with this project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <input
              type="file"
              multiple
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              onClick={handleUploadClick}
              disabled={uploading}
              className="w-full"
            >
              {uploading ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-b-2 border-current"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <FileUp className="mr-2 h-4 w-4" />
                  Upload Files
                </>
              )}
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : files.length > 0 ? (
            <div className="space-y-2">
              {files.map((file) => (
                <div 
                  key={file.id} 
                  className="flex items-center justify-between border p-3 rounded-md"
                >
                  <div className="flex items-center space-x-3">
                    <File className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => downloadFile(file.name)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-red-600 hover:text-red-600 hover:bg-red-50"
                      onClick={() => setFileToDelete(file.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No files uploaded yet
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!fileToDelete} onOpenChange={(open) => !open && setFileToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the file "{fileToDelete}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteFile}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProjectFileManager;
