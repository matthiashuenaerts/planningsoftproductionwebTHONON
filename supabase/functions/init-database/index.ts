
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { data: employeesExist } = await supabaseClient
      .from('employees')
      .select('count')
      .limit(1);

    // If employees already exist, do nothing
    if (employeesExist && employeesExist.length > 0 && employeesExist[0].count > 0) {
      return new Response(
        JSON.stringify({ message: "Database already initialized" }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Seed initial employees
    const { error: employeesError } = await supabaseClient.from('employees').insert([
      {
        name: 'Admin User',
        email: 'admin@kitchenpro.com',
        password: 'admin123', // In a real app, this would be hashed
        role: 'admin'
      },
      {
        name: 'Manager User',
        email: 'manager@kitchenpro.com',
        password: 'manager123',
        role: 'manager'
      },
      {
        name: 'Worker 1',
        email: 'worker1@kitchenpro.com',
        password: 'worker123',
        role: 'worker',
        workstation: 'CUTTING'
      },
      {
        name: 'Worker 2',
        email: 'worker2@kitchenpro.com',
        password: 'worker123',
        role: 'worker',
        workstation: 'ASSEMBLY'
      }
    ]);

    if (employeesError) throw employeesError;

    // Seed a sample project
    const { data: project, error: projectError } = await supabaseClient
      .from('projects')
      .insert({
        name: 'Luxury Kitchen Remodel',
        client: 'Smith Residence',
        description: 'Modern kitchen remodel with custom cabinets, island, and high-end appliances.',
        start_date: new Date().toISOString().split('T')[0],
        installation_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'in_progress',
      })
      .select()
      .single();

    if (projectError) throw projectError;

    // Get standard phases
    const phaseTypes = ['PLANNING', 'DESIGN', 'PRODUCTION', 'ASSEMBLY', 'TESTING', 'DEPLOYMENT'];
    const today = new Date();
    
    // Create phases for the project
    const phases = [];
    for (let i = 0; i < phaseTypes.length; i++) {
      const startDate = new Date(today);
      startDate.setDate(today.getDate() + i * 7);
      
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 7);
      
      phases.push({
        project_id: project.id,
        name: phaseTypes[i],
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        progress: i <= 1 ? 100 : i === 2 ? 50 : 0,
      });
    }

    const { data: createdPhases, error: phasesError } = await supabaseClient
      .from('phases')
      .insert(phases)
      .select();

    if (phasesError) throw phasesError;

    // Create tasks for each phase
    const tasks = [];
    const workstations = ['CUTTING', 'WELDING', 'PAINTING', 'ASSEMBLY', 'PACKAGING', 'SHIPPING'];
    const priorities = ['Low', 'Medium', 'High', 'Urgent'];
    
    for (const phase of createdPhases) {
      const phaseIndex = phaseTypes.indexOf(phase.name);
      
      // Create 2-4 tasks per phase
      const taskCount = Math.floor(Math.random() * 3) + 2;
      
      for (let i = 0; i < taskCount; i++) {
        const dueDate = new Date(phase.start_date);
        dueDate.setDate(dueDate.getDate() + i * 2);
        
        tasks.push({
          phase_id: phase.id,
          assignee_id: null, // Will be assigned later
          title: `Task ${i + 1} for ${phase.name}`,
          description: `This is a sample task for the ${phase.name} phase of the project.`,
          workstation: workstations[Math.floor(Math.random() * workstations.length)],
          status: phaseIndex <= 1 ? 'COMPLETED' : 
                 phaseIndex === 2 ? (i % 2 === 0 ? 'COMPLETED' : 'IN_PROGRESS') : 'TODO',
          priority: priorities[Math.floor(Math.random() * priorities.length)],
          due_date: dueDate.toISOString().split('T')[0],
        });
      }
    }

    const { error: tasksError } = await supabaseClient
      .from('tasks')
      .insert(tasks);

    if (tasksError) throw tasksError;

    return new Response(
      JSON.stringify({ 
        message: "Database initialized successfully",
        data: {
          employees: 4,
          projects: 1,
          phases: createdPhases.length,
          tasks: tasks.length
        }
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
    
  } catch (error) {
    console.error("Error:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
