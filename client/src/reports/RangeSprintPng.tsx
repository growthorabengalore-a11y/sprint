import { forwardRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';
import { fmtMinutes, inr, pct, fmtDate, nowStamp } from '../utils/format';
const cell: React.CSSProperties = { border: '1px solid #cfd6e4', padding: '7px 9px', fontSize: 14 };
/** Weekly / 2-week / 3-week / monthly / individual sprint report image. */
const RangeSprintPng = forwardRef<HTMLDivElement, { data: any; title: string }>(({ data, title }, ref) => (
  <div ref={ref} style={{ width: 1100, background: '#fff', fontFamily: 'Inter, Arial, sans-serif', color: '#1b2437' }}>
    <div style={{ background: '#1f3a6e', color: '#fff', padding: '16px 20px' }}><div style={{ fontSize: 24, fontWeight: 800 }}>{title}</div><div style={{ fontSize: 14 }}>{fmtDate(data.from)} to {fmtDate(data.to)} • {data.workingDays} working days</div></div>
    <div style={{ display: 'flex', gap: 10, padding: 12, flexWrap: 'wrap' }}>
      {[['Total Talk Time', fmtMinutes(data.totals.talkMinutes)], ['Total Leads', String(data.totals.leads)], ['Confirmed Payments', inr(data.totals.confirmedPayments)], ['Overall Performance', pct(data.overallPerformance)],
        ['Avg Daily Performance', pct(data.averageDailyPerformance)], ['Missing Submissions', String(data.missingSubmissions)], ['Top Performer', data.topPerformer ? `${data.topPerformer.name} (${pct(data.topPerformer.performance)})` : '—']].map(([k, v]) => (
        <div key={k} style={{ background: '#ffe14d', border: '1px solid #c9a800', padding: '6px 12px', minWidth: 140 }}><div style={{ fontSize: 11, fontWeight: 700 }}>{k}</div><div style={{ fontSize: 15, fontWeight: 800 }}>{v}</div></div>))}
    </div>
    <div style={{ display: 'flex', gap: 10, padding: '0 12px' }}>
      <LineChart width={530} height={220} data={data.daily}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} fontSize={11} /><YAxis domain={[0, 100]} fontSize={11} /><Line type="monotone" dataKey="averagePerformance" stroke="#9b1b30" strokeWidth={2} isAnimationActive={false} dot /></LineChart>
      <BarChart width={530} height={220} data={data.daily}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} fontSize={11} /><YAxis fontSize={11} /><Bar dataKey="leads" fill="#1f3a6e" isAnimationActive={false} /></BarChart>
    </div>
    <table style={{ width: 'calc(100% - 24px)', margin: 12, borderCollapse: 'collapse' }}>
      <thead><tr style={{ background: '#dfe6f3' }}>{['Rank', 'Name', 'Talk Time', 'Leads', 'Payments', 'Avg Daily %', 'Period %', 'Done days', 'Missing'].map((h) => <th key={h} style={{ ...cell, textAlign: 'left' }}>{h}</th>)}</tr></thead>
      <tbody>{data.employees.map((e: any) => <tr key={e.employeeId}><td style={cell}>{e.rank ?? '—'}</td><td style={{ ...cell, fontWeight: 700 }}>{e.name}</td><td style={cell}>{fmtMinutes(e.talkMinutes)}</td><td style={cell}>{e.leads}</td><td style={cell}>{inr(e.confirmedPayments)}</td><td style={cell}>{pct(e.averageDailyPerformance)}</td><td style={{ ...cell, fontWeight: 800 }}>{pct(e.periodPerformance)}</td><td style={cell}>{e.completedDays}</td><td style={cell}>{e.missingSubmissions}</td></tr>)}</tbody>
    </table>
    <div style={{ padding: '4px 14px 12px', fontSize: 12, color: '#667' }}>Generated: {nowStamp()} (IST)</div>
  </div>
));
export default RangeSprintPng;
