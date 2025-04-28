
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppContext } from '@/context/AppContext';
import TaskList from './TaskList';
import { WorkstationType } from '@/lib/mockData';

interface WorkstationViewProps {
  workstation: WorkstationType;
}

const WorkstationView: React.FC<WorkstationViewProps> = ({ workstation }) => {
  const { getTasksForWorkstation } = useAppContext();
  const tasks = getTasksForWorkstation(workstation);

  const getWorkstationColor = (workstation: WorkstationType): string => {
    switch (workstation) {
      case WorkstationType.CUTTING:
        return 'bg-workstation-cutting';
      case WorkstationType.WELDING:
        return 'bg-workstation-welding';
      case WorkstationType.PAINTING:
        return 'bg-workstation-painting';
      case WorkstationType.ASSEMBLY:
        return 'bg-workstation-assembly';
      case WorkstationType.PACKAGING:
        return 'bg-workstation-packaging';
      case WorkstationType.SHIPPING:
        return 'bg-workstation-shipping';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${getWorkstationColor(workstation)}`}></div>
          <CardTitle>{workstation} Workstation</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <TaskList tasks={tasks} title={`${workstation} Tasks`} />
      </CardContent>
    </Card>
  );
};

export default WorkstationView;
