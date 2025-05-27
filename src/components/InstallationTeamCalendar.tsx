import React, { useState, useEffect } from 'react';
import { format, addDays, isWithinInterval, startOfDay, endOfDay, startOfWeek } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

// Define project type
interface Project {
  id: string;
  name: string;
  client: string;
  installation_date: string;
  status: string;
  progress: number;
  [key: string]: any;
}

// Define assignment type
interface Assignment {
  id: string;
  project_id: string;
  team: string;
  start_date: string;
  duration: number;
  created_at?: string;
  updated_at?: string;
}

// Define item type for drag and drop
interface DragItem {
  type: string;
  id: string;
  team: string;
}

// Define team colors
const teamColors = {
  green: {
    bg: 'bg-green-100 hover:bg-green-200',
    border: 'border-green-300',
    text: 'text-green-800',
    header: 'bg-green-500 text-white'
  },
  blue: {
    bg: 'bg-blue-100 hover:bg-blue-200',
    border: 'border-blue-300',
    text: 'text-blue-800',
    header: 'bg-blue-500 text-white'
  },
  orange: {
    bg: 'bg-orange-100 hover:bg-orange-200',
    border: 'border-orange-300',
    text: 'text-orange-800',
    header: 'bg-orange-500 text-white'
  },
  unassigned: {
    bg: 'bg-gray-100 hover:bg-gray-200',
    border: 'border-gray-300',
    text: 'text-gray-800',
    header: 'bg-gray-500 text-white'
  }
};

// Define the project item component
const ProjectItem = ({ project, team, dateRange, onExtendProject }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'PROJECT',
    item: { id: project.id, team: team },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging()
    })
  }));

  const teamColor = team ? teamColors[team] : teamColors.unassigned;
  
  const handleExtend = (e, direction) => {
    e.stopPropagation();
    onExtendProject(project.id, direction);
  };

  return (
    <div
      ref={drag}
      className={cn(
        "p-2 mb-2 rounded border cursor-move relative",
        teamColor.bg,
        teamColor.border,
        isDragging ? "opacity-50" : "opacity-100"
      )}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <div className="flex justify-between items-start">
        <div>
          <div className={cn("font-medium", teamColor.text)}>{project.name}</div>
          <div className="text-xs text-gray-600">{project.client}</div>
        </div>
        <Badge className={getStatusColor(project.status)}>{project.status}</Badge>
      </div>
      
      {dateRange && dateRange.length > 1 && (
        <div className="text-xs mt-1 text-gray-600">
          {format(dateRange[0], 'MMM d')} - {format(dateRange[dateRange.length - 1], 'MMM d')}
        </div>
      )}
      
      <div className="flex justify-between mt-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="p-1 h-6 w-6"
          onClick={(e) => handleExtend(e, 'start')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="p-1 h-6 w-6"
          onClick={(e) => handleExtend(e, 'end')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// Define the day cell component
const DayCell = ({ date, team, projects, assignments, onDropProject, handleDayClick, handleExtendProject }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'PROJECT',
    drop: (item: { id: string; team: string }) => {
      // If dropping on the same team, it's a move to a different date
      if (item.team === team) {
        handleDayClick(item.id, format(date, 'yyyy-MM-dd'));
      } else {
        // Otherwise, it's a team change
        onDropProject(item.id, team, format(date, 'yyyy-MM-dd'));
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver()
    })
  }));

  const dateStr = format(date, 'yyyy-MM-dd');
  const projectsForDay = projects.filter(project => {
    const assignment = assignments.find(a => a.project_id === project.id && a.team === team);
    if (!assignment) return false;
    
    // Check if this date is within the assignment date range
    const startAssignmentDate = new Date(assignment.start_date);
    const endAssignmentDate = new Date(startAssignmentDate);
    endAssignmentDate.setDate(endAssignmentDate.getDate() + (assignment.duration - 1));
    
    return isWithinInterval(date, {
      start: startOfDay(startAssignmentDate),
      end: endOfDay(endAssignmentDate)
    });
  });

  return (
    <div 
      ref={drop}
      className={cn(
        "min-h-[120px] border rounded p-1 bg-white",
        isOver ? "bg-gray-100" : ""
      )}
    >
      <div className="text-center text-sm font-medium mb-1">
        {format(date, 'EEE d')}
      </div>
      
      <div className="overflow-y-auto max-h-[300px]">
        {projectsForDay.map(project => {
          const assignment = assignments.find(a => a.project_id === project.id && a.team === team);
          if (!assignment) return null;
          
          // Calculate the date range for this project
          const startAssignmentDate = new Date(assignment.start_date);
          const endAssignmentDate = new Date(startAssignmentDate);
          endAssignmentDate.setDate(endAssignmentDate.getDate() + (assignment.duration - 1));
          
          const dateRange = [];
          let currentDate = new Date(startAssignmentDate);
          while (currentDate <= endAssignmentDate) {
            dateRange.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
          }
          
          // Only show the project on the start date to avoid duplicates
          if (format(date, 'yyyy-MM-dd') === format(startAssignmentDate, 'yyyy-MM-dd')) {
            return (
              <ProjectItem 
                key={project.id} 
                project={project} 
                team={team} 
                dateRange={dateRange}
                onExtendProject={handleExtendProject}
              />
            );
          }
          return null;
        })}
      </div>
    </div>
  );
};

// Define the team calendar component
const TeamCalendar = ({ team, startDate, projects, assignments, onDropProject, handleDayClick, handleExtendProject }) => {
  const teamColor = teamColors[team];
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));

  return (
    <div className="mb-6">
      <div className={cn("p-3 rounded-t-lg", teamColor.header)}>
        <h3 className="text-lg font-medium capitalize">{team} Team</h3>
      </div>
      
      <div className={cn(
        "grid grid-cols-7 gap-1 p-2 rounded-b-lg border-b border-x",
        teamColor.border
      )}>
        {weekDates.map((date, i) => (
          <DayCell 
            key={i} 
            date={date} 
            team={team} 
            projects={projects} 
            assignments={assignments}
            onDropProject={onDropProject}
            handleDayClick={handleDayClick}
            handleExtendProject={handleExtendProject}
          />
        ))}
      </div>
    </div>
  );
};

// Function to get status badge color
const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'active':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'completed':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'cancelled':
      return 'bg-red-100 text-red-800 border-red-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

// Define the unassigned projects component
const UnassignedProjects = ({ projects, assignments }) => {
  // Filter projects that don't have a team assignment
  const unassignedProjects = projects.filter(project => 
    !assignments.some(a => a.project_id === project.id)
  );
  
  return (
    <div className="mb-6">
      <div className={cn("p-3 rounded-t-lg", teamColors.unassigned.header)}>
        <h3 className="text-lg font-medium">Unassigned Projects</h3>
      </div>
      
      <div className="p-2 rounded-b-lg border-b border-x border-gray-300 bg-white">
        {unassignedProjects.length === 0 ? (
          <p className="text-center text-gray-500 p-4">No unassigned projects</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {unassignedProjects.map(project => (
              <ProjectItem 
                key={project.id} 
                project={project} 
                team={null}
                dateRange={null}
                onExtendProject={() => {}}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Main installation team calendar component
const InstallationTeamCalendar = ({ projects }: { projects: Project[] }) => {
  // Start from Monday (1) instead of Sunday (0)
  const [weekStartDate, setWeekStartDate] = useState(() => {
    const today = new Date();
    return startOfWeek(today, { weekStartsOn: 1 });
  });
  
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch team assignments
  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('project_team_assignments')
          .select('*')
          .order('start_date', { ascending: true });
          
        if (error) throw error;
        setAssignments(data || []);
      } catch (error) {
        console.error('Error fetching team assignments:', error);
        toast({
          title: "Error",
          description: "Failed to load team assignments",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchAssignments();
  }, [toast]);

  // Navigate to previous week
  const prevWeek = () => {
    setWeekStartDate(addDays(weekStartDate, -7));
  };

  // Navigate to next week
  const nextWeek = () => {
    setWeekStartDate(addDays(weekStartDate, 7));
  };

  // Handle project drop on a team
  const handleDropProject = async (projectId: string, team: string, newStartDate?: string) => {
    try {
      // Check if an assignment already exists
      const existingAssignmentIndex = assignments.findIndex(a => a.project_id === projectId);
      
      if (existingAssignmentIndex >= 0) {
        // Update existing assignment
        const existingAssignment = assignments[existingAssignmentIndex];
        const updateData: Partial<Assignment> = { team };
        
        // If a new date is specified, update the start date
        if (newStartDate) {
          updateData.start_date = newStartDate;
        }
        
        const { error } = await supabase
          .from('project_team_assignments')
          .update(updateData)
          .eq('id', existingAssignment.id);
          
        if (error) throw error;
        
        // Update local state
        const updatedAssignments = [...assignments];
        updatedAssignments[existingAssignmentIndex] = {
          ...existingAssignment,
          ...updateData
        };
        setAssignments(updatedAssignments);
        
        toast({
          title: "Team Updated",
          description: `Project has been assigned to ${team} team${newStartDate ? ` starting ${format(new Date(newStartDate), 'MMM d')}` : ''}`
        });
      } else {
        // Create new assignment
        const newAssignment = {
          project_id: projectId,
          team,
          start_date: newStartDate || format(weekStartDate, 'yyyy-MM-dd'),
          duration: 1 // Default 1 day
        };
        
        const { data, error } = await supabase
          .from('project_team_assignments')
          .insert([newAssignment])
          .select();
          
        if (error) throw error;
        
        // Update local state
        setAssignments([...assignments, data[0]]);
        
        toast({
          title: "Team Assigned",
          description: `Project has been assigned to ${team} team`
        });
      }
    } catch (error) {
      console.error('Error assigning project to team:', error);
      toast({
        title: "Error",
        description: "Failed to assign project to team",
        variant: "destructive"
      });
    }
  };

  // Handle project date change
  const handleDayClick = async (projectId: string, newStartDate: string) => {
    try {
      // Find the assignment
      const assignmentIndex = assignments.findIndex(a => a.project_id === projectId);
      if (assignmentIndex < 0) return;
      
      const assignment = assignments[assignmentIndex];
      
      // Update assignment start date
      const { error } = await supabase
        .from('project_team_assignments')
        .update({ start_date: newStartDate })
        .eq('id', assignment.id);
        
      if (error) throw error;
      
      // Update local state
      const updatedAssignments = [...assignments];
      updatedAssignments[assignmentIndex] = {
        ...assignment,
        start_date: newStartDate
      };
      setAssignments(updatedAssignments);
      
      toast({
        title: "Date Updated",
        description: `Project moved to ${format(new Date(newStartDate), 'MMM d')}`
      });
    } catch (error) {
      console.error('Error updating project date:', error);
      toast({
        title: "Error",
        description: "Failed to update project date",
        variant: "destructive"
      });
    }
  };

  // Handle project extension (duration change)
  const handleExtendProject = async (projectId: string, direction: string) => {
    try {
      // Find the assignment
      const assignmentIndex = assignments.findIndex(a => a.project_id === projectId);
      if (assignmentIndex < 0) return;
      
      const assignment = assignments[assignmentIndex];
      let duration = assignment.duration;
      let start_date = assignment.start_date;
      
      if (direction === 'end') {
        // Extend the duration
        duration += 1;
      } else if (direction === 'start') {
        if (duration > 1) {
          // Shrink from the start (duration decreases)
          duration -= 1;
          // Move start date forward by one day
          const currentStart = new Date(start_date);
          currentStart.setDate(currentStart.getDate() + 1);
          start_date = format(currentStart, 'yyyy-MM-dd');
        }
      }
      
      // Update assignment
      const { error } = await supabase
        .from('project_team_assignments')
        .update({ duration, start_date })
        .eq('id', assignment.id);
        
      if (error) throw error;
      
      // Update local state
      const updatedAssignments = [...assignments];
      updatedAssignments[assignmentIndex] = {
        ...assignment,
        duration,
        start_date
      };
      setAssignments(updatedAssignments);
      
      toast({
        title: "Duration Updated",
        description: `Project duration is now ${duration} day${duration > 1 ? 's' : ''}`
      });
    } catch (error) {
      console.error('Error updating project duration:', error);
      toast({
        title: "Error",
        description: "Failed to update project duration",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>;
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle>Installation Team Calendar</CardTitle>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="icon" onClick={prevWeek}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">
                {format(weekStartDate, 'MMM d')} - {format(addDays(weekStartDate, 6), 'MMM d, yyyy')}
              </span>
              <Button variant="outline" size="icon" onClick={nextWeek}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <UnassignedProjects projects={projects} assignments={assignments} />
          <TeamCalendar 
            team="green" 
            startDate={weekStartDate} 
            projects={projects} 
            assignments={assignments} 
            onDropProject={handleDropProject} 
            handleDayClick={handleDayClick}
            handleExtendProject={handleExtendProject}
          />
          <TeamCalendar 
            team="blue" 
            startDate={weekStartDate} 
            projects={projects} 
            assignments={assignments} 
            onDropProject={handleDropProject} 
            handleDayClick={handleDayClick}
            handleExtendProject={handleExtendProject}
          />
          <TeamCalendar 
            team="orange" 
            startDate={weekStartDate} 
            projects={projects} 
            assignments={assignments} 
            onDropProject={handleDropProject} 
            handleDayClick={handleDayClick}
            handleExtendProject={handleExtendProject}
          />
        </CardContent>
      </Card>
    </DndProvider>
  );
};

export default InstallationTeamCalendar;
