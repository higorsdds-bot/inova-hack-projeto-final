import React from 'react';
import { Employee } from '../types';
import { User, Clock, AlertCircle } from 'lucide-react';

interface Props {
  employee: Employee;
}

export const EmployeeCard: React.FC<Props> = ({ employee }) => {
  const isMissing = employee.status === 'MISSING_EXIT';
  const isOff = employee.status === 'OFF_SHIFT';

  return (
    <div className={`flex items-center gap-4 p-3 rounded-lg border transition-all ${
      isMissing 
        ? 'bg-red-950/30 border-red-900' 
        : isOff 
          ? 'bg-slate-900 border-slate-800 opacity-60' 
          : 'bg-slate-800 border-slate-700'
    }`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
        isMissing ? 'bg-red-900 text-red-200' : 'bg-slate-700 text-slate-300'
      }`}>
        <User size={20} />
      </div>
      
      <div className="flex-1">
        <div className="flex justify-between items-center">
            <h4 className="font-bold text-sm text-slate-200">{employee.name}</h4>
            {isMissing && <AlertCircle size={14} className="text-red-500 animate-bounce" />}
        </div>
        
        <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 font-mono">
          <span className="flex items-center gap-1">
            <Clock size={10} /> In: {employee.clockIn || '--:--'}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={10} /> Out: {employee.clockOut || '--:--'}
          </span>
        </div>
      </div>

      <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
        employee.status === 'ACTIVE' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' :
        employee.status === 'MISSING_EXIT' ? 'bg-red-950 text-red-400 border border-red-900' :
        'bg-slate-950 text-slate-500 border border-slate-800'
      }`}>
        {employee.status === 'MISSING_EXIT' ? 'ERRO' : employee.status === 'ACTIVE' ? 'ATIVO' : 'OFF'}
      </div>
    </div>
  );
};