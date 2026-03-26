import React, { useState } from 'react';
import { BackArrowIcon, ChevronLeftIcon, ChevronRightIcon } from './Icons';
import { todayKey, toDateKey } from '../hooks/useGameState';

interface CalendarViewProps {
  onBack: () => void;
  onSelectDate: (dateKey: string) => void;
  progress: Record<string, { status: string; attempts: number }>;
}

const CalendarView: React.FC<CalendarViewProps> = ({ onBack, onSelectDate, progress }) => {
  const today = todayKey();
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const days = [];
  // Offset
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`empty-${i}`} className="cal-day empty"></div>);
  }
  // Days
  for (let d = 1; d <= daysInMonth; d++) {
    const dObj = new Date(year, month, d);
    const dateKey = toDateKey(dObj);
    const prog = progress[dateKey];
    const isToday = dateKey === today;
    const isFuture = dObj > new Date();
    
    let statusClass = '';
    if (prog?.status === 'won') statusClass = 'cal-day--completed';
    else if (prog?.attempts > 0) statusClass = 'cal-day--attempted';
    if (isFuture) statusClass += ' cal-day--future';

    days.push(
      <div 
        key={dateKey} 
        className={`cal-day ${statusClass} ${isToday ? 'cal-day--today' : ''}`}
        onClick={() => !isFuture && onSelectDate(dateKey)}
        title={isFuture ? 'Not available yet' : (prog ? `${prog.attempts} attempts` : 'Not played')}
      >
        {d}
      </div>
    );
  }

  const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="calendar-view">
      <div className="header">
        <button className="icon-btn" onClick={onBack}>
          <BackArrowIcon />
        </button>
        <div style={{ fontWeight: 800, letterSpacing: '1px' }}>HISTORY</div>
        <div style={{ width: '40px' }}></div>
      </div>
      
      <div className="calendar-content">
        <div className="cal-month-nav">
            <button className="icon-btn" onClick={prevMonth}><ChevronLeftIcon /></button>
            <div className="cal-month-title">{monthName}</div>
            <button className="icon-btn" onClick={nextMonth}><ChevronRightIcon /></button>
        </div>

        <div className="cal-grid">
            {weekdays.map((w, i) => (
                <div key={`${w}-${i}`} className="cal-weekday-header">{w}</div>
            ))}
            {days}
        </div>

        <div className="flex flex-col gap-2 mt-8">
            <div className="flex items-center gap-2 text-sm text-dim">
                <div className="w-4 h-4 rounded bg-var(--color-green)" style={{ backgroundColor: 'var(--color-green)' }}></div>
                <span>Completed</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-dim">
                <div className="w-4 h-4 rounded border-2 border-dashed" style={{ borderColor: 'var(--color-yellow)' }}></div>
                <span>In progress</span>
            </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
