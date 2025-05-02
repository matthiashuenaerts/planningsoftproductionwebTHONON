
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.23.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check if we already have data
    const { data: existingProjects } = await supabaseClient
      .from('projects')
      .select('id')
      .limit(1)

    if (existingProjects && existingProjects.length > 0) {
      return new Response(
        JSON.stringify({
          message: 'Database already initialized with sample data'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    // Insert sample projects
    const now = new Date()
    const startDate = new Date()
    startDate.setDate(now.getDate() - 15)
    
    const installDate = new Date()
    installDate.setDate(now.getDate() + 30)

    // Insert projects
    const { data: projectsData, error: projectsError } = await supabaseClient
      .from('projects')
      .insert([
        {
          name: 'Office Building Renovation',
          client: 'ABC Corp',
          description: 'Complete renovation of 3-story office building with new furniture and fixtures',
          start_date: startDate.toISOString().split('T')[0],
          installation_date: installDate.toISOString().split('T')[0],
          progress: 0,
          status: 'in_progress'
        },
        {
          name: 'Restaurant Kitchen Equipment',
          client: 'Fine Dining LLC',
          description: 'Custom stainless steel kitchen equipment for new restaurant',
          start_date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          installation_date: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          progress: 0,
          status: 'planned'
        }
      ])
      .select()

    if (projectsError) {
      throw projectsError
    }

    // Define phases for each project
    const phases = []
    
    // Project 1 phases
    if (projectsData && projectsData[0]) {
      const project1 = projectsData[0]
      const phaseTypes = ['PLANNING', 'DESIGN', 'PRODUCTION', 'ASSEMBLY', 'TESTING', 'DEPLOYMENT']
      
      let phaseStartDate = new Date(project1.start_date)
      
      for (const phaseType of phaseTypes) {
        const phaseEndDate = new Date(phaseStartDate)
        phaseEndDate.setDate(phaseStartDate.getDate() + 10) // Each phase is 10 days long
        
        phases.push({
          project_id: project1.id,
          name: phaseType,
          start_date: phaseStartDate.toISOString().split('T')[0],
          end_date: phaseEndDate.toISOString().split('T')[0],
          progress: phaseType === 'PLANNING' ? 100 : phaseType === 'DESIGN' ? 50 : 0
        })
        
        phaseStartDate = new Date(phaseEndDate)
        phaseStartDate.setDate(phaseEndDate.getDate() + 1) // Next phase starts day after previous ends
      }
    }
    
    // Project 2 phases (similar structure)
    if (projectsData && projectsData[1]) {
      const project2 = projectsData[1]
      const phaseTypes = ['PLANNING', 'DESIGN', 'PRODUCTION', 'ASSEMBLY', 'TESTING', 'DEPLOYMENT']
      
      let phaseStartDate = new Date(project2.start_date)
      
      for (const phaseType of phaseTypes) {
        const phaseEndDate = new Date(phaseStartDate)
        phaseEndDate.setDate(phaseStartDate.getDate() + 7) // Each phase is 7 days long for this project
        
        phases.push({
          project_id: project2.id,
          name: phaseType,
          start_date: phaseStartDate.toISOString().split('T')[0],
          end_date: phaseEndDate.toISOString().split('T')[0],
          progress: phaseType === 'PLANNING' ? 100 : 0
        })
        
        phaseStartDate = new Date(phaseEndDate)
        phaseStartDate.setDate(phaseEndDate.getDate() + 1)
      }
    }
    
    // Insert all phases
    const { data: phasesData, error: phasesError } = await supabaseClient
      .from('phases')
      .insert(phases)
      .select()

    if (phasesError) {
      throw phasesError
    }

    // Create sample tasks for the first few phases
    const tasks = []
    
    // Sample tasks for the first project's phases
    if (phasesData) {
      const planningPhase = phasesData.find(p => p.project_id === projectsData[0].id && p.name === 'PLANNING')
      const designPhase = phasesData.find(p => p.project_id === projectsData[0].id && p.name === 'DESIGN')
      const productionPhase = phasesData.find(p => p.project_id === projectsData[0].id && p.name === 'PRODUCTION')
      
      if (planningPhase) {
        tasks.push({
          phase_id: planningPhase.id,
          title: 'Site inspection',
          description: 'Inspect site and document existing conditions',
          workstation: 'CUTTING',
          status: 'COMPLETED',
          priority: 'High',
          due_date: new Date(planningPhase.start_date).toISOString().split('T')[0]
        })
        
        tasks.push({
          phase_id: planningPhase.id,
          title: 'Requirements gathering',
          description: 'Meet with client to determine project requirements',
          workstation: 'ASSEMBLY',
          status: 'COMPLETED',
          priority: 'Medium',
          due_date: new Date(planningPhase.end_date).toISOString().split('T')[0]
        })
      }
      
      if (designPhase) {
        tasks.push({
          phase_id: designPhase.id,
          title: 'Create blueprints',
          description: 'Design layout and furniture placement',
          workstation: 'ASSEMBLY',
          status: 'COMPLETED',
          priority: 'High',
          due_date: new Date(designPhase.start_date).toISOString().split('T')[0]
        })
        
        tasks.push({
          phase_id: designPhase.id,
          title: 'Material selection',
          description: 'Choose materials for furniture and fixtures',
          workstation: 'CUTTING',
          status: 'IN_PROGRESS',
          priority: 'Medium',
          due_date: new Date(designPhase.end_date).toISOString().split('T')[0]
        })
      }
      
      if (productionPhase) {
        const today = new Date().toISOString().split('T')[0]
        
        tasks.push({
          phase_id: productionPhase.id,
          title: 'Cut desk frames',
          description: 'Cut metal frames for 20 desks',
          workstation: 'CUTTING',
          status: 'TODO',
          priority: 'High',
          due_date: today
        })
        
        tasks.push({
          phase_id: productionPhase.id,
          title: 'Prepare wood tops',
          description: 'Cut and sand wooden desk tops',
          workstation: 'CUTTING',
          status: 'TODO',
          priority: 'Medium',
          due_date: today
        })
        
        tasks.push({
          phase_id: productionPhase.id,
          title: 'Weld desk frames',
          description: 'Weld metal frames for 20 desks',
          workstation: 'WELDING',
          status: 'TODO',
          priority: 'High',
          due_date: today
        })
      }
    }

    // Insert all tasks
    const { data: tasksData, error: tasksError } = await supabaseClient
      .from('tasks')
      .insert(tasks)
      .select()

    if (tasksError) {
      throw tasksError
    }

    return new Response(
      JSON.stringify({
        message: 'Database initialized with sample data',
        projects: projectsData.length,
        phases: phasesData.length,
        tasks: tasksData.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
