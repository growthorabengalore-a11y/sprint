import { forwardRef } from 'react';
import { fmtDate, nowStamp } from '../utils/format';

export type EmployeeLeadUpdateReportRow = {
  id: string;
  employeeName: string;
  employeeCode: string;
  dateKey: string;
  leadCount: number;
  leads: { assignedTo: string; leadStatus: 'Cold' | 'Warm' | 'Hot'; paymentStatus: string; leadCount?: number }[];
  createdAt: string;
};

const cell: React.CSSProperties = { border: '1px solid #cfd6e4', padding: '8px 10px', fontSize: 13, textAlign: 'left', verticalAlign: 'top', overflowWrap: 'anywhere' };
const statusScore = { Cold: 33, Warm: 67, Hot: 100 } as const;
const submittedAt = (value: string) => new Date(value).toLocaleString('en-IN', {
  timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short',
});

const EmployeeLeadUpdatesPng = forwardRef<HTMLDivElement, { from: string; to: string; items: EmployeeLeadUpdateReportRow[]; name?: string }>(({ from, to, items, name }, ref) => {
  const employees = items.reduce((groups, item) => {
    const key = item.employeeCode;
    const group = groups.get(key) || { employeeName: item.employeeName, employeeCode: item.employeeCode, leads: [] };
    group.leads.push(...item.leads.map((lead, index) => ({ ...lead, item, label: `Lead ${index + 1}` })));
    groups.set(key, group);
    return groups;
  }, new Map<string, {
    employeeName: string;
    employeeCode: string;
    leads: (EmployeeLeadUpdateReportRow['leads'][number] & {
      item: EmployeeLeadUpdateReportRow;
      label: string;
    })[];
  }>());
  const employeeGroups = [...employees.values()];
  const totals = employeeGroups.flatMap((employee) => employee.leads).reduce((result, lead) => {
    const count = lead.leadCount || 1;
    result.total += count;
    result[lead.leadStatus] += count;
    result.performancePoints += statusScore[lead.leadStatus] * count;
    return result;
  }, { total: 0, Cold: 0, Warm: 0, Hot: 0, performancePoints: 0 });
  const performance = totals.total ? `${(totals.performancePoints / totals.total).toFixed(2)}%` : '0.00%';
  return (
  <div ref={ref} style={{ width: 1100, background: '#fff', fontFamily: 'Arial, sans-serif', color: '#1b2437', padding: 18 }}>
    <header style={{ background: '#9f1239', color: '#fff', padding: '16px 20px' }}>
      <div style={{ fontSize: 12, fontWeight: 700 }}>GROWTHORA · EMPLOYEE LEAD MANAGEMENT</div>
      <div style={{ marginTop: 4, fontSize: 24, fontWeight: 800 }}>{name ? `${name} · Lead Report` : 'Employee Lead Updates Report'}</div>
      <div style={{ marginTop: 5, fontSize: 13 }}>Period: {from && to ? `${fmtDate(from)} – ${fmtDate(to)}` : 'All submitted dates'}</div>
    </header>
    <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
      {[
        ['Total Leads', totals.total, '#9f1239'],
        ['Cold Leads', totals.Cold, '#475569'],
        ['Warm Leads', totals.Warm, '#b45309'],
        ['Hot Leads', totals.Hot, '#15803d'],
        ['Total Performance', performance, '#1d4ed8'],
      ].map(([label, value, color]) => (
        <div key={String(label)} style={{ flex: 1, border: '1px solid #cfd6e4', borderRadius: 6, padding: '9px 10px', background: '#f8fafc' }}>
          <div style={{ color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
          <div style={{ marginTop: 4, color: String(color), fontSize: 21, fontWeight: 800 }}>{value}</div>
        </div>
      ))}
    </div>
    <table style={{ width: '100%', marginTop: 14, borderCollapse: 'collapse' }}>
      <thead><tr style={{ background: '#f1f5f9' }}>{['Employee', 'Lead details'].map((heading) => <th key={heading} style={cell}>{heading}</th>)}</tr></thead>
      <tbody>{employeeGroups.map((employee) => <tr key={employee.employeeCode}>
        <td style={{ ...cell, width: 190, fontWeight: 700 }}>
          {employee.employeeName}<div style={{ color: '#64748b', fontSize: 11 }}>{employee.employeeCode}</div>
          <div style={{ marginTop: 6, color: '#475569', fontSize: 11, fontWeight: 400 }}>
            {employee.leads.reduce((count, lead) => count + (lead.leadCount || 1), 0)} total leads
          </div>
        </td>
        <td style={cell}>
          {employee.leads.map((lead, index) => <div key={`${lead.item.id}-${index}`} style={{ padding: '5px 0', borderBottom: index < employee.leads.length - 1 ? '1px solid #e2e8f0' : undefined }}>
            <b>{lead.label}{lead.leadCount && lead.leadCount > 1 ? ` × ${lead.leadCount}` : ''}</b>
            <span style={{ color: '#64748b' }}> · {fmtDate(lead.item.dateKey)} · {submittedAt(lead.item.createdAt)}</span>
            <div style={{ marginTop: 3 }}>Assigned to: {lead.assignedTo} · Status: {lead.leadStatus} · Remark: {lead.paymentStatus || '—'}</div>
          </div>)}
        </td>
      </tr>)}</tbody>
    </table>
    {!items.length && <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>No employee lead updates for this period.</div>}
    <footer style={{ padding: '12px 2px 0', color: '#64748b', fontSize: 11 }}>Generated {nowStamp()} (IST) · Performance index: Cold 33%, Warm 67%, Hot 100%, weighted by lead count.</footer>
  </div>
  );
});

export default EmployeeLeadUpdatesPng;
