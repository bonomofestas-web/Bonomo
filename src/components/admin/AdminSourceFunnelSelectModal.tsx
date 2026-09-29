import React, { useState } from 'react';
import { 
  X, Target, Crown, Check, 
  ShieldAlert, Layers
} from 'lucide-react';
import type { CommercialFunnel } from '../../types/admin';

interface AdminSourceFunnelSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFunnelId: string;
  onSelectFunnel: (funnelId: string) => void;
  funnels: CommercialFunnel[];
  venueName?: string;
}

export const AdminSourceFunnelSelectModal: React.FC<AdminSourceFunnelSelectModalProps> = ({
  isOpen,
  onClose,
  selectedFunnelId,
  onSelectFunnel,
  funnels,
  venueName,
}) => {
  // Estado para o modal de confirmação de Sucesso do Cliente
  const [pendingPostSaleFunnelId, setPendingPostSaleFunnelId] = useState<string | null>(null);
  const [postSaleConfirmed, setPostSaleConfirmed] = useState(false);

  if (!isOpen) return null;

  // Separação de Funis Comerciais e Pós-Venda
  const commercialFunnels = funnels.filter(f => !f.isPostSale && f.category !== 'Pós-Venda' && f.category !== 'pos_venda');
  const postSaleFunnels = funnels.filter(f => f.isPostSale || f.category === 'Pós-Venda' || f.category === 'pos_venda');

  const handleSelect = (fId: string, isPostSale: boolean) => {
    if (isPostSale) {
      // Abre o aviso de tela grande com checkbox de consentimento
      setPendingPostSaleFunnelId(fId);
      setPostSaleConfirmed(false);
    } else {
      onSelectFunnel(fId);
      onClose();
    }
  };

  const handleConfirmPostSale = () => {
    if (!postSaleConfirmed || !pendingPostSaleFunnelId) return;
    onSelectFunnel(pendingPostSaleFunnelId);
    setPendingPostSaleFunnelId(null);
    setPostSaleConfirmed(false);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '20px',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      animation: 'fadeIn 0.2s ease-out',
    }}>
      {/* ── MODAL PRINCIPAL: SELEÇÃO VISUAL DE FUNIL COM CORES ─────────── */}
      <div style={{
        background: 'var(--adm-bg-card)',
        border: '1px solid var(--adm-border)',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '720px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Header */}
        <div style={{
          padding: '22px 28px',
          borderBottom: '1px solid var(--adm-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--adm-bg-input)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'var(--adm-accent-bg, rgba(212, 175, 55, 0.12))',
              border: '1.5px solid var(--adm-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--adm-accent)',
              flexShrink: 0,
            }}>
              <Target size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--adm-text-title)', margin: 0, letterSpacing: '-0.3px' }}>
                Selecionar Funil de Destino
              </h2>
              <div style={{ fontSize: '0.76rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
                {venueName ? `Casa vinculada: ${venueName} • ` : ''}Direcionamento automático de contatos recebidos
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              background: 'var(--adm-bg-card)',
              border: '1px solid var(--adm-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--adm-text-muted)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{
          padding: '24px 28px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '22px',
        }}>
          
          {/* Opção Desvincular / Sem Funil */}
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
              Opção de Triagem Manual
            </div>
            <div
              onClick={() => handleSelect('', false)}
              style={{
                padding: '14px 18px',
                borderRadius: '14px',
                border: !selectedFunnelId ? '2px solid var(--adm-accent)' : '1px solid var(--adm-border)',
                background: !selectedFunnelId ? 'var(--adm-accent-bg, rgba(212, 175, 55, 0.08))' : 'var(--adm-bg-input)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(100, 116, 139, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--adm-text-muted)',
                  flexShrink: 0,
                }}>
                  <Layers size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: 'var(--adm-text-title)', fontSize: '0.88rem' }}>
                    ⚪ Sem Funil Definido (Desvincular Origem)
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
                    Os contatos chegam como leads desindexados para que sua equipe faça a qualificação e direcionamento manual.
                  </div>
                </div>
              </div>
              {!selectedFunnelId && (
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--adm-accent)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={14} strokeWidth={3} />
                </div>
              )}
            </div>
          </div>

          {/* Seção 1: Funis Comerciais */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                🎯 Funis Comerciais (Pré-Vendas & Vendas)
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)' }}>
                {commercialFunnels.length} {commercialFunnels.length === 1 ? 'funil disponível' : 'funis disponíveis'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
              {commercialFunnels.map(f => {
                const fColor = f.badgeColor || '#3B82F6';
                const isSelected = selectedFunnelId === f.id;

                return (
                  <div
                    key={f.id}
                    onClick={() => handleSelect(f.id, false)}
                    style={{
                      padding: '16px',
                      borderRadius: '16px',
                      border: isSelected ? `2px solid ${fColor}` : '1px solid var(--adm-border)',
                      background: isSelected ? `${fColor}12` : 'var(--adm-bg-input)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: `${fColor}20`,
                          border: `1.5px solid ${fColor}50`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: fColor,
                          flexShrink: 0,
                        }}>
                          <Target size={18} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, color: 'var(--adm-text-title)', fontSize: '0.92rem' }}>
                            {f.name}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: fColor, fontWeight: 700, marginTop: '1px' }}>
                            {f.category || 'Comercial'}
                          </div>
                        </div>
                      </div>

                      {isSelected && (
                        <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: fColor, color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={13} strokeWidth={3} />
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingTop: '4px', borderTop: '1px solid var(--adm-border)' }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)', fontWeight: 600 }}>
                        {f.stages?.length || 0} etapas
                      </span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>•</span>
                      <span style={{
                        fontSize: '0.66rem',
                        fontWeight: 700,
                        color: f.isEntryStageActive === false ? '#F59E0B' : '#10B981',
                      }}>
                        {f.isEntryStageActive === false ? '⚠️ Sem Caixa de Entrada' : '✓ Caixa de Entrada Ativa'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Seção 2: Sucesso do Cliente (Pós-Venda) */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#8B5CF6', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                👑 Sucesso do Cliente (Pós-Venda)
              </span>
              <span style={{ fontSize: '0.68rem', color: '#8B5CF6', fontWeight: 700 }}>
                Geração Direta de Clientes
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
              {(postSaleFunnels.length > 0 ? postSaleFunnels : [{
                id: 'post_sale_default',
                name: 'Sucesso do Cliente',
                category: 'Pós-Venda',
                badgeColor: '#8B5CF6',
                isPostSale: true,
                stages: [],
              }]).map(f => {
                const isSelected = selectedFunnelId === f.id || (selectedFunnelId === 'post_sale_default' && f.id === 'post_sale_default');

                return (
                  <div
                    key={f.id}
                    onClick={() => handleSelect(f.id, true)}
                    style={{
                      padding: '16px',
                      borderRadius: '16px',
                      border: isSelected ? '2px solid #8B5CF6' : '1px solid rgba(139, 92, 246, 0.3)',
                      background: isSelected ? 'rgba(139, 92, 246, 0.14)' : 'linear-gradient(135deg, rgba(139, 92, 246, 0.06) 0%, var(--adm-bg-input) 100%)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: 'rgba(139, 92, 246, 0.2)',
                          border: '1.5px solid #8B5CF6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#8B5CF6',
                          flexShrink: 0,
                        }}>
                          <Crown size={18} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, color: 'var(--adm-text-title)', fontSize: '0.92rem' }}>
                            {f.name}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#8B5CF6', fontWeight: 800, marginTop: '1px' }}>
                            👑 Módulo de Pós-Venda
                          </div>
                        </div>
                      </div>

                      {isSelected && (
                        <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#8B5CF6', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={13} strokeWidth={3} />
                        </div>
                      )}
                    </div>

                    <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', lineHeight: '1.4' }}>
                      Destinado exclusivamente a contatos pós-contrato. Mensagens recebidas entram como <strong>CLIENTES</strong>.
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 28px',
          borderTop: '1px solid var(--adm-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          background: 'var(--adm-bg-card)',
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: '1px solid var(--adm-border)',
              background: 'transparent',
              color: 'var(--adm-text-title)',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Fechar
          </button>
        </div>
      </div>

      {/* ── MODAL SECUNDÁRIO: CONFIRMAÇÃO DE CONSENTIMENTO PARA PÓS-VENDA ── */}
      {pendingPostSaleFunnelId && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100000,
          padding: '20px',
          animation: 'fadeIn 0.2s ease-out',
        }}>
          <div style={{
            background: 'var(--adm-bg-card)',
            border: '2px solid #8B5CF6',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '540px',
            padding: '32px',
            boxShadow: '0 30px 70px rgba(139, 92, 246, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            textAlign: 'center',
          }}>
            {/* Ícone de Alerta */}
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'rgba(139, 92, 246, 0.15)',
              border: '2px solid #8B5CF6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#8B5CF6',
              margin: '0 auto',
            }}>
              <ShieldAlert size={34} />
            </div>

            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--adm-text-title)', margin: 0, letterSpacing: '-0.3px' }}>
                Atenção: Vinculação ao Sucesso do Cliente
              </h3>
              <p style={{ fontSize: '0.84rem', color: 'var(--adm-text-muted)', marginTop: '8px', lineHeight: '1.5' }}>
                Você está definindo o destino desta origem para o módulo de <strong>Sucesso do Cliente (Pós-Venda)</strong>.
              </p>
            </div>

            {/* Caixa Informativa com Regra Suprema */}
            <div style={{
              padding: '16px 20px',
              borderRadius: '16px',
              background: 'rgba(139, 92, 246, 0.08)',
              border: '1px solid rgba(139, 92, 246, 0.25)',
              textAlign: 'left',
              fontSize: '0.78rem',
              color: 'var(--adm-text-title)',
              lineHeight: '1.5',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}>
              <div style={{ fontWeight: 800, color: '#8B5CF6', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Crown size={15} /> Regra Oficial do Sistema F5:
              </div>
              <div>
                • <strong>TODO E QUALQUER CONTATO</strong> que enviar mensagem para este WhatsApp será cadastrado automaticamente com a tag de <strong>CLIENTE</strong>.
              </div>
              <div>
                • Este canal é de <strong>Pós-Venda</strong>: nenhum contato será tratado como Lead comercial.
              </div>
              <div>
                • A <strong>Caixa de Entrada</strong> deste funil será <u>ativada automaticamente</u> para viabilizar a recepção contínua dos clientes.
              </div>
            </div>

            {/* Checkbox Obrigatório */}
            <label style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              cursor: 'pointer',
              textAlign: 'left',
              padding: '12px 14px',
              borderRadius: '12px',
              background: postSaleConfirmed ? 'rgba(139, 92, 246, 0.12)' : 'var(--adm-bg-input)',
              border: postSaleConfirmed ? '1.5px solid #8B5CF6' : '1px solid var(--adm-border)',
              transition: 'all 0.15s ease',
            }}>
              <input
                type="checkbox"
                checked={postSaleConfirmed}
                onChange={(e) => setPostSaleConfirmed(e.target.checked)}
                style={{
                  width: '18px',
                  height: '18px',
                  accentColor: '#8B5CF6',
                  cursor: 'pointer',
                  marginTop: '2px',
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: '0.80rem', fontWeight: 700, color: 'var(--adm-text-title)', lineHeight: '1.4' }}>
                Tenho ciência e confirmo que todas as pessoas que mandarem mensagem para este WhatsApp serão cadastradas como <u>CLIENTES</u> no Sucesso do Cliente.
              </span>
            </label>

            {/* Ações */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => {
                  setPendingPostSaleFunnelId(null);
                  setPostSaleConfirmed(false);
                }}
                style={{
                  flex: 1,
                  height: '44px',
                  borderRadius: '12px',
                  border: '1px solid var(--adm-border)',
                  background: 'transparent',
                  color: 'var(--adm-text-muted)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Voltar / Cancelar
              </button>

              <button
                type="button"
                disabled={!postSaleConfirmed}
                onClick={handleConfirmPostSale}
                style={{
                  flex: 1.4,
                  height: '44px',
                  borderRadius: '12px',
                  border: 'none',
                  background: postSaleConfirmed ? 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)' : 'rgba(100, 116, 139, 0.2)',
                  color: postSaleConfirmed ? '#FFFFFF' : 'var(--adm-text-muted)',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: postSaleConfirmed ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: postSaleConfirmed ? '0 4px 16px rgba(139, 92, 246, 0.4)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <Check size={16} />
                <span>Confirmar Vinculação</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
