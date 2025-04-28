
export type Project = {
  id: string;
  name: string;
  description: string;
  client: string;
  installationDate: string;
  startDate: string;
  currentPhase: PhaseType;
  progress: number;
  phases: Phase[];
};

export type Phase = {
  id: string;
  name: PhaseType;
  startDate: string;
  endDate: string;
  status: Status;
  progress: number;
  tasks: Task[];
};

export type Task = {
  id: string;
  projectId: string;
  phaseId: string;
  title: string;
  description: string;
  workstation: WorkstationType;
  assignee: string | null;
  dueDate: string;
  status: Status;
  priority: Priority;
};

export enum PhaseType {
  PLANNING = "Planning",
  DESIGN = "Design",
  PRODUCTION = "Production",
  ASSEMBLY = "Assembly",
  TESTING = "Testing",
  DEPLOYMENT = "Deployment"
}

export enum WorkstationType {
  CUTTING = "Cutting",
  WELDING = "Welding",
  PAINTING = "Painting",
  ASSEMBLY = "Assembly",
  PACKAGING = "Packaging",
  SHIPPING = "Shipping"
}

export enum Status {
  NOT_STARTED = "Not Started",
  IN_PROGRESS = "In Progress",
  COMPLETED = "Completed",
  DELAYED = "Delayed",
  BLOCKED = "Blocked"
}

export enum Priority {
  LOW = "Low",
  MEDIUM = "Medium",
  HIGH = "High",
  URGENT = "Urgent"
}

export type User = {
  id: string;
  name: string;
  role: string;
  workstation: WorkstationType;
  avatar: string;
};

// Generate mock data for our application
export const users: User[] = [
  {
    id: "user-1",
    name: "Alex Johnson",
    role: "Production Manager",
    workstation: WorkstationType.ASSEMBLY,
    avatar: "https://i.pravatar.cc/150?img=1",
  },
  {
    id: "user-2",
    name: "Sarah Williams",
    role: "CNC Operator",
    workstation: WorkstationType.CUTTING,
    avatar: "https://i.pravatar.cc/150?img=2",
  },
  {
    id: "user-3",
    name: "Mike Thompson",
    role: "Welder",
    workstation: WorkstationType.WELDING,
    avatar: "https://i.pravatar.cc/150?img=3",
  },
  {
    id: "user-4",
    name: "Emily Davis",
    role: "Painter",
    workstation: WorkstationType.PAINTING,
    avatar: "https://i.pravatar.cc/150?img=4",
  },
  {
    id: "user-5",
    name: "Chris Wilson",
    role: "Assembler",
    workstation: WorkstationType.ASSEMBLY,
    avatar: "https://i.pravatar.cc/150?img=5",
  },
  {
    id: "user-6",
    name: "Jessica Brown",
    role: "Quality Control",
    workstation: WorkstationType.PACKAGING, // Changed from TESTING to PACKAGING
    avatar: "https://i.pravatar.cc/150?img=6",
  },
];

// Helper function to get dates relative to today
const getDate = (offset: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().split('T')[0];
};

export const projects: Project[] = [
  {
    id: "project-1",
    name: "Office Building Renovation",
    description: "Complete renovation of 3-story office building with new furniture and fixtures",
    client: "ABC Corp",
    installationDate: getDate(30),
    startDate: getDate(-15),
    currentPhase: PhaseType.PRODUCTION,
    progress: 45,
    phases: [
      {
        id: "phase-1-1",
        name: PhaseType.PLANNING,
        startDate: getDate(-15),
        endDate: getDate(-10),
        status: Status.COMPLETED,
        progress: 100,
        tasks: [
          {
            id: "task-1-1-1",
            projectId: "project-1",
            phaseId: "phase-1-1",
            title: "Site inspection",
            description: "Inspect site and document existing conditions",
            workstation: WorkstationType.CUTTING,
            assignee: "user-1",
            dueDate: getDate(-12),
            status: Status.COMPLETED,
            priority: Priority.HIGH
          },
          {
            id: "task-1-1-2",
            projectId: "project-1",
            phaseId: "phase-1-1",
            title: "Requirements gathering",
            description: "Meet with client to determine project requirements",
            workstation: WorkstationType.CUTTING,
            assignee: "user-1",
            dueDate: getDate(-11),
            status: Status.COMPLETED,
            priority: Priority.HIGH
          }
        ]
      },
      {
        id: "phase-1-2",
        name: PhaseType.DESIGN,
        startDate: getDate(-10),
        endDate: getDate(-5),
        status: Status.COMPLETED,
        progress: 100,
        tasks: [
          {
            id: "task-1-2-1",
            projectId: "project-1",
            phaseId: "phase-1-2",
            title: "Create blueprints",
            description: "Design layout and furniture placement",
            workstation: WorkstationType.CUTTING,
            assignee: "user-2",
            dueDate: getDate(-7),
            status: Status.COMPLETED,
            priority: Priority.MEDIUM
          },
          {
            id: "task-1-2-2",
            projectId: "project-1",
            phaseId: "phase-1-2",
            title: "Material selection",
            description: "Choose materials for furniture and fixtures",
            workstation: WorkstationType.CUTTING,
            assignee: "user-2",
            dueDate: getDate(-6),
            status: Status.COMPLETED,
            priority: Priority.MEDIUM
          }
        ]
      },
      {
        id: "phase-1-3",
        name: PhaseType.PRODUCTION,
        startDate: getDate(-5),
        endDate: getDate(5),
        status: Status.IN_PROGRESS,
        progress: 50,
        tasks: [
          {
            id: "task-1-3-1",
            projectId: "project-1",
            phaseId: "phase-1-3",
            title: "Cut desk frames",
            description: "Cut metal frames for 20 desks",
            workstation: WorkstationType.CUTTING,
            assignee: "user-2",
            dueDate: getDate(-3),
            status: Status.COMPLETED,
            priority: Priority.HIGH
          },
          {
            id: "task-1-3-2",
            projectId: "project-1",
            phaseId: "phase-1-3",
            title: "Weld desk frames",
            description: "Weld metal frames for 20 desks",
            workstation: WorkstationType.WELDING,
            assignee: "user-3",
            dueDate: getDate(0),
            status: Status.IN_PROGRESS,
            priority: Priority.HIGH
          },
          {
            id: "task-1-3-3",
            projectId: "project-1",
            phaseId: "phase-1-3",
            title: "Paint desk frames",
            description: "Paint metal frames for 20 desks",
            workstation: WorkstationType.PAINTING,
            assignee: "user-4",
            dueDate: getDate(2),
            status: Status.NOT_STARTED,
            priority: Priority.MEDIUM
          }
        ]
      },
      {
        id: "phase-1-4",
        name: PhaseType.ASSEMBLY,
        startDate: getDate(5),
        endDate: getDate(15),
        status: Status.NOT_STARTED,
        progress: 0,
        tasks: [
          {
            id: "task-1-4-1",
            projectId: "project-1",
            phaseId: "phase-1-4",
            title: "Assemble desks",
            description: "Assemble 20 desks with frames and tops",
            workstation: WorkstationType.ASSEMBLY,
            assignee: "user-5",
            dueDate: getDate(10),
            status: Status.NOT_STARTED,
            priority: Priority.MEDIUM
          },
          {
            id: "task-1-4-2",
            projectId: "project-1",
            phaseId: "phase-1-4",
            title: "Install cable management",
            description: "Install cable management systems on 20 desks",
            workstation: WorkstationType.ASSEMBLY,
            assignee: "user-5",
            dueDate: getDate(12),
            status: Status.NOT_STARTED,
            priority: Priority.LOW
          }
        ]
      },
      {
        id: "phase-1-5",
        name: PhaseType.TESTING,
        startDate: getDate(15),
        endDate: getDate(20),
        status: Status.NOT_STARTED,
        progress: 0,
        tasks: [
          {
            id: "task-1-5-1",
            projectId: "project-1",
            phaseId: "phase-1-5",
            title: "Quality inspection",
            description: "Inspect all furniture for quality standards",
            workstation: WorkstationType.PACKAGING,
            assignee: "user-6",
            dueDate: getDate(18),
            status: Status.NOT_STARTED,
            priority: Priority.HIGH
          }
        ]
      },
      {
        id: "phase-1-6",
        name: PhaseType.DEPLOYMENT,
        startDate: getDate(20),
        endDate: getDate(30),
        status: Status.NOT_STARTED,
        progress: 0,
        tasks: [
          {
            id: "task-1-6-1",
            projectId: "project-1",
            phaseId: "phase-1-6",
            title: "Packaging",
            description: "Package all furniture for shipping",
            workstation: WorkstationType.PACKAGING,
            assignee: "user-6",
            dueDate: getDate(22),
            status: Status.NOT_STARTED,
            priority: Priority.MEDIUM
          },
          {
            id: "task-1-6-2",
            projectId: "project-1",
            phaseId: "phase-1-6",
            title: "Delivery",
            description: "Deliver furniture to client site",
            workstation: WorkstationType.SHIPPING,
            assignee: "user-1",
            dueDate: getDate(25),
            status: Status.NOT_STARTED,
            priority: Priority.HIGH
          },
          {
            id: "task-1-6-3",
            projectId: "project-1",
            phaseId: "phase-1-6",
            title: "Installation",
            description: "Install furniture at client site",
            workstation: WorkstationType.ASSEMBLY,
            assignee: "user-5",
            dueDate: getDate(28),
            status: Status.NOT_STARTED,
            priority: Priority.HIGH
          }
        ]
      }
    ]
  },
  {
    id: "project-2",
    name: "Restaurant Kitchen Equipment",
    description: "Custom stainless steel kitchen equipment for new restaurant",
    client: "Fine Dining LLC",
    installationDate: getDate(15),
    startDate: getDate(-5),
    currentPhase: PhaseType.DESIGN,
    progress: 20,
    phases: [
      {
        id: "phase-2-1",
        name: PhaseType.PLANNING,
        startDate: getDate(-5),
        endDate: getDate(-3),
        status: Status.COMPLETED,
        progress: 100,
        tasks: [
          {
            id: "task-2-1-1",
            projectId: "project-2",
            phaseId: "phase-2-1",
            title: "Kitchen layout analysis",
            description: "Analyze kitchen layout and requirements",
            workstation: WorkstationType.CUTTING,
            assignee: "user-1",
            dueDate: getDate(-4),
            status: Status.COMPLETED,
            priority: Priority.HIGH
          }
        ]
      },
      {
        id: "phase-2-2",
        name: PhaseType.DESIGN,
        startDate: getDate(-3),
        endDate: getDate(2),
        status: Status.IN_PROGRESS,
        progress: 60,
        tasks: [
          {
            id: "task-2-2-1",
            projectId: "project-2",
            phaseId: "phase-2-2",
            title: "Design prep stations",
            description: "Create detailed designs for prep stations",
            workstation: WorkstationType.CUTTING,
            assignee: "user-2",
            dueDate: getDate(-1),
            status: Status.COMPLETED,
            priority: Priority.MEDIUM
          },
          {
            id: "task-2-2-2",
            projectId: "project-2",
            phaseId: "phase-2-2",
            title: "Design cooking line",
            description: "Create detailed designs for cooking line",
            workstation: WorkstationType.CUTTING,
            assignee: "user-2",
            dueDate: getDate(1),
            status: Status.IN_PROGRESS,
            priority: Priority.MEDIUM
          }
        ]
      },
      // Additional phases similar to project 1...
      {
        id: "phase-2-3",
        name: PhaseType.PRODUCTION,
        startDate: getDate(2),
        endDate: getDate(8),
        status: Status.NOT_STARTED,
        progress: 0,
        tasks: []
      },
      {
        id: "phase-2-4",
        name: PhaseType.ASSEMBLY,
        startDate: getDate(8),
        endDate: getDate(10),
        status: Status.NOT_STARTED,
        progress: 0,
        tasks: []
      },
      {
        id: "phase-2-5",
        name: PhaseType.TESTING,
        startDate: getDate(10),
        endDate: getDate(12),
        status: Status.NOT_STARTED,
        progress: 0,
        tasks: []
      },
      {
        id: "phase-2-6",
        name: PhaseType.DEPLOYMENT,
        startDate: getDate(12),
        endDate: getDate(15),
        status: Status.NOT_STARTED,
        progress: 0,
        tasks: []
      }
    ]
  },
  {
    id: "project-3",
    name: "School Laboratory Furniture",
    description: "Custom laboratory tables and storage for high school science department",
    client: "Westside School District",
    installationDate: getDate(45),
    startDate: getDate(-10),
    currentPhase: PhaseType.PLANNING,
    progress: 10,
    phases: [
      {
        id: "phase-3-1",
        name: PhaseType.PLANNING,
        startDate: getDate(-10),
        endDate: getDate(5),
        status: Status.IN_PROGRESS,
        progress: 70,
        tasks: [
          {
            id: "task-3-1-1",
            projectId: "project-3",
            phaseId: "phase-3-1",
            title: "Lab requirements gathering",
            description: "Meet with science department to determine needs",
            workstation: WorkstationType.CUTTING,
            assignee: "user-1",
            dueDate: getDate(-5),
            status: Status.COMPLETED,
            priority: Priority.HIGH
          },
          {
            id: "task-3-1-2",
            projectId: "project-3",
            phaseId: "phase-3-1",
            title: "Safety compliance research",
            description: "Research safety requirements for school labs",
            workstation: WorkstationType.CUTTING,
            assignee: "user-1",
            dueDate: getDate(2),
            status: Status.IN_PROGRESS,
            priority: Priority.HIGH
          }
        ]
      },
      // Additional phases...
      {
        id: "phase-3-2",
        name: PhaseType.DESIGN,
        startDate: getDate(5),
        endDate: getDate(15),
        status: Status.NOT_STARTED,
        progress: 0,
        tasks: []
      },
      {
        id: "phase-3-3",
        name: PhaseType.PRODUCTION,
        startDate: getDate(15),
        endDate: getDate(25),
        status: Status.NOT_STARTED,
        progress: 0,
        tasks: []
      },
      {
        id: "phase-3-4",
        name: PhaseType.ASSEMBLY,
        startDate: getDate(25),
        endDate: getDate(35),
        status: Status.NOT_STARTED,
        progress: 0,
        tasks: []
      },
      {
        id: "phase-3-5",
        name: PhaseType.TESTING,
        startDate: getDate(35),
        endDate: getDate(40),
        status: Status.NOT_STARTED,
        progress: 0,
        tasks: []
      },
      {
        id: "phase-3-6",
        name: PhaseType.DEPLOYMENT,
        startDate: getDate(40),
        endDate: getDate(45),
        status: Status.NOT_STARTED,
        progress: 0,
        tasks: []
      }
    ]
  }
];

// Get all tasks across all projects
export const getAllTasks = (): Task[] => {
  return projects.flatMap(project => 
    project.phases.flatMap(phase => 
      phase.tasks
    )
  );
};

// Get tasks due today
export const getTodaysTasks = (): Task[] => {
  const today = getDate(0);
  return getAllTasks().filter(task => task.dueDate === today);
};

// Get tasks for a specific workstation
export const getTasksByWorkstation = (workstation: WorkstationType): Task[] => {
  return getAllTasks().filter(task => task.workstation === workstation);
};

// Get tasks for a specific user
export const getTasksByAssignee = (userId: string): Task[] => {
  return getAllTasks().filter(task => task.assignee === userId);
};

// Utility function to get task status class
export const getTaskStatusClass = (dueDate: string): string => {
  const today = getDate(0);
  const tomorrow = getDate(1);
  
  if (dueDate < today) {
    return "task-overdue";
  } else if (dueDate === today) {
    return "task-today";
  } else {
    return "task-upcoming";
  }
};

// Utility function to format date
export const formatDate = (dateString: string): string => {
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};
