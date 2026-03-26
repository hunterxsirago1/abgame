import React from 'react';
import { BackArrowIcon } from './Icons';
import { todayKey, toDateKey } from '../hooks/useGameState';

interface CalendarViewProps {
  onBack: () => void;
  onSelectDate: (dateKey: string) => void;
  progress: Record<string, { status: string; attempts: number }>;
}

const CalendarView: React.FC<CalendarViewProps> = ({ onBack, onSelectDate, progress }) => {
  const today = todayKey();
  
  // Generate last 60 days for now
  const dates = [];
  const start = new Date();
  for (let i = 0; i < 60; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() - i);
    dates.push(toDateKey(d));
  }

  // Group by month
  const months: Record<string, string[]> = {};
  dates.forEach(dateKey => {
    const d = new Date(dateKey + 'T00:00:00');
    const monthKey = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (!months[monthKey]) months[monthKey] = [];
    months[monthKey].push(dateKey);
  });

  return (
    <div className="calendar-view">
      <div className="header">
        <button className="icon-btn" onClick={onBack}>
          <BackArrowIcon />
        </button>
        <div style={{ fontWeight: 800, letterSpacing: '1px' }}>PREVIOUS GAMES</div>
        <div style={{ width: '40px' }}></div>
      </div>
      
      <div className="calendar-content">
        {Object.entries(months).map(([monthLabel, days]) => (
          <div key={monthLabel}>
            <div className="cal-month-label">{monthLabel}</div>
            <div className="cal-grid">
              {days.map(dateKey => {
                const d = new Date(dateKey + 'T00:00:00');
                const dayNum = d.getDate();
                const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
                const prog = progress[dateKey];
                const isToday = dateKey === today;

                let statusClass = '';
                if (prog?.status === 'completed') statusClass = 'cal-day--completed';
                else if (prog?.status === 'attempted') statusClass = 'cal-day--attempted';

                return (
                  <div 
                    key={dateKey} 
                    className={`cal-day ${statusClass} ${isToday ? 'cal-day--today' : ''}`}
                    onClick={() => onSelectDate(dateKey)}
                  >
                    <div className="cal-day-top">
                      <span className="cal-weekday">{weekday}</span>
                      {isToday && <span className="cal-today-badge">TODAY</span>}
                      {prog?.status === 'completed' && <span className="cal-status-dot green-dot"></span>}
                      {prog?.status === 'attempted' && <span className="cal-status-dot yellow-dot"></span>}
                    </div>
                    <span className="cal-daynum">{dayNum}</span>
                    <span className="cal-attempts">
                      {prog ? `${prog.attempts} guess${prog.attempts !== 1 ? 'es' : ''}` : 'Not played'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CalendarView;
