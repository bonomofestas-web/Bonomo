import React from 'react';
import { Crown, Handshake, Medal, Trophy } from 'lucide-react';
import { DeltaBadge, EmptyHint, Panel, SectionTitle, formatBRL } from './DashboardKpi';
import { pctDelta } from '../../../utils/dashboardPeriod';
import type { CloserRank, SdrRank } from '../../../hooks/useCommercialDashboardData';
import { roleLabel } from './CollaboratorIdentity';

const GOLD = '#D4AF37';
const SILVER = '#CBD5E1';
const BRONZE = '#CD7F32';
const MEDAL = [GOLD, SILVER, BRONZE];
const PLATFORM_H = [170, 122, 84]; // 1o, 2o, 3o (desnivel maior para o 3o respirar)

export const Avatar: React.FC<{ name: string; url?: string; size: number; ring?: string }> = ({ name, url, size, ring }) => {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('');
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', display: 'inline-flex',
      alignItems: 'center', justifyContent: 'center', fontSize: size * 0.34, fontWeight: 800,
      background: 'var(--adm-bg-input)', color: 'var(--adm-text-title)',
      boxShadow: ring ? `0 0 0 3px ${ring}` : undefined,
    }}>
      {url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
    </span>
  );
};

interface PodiumItem {
  id: string;
  name: string;
  avatarUrl?: string;
  role?: string;
  main: string;     // valor principal (ex.: R$)
  sub: string;      // linha secundaria
  extra?: React.ReactNode;
  pct: number | null;
  hasCurrent: boolean;
}

const PodiumColumn: React.FC<{ item: PodiumItem; place: 0 | 1 | 2 }> = ({ item, place }) => {
  const color = MEDAL[place];
  const Icon = place === 0 ? Crown : Medal;
  return (
    <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
      <Icon size={place === 0 ? 24 : 18} color={color} style={{ marginBottom: '4px', filter: place === 0 ? `drop-shadow(0 0 6px ${color})` : undefined }} />
      <Avatar name={item.name} url={item.avatarUrl} size={place === 0 ? 62 : 48} ring={color} />
      <div title={item.name} style={{
        marginTop: '8px', maxWidth: '100%', fontSize: place === 0 ? '0.86rem' : '0.78rem', fontWeight: 800,
        color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {item.name}
      </div>
      {item.role && (
        <span style={{
          marginTop: '2px', fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em',
          padding: '1px 6px', borderRadius: '4px', color: 'var(--adm-text-muted)',
          background: 'var(--adm-bg-input)', border: '1px solid var(--adm-border)',
        }}>{roleLabel(item.role)}</span>
      )}
      <div style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)', fontVariantNumeric: 'tabular-nums', textAlign: 'center' }}>{item.sub}</div>
      {item.extra}
      <div style={{
        marginTop: '8px', width: '100%', height: PLATFORM_H[place], borderRadius: '10px 10px 0 0',
        background: `linear-gradient(180deg, ${color}55 0%, ${color}14 100%)`,
        borderTop: `3px solid ${color}`, boxShadow: place === 0 ? `0 -6px 22px ${color}33` : undefined,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '6px',
      }}>
        <span style={{ fontSize: '1.7rem', fontWeight: 800, lineHeight: 1, color, fontVariantNumeric: 'tabular-nums' }}>{place + 1}º</span>
        <span style={{ fontSize: place === 0 ? '0.9rem' : '0.8rem', fontWeight: 800, color: 'var(--adm-text-title)', fontVariantNumeric: 'tabular-nums' }}>
          {item.main}
        </span>
        <DeltaBadge pct={item.pct} hasCurrent={item.hasCurrent} />
      </div>
    </div>
  );
};

const Podium: React.FC<{
  title: string; hint: string; empty: string; items: PodiumItem[];
}> = ({ title, hint, empty, items }) => {
  const [first, second, third] = items;
  const rest = items.slice(3, 6);
  return (
    <Panel>
      <SectionTitle hint={hint}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
          <Trophy size={16} color={GOLD} /> {title}
        </span>
      </SectionTitle>
      {items.length === 0 ? (
        <EmptyHint>{empty}</EmptyHint>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', padding: '4px 4px 0' }}>
            {second ? <PodiumColumn item={second} place={1} /> : <div style={{ flex: '1 1 0' }} />}
            <PodiumColumn item={first} place={0} />
            {third ? <PodiumColumn item={third} place={2} /> : <div style={{ flex: '1 1 0' }} />}
          </div>
          {rest.length > 0 && (
            <div style={{ marginTop: '12px', borderTop: '1px solid var(--adm-border)' }}>
              {rest.map((r, i) => (
                <div key={r.id} style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0',
                  borderBottom: '1px solid var(--adm-border)', fontVariantNumeric: 'tabular-nums',
                }}>
                  <span style={{ width: '22px', fontSize: '0.74rem', fontWeight: 800, color: 'var(--adm-text-muted)' }}>{i + 4}º</span>
                  <Avatar name={r.name} url={r.avatarUrl} size={26} />
                  <span style={{ flex: 1, minWidth: 0, fontSize: '0.78rem', fontWeight: 700, color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>{r.main}</span>
                  <DeltaBadge pct={r.pct} hasCurrent={r.hasCurrent} />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Panel>
  );
};

export const ClosersPodium: React.FC<{ closers: CloserRank[] }> = ({ closers }) => (
  <Podium
    title="Pódio de Closers" hint="Por valor fechado no período" empty="Nenhum fechamento atribuído a Closers no período."
    items={closers.slice(0, 6).map(c => ({
      id: c.id, name: c.name, avatarUrl: c.avatarUrl, role: 'closer',
      main: formatBRL(c.revenue),
      sub: `${c.closings} ${c.closings === 1 ? 'contrato' : 'contratos'}`,
      extra: c.topSdrName ? (
        <span title={`SDR parceiro: ${c.topSdrName} (${c.topSdrCount})`} style={{
          marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px', maxWidth: '100%',
          fontSize: '0.64rem', fontWeight: 700, color: 'var(--adm-text-muted)',
        }}>
          <Handshake size={11} />
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.topSdrName} ({c.topSdrCount})</span>
        </span>
      ) : undefined,
      pct: pctDelta(c.revenue, c.revenuePrev), hasCurrent: c.revenue > 0,
    }))}
  />
);

const pctTxt = (v: number | null) => (v === null ? '—' : `${Math.round(v)}%`);

export const SdrsPodium: React.FC<{ sdrs: SdrRank[] }> = ({ sdrs }) => {
  const toItem = (s: SdrRank): PodiumItem => ({
    id: s.id, name: s.name, avatarUrl: s.avatarUrl, role: 'sdr',
    // A nota (score) fica so no calculo; o pódio exibe os resultados e a ordem ja vem dela.
    main: `${s.appointments} agend.`,
    sub: `Comparecimento ${pctTxt(s.schedToAttendRate)}`,
    extra: (
      <span style={{ marginTop: '4px', fontSize: '0.64rem', fontWeight: 700, color: 'var(--adm-text-muted)' }}>
        Agendamento {pctTxt(s.qualToSchedRate)}
      </span>
    ),
    pct: pctDelta(s.appointments, s.appointmentsPrev), hasCurrent: s.appointments > 0,
  });
  return (
    <Podium
      title="Pódio de SDRs"
      hint="Ordenado pela nota de desempenho do período"
      empty="Nenhuma atividade de SDR no período."
      items={sdrs.slice(0, 6).map(toItem)}
    />
  );
};
