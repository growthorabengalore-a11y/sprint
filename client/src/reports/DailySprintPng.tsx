import { forwardRef } from 'react';
import { fmtMinutes, inr, pct, titleDate, nowStamp, payCell } from '../utils/format';
// Dedicated report component modelled on the owner's sheet. Fixed width; height grows with employees.
const cell: React.CSSProperties = { border: '1px solid #b7c0d0', padding: '8px 10px', fontSize: 15 };
const DailySprintPng = forwardRef<HTMLDivElement, { data: any }>(({ data }, ref) => (
  <div ref={ref} style={{ width: 1100, background: '#fff', fontFamily: 'Inter, Arial, sans-serif', color: '#1b2437', padding: 0 }}>
    <div style={{ display: 'flex' }}>
      <div style={{ flex: 1, background: '#1f3a6e', color: '#fff', fontSize: 26, fontWeight: 800, padding: '18px 20px' }}>{titleDate(data.date)} - Sprint Updates</div>
      <div style={{ display: 'flex', gap: 10, padding: 10, background: '#fff' }}>
        {[['Total Hours', fmtMinutes(data.totals.talkMinutes)], ['Total Leads', String(data.totals.leads)], ['Total Payment', inr(data.totals.confirmedPayments)]].map(([k, v]) => (
          <div key={k} style={{ background: '#ffe14d', border: '1px solid #c9a800', padding: '6px 14px', minWidth: 140, textAlign: 'center' }}><div style={{ fontSize: 12, fontWeight: 700 }}>{k}</div><div style={{ fontSize: 17, fontWeight: 800 }}>{v}</div></div>))}
      </div>
    </div>
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr style={{ background: '#dfe6f3' }}>{['Names', 'Session', 'Talk Time', 'Leads', 'Payments', 'Performance %'].map((h) => <th key={h} style={{ ...cell, textAlign: 'left', fontWeight: 800 }}>{h}</th>)}</tr></thead>
      <tbody>
        {data.employees.map((e: any) => ['morning', 'evening'].map((s) => {
          const x = e[s];
          const miss = !x;
          return (
            <tr key={e.employeeId + s} style={{ background: s === 'evening' ? '#f6f8fc' : '#fff' }}>
              {s === 'morning' && <td rowSpan={2} style={{ ...cell, fontWeight: 800, verticalAlign: 'middle' }}>{e.name}<div style={{ fontSize: 11, fontWeight: 400, color: '#667' }}>{e.employeeId}</div></td>}
              <td style={cell}>{s === 'morning' ? 'Morning' : 'Evening'}</td>
              <td style={{ ...cell, color: miss ? '#c0152e' : undefined }}>{miss ? 'Missing' : fmtMinutes(x.talkTimeMinutes)}</td>
              <td style={{ ...cell, color: miss ? '#c0152e' : undefined }}>{miss ? 'Missing' : x.leads}</td>
              <td style={{ ...cell, color: miss || x.paymentStatus === 'not_confirm' ? '#c0152e' : undefined }}>{payCell(x)}</td>
              <td style={{ ...cell, fontWeight: 800 }}>{s === 'evening' ? (e.performance != null ? pct(e.performance) : e.status) : ''}</td>
            </tr>);
        }))}
        {!data.employees.length && <tr><td colSpan={6} style={{ ...cell, textAlign: 'center' }}>No employees</td></tr>}
      </tbody>
    </table>
    <div style={{ padding: '10px 14px', fontSize: 12, color: '#667' }}>Generated: {nowStamp()} (IST) • Totals = evening achieved values; payments = confirmed only</div>
  </div>
));
export default DailySprintPng;
