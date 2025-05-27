
import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
  estimatedHours: number;
  startTime: string;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ estimatedHours, startTime }) => {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isOvertime, setIsOvertime] = useState<boolean>(false);

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const start = new Date(startTime).getTime();
      const estimatedDuration = estimatedHours * 60 * 60 * 1000; // Convert hours to milliseconds
      const elapsed = now - start;
      const remaining = estimatedDuration - elapsed;

      if (remaining <= 0) {
        setIsOvertime(true);
        setTimeRemaining(Math.abs(remaining));
      } else {
        setIsOvertime(false);
        setTimeRemaining(remaining);
      }
    };

    // Calculate immediately
    calculateTimeRemaining();

    // Update every minute
    const interval = setInterval(calculateTimeRemaining, 60000);

    return () => clearInterval(interval);
  }, [estimatedHours, startTime]);

  const formatTime = (milliseconds: number) => {
    const totalMinutes = Math.floor(milliseconds / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getTimerColor = () => {
    if (isOvertime) {
      return 'bg-red-100 text-red-800 border-red-300';
    }
    
    const totalDuration = estimatedHours * 60 * 60 * 1000;
    const percentage = (timeRemaining / totalDuration) * 100;
    
    if (percentage <= 25) {
      return 'bg-orange-100 text-orange-800 border-orange-300';
    } else if (percentage <= 50) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    }
    return 'bg-green-100 text-green-800 border-green-300';
  };

  return (
    <Badge className={`${getTimerColor()} flex items-center gap-1 w-fit`}>
      <Clock className="h-3 w-3" />
      {isOvertime ? '⚠️ Overtime: ' : 'Time left: '}
      {formatTime(timeRemaining)}
    </Badge>
  );
};

export default CountdownTimer;
