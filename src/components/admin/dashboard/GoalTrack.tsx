import React from 'react';
import { Flag, Trophy } from 'lucide-react';
import { EmptyHint, Panel, SectionTitle } from './DashboardKpi';
import { Avatar } from './TeamPodiums';
import { getGoalStatus } from '../../../utils/goalStatus';
import type { CollaboratorRow } from '../../../hooks/useCommercialDashboardData';

const AVATAR = 34;

const TrackRow: React.FC<{ row: CollaboratorRow; expectedPct: number }> = ({ row, expectedPct }) => {
  const hasGoal = row.goalPct !== null;
  const pct = row.goalPct ?? 0;
  const status = getGoalStatus(row.goalPct);
  const position = Math.min(100, Math.max(0, pct));
  const done = hasGoal && pct >= 100;
  const marker = Math.min(100, expectedPct);

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'minmax(120px, 190px) 1fr 120px', gap: '14px', alignItems: 'center',
      padding: '10px 0', borderBottom: '1px solid var(--adm-border)',
    }}>
      <div style={{ minWidth: 0 }}>
        <div title={row.name} style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {row.name}
        </div>
        <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)' }}>{row.role === 'closer' ? 'Closer' : 'SDR'}</div>
      </div>

      {/* Pista: o avatar corre ate a bandeira de chegada (100%); a marca vertical e o ritmo esperado */}
      <div style={{ position: 'relative', height: `${AVATAR + 8}px`, margin: `0 ${AVATAR / 2 + 12}px 0 ${AVATAR / 2}px` }}>
        <div style={{
          position: 'absolute', left: 0, right: 0, top: '50%', height: '10px', transform: 'translateY(-50%)',
          borderRadius: '5px', background: 'var(--adm-bg-input)',
          backgroundImage: 'repeating-linear-gradient(90deg, transparent 0 18px, rgba(148,163,184,0.16) 18px 20px)',
        }} />
        {hasGoal && (
          <div style={{
            position: 'absolute', left: 0, top: '50%', height: '10px', width: `${position}%`, transform: 'translateY(-50%)',
            borderRadius: '5px', background: `linear-gradient(90deg, ${status.color}66, ${status.color})`,
            transition: 'width 0.5s ease',
          }} />
        )}
        {hasGoal && expectedPct > 0 && (
          <div title={`Ritmo esperado: ${expectedPct}%`} style={{
            position: 'absolute', left: `${marker}%`, top: '4px', bottom: '4px', width: '2px', borderRadius: '1px',
            background: 'var(--adm-text-title)', opacity: 0.7,
          }} />
        )}
        <div style={{
          position: 'absolute', left: `${position}%`, top: '50%', transform: 'translate(-50%, -50%)',
          transition: 'left 0.5s ease', opacity: hasGoal ? 1 : 0.5,
        }}>
          <Avatar name={row.name} url={row.avatarUrl} size={AVATAR} ring={hasGoal ? status.color : '#64748B'} />
        </div>
        <div style={{ position: 'absolute', right: `-${AVATAR / 2 + 12}px`, top: '50%', transform: 'translateY(-50%)' }}>
          {done ? <Trophy size={20} color="#D4AF37" style={{ filter: 'drop-shadow(0 0 6px #D4AF37)' }} /> : <Flag size={18} color="var(--adm-text-muted)" />}
        </div>
      </div>

      <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        {hasGoal ? (
          <>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: status.color }}>{pct}%</div>
            <div title={row.goalDetail || undefined} style={{ fontSize: '0.64rem', color: 'var(--adm-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {row.goalDetail}
            </div>
          </>
        ) : (
          <span style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)' }}>Sem meta</span>
        )}
      </div>
    </div>
  );
};

export const GoalTrack: React.FC<{ rows: CollaboratorRow[]; expectedPct: number }> = ({ rows, expectedPct }) => {
  const sorted = [...rows].sort((a, b) => {
    if (a.goalPct === null && b.goalPct === null) return a.name.localeCompare(b.name);
    if (a.goalPct === null) return 1;
    if (b.goalPct === null) return -1;
    return b.goalPct - a.goalPct;
  });
  const withGoal = sorted.filter(r => r.goalPct !== null).length;
  return (
    <Panel>
      <SectionTitle hint={`${withGoal} de ${rows.length} com meta · a marca vertical é o ritmo esperado (${expectedPct}%)`}>
        Esteira de metas da equipe
      </SectionTitle>
      {rows.length === 0 ? (
        <EmptyHint>Nenhum SDR ou Closer ativo no escopo.</EmptyHint>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: '520px' }}>
            {sorted.map(r => <TrackRow key={r.id} row={r} expectedPct={expectedPct} />)}
          </div>
        </div>
      )}
    </Panel>
  );
};
