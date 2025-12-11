import React from 'react';
import { SensorData } from '../types';
import { Activity, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface Props {
  data: SensorData;
}

export const SensorGauge: React.FC<Props> = ({ data }) => {
  // Calculate percentage for bar width (clamped 0-100)
  const range = data.max * 1.5; // Give some headroom
  const percentage = Math.min(100, Math.max(0, (data.current / range) * 100));

  let statusColor = "bg-emerald-500";
  let textColor = "text-emerald-400";
  let borderColor = "border-slate-700";
  let StatusIcon = CheckCircle2;

  if (data.status === 'WARNING') {
    statusColor = "bg-yellow-500";
    textColor = "text-yellow-400";
    borderColor = "border-yellow-900";
    StatusIcon = Activity;
  } else if (data.status === 'CRITICAL') {
    statusColor = "bg-red-500";
    textColor = "text-red-500";
    borderColor = "border-red-900";
    StatusIcon = AlertTriangle;
  }

  return (
    <div className={`bg-slate-900/80 p-4 rounded-xl border ${borderColor} shadow-lg relative overflow-hidden group`}>
      <div className="flex justify-between items-start mb-2">
        <span className="text-slate-400 text-xs uppercase tracking-wider font-bold">{data.name}</span>
        <StatusIcon size={16} className={`${textColor} ${data.status === 'CRITICAL' ? 'animate-pulse' : ''}`} />
      </div>
      
      <div className="flex items-end gap-1 mb-3">
        <span className={`text-2xl font-mono font-bold ${textColor}`}>
          {data.current.toFixed(1)}
        </span>
        <span className="text-slate-500 text-xs mb-1 font-mono">{data.unit}</span>
      </div>

      {/* Progress Bar Background */}
      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
        {/* Progress Indicator */}
        <div 
          className={`h-full ${statusColor} transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Ideal Range Markers */}
      <div className="absolute bottom-4 left-4 right-4 h-1.5 pointer-events-none opacity-30">
        <div 
          className="absolute h-full bg-white w-0.5" 
          style={{ left: `${(data.min / range) * 100}%` }} 
        />
        <div 
          className="absolute h-full bg-white w-0.5" 
          style={{ left: `${(data.max / range) * 100}%` }} 
        />
      </div>
    </div>
  );
};