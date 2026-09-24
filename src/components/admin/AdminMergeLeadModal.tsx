import React, { useState, useMemo } from 'react';
import { 
  X, Merge, Search, AlertTriangle, ArrowRight, Check, RefreshCw 
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { formatPhone } from '../../utils/phoneFormatter';
import { SafeAvatar } from './SafeAvatar';
import type { Lead } from '../../types/admin';

interface AdminMergeLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceLead: Lead | null;
  onMerged?: (mergedLeadId: string) => void;
}

export const AdminMergeLeadModal: React.FC<AdminMergeLeadModalProps> = ({
  isOpen,
  onClose,
  sourceLead,
  onMerged,
}) => {
  const { leads, mergeLeads } = useAdminState();
  const [searchTerm, setSearchTerm] = useState('');
  const [targetLead, setTargetLead] = useState<Lead | null>(null);
  const [keepSourceAsMaster, setKeepSourceAsMaster] = useState(true);
  const [isMerging, setIsMerging] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Reseta estado ao fechar ou ao trocar de lead
  React.useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setTargetLead(null);
      setKeepSourceAsMaster(true);
      setErrorMsg('');
    }
  }, [isOpen, sourceLead?.id]);

  // Lista de leads elegíveis para unificação (exclui o próprio sourceLead)
  const candidateLeads = useMemo(() => {
    if (!sourceLead || !searchTerm.trim()) return [];
    const clean = searchTerm.toLowerCase().trim();
    const cleanDigits = clean.replace(/\D/g, '');

    return leads.filter(l => {
      if (l.id === sourceLead.id) return false;
      const matchesName = (l.name || '').toLowerCase().includes(clean);
      const matchesPhone = cleanDigits.length >= 3 && (l.phone || '').replace(/\D/g, '').includes(cleanDigits);
      const matchesCode = (l.code || '').toLowerCase().includes(clean);
      const matchesJid = Boolean(l.whatsappJid && l.whatsappJid.toLowerCase().includes(clean));
      const matchesLid = Boolean(l.whatsappLid && l.whatsappLid.includes(cleanDigits));
      return matchesName || matchesPhone || matchesCode || matchesJid || matchesLid;
    }).slice(0, 10);
  }, [leads, sourceLead, searchTerm]);

  if (!isOpen || !sourceLead) return null;

  const masterLead = keepSourceAsMaster ? sourceLead : targetLead;
  const secondaryLead = keepSourceAsMaster ? targetLead : sourceLead;

  const handleConfirmMerge = async () => {
    if (!masterLead || !secondaryLead) {
      setErrorMsg('Selecione outro lead para unificar.');
      return;
    }

    setIsMerging(true);
    setErrorMsg('');

    try {
      const success = await mergeLeads(masterLead.id, secondaryLead.id);
      if (success) {
        onMerged?.(masterLead.id);
        onClose();
      } else {
        setErrorMsg('Não foi possível unificar os leads. Tente novamente.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao processar unificação.');
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100000,
      padding: '20px',
    }}>
      <div style={{
        background: 'var(--adm-bg-card, #141118)',
        border: '1px solid var(--adm-border, rgba(212, 175, 55, 0.35))',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '680px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--adm-border, rgba(255,255,255,0.08))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10B981',
            }}>
              <Merge size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title, #FFFFFF)' }}>
                Unificar com outro Lead
              </h3>
              <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--adm-text-muted, #9E988D)' }}>
                Junte históricos de conversas, telefones e tarefas em um único lead principal
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isMerging}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--adm-text-muted, #9E988D)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {errorMsg && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #EF4444',
              color: '#EF4444',
              fontSize: '0.76rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <AlertTriangle size={15} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Comparativo Visual de Unificação */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            gap: '12px',
            alignItems: 'center',
          }}>
            {/* Box Lead 1 */}
            <div style={{
              background: 'var(--adm-bg-input, rgba(255,255,255,0.03))',
              border: `1.5px solid ${keepSourceAsMaster ? '#10B981' : 'var(--adm-border, rgba(255,255,255,0.1))'}`,
              borderRadius: '12px',
              padding: '12px',
              position: 'relative',
            }}>
              {keepSourceAsMaster && (
                <span style={{
                  position: 'absolute',
                  top: '-10px',
                  right: '10px',
                  background: '#10B981',
                  color: '#FFFFFF',
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  padding: '1px 8px',
                  borderRadius: '10px',
                  textTransform: 'uppercase',
                }}>
                  Principal (Mantido)
                </span>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <SafeAvatar src={sourceLead.avatarUrl} name={sourceLead.name} size={36} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--adm-text-title, #FFF)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {sourceLead.name || 'Sem Nome'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted, #9E988D)' }}>
                    {formatPhone(sourceLead.phone) || sourceLead.phone || 'Sem telefone'}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)', display: 'flex', gap: '8px' }}>
                <span>💬 {sourceLead.activities?.length || 0} atividades</span>
                {sourceLead.code && <span>• Cód: {sourceLead.code}</span>}
              </div>
            </div>

            {/* Ícone de junção */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'var(--adm-bg-input, rgba(255,255,255,0.06))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--adm-text-muted)',
              }}>
                <ArrowRight size={16} />
              </div>
              {targetLead && (
                <button
                  type="button"
                  onClick={() => setKeepSourceAsMaster(!keepSourceAsMaster)}
                  title="Inverter lead principal"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--adm-accent, #6366F1)',
                    fontSize: '0.66rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                  }}
                >
                  <RefreshCw size={10} /> Inverter
                </button>
              )}
            </div>

            {/* Box Lead 2 (Selecionado ou Busca) */}
            <div style={{
              background: 'var(--adm-bg-input, rgba(255,255,255,0.03))',
              border: `1.5px solid ${targetLead && !keepSourceAsMaster ? '#10B981' : 'var(--adm-border, rgba(255,255,255,0.1))'}`,
              borderRadius: '12px',
              padding: '12px',
              position: 'relative',
              minHeight: '82px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}>
              {targetLead && !keepSourceAsMaster && (
                <span style={{
                  position: 'absolute',
                  top: '-10px',
                  right: '10px',
                  background: '#10B981',
                  color: '#FFFFFF',
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  padding: '1px 8px',
                  borderRadius: '10px',
                  textTransform: 'uppercase',
                }}>
                  Principal (Mantido)
                </span>
              )}
              {targetLead ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <SafeAvatar src={targetLead.avatarUrl} name={targetLead.name} size={36} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--adm-text-title, #FFF)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {targetLead.name || 'Sem Nome'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted, #9E988D)' }}>
                        {formatPhone(targetLead.phone) || targetLead.phone || 'Sem telefone'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTargetLead(null)}
                      style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px' }}
                      title="Remover seleção"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)', display: 'flex', gap: '8px' }}>
                    <span>💬 {targetLead.activities?.length || 0} atividades</span>
                    {targetLead.code && <span>• Cód: {targetLead.code}</span>}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--adm-text-muted)', fontSize: '0.74rem' }}>
                  Busque e selecione o lead abaixo
                </div>
              )}
            </div>
          </div>

          {/* Campo de Busca de Outro Lead */}
          {!targetLead && (
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--adm-text-muted)', marginBottom: '6px' }}>
                Buscar lead para unificar (digite nome, telefone ou código):
              </label>
              <div style={{ position: 'relative' }}>
                <Search size={15} color="var(--adm-text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Ex: Andreia, 2199999..., LEAD-1024"
                  className="adm-input"
                  style={{
                    width: '100%',
                    paddingLeft: '36px',
                    height: '40px',
                    borderRadius: '10px',
                    fontSize: '0.82rem',
                  }}
                  autoFocus
                />
              </div>

              {/* Lista de Resultados */}
              {searchTerm.trim().length > 0 && (
                <div style={{
                  marginTop: '8px',
                  background: 'var(--adm-bg-input, rgba(255,255,255,0.03))',
                  border: '1px solid var(--adm-border, rgba(255,255,255,0.1))',
                  borderRadius: '10px',
                  maxHeight: '180px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                }}>
                  {candidateLeads.length === 0 ? (
                    <div style={{ padding: '14px', textAlign: 'center', color: 'var(--adm-text-muted)', fontSize: '0.74rem' }}>
                      Nenhum outro lead encontrado com esse termo.
                    </div>
                  ) : (
                    candidateLeads.map(l => (
                      <div
                        key={l.id}
                        onClick={() => {
                          setTargetLead(l);
                          setSearchTerm('');
                        }}
                        style={{
                          padding: '10px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderBottom: '1px solid var(--adm-border, rgba(255,255,255,0.05))',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--adm-bg-card, rgba(255,255,255,0.06))'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <SafeAvatar src={l.avatarUrl} name={l.name} size={30} />
                          <div>
                            <div style={{ fontSize: '0.80rem', fontWeight: 800, color: 'var(--adm-text-title, #FFF)' }}>
                              {l.name || 'Sem Nome'}
                            </div>
                            <div style={{ fontSize: '0.70rem', color: 'var(--adm-text-muted)' }}>
                              {formatPhone(l.phone) || l.phone || 'Sem telefone'} • Cód: {l.code}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            background: 'var(--adm-accent-bg, rgba(99,102,241,0.15))',
                            border: '1px solid var(--adm-accent, #6366F1)',
                            color: 'var(--adm-accent, #6366F1)',
                            fontSize: '0.70rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Selecionar
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* O que acontecerá ao unificar */}
          {targetLead && (
            <div style={{
              padding: '12px 14px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}>
              <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#10B981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Check size={14} /> Resumo da Unificação:
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.72rem', color: 'var(--adm-text-title, #E2E8F0)', lineHeight: '1.5' }}>
                <li>Todas as mensagens do WhatsApp dos dois leads serão <strong>combinadas em ordem cronológica exata</strong>.</li>
                <li>Os números de telefone, JID e identificadores multi-dispositivo (LID) serão preservados no lead principal.</li>
                <li>Tarefas pendentes e anotações serão migradas automaticamente.</li>
                <li>O lead secundário será removido com segurança, eliminando duplicações no CRM.</li>
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid var(--adm-border, rgba(255,255,255,0.08))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '10px',
        }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isMerging}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: 'transparent',
              border: '1px solid var(--adm-border, rgba(255,255,255,0.15))',
              color: 'var(--adm-text-muted, #9E988D)',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirmMerge}
            disabled={!targetLead || isMerging}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 20px',
              borderRadius: '8px',
              background: targetLead ? '#10B981' : 'rgba(255,255,255,0.1)',
              color: targetLead ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
              border: 'none',
              fontSize: '0.76rem',
              fontWeight: 800,
              cursor: targetLead ? 'pointer' : 'not-allowed',
              boxShadow: targetLead ? '0 2px 10px rgba(16, 185, 129, 0.3)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <Merge size={14} />
            <span>{isMerging ? 'Unificando...' : 'Confirmar Unificação'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
