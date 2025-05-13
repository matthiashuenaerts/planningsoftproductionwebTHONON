
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const DailyTasks: React.FC = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Redirect to the new InstallCalendar page
    navigate('/install-calendar');
  }, [navigate]);
  
  return null;
};

export default DailyTasks;
