import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, addDays, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useToast } from '@/hooks/use-toast';
import { Project } from '@/types/project';

interface TeamCalendarProps {
  projects: Project[];
  selectedDate: Date;
  onAssignTeam: (projectId: string, team: string, startDate: string, duration: number) => Promise<void>;
}

const TEAMS = ['green', 'blue', 'orange'];

const TeamCalendar: React.FC<TeamCalendarProps> = ({ projects, selectedDate, onAssignTeam }) => {
  const [weekStart, setWeekStart] = useState<Date>(selectedDate);
  const { toast } = useToast();
  
  // Generate week dates
  const weekDates = Array.from({ length: 14 }, (_, i) => addDays(weekStart, i));
  
  const handlePrevWeek = () => {
    setWeekStart(addDays(weekStart, -14));
  };
  
  const handleNextWeek = () => {
    setWeekStart(addDays(weekStart, 14));
  };
  
  const handleProjectDrop = async (projectId: string, team: string, date: Date, duration: number) => {
    try {
      await onAssignTeam(projectId, team, date.toISOString().split('T')[0], duration);
      toast({
        title: "Project scheduled",
        description: `Project assigned to team ${team}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to assign project: ${error.message}`,
        variant: "destructive",
      });
    }
  };
  
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Team Planning</h2>
          <div className="flex items-center space-x-2">
            <button 
              onClick={handlePrevWeek}
              className="p-1 rounded-full hover:bg-gray-200"
            >
              &lt;
            </button>
            <span className="text-sm font-medium">
              {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 13), 'MMM d, yyyy')}
            </span>
            <button 
              onClick={handleNextWeek}
              className="p-1 rounded-full hover:bg-gray-200"
            >
              &gt;
            </button>
          </div>
        </div>
        
        {/* Calendar header - dates */}
        <div className="grid grid-cols-14 gap-1">
          {weekDates.map((date, i) => (
            <div key={i} className="text-center">
              <div className="mb-1 font-medium text-xs">{format(date, 'E')}</div>
              <div className={cn(
                "text-xs p-1 rounded-full w-6 h-6 mx-auto flex items-center justify-center",
                isSameDay(date, new Date()) ? "bg-primary text-primary-foreground" : ""
              )}>
                {format(date, 'd')}
              </div>
            </div>
          ))}
        </div>
        
        {/* Team calendars */}
        {TEAMS.map(team => (
          <TeamCalendarRow 
            key={team} 
            team={team} 
            weekDates={weekDates} 
            projects={projects.filter(p => p.team === team)}
            onDrop={handleProjectDrop}
          />
        ))}
        
        {/* Unassigned projects */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Unassigned Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {projects.filter(p => !p.team).map(project => (
                <DraggableProject key={project.id} project={project} />
              ))}
              {projects.filter(p => !p.team).length === 0 && (
                <div className="col-span-full text-center text-muted-foreground py-4">
                  No unassigned projects
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DndProvider>
  );
};

interface TeamCalendarRowProps {
  team: string;
  weekDates: Date[];
  projects: Project[];
  onDrop: (projectId: string, team: string, date: Date, duration: number) => void;
}

const TeamCalendarRow: React.FC<TeamCalendarRowProps> = ({ team, weekDates, projects, onDrop }) => {
  const teamColors: Record<string, string> = {
    green: "bg-green-100 border-green-300 text-green-800",
    blue: "bg-blue-100 border-blue-300 text-blue-800",
    orange: "bg-orange-100 border-orange-300 text-orange-800",
  };
  
  return (
    <Card>
      <CardHeader className="py-2">
        <CardTitle className="text-base capitalize flex items-center">
          <Badge className={cn("mr-2", teamColors[team])}>
            {team} team
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        <div className="grid grid-cols-14 gap-1 min-h-24 relative">
          {weekDates.map((date, dateIndex) => (
            <DropZone
              key={date.toISOString()}
              date={date}
              team={team}
              dateIndex={dateIndex}
              onDrop={onDrop}
            />
          ))}
          
          {/* Render projects spanning multiple days */}
          {projects.map(project => {
            // Find which date index matches this project's start date
            const projectDate = new Date(project.assignment_start_date || project.installation_date);
            const startDateIndex = weekDates.findIndex(date => 
              isSameDay(date, projectDate)
            );
            
            if (startDateIndex === -1) return null; // Not in the visible range
            
            const duration = project.duration || 1;
            const width = Math.min(duration, 14 - startDateIndex);
            
            return (
              <div
                key={project.id}
                className="absolute z-10 top-4"
                style={{
                  left: `${(startDateIndex / 14) * 100}%`,
                  width: `${(width / 14) * 100}%`,
                  height: "calc(100% - 8px)"
                }}
              >
                <ResizableProject 
                  project={project} 
                  team={team} 
                  startDateIndex={startDateIndex} 
                  duration={width}
                  maxColumns={14 - startDateIndex}
                  startDate={weekDates[startDateIndex]}
                  onResize={(newDuration) => {
                    onDrop(project.id, team, projectDate, newDuration);
                  }}
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

interface DropZoneProps {
  date: Date;
  team: string;
  dateIndex: number;
  onDrop: (projectId: string, team: string, date: Date, duration: number) => void;
}

const DropZone: React.FC<DropZoneProps> = ({ date, team, dateIndex, onDrop }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'PROJECT',
    drop: (item: { id: string; duration: number }) => {
      onDrop(item.id, team, date, item.duration || 1);
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }), [team, date, onDrop]);
  
  return (
    <div
      ref={drop}
      className={cn(
        "border border-dashed rounded min-h-[3rem]",
        isOver ? "border-primary bg-primary/10" : "border-gray-200"
      )}
      data-date={date.toISOString()}
      data-team={team}
      data-index={dateIndex}
    />
  );
};

interface DraggableProjectProps {
  project: Project;
}

const DraggableProject: React.FC<DraggableProjectProps> = ({ project }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'PROJECT',
    item: { id: project.id, duration: project.duration || 1 },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }), [project.id, project.duration]);
  
  return (
    <div
      ref={drag}
      className={cn(
        "border rounded-md p-2 cursor-move bg-white",
        isDragging ? "opacity-50" : "shadow-sm"
      )}
    >
      <div className="font-medium text-sm">{project.name}</div>
      <div className="text-xs text-muted-foreground">{project.client}</div>
    </div>
  );
};

interface ResizableProjectProps {
  project: Project;
  team: string;
  startDateIndex: number;
  duration: number;
  maxColumns: number;
  startDate: Date;
  onResize: (newDuration: number) => void;
}

const ResizableProject: React.FC<ResizableProjectProps> = ({ 
  project, 
  startDate,
  duration,
  maxColumns,
  onResize
}) => {
  const [resizing, setResizing] = useState(false);
  const [currentWidth, setCurrentWidth] = useState(duration);
  
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizing(true);
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      const projectCard = (e.target as HTMLElement).closest('.project-card');
      if (!projectCard) return;
      
      const rect = projectCard.getBoundingClientRect();
      const containerWidth = rect.width;
      const offsetX = moveEvent.clientX - rect.left;
      const cellWidth = containerWidth / duration;
      
      // Calculate new duration based on drag position
      let newDuration = Math.max(1, Math.round(offsetX / cellWidth));
      newDuration = Math.min(newDuration, maxColumns);
      
      setCurrentWidth(newDuration);
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      setResizing(false);
      
      if (currentWidth !== duration) {
        onResize(currentWidth);
      }
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-50 border-green-200';
      case 'pending':
        return 'bg-yellow-50 border-yellow-200';
      case 'completed':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };
  
  return (
    <div
      className={cn(
        "project-card h-full rounded-md border-2 flex flex-col overflow-hidden",
        getStatusColor(project.status)
      )}
    >
      <div className="p-1 text-xs font-medium truncate">{project.name}</div>
      <div className="text-xs opacity-75 truncate px-1">{project.client}</div>
      
      <div 
        className="absolute top-0 right-0 bottom-0 w-2 cursor-ew-resize hover:bg-gray-400/20"
        onMouseDown={handleResizeStart}
      />
    </div>
  );
};

export default TeamCalendar;
