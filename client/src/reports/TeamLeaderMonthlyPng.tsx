import { forwardRef } from 'react';
import { fmtDate, inr, nowStamp, pct } from '../utils/format';

type MonthlyRow = {
  name: string;
  target: number;
  archived: number;
  remaining: number;
  percent: number;
};

const TeamLeaderMonthlyPng = forwardRef<HTMLDivElement, {
  from: string;
  to: string;
  rows: MonthlyRow[];
}>(({ from, to, rows }, ref) => {
  const totals = rows.reduce((result, row) => ({
    target: result.target + row.target,
    archived: result.archived + row.archived,
    remaining: result.remaining + row.remaining,
  }), { target: 0, archived: 0, remaining: 0 });
  const overallPercent = totals.target ? totals.archived / totals.target * 100 : 0;
  const cell: React.CSSProperties = {
    border: '1px solid #cfd6e4',
    padding: '9px 11px',
    fontSize: 14,
    textAlign: 'left',
  };

  return (
    <div ref={ref} style={{ width: 1100, background: '#fff', fontFamily: 'Arial, sans-serif', color: '#1b2437', padding: 20 }}>
      <header style={{ background: '#9f1239', color: '#fff', padding: '18px 22px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>GROWTHORA · TEAM LEADER TARGET</div>
        <h1 style={{ margin: '5px 0 0', fontSize: 26 }}>Monthly Team Leader Report</h1>
        <div style={{ marginTop: 5, fontSize: 13 }}>{fmtDate(from)} – {fmtDate(to)}</div>
      </header>

      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        {[
          ['Total Payment / Archived', inr(totals.archived)],
          ['Total Target', inr(totals.target)],
          ['Remaining', inr(totals.remaining)],
        ].map(([label, value]) => (
          <div key={label} style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: 8, padding: '11px 14px', background: '#f8fafc' }}>
            <div style={{ color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
            <div style={{ marginTop: 5, color: '#9f1239', fontSize: 21, fontWeight: 800 }}>{value}</div>
          </div>
        ))}
        <div style={{ width: 190, border: '1px solid #a7f3d0', borderRadius: 8, padding: '9px 14px', background: '#ecfdf5' }}>
          <div style={{ color: '#047857', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Overall achievement</div>
          <div style={{ marginTop: 3, color: '#047857', fontSize: 20, fontWeight: 800 }}>{pct(overallPercent)}</div>
        </div>
      </div>

      <table style={{ width: '100%', marginTop: 16, borderCollapse: 'collapse' }}>
        <thead><tr style={{ background: '#f1f5f9' }}>
          {['Team Leader Name', 'Total Target', 'Archived', 'Remaining', 'Overall %'].map((heading) => <th key={heading} style={cell}>{heading}</th>)}
        </tr></thead>
        <tbody>
          {rows.map((row) => <tr key={row.name}>
            <td style={{ ...cell, fontWeight: 700 }}>{row.name}</td>
            <td style={cell}>{inr(row.target)}</td>
            <td style={cell}>{inr(row.archived)}</td>
            <td style={cell}>{inr(row.remaining)}</td>
            <td style={{ ...cell, fontWeight: 700 }}>{pct(row.percent)}</td>
          </tr>)}
          <tr style={{ background: '#f8fafc', fontWeight: 800 }}>
            <td style={cell}>TOTAL</td>
            <td style={cell}>{inr(totals.target)}</td>
            <td style={cell}>{inr(totals.archived)}</td>
            <td style={cell}>{inr(totals.remaining)}</td>
            <td style={cell}>{pct(overallPercent)}</td>
          </tr>
        </tbody>
      </table>
      {!rows.length && <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>No active team leaders for this month.</div>}
      <footer style={{ padding: '12px 2px 0', color: '#64748b', fontSize: 11 }}>
        Generated {nowStamp()} (IST) · Monthly target is counted through the report end date; archived payments exclude GST.
      </footer>
    </div>
  );
});

export default TeamLeaderMonthlyPng;
