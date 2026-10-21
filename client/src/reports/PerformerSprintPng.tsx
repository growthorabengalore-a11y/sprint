import { forwardRef } from 'react';
import { fmtDate, fmtMinutes, inr, nowStamp } from '../utils/format';

type Performer = {
  name: string;
  talk: number;
  talkTarget: number;
  leads: number;
  leadsTarget: number;
  payments: number;
  metTalk: boolean;
  metLeads: boolean;
  targetProgress: number;
};
type PerformerGroups = {
  paid: Performer[];
  unpaidTargetAchievers: Performer[];
  unpaidTargetMissers: Performer[];
};

const border = '1px solid #d5dce8';
const cell: React.CSSProperties = { border, padding: '9px 11px', fontSize: 13, textAlign: 'left' };

function PerformerTable({ title, description, entries, color, emptyText }: {
  title: string;
  description: string;
  entries: Performer[];
  color: string;
  emptyText: string;
}) {
  return (
    <section style={{ margin: '18px 20px 0' }}>
      <div style={{ background: color, color: '#fff', padding: '11px 14px', borderRadius: '6px 6px 0 0' }}>
        <div style={{ fontSize: 17, fontWeight: 800 }}>{title}</div>
        <div style={{ marginTop: 3, fontSize: 11 }}>{description}</div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup><col style={{ width: '6%' }} /><col style={{ width: '30%' }} /><col style={{ width: '16%' }} /><col style={{ width: '14%' }} /><col style={{ width: '17%' }} /><col style={{ width: '17%' }} /></colgroup>
        <thead><tr style={{ background: '#edf1f7' }}>
          {['#', 'Employee', 'Talk Time', 'Leads', 'Confirmed Payment', 'Target Status'].map((heading) => (
            <th key={heading} style={{ ...cell, fontWeight: 800 }}>{heading}</th>
          ))}
        </tr></thead>
        <tbody>
          {entries.map((entry, index) => (
            <tr key={`${title}-${entry.name}`} style={{ background: index % 2 ? '#f8fafc' : '#fff' }}>
              <td style={cell}>{index + 1}</td>
              <td style={{ ...cell, fontWeight: 700 }}>{entry.name}</td>
              <td style={cell}>{fmtMinutes(entry.talk)} / {fmtMinutes(entry.talkTarget)}</td>
              <td style={cell}>{entry.leads} / {entry.leadsTarget}</td>
              <td style={{ ...cell, fontWeight: 700 }}>{inr(entry.payments)}</td>
              <td style={cell}>Talk {entry.metTalk ? 'Met' : 'Missed'} · Leads {entry.metLeads ? 'Met' : 'Missed'}</td>
            </tr>
          ))}
          {!entries.length && <tr><td colSpan={6} style={{ ...cell, textAlign: 'center', color: '#64748b' }}>{emptyText}</td></tr>}
        </tbody>
      </table>
    </section>
  );
}

const PerformerSprintPng = forwardRef<HTMLDivElement, { from: string; to: string; groups: PerformerGroups }>(({ from, to, groups }, ref) => (
  <div ref={ref} style={{ width: 1100, background: '#fff', fontFamily: 'Inter, Arial, sans-serif', color: '#1b2437', paddingBottom: 14 }}>
    <header style={{ background: '#1f3a6e', color: '#fff', padding: '19px 20px' }}>
      <div style={{ fontSize: 25, fontWeight: 800 }}>Sprint Performer Report</div>
      <div style={{ marginTop: 5, fontSize: 14 }}>
        {from === to ? fmtDate(from) : `${fmtDate(from)} – ${fmtDate(to)}`}
      </div>
    </header>
    <PerformerTable title="Top Performers — Confirmed Payments" description="Employees with confirmed payments, ranked from highest to lowest payment." entries={groups.paid} color="#18794e" emptyText="No confirmed payments in this period." />
    <PerformerTable title="No Payment — Talk Time and Leads Targets Achieved" description="Zero confirmed payment; total achieved talk time and leads both meet or exceed their morning targets for the selected period." entries={groups.unpaidTargetAchievers} color="#2563a6" emptyText="No employees in this category." />
    <PerformerTable title="Worst Performers — No Payment and Targets Missed" description="Zero confirmed payment; talk time, leads, or both are below their selected-period targets. Ordered from lowest target progress." entries={groups.unpaidTargetMissers} color="#b4233b" emptyText="No employees in this category." />
    <footer style={{ padding: '12px 20px 0', fontSize: 11, color: '#64748b' }}>Talk time and leads are shown as achieved / target totals. Only confirmed evening payments are counted. Generated: {nowStamp()} (IST)</footer>
  </div>
));

export default PerformerSprintPng;
