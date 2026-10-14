import { forwardRef } from 'react';
import { fmtHM, fmtTime, fmtDate, nowStamp } from '../utils/format';
const cell: React.CSSProperties = { border: '1px solid #cfd6e4', padding: '7px 9px', fontSize: 14 };
/** mode 'daily': rows of one day. mode 'range': per-employee summary. */
const AttendancePng = forwardRef<HTMLDivElement, { mode: 'daily' | 'range'; title: string; subtitle: string; data: any }>(({ mode, title, subtitle, data }, ref) => (
  <div ref={ref} style={{ width: 1100, background: '#fff', fontFamily: 'Inter, Arial, sans-serif', color: '#1b2437' }}>
    <div style={{ background: '#1f3a6e', color: '#fff', padding: '16px 20px' }}><div style={{ fontSize: 24, fontWeight: 800 }}>{title}</div><div style={{ fontSize: 14 }}>{subtitle}</div></div>
    {mode === 'daily' && data.cards && <div style={{ display: 'flex', gap: 10, padding: 12, flexWrap: 'wrap' }}>
      {Object.entries({ Total: data.cards.totalEmployees, Present: data.cards.present, 'Half Day': data.cards.halfDay, Absent: data.cards.absent, 'Checked In': data.cards.checkedIn, 'Checked Out': data.cards.checkedOut, Late: data.cards.lateComers, 'Completion %': `${data.cards.completionPercent}%` }).map(([k, v]) => (
        <div key={k} style={{ background: '#ffe14d', border: '1px solid #c9a800', padding: '6px 12px', minWidth: 100 }}><div style={{ fontSize: 11, fontWeight: 700 }}>{k}</div><div style={{ fontSize: 16, fontWeight: 800 }}>{String(v)}</div></div>))}
    </div>}
    <table style={{ width: 'calc(100% - 24px)', margin: 12, borderCollapse: 'collapse' }}>
      <thead><tr style={{ background: '#dfe6f3' }}>{(mode === 'daily' ? ['ID', 'Name', 'Check-in', 'Check-out', 'Hours', 'Status', 'Verification'] : ['ID', 'Name', 'Total hours', 'Present', 'Half', 'Absent', 'Late', 'Avg hours', 'Attendance %']).map((h) => <th key={h} style={{ ...cell, textAlign: 'left' }}>{h}</th>)}</tr></thead>
      <tbody>{mode === 'daily'
        ? data.rows.map((r: any) => <tr key={r.employeeId}><td style={cell}>{r.employeeId}</td><td style={{ ...cell, fontWeight: 700 }}>{r.name}</td><td style={cell}>{fmtTime(r.checkIn)}{r.late ? ` (+${r.minutesLate}m late)` : ''}</td><td style={cell}>{fmtTime(r.checkOut)}</td><td style={cell}>{fmtHM(r.workingMinutes)}</td><td style={cell}>{r.status}</td><td style={cell}>{r.verification || '-'}{r.corrected ? ' • corrected' : ''}</td></tr>)
        : data.employees.map((e: any) => <tr key={e.employeeId}><td style={cell}>{e.employeeId}</td><td style={{ ...cell, fontWeight: 700 }}>{e.name}</td><td style={cell}>{fmtHM(e.totalMinutes)}</td><td style={cell}>{e.presentDays}</td><td style={cell}>{e.halfDays}</td><td style={cell}>{e.absentDays}</td><td style={cell}>{e.lateArrivals}</td><td style={cell}>{fmtHM(e.averageMinutes)}</td><td style={{ ...cell, fontWeight: 800 }}>{e.attendancePercent ?? '—'}{e.attendancePercent != null ? '%' : ''}</td></tr>)}</tbody>
    </table>
    <div style={{ padding: '4px 14px 12px', fontSize: 12, color: '#667' }}>Generated: {nowStamp()} (IST) {data.from && mode === 'range' ? `• ${fmtDate(data.from)} to ${fmtDate(data.to)}` : ''}</div>
  </div>
));
export default AttendancePng;
