import { forwardRef } from 'react';
import { fmtDate, nowStamp } from '../utils/format';

type Count = { category: string; count: number };
type Member = {
  id: string;
  name: string;
  role: string;
  targets: Count[];
  archived: Count[];
  performance: { target: number; archived: number; percentage: number } | null;
};
type Team = { id: string; teamSeries: string; teamName: string; members: Member[] };

const cell: React.CSSProperties = { border: '1px solid #cfd6e4', padding: '9px 10px', fontSize: 13, textAlign: 'left', verticalAlign: 'top' };
const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
const summarize = (items: Count[]) => items.length ? items.map((item) => `${titleCase(item.category)}: ${item.count}`).join(' · ') : '—';

const TeamPerformancePng = forwardRef<HTMLDivElement, { weekEnding: string; teams: Team[] }>(({ weekEnding, teams }, ref) => (
  <div ref={ref} style={{ width: 1100, background: '#fff', fontFamily: 'Arial, sans-serif', color: '#1b2437', padding: 18 }}>
    <header style={{ background: '#9f1239', color: '#fff', padding: '16px 20px' }}>
      <div style={{ fontSize: 12, fontWeight: 700 }}>GROWTHORA · TEAM PERFORMANCE</div>
      <div style={{ marginTop: 4, fontSize: 24, fontWeight: 800 }}>Weekly Team Report</div>
      <div style={{ marginTop: 5, fontSize: 13 }}>Week ending {fmtDate(weekEnding)} (Saturday)</div>
    </header>
    {teams.map((team) => (
      <section key={team.id} style={{ marginTop: 16 }}>
        <h2 style={{ margin: '0 0 7px', color: '#9f1239', fontSize: 18 }}>{`Team ${team.teamSeries} · ${team.teamName}`}</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#f1f5f9' }}>{['Name', 'Target', 'Archived', 'Performance'].map((heading) => <th key={heading} style={cell}>{heading}</th>)}</tr></thead>
          <tbody>{team.members.map((member) => <tr key={member.id}>
            <td style={{ ...cell, fontWeight: 700 }}>{member.name}</td>
            <td style={cell}>{summarize(member.targets)}</td>
            <td style={cell}>{member.archived.length ? summarize(member.archived) : 'Not entered'}</td>
            <td style={{ ...cell, fontWeight: 700 }}>{member.performance ? `${member.performance.percentage.toFixed(2)}%` : '—'}</td>
          </tr>)}</tbody>
        </table>
        {!team.members.length && <div style={{ padding: 12, color: '#64748b' }}>No team members added.</div>}
      </section>
    ))}
    <footer style={{ padding: '12px 2px 0', color: '#64748b', fontSize: 11 }}>Generated {nowStamp()} (IST) · Performance = archived count ÷ target count, capped at 100%.</footer>
  </div>
));

export default TeamPerformancePng;
