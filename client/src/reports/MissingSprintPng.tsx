import { forwardRef } from 'react';
import { fmtDate, nowStamp } from '../utils/format';

type MissingSprintEntry = { name: string; session: 'Morning' | 'Evening' };
const cell: React.CSSProperties = { border: '1px solid #b7c0d0', padding: '9px 12px', fontSize: 15 };

const MissingSprintPng = forwardRef<HTMLDivElement, { date: string; entries: MissingSprintEntry[] }>(({ date, entries }, ref) => (
  <div ref={ref} style={{ width: 760, background: '#fff', fontFamily: 'Inter, Arial, sans-serif', color: '#1b2437' }}>
    <div style={{ background: '#1f3a6e', color: '#fff', padding: '18px 20px' }}>
      <div style={{ fontSize: 24, fontWeight: 800 }}>Missing Sprint Updates</div>
      <div style={{ fontSize: 14 }}>{fmtDate(date)}</div>
    </div>
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr style={{ background: '#dfe6f3' }}>
        {['Name', 'Missed Session'].map((heading) => <th key={heading} style={{ ...cell, textAlign: 'left', fontWeight: 800 }}>{heading}</th>)}
      </tr></thead>
      <tbody>
        {entries.map((entry, index) => (
          <tr key={`${entry.name}-${entry.session}-${index}`} style={{ background: index % 2 ? '#f6f8fc' : '#fff' }}>
            <td style={{ ...cell, fontWeight: 700 }}>{entry.name}</td>
            <td style={cell}>{entry.session}</td>
          </tr>
        ))}
        {!entries.length && <tr><td colSpan={2} style={{ ...cell, textAlign: 'center' }}>No missing submissions</td></tr>}
      </tbody>
    </table>
    <div style={{ padding: '10px 14px', fontSize: 12, color: '#667' }}>Generated: {nowStamp()} (IST)</div>
  </div>
));

export default MissingSprintPng;
