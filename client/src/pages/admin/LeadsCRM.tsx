import { useState } from 'react';
import AssignedLeads from './AssignedLeads';
import EmployeeLeadUpdates from './EmployeeLeadUpdates';

export default function LeadsCRM() {
  const [tab, setTab] = useState<'assigned' | 'employee'>('assigned');
  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-slate-200" role="tablist" aria-label="Leads management sections">
        <button type="button" role="tab" aria-selected={tab === 'assigned'} className={`border-b-2 px-4 py-2 text-sm font-semibold ${tab === 'assigned' ? 'border-crimson-600 text-crimson-700' : 'border-transparent text-slate-500'}`} onClick={() => setTab('assigned')}>Assigned Leads</button>
        <button type="button" role="tab" aria-selected={tab === 'employee'} className={`border-b-2 px-4 py-2 text-sm font-semibold ${tab === 'employee' ? 'border-crimson-600 text-crimson-700' : 'border-transparent text-slate-500'}`} onClick={() => setTab('employee')}>Employee Lead Updates</button>
      </div>
      {tab === 'assigned' ? <AssignedLeads /> : <EmployeeLeadUpdates />}
    </div>
  );
}
