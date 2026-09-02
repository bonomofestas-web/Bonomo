import React, { useState } from 'react';
import { 
  Gift, Crown, Plus, Search, Edit3, Trash2, 
  DollarSign
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { AdminBenefitModal } from './AdminBenefitModal';
import { AdminVipRewardModal } from './AdminVipRewardModal';
import { AdminConfirmModal } from './AdminConfirmModal';
import type { BenefitCatalogItem, VipRewardCatalogItem } from '../../types/admin';

export const AdminBenefitsCatalogView: React.FC = () => {
  const { 
    benefitsCatalog, 
    vipCatalog, 
    deleteBenefitCatalogItem, 
    deleteVipCatalogItem 
  } = useAdminState();

  const [activeSubTab, setActiveSubTab] = useState<'benefits' | 'vip'>('benefits');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Modals state
  const [isBenefitModalOpen, setIsBenefitModalOpen] = useState(false);
  const [editingBenefit, setEditingBenefit] = useState<BenefitCatalogItem | null>(null);
  const [benefitToDelete, setBenefitToDelete] = useState<BenefitCatalogItem | null>(null);

  const [isVipModalOpen, setIsVipModalOpen] = useState(false);
  const [editingVipReward, setEditingVipReward] = useState<VipRewardCatalogItem | null>(null);
  const [vipToDelete, setVipToDelete] = useState<VipRewardCatalogItem | null>(null);

  // Filtered lists
  const filteredBenefits = (benefitsCatalog || []).filter(b => {
    const nameMatch = (b.name || '').toLowerCase().includes(search.toLowerCase());
    const descMatch = (b.description || '').toLowerCase().includes(search.toLowerCase());
    const matchesSearch = nameMatch || descMatch;
    const matchesCat = categoryFilter === 'all' || b.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const filteredVip = (vipCatalog || []).filter(v => {
    const nameMatch = (v.name || '').toLowerCase().includes(search.toLowerCase());
    const descMatch = (v.description || '').toLowerCase().includes(search.toLowerCase());
    return nameMatch || descMatch;
  });

  const categoryLabels: Record<string, string> = {
    festa: 'Festa & Horário',
    convidados: 'Convidados Extras',
    entretenimento: 'Entretenimento & Atrações',
    gastronomia: 'Gastronomia & Open Bar',
    vip: 'Experiência VIP',
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      padding: '24px 32px 60px 32px',
      width: '100%',
      boxSizing: 'border-box',
      animation: 'fadeIn 0.25s ease-out',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{
            fontSize: '1.45rem',
            fontWeight: 800,
            color: 'var(--adm-text-title)',
            letterSpacing: '-0.4px',
            margin: '0 0 4px 0',
          }}>
            Catálogo de Benefícios & Prêmios VIP
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted)', margin: 0 }}>
            Gerencie o acervo de prêmios e bonificações para as jornadas das debutantes.
          </p>
        </div>

        {/* Action Button */}
        <div style={{ display: 'flex', gap: '10px' }}>
          {activeSubTab === 'benefits' ? (
            <button
              onClick={() => {
                setEditingBenefit(null);
                setIsBenefitModalOpen(true);
              }}
              className="adm-btn-primary"
              style={{
                padding: '8px 18px',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '0.82rem',
              }}
            >
              <Plus size={16} />
              <span>Novo Benefício</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setEditingVipReward(null);
                setIsVipModalOpen(true);
              }}
              className="adm-btn-primary"
              style={{
                padding: '8px 18px',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '0.82rem',
              }}
            >
              <Plus size={16} />
              <span>Novo Presente VIP</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub Tabs: Benefícios vs Presentes VIP */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{
          background: 'var(--adm-bg-card)',
          border: '1px solid var(--adm-border)',
          borderRadius: '12px',
          padding: '4px',
          display: 'flex',
          gap: '4px',
        }}>
          <button
            onClick={() => setActiveSubTab('benefits')}
            style={{
              background: activeSubTab === 'benefits' ? 'var(--adm-accent-bg)' : 'transparent',
              border: activeSubTab === 'benefits' ? '1px solid var(--adm-accent)' : '1px solid transparent',
              color: activeSubTab === 'benefits' ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
              borderRadius: '8px',
              padding: '7px 16px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <Gift size={14} />
            <span>Benefícios de Metas ({benefitsCatalog.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('vip')}
            style={{
              background: activeSubTab === 'vip' ? 'var(--adm-accent-bg)' : 'transparent',
              border: activeSubTab === 'vip' ? '1px solid var(--adm-accent)' : '1px solid transparent',
              color: activeSubTab === 'vip' ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
              borderRadius: '8px',
              padding: '7px 16px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <Crown size={14} />
            <span>Presentes VIP por Vendas ({vipCatalog.length})</span>
          </button>
        </div>

        {/* Search & Category Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ position: 'relative', width: '240px' }}>
            <Search size={14} color="var(--adm-accent)" style={{ position: 'absolute', left: '12px', top: '10px' }} />
            <input
              type="text"
              placeholder="Buscar item do catálogo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--adm-bg-input)',
                border: '1px solid var(--adm-border)',
                borderRadius: '10px',
                padding: '8px 12px 8px 34px',
                color: 'var(--adm-text-title)',
                fontSize: '0.8rem',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            />
          </div>

          {activeSubTab === 'benefits' && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                background: 'var(--adm-bg-input)',
                border: '1px solid var(--adm-border)',
                borderRadius: '10px',
                padding: '8px 12px',
                color: 'var(--adm-text-title)',
                fontSize: '0.8rem',
                outline: 'none',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              <option value="all">Todas as Categorias</option>
              <option value="festa">Festa & Horário</option>
              <option value="convidados">Convidados Extras</option>
              <option value="entretenimento">Entretenimento</option>
              <option value="gastronomia">Gastronomia</option>
              <option value="vip">Experiência VIP</option>
            </select>
          )}
        </div>
      </div>

      {/* TAB 1: BENEFÍCIOS DE METAS */}
      {activeSubTab === 'benefits' && (
        filteredBenefits.length === 0 ? (
          <div className="saas-card" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--adm-text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Gift size={42} color="var(--adm-accent)" style={{ opacity: 0.6, marginBottom: '12px' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: '0 0 6px 0' }}>
              Nenhum Benefício Cadastrado
            </h3>
            <p style={{ fontSize: '0.8rem', maxWidth: '380px', margin: '0 auto 18px auto', lineHeight: 1.5 }}>
              Cadastre novos benefícios e bonificações para as debutantes resgatarem por indicações validadas.
            </p>
            <button
              onClick={() => {
                setEditingBenefit(null);
                setIsBenefitModalOpen(true);
              }}
              className="adm-btn-primary"
              style={{ padding: '8px 18px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 800 }}
            >
              <Plus size={15} /> Cadastrar Primeiro Benefício
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '20px',
          }}>
            {filteredBenefits.map(item => (
              <div
                key={item.id}
                className="saas-card"
                style={{
                  padding: 0,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Dual Image Preview Header */}
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', background: 'var(--adm-bg-elevated)', borderBottom: '1px solid var(--adm-border)' }}>
                  {/* Img 1: Mockup Transparent */}
                  <div style={{
                    height: '110px',
                    background: 'radial-gradient(circle, var(--adm-accent-bg) 0%, var(--adm-bg-input) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px',
                    borderRight: '1px solid var(--adm-border)',
                    position: 'relative',
                  }}>
                    <img
                      src={item.cardImageUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80'}
                      alt={item.name}
                      style={{ maxHeight: '85px', maxWidth: '85px', objectFit: 'contain', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))' }}
                    />
                    <span style={{ position: 'absolute', bottom: '4px', left: '6px', fontSize: '0.58rem', color: 'var(--adm-text-muted)', fontWeight: 700 }}>
                      MOCKUP 1:1
                    </span>
                  </div>

                  {/* Img 2: Banner Details */}
                  <div style={{
                    height: '110px',
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    <img
                      src={item.detailImageUrl || item.cardImageUrl}
                      alt={item.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)',
                      display: 'flex',
                      alignItems: 'flex-end',
                      padding: '8px 10px',
                    }}>
                      <span style={{ fontSize: '0.62rem', color: 'var(--adm-accent)', fontWeight: 700 }}>
                        BANNER 16:9 (DETALHES)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{
                      background: 'var(--adm-accent-bg)',
                      color: 'var(--adm-accent)',
                      borderRadius: '6px',
                      padding: '2px 8px',
                      fontSize: '0.66rem',
                      fontWeight: 700,
                    }}>
                      {categoryLabels[item.category] || item.category}
                    </span>

                    <span style={{
                      background: 'var(--adm-green-bg)',
                      color: 'var(--adm-green)',
                      borderRadius: '6px',
                      padding: '2px 8px',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                    }}>
                      {item.pointsRequired} Indicações
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: '2px 0 0 0', letterSpacing: '-0.2px' }}>
                    {item.name}
                  </h3>

                  <p style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', margin: 0, lineHeight: 1.4, flex: 1 }}>
                    {item.description}
                  </p>

                  {item.defaultValue && item.defaultValue > 0 && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <DollarSign size={12} color="var(--adm-green)" />
                      <span>Valor estimado: <strong style={{ color: 'var(--adm-text-title)' }}>R$ {item.defaultValue.toLocaleString('pt-BR')}</strong></span>
                    </div>
                  )}

                  {/* Footer Controls */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '8px',
                    borderTop: '1px solid var(--adm-border)',
                    paddingTop: '12px',
                    marginTop: '6px',
                  }}>
                    <button
                      onClick={() => {
                        setEditingBenefit(item);
                        setIsBenefitModalOpen(true);
                      }}
                      style={{
                        background: 'var(--adm-bg-elevated)',
                        border: '1px solid var(--adm-border)',
                        color: 'var(--adm-text-title)',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Edit3 size={12} color="var(--adm-accent)" />
                      <span>Editar</span>
                    </button>

                    <button
                      onClick={() => setBenefitToDelete(item)}
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        color: 'var(--adm-red)',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        fontSize: '0.74rem',
                        cursor: 'pointer',
                      }}
                      title="Excluir Benefício"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* TAB 2: PRESENTES VIP POR VENDAS */}
      {activeSubTab === 'vip' && (
        filteredVip.length === 0 ? (
          <div className="saas-card" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--adm-text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Crown size={42} color="#EC4899" style={{ opacity: 0.6, marginBottom: '12px' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: '0 0 6px 0' }}>
              Nenhum Prêmio VIP Cadastrado
            </h3>
            <p style={{ fontSize: '0.8rem', maxWidth: '380px', margin: '0 auto 18px auto', lineHeight: 1.5 }}>
              Cadastre super presentes (ex: iPhones, Watches, Viagens) liberados com contratos fechados por indicação.
            </p>
            <button
              onClick={() => {
                setEditingVipReward(null);
                setIsVipModalOpen(true);
              }}
              className="adm-btn-primary"
              style={{ padding: '8px 18px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 800 }}
            >
              <Plus size={15} /> Cadastrar Primeiro Prêmio VIP
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '20px',
          }}>
            {filteredVip.map(item => (
              <div
                key={item.id}
                className="saas-card"
                style={{
                  padding: 0,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Dual Image Preview Header */}
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', background: 'var(--adm-bg-elevated)', borderBottom: '1px solid var(--adm-border)' }}>
                  <div style={{
                    height: '110px',
                    background: 'radial-gradient(circle, rgba(236, 72, 153, 0.15) 0%, var(--adm-bg-input) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px',
                    borderRight: '1px solid var(--adm-border)',
                    position: 'relative',
                  }}>
                    <img
                      src={item.cardImageUrl}
                      alt={item.name}
                      style={{ maxHeight: '85px', maxWidth: '85px', objectFit: 'contain', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))' }}
                    />
                    <span style={{ position: 'absolute', bottom: '4px', left: '6px', fontSize: '0.58rem', color: '#EC4899', fontWeight: 700 }}>
                      MOCKUP VIP
                    </span>
                  </div>

                  <div style={{
                    height: '110px',
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    <img
                      src={item.detailImageUrl || item.cardImageUrl}
                      alt={item.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)',
                      display: 'flex',
                      alignItems: 'flex-end',
                      padding: '8px 10px',
                    }}>
                      <span style={{ fontSize: '0.62rem', color: '#EC4899', fontWeight: 700 }}>
                        BANNER 16:9
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{
                      background: 'rgba(236, 72, 153, 0.15)',
                      color: '#EC4899',
                      borderRadius: '6px',
                      padding: '2px 8px',
                      fontSize: '0.66rem',
                      fontWeight: 700,
                    }}>
                      {item.badgeTag || 'VIP REWARD'}
                    </span>

                    <span style={{
                      background: 'var(--adm-green-bg)',
                      color: 'var(--adm-green)',
                      borderRadius: '6px',
                      padding: '2px 8px',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                    }}>
                      {item.salesRequired} Venda{item.salesRequired > 1 ? 's' : ''} Fechada{item.salesRequired > 1 ? 's' : ''}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: '2px 0 0 0', letterSpacing: '-0.2px' }}>
                    {item.name}
                  </h3>

                  <p style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', margin: 0, lineHeight: 1.4, flex: 1 }}>
                    {item.description}
                  </p>

                  {/* Footer Controls */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '8px',
                    borderTop: '1px solid var(--adm-border)',
                    paddingTop: '12px',
                    marginTop: '6px',
                  }}>
                    <button
                      onClick={() => {
                        setEditingVipReward(item);
                        setIsVipModalOpen(true);
                      }}
                      style={{
                        background: 'var(--adm-bg-elevated)',
                        border: '1px solid var(--adm-border)',
                        color: 'var(--adm-text-title)',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Edit3 size={12} color="var(--adm-accent)" />
                      <span>Editar</span>
                    </button>

                    <button
                      onClick={() => setVipToDelete(item)}
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        color: 'var(--adm-red)',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        fontSize: '0.74rem',
                        cursor: 'pointer',
                      }}
                      title="Excluir Presente VIP"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Modals */}
      <AdminBenefitModal
        isOpen={isBenefitModalOpen}
        onClose={() => setIsBenefitModalOpen(false)}
        benefitToEdit={editingBenefit}
      />

      <AdminVipRewardModal
        isOpen={isVipModalOpen}
        onClose={() => setIsVipModalOpen(false)}
        rewardToEdit={editingVipReward}
      />

      {/* Benefit Delete Confirm */}
      <AdminConfirmModal
        isOpen={!!benefitToDelete}
        onClose={() => setBenefitToDelete(null)}
        onConfirm={() => {
          if (benefitToDelete) {
            deleteBenefitCatalogItem(benefitToDelete.id);
            setBenefitToDelete(null);
          }
        }}
        title="Excluir Benefício"
        itemName={benefitToDelete?.name}
        message={benefitToDelete ? `Tem certeza que deseja excluir o benefício "${benefitToDelete.name}" do catálogo geral?` : undefined}
      />

      {/* VIP Reward Delete Confirm */}
      <AdminConfirmModal
        isOpen={!!vipToDelete}
        onClose={() => setVipToDelete(null)}
        onConfirm={() => {
          if (vipToDelete) {
            deleteVipCatalogItem(vipToDelete.id);
            setVipToDelete(null);
          }
        }}
        title="Excluir Presente VIP"
        itemName={vipToDelete?.name}
        message={vipToDelete ? `Tem certeza que deseja excluir o presente VIP "${vipToDelete.name}" do catálogo geral?` : undefined}
      />
    </div>
  );
};
