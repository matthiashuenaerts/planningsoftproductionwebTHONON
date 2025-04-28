
import React from 'react';
import { Project, PhaseType } from '@/lib/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TimelineProps {
  project: Project;
}

const Timeline: React.FC<TimelineProps> = ({ project }) => {
  // Helper function to get color for phase
  const getPhaseColor = (phase: PhaseType): string => {
    switch (phase) {
      case PhaseType.PLANNING:
        return 'bg-phase-planning';
      case PhaseType.DESIGN:
        return 'bg-phase-design';
      case PhaseType.PRODUCTION:
        return 'bg-phase-production';
      case PhaseType.ASSEMBLY:
        return 'bg-phase-assembly';
      case PhaseType.TESTING:
        return 'bg-phase-testing';
      case PhaseType.DEPLOYMENT:
        return 'bg-phase-deployment';
      default:
        return 'bg-gray-500';
    }
  };

  // Helper to format date
  const formatShortDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Project Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
          
          {project.phases.map((phase, index) => (
            <div key={phase.id} className="relative pl-12 pb-8 last:pb-0">
              {/* Timeline node */}
              <div className={`absolute left-4 w-4 h-4 rounded-full -translate-x-1/2 ${getPhaseColor(phase.name)}`}></div>
              
              <div>
                <div className="flex justify-between items-center mb-1">
                  <h4 className="font-medium">{phase.name}</h4>
                  <div className="text-xs text-muted-foreground">
                    {formatShortDate(phase.startDate)} - {formatShortDate(phase.endDate)}
                  </div>
                </div>
                
                <div className="progress-bar mb-2">
                  <div 
                    className={`progress-value ${getPhaseColor(phase.name)}`} 
                    style={{ width: `${phase.progress}%` }}
                  ></div>
                </div>
                
                <div className="text-xs text-right">
                  {phase.progress}% Complete
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default Timeline;
