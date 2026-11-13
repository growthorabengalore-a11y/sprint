import { forwardRef } from 'react';
import { fmtDate, nowStamp } from '../utils/format';

type LeadUpdate = {
  employeeName: string;
  employeeCode: string;
  dateKey: string;
  leadCount: number;
  assignedTo: string;
  leadStatus: string;
  paymentStatus: string;
  createdAt: string;
};

const cell: React.CSSProperties = { border: '1px solid #cfd6e4', padding: '8px 10px', fontSize: 13, textAlign: 'left', verticalAlign: 'top' };

const EmployeeLeadUpdatesPng = forwardRef<HTMLDivElement, { name: string; items: LeadUpdate[] }>(({ name, items }, ref) => (
  <div ref={ref} style={{ width: 1100, background: '#fff', fontFamily: 'Arial, sans-serif', color: '#1b2437', padding: 18 }}>
    <header style={{ background: '#9f1239', color: '#fff', padding: '16px 20px' }}>
      <div style={{ fontSize: 12, fontWeight: 700 }}>GROWTHORA · LEAD UPDATES</div>
      <div style={{ marginTop: 4, fontSize: 24, fontWeight: 800 }}>{name} · Lead Report</div>
    </header>
    <table style={{ width: '100%', marginTop: 14, borderCollapse: 'collapse' }}>
      <thead><tr style={{ background: '#f1f5f9' }}>{['Date', 'Submitted at', 'Lead count', 'Assigned to', 'Lead status', 'Payment status'].map((heading) => <th key={heading} style={cell}>{heading}</th>)}</tr></thead>
      <tbody>{items.map((item) => <tr key={`${item.dateKey}-${item.createdAt}`}>
        <td style={cell}>{fmtDate(item.dateKey)}</td>
        <td style={cell}>{new Date(item.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}</td>
        <td style={cell}>{item.leadCount}</td>
        <td style={cell}>{item.assignedTo}</td>
        <td style={cell}>{item.leadStatus}</td>
        <td style={cell}>{item.paymentStatus}</td>
      </tr>)}</tbody>
    </table>
    <footer style={{ padding: '12px 2px 0', color: '#64748b', fontSize: 11 }}>Generated {nowStamp()} (IST) · Employee ID: {items[0]?.employeeCode || '—'}</footer>
  </div>
));

export default EmployeeLeadUpdatesPng;
