import { forwardRef } from 'react';
import { fmtDate, inr, nowStamp } from '../utils/format';

type Member = { id: string; name: string; designation: string; archived: number };
type Team = { teamName: string; weeklyTarget: number; targetForPeriod: number | null; archived: number; performance: number | null; members: Member[] };
const cell: React.CSSProperties = { border: '1px solid #cfd6e4', padding: '9px 10px', fontSize: 13, textAlign: 'left', verticalAlign: 'top' };

const GreaterRewardsPng = forwardRef<HTMLDivElement, { team: Team; from: string; to: string }>(({ team, from, to }, ref) => (
  <div ref={ref} style={{ width: 1000, background: '#fff', fontFamily: 'Arial, sans-serif', color: '#1b2437', padding: 20 }}>
    <header style={{ background: '#9f1239', color: '#fff', padding: '16px 20px' }}>
      <div style={{ fontSize: 12, fontWeight: 700 }}>GROWTHORA · GREATER REWARDS PLAN</div>
      <div style={{ marginTop: 4, fontSize: 25, fontWeight: 800 }}>{team.teamName}</div>
      <div style={{ marginTop: 5, fontSize: 13 }}>Period: {fmtDate(from)} – {fmtDate(to)}</div>
    </header>
    <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
      {[
        ['Weekly target', inr(team.weeklyTarget)],
        ['Target for period', inr(team.targetForPeriod)],
        ['Archived in period', inr(team.archived)],
        ['Performance', team.performance == null ? '—' : `${team.performance.toFixed(2)}%`],
      ].map(([label, value]) => <div key={label} style={{ flex: 1, border: '1px solid #cfd6e4', borderRadius: 6, padding: '10px 12px', background: '#f8fafc' }}>
        <div style={{ color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
        <div style={{ marginTop: 5, color: '#9f1239', fontSize: 21, fontWeight: 800 }}>{value}</div>
      </div>)}
    </div>
    <table style={{ width: '100%', marginTop: 16, borderCollapse: 'collapse' }}>
      <thead><tr style={{ background: '#f1f5f9' }}>{['Member name', 'Designation', 'Archived in period'].map((heading) => <th key={heading} style={cell}>{heading}</th>)}</tr></thead>
      <tbody>{team.members.map((member) => <tr key={member.id}>
        <td style={{ ...cell, fontWeight: 700 }}>{member.name}</td>
        <td style={cell}>{member.designation}</td>
        <td style={cell}>{inr(member.archived)}</td>
      </tr>)}</tbody>
    </table>
    {!team.members.length && <div style={{ padding: 16, textAlign: 'center', color: '#64748b' }}>No members added.</div>}
    <footer style={{ padding: '12px 2px 0', color: '#64748b', fontSize: 11 }}>Generated {nowStamp()} (IST) · Period target is the weekly target multiplied by the number of Monday–Sunday weeks in the selected date range.</footer>
  </div>
));

export default GreaterRewardsPng;
