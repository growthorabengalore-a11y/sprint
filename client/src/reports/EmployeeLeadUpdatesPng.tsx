import { forwardRef } from 'react';
import { fmtDate, nowStamp } from '../utils/format';

export type EmployeeLeadUpdateReportRow = {
  employeeName: string;
  employeeCode: string;
  dateKey: string;
  leadCount: number;
  assignedTo: string;
  leadStatus: string;
  paymentStatus: string;
  createdAt: string;
};

const cell: React.CSSProperties = { border: '1px solid #cfd6e4', padding: '8px 10px', fontSize: 13, textAlign: 'left', verticalAlign: 'top', overflowWrap: 'anywhere' };
const statusScore = { Cold: 33, Warm: 67, Hot: 100 } as const;

const EmployeeLeadUpdatesPng = forwardRef<HTMLDivElement, { from: string; to: string; items: EmployeeLeadUpdateReportRow[]; name?: string }>(({ from, to, items, name }, ref) => {
  const totals = items.reduce((result, item) => {
    result.total += item.leadCount;
    result[item.leadStatus] += item.leadCount;
    result.performancePoints += statusScore[item.leadStatus] * item.leadCount;
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
      <thead><tr style={{ background: '#f1f5f9' }}>{['Employee', 'Date', 'Submitted at', 'Lead count', 'Assigned to', 'Client status', 'Remark / payment status'].map((heading) => <th key={heading} style={cell}>{heading}</th>)}</tr></thead>
      <tbody>{items.map((item) => <tr key={`${item.dateKey}-${item.createdAt}`}>
        <td style={cell}>{item.employeeName}<div style={{ color: '#64748b', fontSize: 11 }}>{item.employeeCode}</div></td>
        <td style={cell}>{fmtDate(item.dateKey)}</td>
        <td style={cell}>{new Date(item.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}</td>
        <td style={cell}>{item.leadCount}</td>
        <td style={cell}>{item.assignedTo}</td>
        <td style={cell}>{item.leadStatus}</td>
        <td style={cell}>{item.paymentStatus}</td>
      </tr>)}</tbody>
    </table>
    {!items.length && <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>No employee lead updates for this period.</div>}
    <footer style={{ padding: '12px 2px 0', color: '#64748b', fontSize: 11 }}>Generated {nowStamp()} (IST) · Performance index: Cold 33%, Warm 67%, Hot 100%, weighted by lead count.</footer>
  </div>
  );
});

export default EmployeeLeadUpdatesPng;
