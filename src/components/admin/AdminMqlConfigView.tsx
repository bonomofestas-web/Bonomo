import React, { useState, useMemo } from 'react';
import { 
  Plus, Trash2, Edit2, X, ArrowRight, ArrowLeft,
  Share2, Layers, Sparkles,
  Info, Check, GitBranch, ChevronUp, ChevronDown, GripVertical
} from 'lucide-react';
import { IcpTargetUserIcon } from './IcpTargetUserIcon';
import { useAdminState } from '../../context/AdminStateContext';
import { ICP_SITUATION_CONFIG } from '../../types/admin';
import type { MqlQuestion, MqlOption, MqlOptionSituation, Venue, CommercialFunnel } from '../../types/admin';
import { mqlService } from '../../services/mqlService';

interface FixedOptionFormState {
  situation: MqlOptionSituation;
  label: string;
}

const DEFAULT_FIXED_OPTIONS: FixedOptionFormState[] = [
  { situation: 'ideal', label: '' },
  { situation: 'good', label: '' },
  { situation: 'medium', label: '' },
  { situation: 'bad', label: '' },
];

export interface IcpProfileGroup {
  id: string;
  name: string;
  funnelIds: string[];
  funnels: CommercialFunnel[];
  venueIds: string[];
  venues: Venue[];
  questions: MqlQuestion[];
}

export const AdminMqlConfigView: React.FC = () => {
  const { 
    venues, 
    funnels,
    mqlQuestions, 
    addMqlQuestion, 
    updateMqlQuestion, 
    deleteMqlQuestion
  } = useAdminState();

  // Navigation & Grouping State
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [isViewingGroup, setIsViewingGroup] = useState<boolean>(false);

  // Profile Modal State (Create / Edit ICP Profile)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<IcpProfileGroup | null>(null);
  const [profileNameInput, setProfileNameInput] = useState('');
  const [selectedFunnelIdsInput, setSelectedFunnelIdsInput] = useState<string[]>([]);
  const [selectedVenueIdsInput, setSelectedVenueIdsInput] = useState<string[]>([]);

  // Question Modal State (Create / Edit Question)
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [questionTitle, setQuestionTitle] = useState('');
  const [questionDescription, setQuestionDescription] = useState('');
  const [formOptions, setFormOptions] = useState<FixedOptionFormState[]>(DEFAULT_FIXED_OPTIONS);

  // Delete Profile Confirmation State
  const [profileToDelete, setProfileToDelete] = useState<IcpProfileGroup | null>(null);

  // ── 1. Filtro Estrito: Apenas funis comerciais (proibido pós-venda em ICP) ──
  const commercialFunnels = useMemo(() => {
    return funnels.filter(f => !f.isPostSale && f.category !== 'Pós-Venda' && !f.name?.toLowerCase().includes('pós-venda'));
  }, [funnels]);

  // ── 2. HUB: Agrupamento de perfis ICP por Funis Comerciais & Nome ──
  const icpProfiles = useMemo<IcpProfileGroup[]>(() => {
    const groupsMap = new Map<string, {
      name: string;
      funnelIds: Set<string>;
      venueIds: Set<string>;
      questions: MqlQuestion[];
    }>();

    // Map existing questions to their profile groups
    mqlQuestions.forEach(q => {
      const qFunnelIds = q.funnelIds && q.funnelIds.length > 0 
        ? q.funnelIds 
        : (q.funnelId ? [q.funnelId] : []);

      const qVenueIds = q.venueIds && q.venueIds.length > 0 
        ? q.venueIds 
        : (q.venueId && q.venueId !== 'all' ? [q.venueId] : []);

      const key = q.profileName 
        ? `name_${q.profileName}` 
        : (qFunnelIds.length > 0 
            ? `f_${qFunnelIds.slice().sort().join('_')}` 
            : (qVenueIds.length > 0 ? `v_${qVenueIds.slice().sort().join('_')}` : `q_${q.id}`));

      if (!groupsMap.has(key)) {
        let defaultName = 'Formulário de ICP';
        if (q.profileName) {
          defaultName = q.profileName;
        } else if (qFunnelIds.length > 0) {
          defaultName = commercialFunnels.filter(f => qFunnelIds.includes(f.id)).map(f => f.name).join(' • ') || 'ICP Comercial';
        } else if (qVenueIds.length > 0) {
          defaultName = venues.filter(v => qVenueIds.includes(v.id)).map(v => v.name).join(' • ') || 'ICP Geral';
        }

        groupsMap.set(key, {
          name: defaultName,
          funnelIds: new Set(qFunnelIds),
          venueIds: new Set(qVenueIds),
          questions: [],
        });
      }

      const grp = groupsMap.get(key)!;
      qFunnelIds.forEach(id => grp.funnelIds.add(id));
      qVenueIds.forEach(id => grp.venueIds.add(id));
      grp.questions.push(q);
      if (q.profileName && (!grp.name || grp.name === 'Formulário de ICP' || grp.name === 'Formato de Qualificação')) {
        grp.name = q.profileName;
      }
    });

    const result: IcpProfileGroup[] = [];
    groupsMap.forEach((grp, key) => {
      const matchedFunnelIds = Array.from(grp.funnelIds).filter(id => commercialFunnels.some(f => f.id === id));
      const matchedFunnels = commercialFunnels.filter(f => matchedFunnelIds.includes(f.id));

      const matchedVenueIds = Array.from(grp.venueIds).filter(id => venues.some(v => v.id === id));
      const matchedVenues = venues.filter(v => matchedVenueIds.includes(v.id));

      const finalName = grp.name || (matchedFunnels.length > 0 
        ? matchedFunnels.map(f => f.name).join(' • ') 
        : (matchedVenues.length > 0 ? matchedVenues.map(v => v.name).join(' • ') : 'Formulário de ICP'));

      result.push({
        id: key,
        name: finalName,
        funnelIds: matchedFunnelIds,
        funnels: matchedFunnels,
        venueIds: matchedVenueIds,
        venues: matchedVenues,
        questions: grp.questions.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
      });
    });

    return result;
  }, [commercialFunnels, venues, mqlQuestions]);

  // Unlinked Funnels (Funnels that have NO qualification format assigned)
  const unlinkedFunnels = useMemo(() => {
    const assignedFunnelIds = new Set<string>();
    icpProfiles.forEach(p => {
      p.funnelIds.forEach(id => assignedFunnelIds.add(id));
    });
    return commercialFunnels.filter(f => !assignedFunnelIds.has(f.id));
  }, [commercialFunnels, icpProfiles]);

  // Active Profile currently being edited/viewed
  const currentProfile = useMemo(() => {
    if (!selectedProfileId) return null;
    return icpProfiles.find(p => p.id === selectedProfileId) || null;
  }, [icpProfiles, selectedProfileId]);

  // ── Handlers do Hub ──
  const handleOpenProfileEditor = (profile: IcpProfileGroup) => {
    setSelectedProfileId(profile.id);
    setIsViewingGroup(true);
  };

  const handleBackToHub = () => {
    setIsViewingGroup(false);
    setSelectedProfileId(null);
  };

  // ── Handlers do Modal de Perfil ICP (Criar / Editar) ──
  const handleOpenCreateProfileModal = (preselectedFunnelId?: string) => {
    setEditingProfile(null);
    const targetFunnel = preselectedFunnelId ? funnels.find(f => f.id === preselectedFunnelId) : unlinkedFunnels[0];
    setProfileNameInput(targetFunnel ? `Qualificação - ${targetFunnel.name}` : '');
    setSelectedFunnelIdsInput(targetFunnel ? [targetFunnel.id] : []);
    setSelectedVenueIdsInput([]);
    setIsProfileModalOpen(true);
  };

  const handleOpenEditProfileModal = (profile: IcpProfileGroup, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingProfile(profile);
    setProfileNameInput(profile.name);
    setSelectedFunnelIdsInput([...profile.funnelIds]);
    setSelectedVenueIdsInput([...profile.venueIds]);
    setIsProfileModalOpen(true);
  };

  const handleToggleFunnelSelection = (funnelId: string) => {
    const isAlreadyLinked = icpProfiles.some(p => p.id !== editingProfile?.id && p.funnelIds.includes(funnelId));
    if (isAlreadyLinked) {
      alert('Regra do CRM: Cada funil comercial só pode ter 1 Formulário de ICP vinculado.');
      return;
    }

    if (selectedFunnelIdsInput.includes(funnelId)) {
      setSelectedFunnelIdsInput(prev => prev.filter(id => id !== funnelId));
    } else {
      setSelectedFunnelIdsInput(prev => [...prev, funnelId]);
    }
  };

  const handleSaveProfile = async () => {
    const cleanName = profileNameInput.trim() || 'Formato de Qualificação';

    if (selectedFunnelIdsInput.length === 0 && funnels.length > 0) {
      alert('Selecione pelo menos 1 Funil para este formato de qualificação.');
      return;
    }

    // Execute save:
    if (editingProfile) {
      // Update all questions belonging to this profile
      for (const q of editingProfile.questions) {
        const updated: MqlQuestion = {
          ...q,
          profileName: cleanName,
          funnelIds: selectedFunnelIdsInput,
          funnelId: selectedFunnelIdsInput[0] || undefined,
          venueIds: selectedVenueIdsInput,
          venueId: selectedVenueIdsInput[0] || 'all',
        };
        updateMqlQuestion(q.id, {
          profileName: cleanName,
          funnelIds: selectedFunnelIdsInput,
          funnelId: selectedFunnelIdsInput[0] || undefined,
          venueIds: selectedVenueIdsInput,
          venueId: selectedVenueIdsInput[0] || 'all',
        });
        await mqlService.upsert(updated);
      }
    } else {
      // Create new profile with a default starter question
      const newQuestion: Omit<MqlQuestion, 'id'> = {
        funnelId: selectedFunnelIdsInput[0] || undefined,
        funnelIds: selectedFunnelIdsInput,
        venueId: selectedVenueIdsInput[0] || 'all',
        venueIds: selectedVenueIdsInput,
        profileName: cleanName,
        title: 'Qual a previsão de data da celebração?',
        description: 'Avalia urgência e maturidade comercial do lead neste funil',
        order: 0,
        options: [
          { id: `opt_${Date.now()}_0`, label: 'Data fechada nos próximos 3 a 6 meses', situation: 'ideal', points: 100 },
          { id: `opt_${Date.now()}_1`, label: 'Data prevista dentro de 1 ano', situation: 'good', points: 70 },
          { id: `opt_${Date.now()}_2`, label: 'Apenas pesquisando para o próximo ano', situation: 'medium', points: 40 },
          { id: `opt_${Date.now()}_3`, label: 'Sem data definida / Sem previsão', situation: 'bad', points: 0 },
        ],
      };
      addMqlQuestion(newQuestion);
    }

    setIsProfileModalOpen(false);
  };

  // ── Handler de Exclusão de Formato de Qualificação ──
  const handleDeleteProfile = async () => {
    if (!profileToDelete) return;

    // Delete all questions in this profile
    for (const q of profileToDelete.questions) {
      deleteMqlQuestion(q.id);
    }

    if (selectedProfileId === profileToDelete.id) {
      setIsViewingGroup(false);
      setSelectedProfileId(null);
    }

    setProfileToDelete(null);
  };

  // ── Handlers Inline (Edição Rápida e Reordenação Direta) ──
  const handleSaveQuestionTitleInline = (questionId: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    updateMqlQuestion(questionId, { title: newTitle.trim() });
  };

  const handleSaveQuestionDescInline = (questionId: string, newDesc: string) => {
    updateMqlQuestion(questionId, { description: newDesc.trim() });
  };

  const handleSaveOptionInline = (questionId: string, optId: string, newText: string) => {
    const question = mqlQuestions.find(q => q.id === questionId);
    if (!question) return;
    const updatedOpts = question.options.map(opt => opt.id === optId ? { ...opt, label: newText } : opt);
    updateMqlQuestion(questionId, { options: updatedOpts });
  };

  const handleMoveQuestion = (idx: number, direction: 'up' | 'down') => {
    if (!currentProfile) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= currentProfile.questions.length) return;

    const reordered = [...currentProfile.questions];
    const temp = reordered[idx];
    reordered[idx] = reordered[targetIdx];
    reordered[targetIdx] = temp;

    reordered.forEach((q, newOrder) => {
      updateMqlQuestion(q.id, { order: newOrder });
    });
  };

  // ── Handlers do Modal de Pergunta ──
  const handleOpenNewQuestionModal = () => {
    setEditingQuestionId(null);
    setQuestionTitle('');
    setQuestionDescription('');
    setFormOptions([
      { situation: 'ideal', label: '' },
      { situation: 'good', label: '' },
      { situation: 'medium', label: '' },
      { situation: 'bad', label: '' },
    ]);
    setIsQuestionModalOpen(true);
  };

  const handleOpenEditQuestionModal = (q: MqlQuestion) => {
    setEditingQuestionId(q.id);
    setQuestionTitle(q.title);
    setQuestionDescription(q.description || '');

    const mapped: FixedOptionFormState[] = [
      {
        situation: 'ideal',
        label: q.options.find(o => o.situation === 'ideal' || o.points >= 90)?.label || '',
      },
      {
        situation: 'good',
        label: q.options.find(o => o.situation === 'good' || (o.points >= 65 && o.points < 90))?.label || '',
      },
      {
        situation: 'medium',
        label: q.options.find(o => o.situation === 'medium' || (o.points >= 30 && o.points < 65))?.label || '',
      },
      {
        situation: 'bad',
        label: q.options.find(o => o.situation === 'bad' || o.points < 30)?.label || '',
      },
    ];

    setFormOptions(mapped);
    setIsQuestionModalOpen(true);
  };

  const handleOptionLabelChange = (situation: MqlOptionSituation, text: string) => {
    setFormOptions(prev => prev.map(opt => {
      if (opt.situation === situation) {
        return { ...opt, label: text };
      }
      return opt;
    }));
  };

  const handleSaveQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionTitle.trim()) {
      alert('Por favor, preencha o título da pergunta.');
      return;
    }

    const filledOptions = formOptions.filter(o => o.label.trim().length > 0);
    if (filledOptions.length < 2) {
      alert('Por favor, preencha pelo menos 2 situações para a pergunta.');
      return;
    }

    const finalOptions: MqlOption[] = formOptions
      .filter(o => o.label.trim().length > 0)
      .map((o, idx) => ({
        id: `opt_${Date.now()}_${idx}`,
        label: o.label.trim(),
        situation: o.situation,
        points: ICP_SITUATION_CONFIG[o.situation].points,
      }));

    const targetFunnelIds = currentProfile ? currentProfile.funnelIds : (funnels[0] ? [funnels[0].id] : []);
    const targetVenueIds = currentProfile ? currentProfile.venueIds : [];
    const targetProfileName = currentProfile?.name || 'Formato de Qualificação';

    if (editingQuestionId) {
      updateMqlQuestion(editingQuestionId, {
        title: questionTitle.trim(),
        description: questionDescription.trim() || undefined,
        options: finalOptions,
        profileName: targetProfileName,
        funnelIds: targetFunnelIds,
        funnelId: targetFunnelIds[0] || undefined,
        venueIds: targetVenueIds,
        venueId: targetVenueIds[0] || 'all',
      });
    } else {
      addMqlQuestion({
        funnelId: targetFunnelIds[0] || undefined,
        funnelIds: targetFunnelIds,
        venueId: targetVenueIds[0] || 'all',
        venueIds: targetVenueIds,
        profileName: targetProfileName,
        title: questionTitle.trim(),
        description: questionDescription.trim() || undefined,
        options: finalOptions,
        order: currentProfile?.questions.length || 0,
      });
    }

    setIsQuestionModalOpen(false);
  };

  // ══════════════════════════════════════════════════════════════════════════
  // TELA 1: HUB / LISTAGEM DOS FORMATOS DE QUALIFICAÇÃO
  // ══════════════════════════════════════════════════════════════════════════
  if (!isViewingGroup || !currentProfile) {
    return (
      <div style={{
        padding: '24px 32px 60px',
        width: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        {/* Header Principal */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(20, 169, 215, 0.2) 0%, rgba(20, 169, 215, 0.05) 100%)',
              border: '1px solid rgba(20, 169, 215, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#14A9D7',
              flexShrink: 0,
            }}>
              <IcpTargetUserIcon size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--adm-text-title)', margin: 0, letterSpacing: '-0.3px' }}>
                Qualificação de Leads por Funil
              </h1>
              <p style={{ fontSize: '0.80rem', color: 'var(--adm-text-muted)', margin: 0, marginTop: '2px' }}>
                Crie formatos de qualificação e vincule aos funis comerciais. Cada funil possui exatamente 1 formato ativo.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleOpenCreateProfileModal()}
            className="adm-btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '12px',
              fontSize: '0.82rem',
              fontWeight: 800,
              boxShadow: '0 4px 16px rgba(20, 169, 215, 0.25)',
            }}
          >
            <Plus size={16} />
            <span>Novo Formato de Qualificação</span>
          </button>
        </div>

        {/* Alerta de Funis sem Qualificação */}
        {unlinkedFunnels.length > 0 && (
          <div style={{
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '14px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(245, 158, 11, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#F59E0B',
                flexShrink: 0,
              }}>
                <Info size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#F59E0B' }}>
                  {unlinkedFunnels.length} {unlinkedFunnels.length === 1 ? 'funil' : 'funis'} sem qualificação vinculada
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}>
                  Leads nestes funis não possuem perguntas de qualificação configuradas no CRM.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              {unlinkedFunnels.map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => handleOpenCreateProfileModal(f.id)}
                  style={{
                    background: 'rgba(245, 158, 11, 0.15)',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    color: '#F59E0B',
                    borderRadius: '8px',
                    padding: '4px 10px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Plus size={12} />
                  <span>{f.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Lista de Formatos de Qualificação */}
        {icpProfiles.length === 0 ? (
          <div style={{
            background: 'var(--adm-bg-card)',
            border: '1.5px dashed rgba(20, 169, 215, 0.3)',
            borderRadius: '16px',
            padding: '50px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '14px',
          }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: 'rgba(20, 169, 215, 0.12)',
              border: '1px solid rgba(20, 169, 215, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#14A9D7',
            }}>
              <IcpTargetUserIcon size={26} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: '0 0 4px 0' }}>
                Nenhum Formato de Qualificação Cadastrado
              </h3>
              <p style={{ fontSize: '0.80rem', color: 'var(--adm-text-muted)', margin: 0, maxWidth: '440px', lineHeight: 1.45 }}>
                Cadastre o seu primeiro formato de qualificação e vincule a um ou mais funis comerciais.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenCreateProfileModal()}
              className="adm-btn-primary"
              style={{
                marginTop: '6px',
                padding: '10px 22px',
                borderRadius: '10px',
                fontSize: '0.82rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Plus size={16} />
              <span>Cadastrar Primeiro Formato</span>
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '18px',
          }}>
            {icpProfiles.map(profile => {
              const qCount = profile.questions.length;
              const isMultiFunnel = profile.funnels.length > 1;

              return (
                <div
                  key={profile.id}
                  onClick={() => handleOpenProfileEditor(profile)}
                  style={{
                    background: 'var(--adm-bg-card)',
                    border: '1px solid var(--adm-border)',
                    borderRadius: '16px',
                    padding: '20px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '16px',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#14A9D7';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(20, 169, 215, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--adm-border)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.1)';
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Top Row: Icon, Title & Action Icons */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                        <div style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '10px',
                          background: isMultiFunnel ? 'rgba(139, 92, 246, 0.15)' : 'rgba(20, 169, 215, 0.15)',
                          border: `1px solid ${isMultiFunnel ? 'rgba(139, 92, 246, 0.35)' : 'rgba(20, 169, 215, 0.35)'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: isMultiFunnel ? '#A78BFA' : '#14A9D7',
                          flexShrink: 0,
                        }}>
                          {isMultiFunnel ? <Layers size={18} /> : <GitBranch size={18} />}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <h3 style={{ fontSize: '0.96rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0, wordBreak: 'break-word' }}>
                            {profile.name}
                          </h3>
                          <span style={{
                            fontSize: '0.66rem',
                            fontWeight: 700,
                            color: isMultiFunnel ? '#A78BFA' : 'var(--adm-accent)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginTop: '2px',
                          }}>
                            {isMultiFunnel ? <Share2 size={10} /> : <GitBranch size={10} />}
                            {profile.funnels.length} {profile.funnels.length === 1 ? 'funil vinculado' : 'funis vinculados'}
                          </span>
                        </div>
                      </div>

                      {/* Top Action Buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditProfileModal(profile, e)}
                          title="Editar Nome e Funis Vinculados"
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid var(--adm-border)',
                            color: 'var(--adm-text-muted)',
                            borderRadius: '8px',
                            padding: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setProfileToDelete(profile);
                          }}
                          title="Excluir Formato de Qualificação"
                          style={{
                            background: 'rgba(239, 68, 68, 0.08)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            color: '#EF4444',
                            borderRadius: '8px',
                            padding: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Chips dos Funis Vinculados */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      {profile.funnels.length > 0 ? (
                        profile.funnels.map(f => (
                          <span
                            key={f.id}
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: 'var(--adm-bg-input)',
                              border: '1px solid var(--adm-border)',
                              color: 'var(--adm-text-body)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <GitBranch size={11} color="#14A9D7" />
                            <span>{f.name}</span>
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>
                          Nenhum funil vinculado
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom Row */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid var(--adm-border)',
                    paddingTop: '12px',
                    marginTop: '4px',
                  }}>
                    {qCount > 0 ? (
                      <span style={{ fontSize: '0.76rem', color: 'var(--adm-text-body)', fontWeight: 600 }}>
                        <strong>{qCount}</strong> {qCount === 1 ? 'pergunta configurada' : 'perguntas configuradas'}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.76rem', color: 'var(--adm-accent)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Sparkles size={12} /> Toque para definir perguntas
                      </span>
                    )}

                    <div style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '6px',
                      background: 'rgba(20, 169, 215, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#14A9D7',
                    }}>
                      <ArrowRight size={14} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── MODAL: CADASTRAR / EDITAR FORMATO DE QUALIFICAÇÃO ── */}
        {isProfileModalOpen && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: '20px',
          }}>
            <div style={{
              background: 'var(--adm-bg-card, #ffffff)',
              border: '1px solid var(--adm-border, #E2E8F0)',
              borderRadius: '16px',
              maxWidth: '560px',
              width: '100%',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              boxShadow: '0 20px 48px rgba(0,0,0,0.18)',
            }}>
              {/* Modal Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--adm-border, #E2E8F0)', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IcpTargetUserIcon size={20} color="#14A9D7" />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--adm-text-title, #0F172A)', margin: 0 }}>
                    {editingProfile ? 'Editar Formulário de ICP' : 'Novo Formulário de ICP'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted, #64748B)', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Nome do Formato */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)', marginBottom: '6px' }}>
                    Nome do Formulário de ICP *
                  </label>
                  <input
                    type="text"
                    value={profileNameInput}
                    onChange={(e) => setProfileNameInput(e.target.value)}
                    placeholder="Ex: ICP Qualificação Comercial, ICP Tráfego Pago..."
                    className="adm-input"
                    style={{ width: '100%', height: '40px', borderRadius: '10px', fontSize: '0.82rem', background: 'var(--adm-bg-input, #F8FAFC)', border: '1px solid var(--adm-border, #E2E8F0)', color: 'var(--adm-text-body, #1E293B)', padding: '0 12px' }}
                  />
                </div>

                {/* Seleção de Funis */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <label style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)' }}>
                      Funis Comerciais Vinculados *
                    </label>
                    <span style={{ fontSize: '0.66rem', color: '#14A9D7', fontWeight: 700 }}>
                      Regra: 1 funil possui no máximo 1 ICP ativo
                    </span>
                  </div>

                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    maxHeight: '220px',
                    overflowY: 'auto',
                    padding: '4px',
                  }}>
                    {commercialFunnels.map(f => {
                      const isSelected = selectedFunnelIdsInput.includes(f.id);
                      const otherProfile = icpProfiles.find(p => p.id !== editingProfile?.id && p.funnelIds.includes(f.id));
                      const isBlocked = Boolean(otherProfile && !isSelected);

                      return (
                        <div
                          key={f.id}
                          onClick={() => {
                            if (isBlocked) return;
                            handleToggleFunnelSelection(f.id);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            background: isSelected 
                              ? 'rgba(20, 169, 215, 0.10)' 
                              : isBlocked 
                                ? 'var(--adm-bg-input, #F8FAFC)' 
                                : 'var(--adm-bg-card, #ffffff)',
                            border: `1px solid ${isSelected ? '#14A9D7' : 'var(--adm-border, #E2E8F0)'}`,
                            cursor: isBlocked ? 'not-allowed' : 'pointer',
                            opacity: isBlocked ? 0.65 : 1,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '6px',
                              background: isSelected ? '#14A9D7' : 'transparent',
                              border: `1.5px solid ${isSelected ? '#14A9D7' : 'var(--adm-border, #CBD5E1)'}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#FFFFFF',
                            }}>
                              {isSelected && <Check size={14} />}
                            </div>
                            <span style={{ fontSize: '0.80rem', fontWeight: 700, color: isSelected ? '#14A9D7' : 'var(--adm-text-title, #0F172A)' }}>
                              {f.name}
                            </span>
                          </div>

                          {otherProfile && !isSelected && (
                            <span style={{
                              fontSize: '0.64rem',
                              color: '#D97706',
                              background: 'rgba(245, 158, 11, 0.12)',
                              border: '1px solid rgba(245, 158, 11, 0.3)',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontWeight: 700,
                            }}>
                              Já vinculado: {otherProfile.name}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', borderTop: '1px solid var(--adm-border, #E2E8F0)', paddingTop: '14px' }}>
                  <button
                    type="button"
                    onClick={() => setIsProfileModalOpen(false)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      background: 'transparent',
                      border: '1px solid var(--adm-border, #CBD5E1)',
                      color: 'var(--adm-text-muted, #64748B)',
                      cursor: 'pointer',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    className="adm-btn-primary"
                    style={{ padding: '8px 20px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 900 }}
                  >
                    Salvar Formulário
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL: CONFIRMAR EXCLUSÃO ── */}
        {profileToDelete && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: '20px',
          }}>
            <div style={{
              background: '#141118',
              border: '1.5px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '20px',
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 24px 64px rgba(0,0,0,0.9)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#EF4444',
                }}>
                  <Trash2 size={18} />
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#FFFFFF', margin: 0 }}>
                  Excluir Formato "{profileToDelete.name}"?
                </h3>
              </div>

              <p style={{ fontSize: '0.78rem', color: '#D3E0EA', margin: 0, lineHeight: 1.45 }}>
                Esta ação apagará as <strong>{profileToDelete.questions.length} perguntas</strong> deste formato. Os funis vinculados ficarão sem critérios de qualificação configurados.
              </p>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setProfileToDelete(null)}
                  className="adm-btn-secondary"
                  style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700 }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDeleteProfile}
                  className="adm-btn-primary"
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 900,
                    background: '#EF4444',
                    borderColor: '#EF4444',
                  }}
                >
                  Confirmar Exclusão
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TELA 2: EDITOR DAS PERGUNTAS DO FORMATO DE QUALIFICAÇÃO SELECIONADO
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      padding: '24px 32px 60px',
      width: '100%',
      boxSizing: 'border-box',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      {/* ── BOTÃO DE VOLTAR AO HUB ── */}
      <div>
        <button
          type="button"
          onClick={handleBackToHub}
          className="adm-btn-secondary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            borderRadius: '10px',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={14} />
          <span>Voltar para Formatos de Qualificação</span>
        </button>
      </div>

      {/* ── HEADER DO PERFIL ── */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '20px',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, rgba(20, 169, 215, 0.2) 0%, rgba(20, 169, 215, 0.05) 100%)',
            border: '1px solid rgba(20, 169, 215, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#14A9D7',
            flexShrink: 0,
          }}>
            <IcpTargetUserIcon size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--adm-text-title)', margin: 0 }}>
                {currentProfile.name}
              </h1>
              <button
                type="button"
                onClick={(e) => handleOpenEditProfileModal(currentProfile, e)}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid var(--adm-border)',
                  color: 'var(--adm-text-muted)',
                  borderRadius: '6px',
                  padding: '3px 8px',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Edit2 size={11} />
                <span>Editar Funis ({currentProfile.funnels.length})</span>
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
              {currentProfile.funnels.map(f => (
                <span
                  key={f.id}
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '5px',
                    background: 'rgba(20, 169, 215, 0.1)',
                    color: '#14A9D7',
                    border: '1px solid rgba(20, 169, 215, 0.25)',
                  }}
                >
                  {f.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenNewQuestionModal}
          className="adm-btn-primary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: '12px',
            fontSize: '0.82rem',
            fontWeight: 800,
          }}
        >
          <Plus size={16} />
          <span>Adicionar Pergunta</span>
        </button>
      </div>

      {/* ── 4 SITUAÇÕES PADRONIZADAS & NOTAS ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '12px',
      }}>
        {/* Ideal */}
        <div style={{
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '12px',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '0.80rem', fontWeight: 800, color: '#10B981' }}>
              Situação Ideal (100%)
            </div>
            <div style={{ fontSize: '0.70rem', color: 'var(--adm-text-muted)' }}>
              Perfil com alta urgência e decisor.
            </div>
          </div>
        </div>

        {/* Bom */}
        <div style={{
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '12px',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#60A5FA', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '0.80rem', fontWeight: 800, color: '#60A5FA' }}>
              Situação Boa (70%)
            </div>
            <div style={{ fontSize: '0.70rem', color: 'var(--adm-text-muted)' }}>
              Perfil favorável com pequenos ajustes.
            </div>
          </div>
        </div>

        {/* Médio */}
        <div style={{
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '12px',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F59E0B', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '0.80rem', fontWeight: 800, color: '#F59E0B' }}>
              Situação Média (40%)
            </div>
            <div style={{ fontSize: '0.70rem', color: 'var(--adm-text-muted)' }}>
              Data aberta ou orçamento justo.
            </div>
          </div>
        </div>

        {/* Ruim */}
        <div style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '12px',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '0.80rem', fontWeight: 800, color: '#EF4444' }}>
              Situação Ruim (0%)
            </div>
            <div style={{ fontSize: '0.70rem', color: 'var(--adm-text-muted)' }}>
              Fora do perfil ou curioso.
            </div>
          </div>
        </div>
      </div>

      {/* ── LISTA DE PERGUNTAS DO FORMATO ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '0.96rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
            Perguntas Cadastradas ({currentProfile.questions.length})
          </h2>
          <span style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>
            Aplicadas nos funis: <strong>{currentProfile.funnels.map(f => f.name).join(' • ') || 'Nenhum'}</strong>
          </span>
        </div>

        {currentProfile.questions.length === 0 ? (
          <div style={{
            background: 'linear-gradient(135deg, rgba(20, 169, 215, 0.08) 0%, var(--adm-bg-card) 100%)',
            border: '1.5px dashed rgba(20, 169, 215, 0.4)',
            borderRadius: '18px',
            padding: '48px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '14px',
              background: 'rgba(20, 169, 215, 0.15)',
              border: '1px solid rgba(20, 169, 215, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#14A9D7',
            }}>
              <IcpTargetUserIcon size={26} />
            </div>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--adm-text-title)' }}>
                Nenhuma Pergunta Cadastrada para {currentProfile.name}
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', maxWidth: '460px', margin: '4px auto 0', lineHeight: 1.45 }}>
                Adicione as perguntas-chave que a equipe comercial deve avaliar nos leads vinculados a estes funis.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenNewQuestionModal}
              className="adm-btn-primary"
              style={{
                marginTop: '8px',
                padding: '10px 22px',
                borderRadius: '10px',
                fontSize: '0.82rem',
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Plus size={16} />
              <span>Adicionar Primeira Pergunta</span>
            </button>
          </div>
        ) : (
          <>
            {currentProfile.questions.map((q, idx) => (
              <div
                key={q.id}
                style={{
                  background: 'var(--adm-bg-card)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '16px',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1, minWidth: 0 }}>
                    {/* Alça e Controles de Reordenação */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                      <div title="Alça de ordenação" style={{ color: 'var(--adm-text-muted, #94A3B8)', cursor: 'grab', display: 'flex', alignItems: 'center' }}>
                        <GripVertical size={16} />
                      </div>
                      <div style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '8px',
                        background: 'rgba(20, 169, 215, 0.15)',
                        color: '#14A9D7',
                        fontWeight: 900,
                        fontSize: '0.78rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {idx + 1}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveQuestion(idx, 'up')}
                          title="Mover para cima"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            padding: '1px',
                            cursor: idx === 0 ? 'not-allowed' : 'pointer',
                            color: idx === 0 ? 'var(--adm-border, #CBD5E1)' : 'var(--adm-text-muted, #64748B)',
                            lineHeight: 1,
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <ChevronUp size={12} />
                        </button>
                        <button
                          type="button"
                          disabled={idx === currentProfile.questions.length - 1}
                          onClick={() => handleMoveQuestion(idx, 'down')}
                          title="Mover para baixo"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            padding: '1px',
                            cursor: idx === currentProfile.questions.length - 1 ? 'not-allowed' : 'pointer',
                            color: idx === currentProfile.questions.length - 1 ? 'var(--adm-border, #CBD5E1)' : 'var(--adm-text-muted, #64748B)',
                            lineHeight: 1,
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <ChevronDown size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Título e Descrição Inline */}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <input
                        defaultValue={q.title}
                        onBlur={(e) => handleSaveQuestionTitleInline(q.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.currentTarget.blur();
                        }}
                        title="Clique para editar o título inline"
                        style={{
                          fontSize: '0.90rem',
                          fontWeight: 800,
                          color: 'var(--adm-text-title, #0F172A)',
                          background: 'transparent',
                          border: '1px solid transparent',
                          borderRadius: '6px',
                          padding: '2px 6px',
                          width: '100%',
                          boxSizing: 'border-box',
                          outline: 'none',
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = 'var(--adm-accent, #6366F1)'}
                        onBlurCapture={(e) => e.currentTarget.style.borderColor = 'transparent'}
                      />
                      <input
                        defaultValue={q.description || ''}
                        onBlur={(e) => handleSaveQuestionDescInline(q.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.currentTarget.blur();
                        }}
                        placeholder="Adicionar descrição / objetivo inline (opcional)..."
                        title="Clique para editar a descrição inline"
                        style={{
                          fontSize: '0.74rem',
                          color: 'var(--adm-text-muted, #64748B)',
                          background: 'transparent',
                          border: '1px solid transparent',
                          borderRadius: '6px',
                          padding: '2px 6px',
                          width: '100%',
                          boxSizing: 'border-box',
                          outline: 'none',
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = 'var(--adm-accent, #6366F1)'}
                        onBlurCapture={(e) => e.currentTarget.style.borderColor = 'transparent'}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => handleOpenEditQuestionModal(q)}
                      className="adm-btn-secondary"
                      style={{ padding: '5px 10px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Edit2 size={12} />
                      <span>Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Deseja realmente excluir a pergunta "${q.title}"?`)) {
                          deleteMqlQuestion(q.id);
                        }
                      }}
                      style={{
                        background: 'transparent',
                        border: '1px solid rgba(239,68,68,0.3)',
                        color: '#EF4444',
                        borderRadius: '8px',
                        padding: '5px 8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* 4 Opções Empilhadas com Edição Inline Direta */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  padding: '12px',
                  background: 'var(--adm-bg-input, #F8FAFC)',
                  borderRadius: '10px',
                }}>
                  {q.options.map(opt => {
                    const sit: MqlOptionSituation = opt.situation || (opt.points >= 90 ? 'ideal' : opt.points >= 65 ? 'good' : opt.points >= 30 ? 'medium' : 'bad');
                    const conf = ICP_SITUATION_CONFIG[sit];

                    return (
                      <div
                        key={opt.id}
                        style={{
                          background: 'var(--adm-bg-card, #ffffff)',
                          border: `1px solid ${conf.border}`,
                          borderRadius: '8px',
                          padding: '8px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px',
                          width: '100%',
                          boxSizing: 'border-box',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                          <span style={{
                            fontSize: '0.64rem',
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: '5px',
                            background: conf.bg,
                            color: conf.color,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            flexShrink: 0,
                            minWidth: '78px',
                            justifyContent: 'center',
                          }}>
                            {conf.label}
                          </span>
                          <input
                            defaultValue={opt.label}
                            onBlur={(e) => handleSaveOptionInline(q.id, opt.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') e.currentTarget.blur();
                            }}
                            title="Clique para editar inline esta alternativa"
                            style={{
                              fontSize: '0.78rem',
                              color: 'var(--adm-text-title, #0F172A)',
                              fontWeight: 600,
                              background: 'transparent',
                              border: '1px solid transparent',
                              borderRadius: '4px',
                              padding: '2px 6px',
                              flex: 1,
                              outline: 'none',
                              boxSizing: 'border-box',
                            }}
                            onFocus={(e) => e.currentTarget.style.borderColor = conf.color}
                            onBlurCapture={(e) => e.currentTarget.style.borderColor = 'transparent'}
                          />
                        </div>
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          color: conf.color,
                          background: conf.bg,
                          padding: '2px 6px',
                          borderRadius: '5px',
                          border: `1px solid ${conf.border}`,
                          flexShrink: 0,
                        }}>
                          {conf.points}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '6px' }}>
              <button
                type="button"
                onClick={handleOpenNewQuestionModal}
                className="adm-btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 24px',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  fontWeight: 900,
                }}
              >
                <Plus size={16} />
                <span>Adicionar Nova Pergunta</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── MODAL: CRIAR / EDITAR PERGUNTA ── */}
      {isQuestionModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1200,
          padding: '20px',
        }}>
          <div style={{
            background: 'var(--adm-bg-card, #ffffff)',
            border: '1px solid var(--adm-border, #E2E8F0)',
            borderRadius: '16px',
            maxWidth: '640px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 20px 48px rgba(0,0,0,0.18)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--adm-border, #E2E8F0)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IcpTargetUserIcon size={20} color="#14A9D7" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--adm-text-title, #0F172A)', margin: 0 }}>
                  {editingQuestionId ? 'Editar Pergunta de ICP' : 'Nova Pergunta de ICP'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsQuestionModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted, #64748B)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Question Title */}
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)', marginBottom: '6px' }}>
                  Título da Pergunta *
                </label>
                <input
                  type="text"
                  value={questionTitle}
                  onChange={(e) => setQuestionTitle(e.target.value)}
                  placeholder="Ex: Qual a previsão de data da celebração?"
                  className="adm-input"
                  style={{ width: '100%', height: '40px', borderRadius: '10px', fontSize: '0.82rem', background: 'var(--adm-bg-input, #F8FAFC)', border: '1px solid var(--adm-border, #E2E8F0)', color: 'var(--adm-text-body, #1E293B)', padding: '0 12px' }}
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)', marginBottom: '6px' }}>
                  Descrição / Objetivo (Opcional)
                </label>
                <input
                  type="text"
                  value={questionDescription}
                  onChange={(e) => setQuestionDescription(e.target.value)}
                  placeholder="Ex: Avalia urgência de decisão e maturidade comercial"
                  className="adm-input"
                  style={{ width: '100%', height: '40px', borderRadius: '10px', fontSize: '0.80rem', background: 'var(--adm-bg-input, #F8FAFC)', border: '1px solid var(--adm-border, #E2E8F0)', color: 'var(--adm-text-body, #1E293B)', padding: '0 12px' }}
                />
              </div>

              {/* 4 Standardized Situations Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)' }}>
                    Defina o Texto para as 4 Situações Comerciais:
                  </label>
                  <span style={{ fontSize: '0.66rem', color: '#14A9D7', fontWeight: 700 }}>
                    Cálculo automatizado pelo sistema
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {formOptions.map((opt) => {
                    const conf = ICP_SITUATION_CONFIG[opt.situation];

                    return (
                      <div
                        key={opt.situation}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          background: 'var(--adm-bg-input, #F8FAFC)',
                          border: `1px solid ${conf.border}`,
                          borderRadius: '10px',
                          padding: '8px 10px',
                        }}
                      >
                        {/* Situation Badge */}
                        <div style={{
                          width: '100px',
                          flexShrink: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                        }}>
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 900,
                            padding: '2px 6px',
                            borderRadius: '5px',
                            background: conf.bg,
                            color: conf.color,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}>
                            {conf.label}
                          </span>
                          <span style={{ fontSize: '0.60rem', color: 'var(--adm-text-muted, #64748B)', marginLeft: '2px' }}>
                            Peso: {conf.points}%
                          </span>
                        </div>

                        {/* Input for this situation */}
                        <input
                          type="text"
                          value={opt.label}
                          onChange={(e) => handleOptionLabelChange(opt.situation, e.target.value)}
                          placeholder={`Texto da resposta ${conf.label.toLowerCase()}...`}
                          className="adm-input"
                          style={{ flex: 1, height: '36px', borderRadius: '8px', fontSize: '0.78rem', background: 'var(--adm-bg-card, #ffffff)', border: '1px solid var(--adm-border, #CBD5E1)', color: 'var(--adm-text-body, #1E293B)', padding: '0 10px' }}
                          required
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Form Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '8px', borderTop: '1px solid var(--adm-border, #E2E8F0)', paddingTop: '14px' }}>
                <button
                  type="button"
                  onClick={() => setIsQuestionModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    background: 'transparent',
                    border: '1px solid var(--adm-border, #CBD5E1)',
                    color: 'var(--adm-text-muted, #64748B)',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="adm-btn-primary"
                  style={{ padding: '8px 20px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 900 }}
                >
                  {editingQuestionId ? 'Salvar Pergunta' : 'Criar Pergunta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
