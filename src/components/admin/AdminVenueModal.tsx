import React, { useState, useEffect } from 'react';
import { 
  X, Building2, MapPin, Phone, 
  Camera, Award, Sparkles, Save, AlertCircle, Loader2
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { maskPhoneInput, formatPhone } from '../../utils/phoneFormatter';
import { ImageUploadField } from './ImageUploadField';
import { VideoUploadField } from './VideoUploadField';
import type { Venue } from '../../types/admin';

interface AdminVenueModalProps {
  isOpen: boolean;
  onClose: () => void;
  venueToEdit?: Venue | null;
}

export const AdminVenueModal: React.FC<AdminVenueModalProps> = ({
  isOpen,
  onClose,
  venueToEdit,
}) => {
  const { addVenue, updateVenue } = useAdminState();

  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [email, setEmail] = useState('');
  const [googleMapsLink, setGoogleMapsLink] = useState('');
  const [wazeLink, setWazeLink] = useState('');
  const [googleMapsEmbedUrl, setGoogleMapsEmbedUrl] = useState('');
  const [yearsInBusiness, setYearsInBusiness] = useState<number>(15);
  const [eventsCompleted, setEventsCompleted] = useState<number>(1200);
  const [guestsDelighted, setGuestsDelighted] = useState<number>(80000);
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerImageUrl, setBannerImageUrl] = useState('');
  const [ballroomImageUrl, setBallroomImageUrl] = useState('');
  const [welcomeVideoUrl, setWelcomeVideoUrl] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    setIsSubmitting(false);

    if (venueToEdit) {
      setName(venueToEdit.name || '');
      setTagline(venueToEdit.tagline || '');
      setDescription(venueToEdit.description || '');
      setAddress(venueToEdit.address || '');
      setPhone(venueToEdit.phone ? formatPhone(venueToEdit.phone) : '');
      setWhatsappNumber(venueToEdit.whatsappNumber ? formatPhone(venueToEdit.whatsappNumber) : '');
      setEmail(venueToEdit.email || '');
      setGoogleMapsLink(venueToEdit.googleMapsLink || '');
      setWazeLink(venueToEdit.wazeLink || '');
      setGoogleMapsEmbedUrl(venueToEdit.googleMapsEmbedUrl || '');
      setYearsInBusiness(venueToEdit.yearsInBusiness ?? 15);
      setEventsCompleted(venueToEdit.eventsCompleted ?? 1200);
      setGuestsDelighted(venueToEdit.guestsDelighted ?? 80000);
      setLogoUrl(venueToEdit.logoUrl || '');
      setBannerImageUrl(venueToEdit.bannerImageUrl || venueToEdit.ballroomImageUrl || '');
      setBallroomImageUrl(venueToEdit.ballroomImageUrl || '');
      setWelcomeVideoUrl(venueToEdit.welcomeVideoUrl || '');
    } else {
      setName('');
      setTagline('Onde momentos exclusivos se transformam em memórias inesquecíveis');
      setDescription('Espaço requintado e sofisticado preparado especialmente para noites inesquecíveis.');
      setAddress('Av. das Américas, 1500 - Barra da Tijuca, Rio de Janeiro - RJ');
      setPhone('(21) 3456-7890');
      setWhatsappNumber('(21) 99999-9999');
      setEmail('contato@espacoriodelounge.com.br');
      setGoogleMapsLink('');
      setWazeLink('');
      setGoogleMapsEmbedUrl('');
      setYearsInBusiness(15);
      setEventsCompleted(1200);
      setGuestsDelighted(80000);
      setLogoUrl('');
      setBannerImageUrl('https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200&auto=format&fit=crop&q=80');
      setBallroomImageUrl('https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200&auto=format&fit=crop&q=80');
      setWelcomeVideoUrl('');
    }
  }, [venueToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Por favor, informe ao menos o nome da Casa de Festas.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const fallbackBallroom = 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200&auto=format&fit=crop&q=80';
    const effectiveBanner = bannerImageUrl.trim() || ballroomImageUrl.trim() || fallbackBallroom;
    const effectiveBallroom = ballroomImageUrl.trim() || bannerImageUrl.trim() || fallbackBallroom;

    const effectiveMapsLink = googleMapsLink.trim() || `https://maps.google.com/?q=${encodeURIComponent(`${name} ${address}`)}`;
    const effectiveWazeLink = wazeLink.trim() || `https://waze.com/ul?q=${encodeURIComponent(`${name} ${address}`)}`;
    const effectiveEmbedUrl = googleMapsEmbedUrl.trim() || `https://maps.google.com/maps?q=${encodeURIComponent(address || name)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

    try {
      if (venueToEdit) {
        await updateVenue(venueToEdit.id, {
          name: name.trim(),
          tagline: tagline.trim() || 'Onde momentos exclusivos se transformam em memórias inesquecíveis',
          description: description.trim() || 'Espaço requintado preparado especialmente para noites inesquecíveis.',
          address: address.trim() || 'Rio de Janeiro - RJ',
          phone: phone.trim() || undefined,
          whatsappNumber: whatsappNumber.trim() || undefined,
          email: email.trim() || undefined,
          googleMapsLink: effectiveMapsLink,
          wazeLink: effectiveWazeLink,
          googleMapsEmbedUrl: effectiveEmbedUrl,
          yearsInBusiness: Number(yearsInBusiness) || 15,
          eventsCompleted: Number(eventsCompleted) || 1200,
          guestsDelighted: Number(guestsDelighted) || 80000,
          logoUrl: logoUrl.trim() || undefined,
          bannerImageUrl: effectiveBanner,
          ballroomImageUrl: effectiveBallroom,
          welcomeVideoUrl: welcomeVideoUrl.trim() || undefined,
        });
      } else {
        await addVenue({
          name: name.trim(),
          tagline: tagline.trim() || 'Onde momentos exclusivos se transformam em memórias inesquecíveis',
          description: description.trim() || 'Espaço requintado preparado especialmente para noites inesquecíveis.',
          address: address.trim() || 'Rio de Janeiro - RJ',
          phone: phone.trim() || undefined,
          whatsappNumber: whatsappNumber.trim() || undefined,
          email: email.trim() || undefined,
          googleMapsLink: effectiveMapsLink,
          wazeLink: effectiveWazeLink,
          googleMapsEmbedUrl: effectiveEmbedUrl,
          yearsInBusiness: Number(yearsInBusiness) || 15,
          eventsCompleted: Number(eventsCompleted) || 1200,
          guestsDelighted: Number(guestsDelighted) || 80000,
          logoUrl: logoUrl.trim() || undefined,
          bannerImageUrl: effectiveBanner,
          ballroomImageUrl: effectiveBallroom,
          welcomeVideoUrl: welcomeVideoUrl.trim() || undefined,
          experienceText: `Mais de ${yearsInBusiness || 15} anos realizando sonhos inesquecíveis.`,
          defaultDressCode: 'Traje Passeio Completo / Gala',
          primaryColor: '#D4AF37',
          secondaryColor: '#E8B4B8',
          accentColor: '#F59E0B',
          glowColor: 'rgba(212, 175, 55, 0.4)',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        });
      }

      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar casa de festas:', err);
      setErrorMsg(err.message || 'Falha ao salvar os dados da unidade. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--adm-bg-input, #13141f)',
    border: '1px solid var(--adm-border, rgba(255,255,255,0.12))',
    borderRadius: '10px',
    padding: '11px 14px',
    color: 'var(--adm-text-title, #FFFFFF)',
    fontSize: '0.84rem',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    transition: 'border-color 0.15s ease',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.74rem',
    color: 'var(--adm-text-title, #E2E8F0)',
    fontWeight: 700,
    marginBottom: '6px',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  };

  const sectionHeaderStyle: React.CSSProperties = {
    fontSize: '0.76rem',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--adm-accent, #D4AF37)',
    fontWeight: 800,
    marginBottom: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  return (
    <div 
      className="admin-modal-overlay" 
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div 
        style={{
          background: 'var(--adm-bg-card, #14151F)',
          borderRadius: '20px',
          border: '1px solid var(--adm-border, rgba(255,255,255,0.12))',
          width: '100%',
          maxWidth: '760px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.85)',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── 1. MODAL HEADER (Padrão de Referência AdminNewLeadModal) ─────── */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--adm-border, rgba(255,255,255,0.1))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(to right, rgba(212, 175, 55, 0.12), transparent)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, var(--adm-accent, #D4AF37), #F59E0B)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#000000',
              boxShadow: '0 4px 14px rgba(212, 175, 55, 0.4)',
              flexShrink: 0,
            }}>
              <Building2 size={24} strokeWidth={2.2} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--adm-text-title, #fff)', letterSpacing: '-0.3px' }}>
                {venueToEdit ? 'Editar Casa de Festas' : 'Nova Casa de Festas'}
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted, #94a3b8)', margin: '2px 0 0 0' }}>
                {venueToEdit 
                  ? `Atualize a identidade, fotos no Cloudflare R2 e canais de ${venueToEdit.name}` 
                  : 'Cadastre uma nova unidade física no ecossistema F5 System'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: 'var(--adm-bg-input, rgba(255,255,255,0.06))',
              border: '1px solid var(--adm-border, rgba(255,255,255,0.1))',
              color: 'var(--adm-text-muted, #94a3b8)',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── 2. MODAL FORM BODY (SCROLLABLE) ───────────────────────────────── */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '26px' }}>
          {errorMsg && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Seção 1: Identidade da Casa */}
          <div>
            <div style={sectionHeaderStyle}>
              <Sparkles size={15} />
              <span>1. Identidade & Apresentação da Casa</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={labelStyle}>
                  Nome Oficial da Casa <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Espaço Rio Lounge"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>
                  Tagline / Frase de Apresentação
                </label>
                <input
                  type="text"
                  placeholder="Ex: O local onde todo aplicativo é testado com comprometimento"
                  value={tagline}
                  onChange={e => setTagline(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>
                Descrição da Casa (Exibida no perfil e na landing page)
              </label>
              <textarea
                rows={3}
                placeholder="Conte a história, diferenciais gastronômicos, arquitetura e proposta única da unidade..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                style={{
                  ...inputStyle,
                  resize: 'vertical',
                  lineHeight: 1.5,
                }}
              />
            </div>
          </div>

          {/* Seção 2: Duas Fotos Independentes & Mídias Oficiais (Cloudflare R2) */}
          <div style={{ borderTop: '1px solid var(--adm-border, rgba(255,255,255,0.08))', paddingTop: '20px' }}>
            <div style={sectionHeaderStyle}>
              <Camera size={15} />
              <span>2. Mídias & Fotos Oficiais (Cloudflare R2)</span>
            </div>

            <div style={{
              background: 'rgba(212, 175, 55, 0.04)',
              border: '1px solid rgba(212, 175, 55, 0.2)',
              borderRadius: '12px',
              padding: '10px 14px',
              marginBottom: '16px',
              fontSize: '0.76rem',
              color: 'var(--adm-text-muted)',
              lineHeight: 1.5,
            }}>
              💡 <strong>Fotos Independentes:</strong> A foto do <strong>Banner</strong> é exibida em formato paisagem panorâmico no topo do ERP. A foto de <strong>Convites</strong> é a imagem oficial apresentada aos convidados e anfitriãs na página pública de confirmação de presença (RSVP).
            </div>

            {/* Grid 2 Fotos Principais */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <ImageUploadField
                value={bannerImageUrl}
                onChange={setBannerImageUrl}
                label="Foto Panorâmica do Banner (ERP - Unidade)"
                aspectRatio="16:9"
                folder="venues"
              />

              <ImageUploadField
                value={ballroomImageUrl}
                onChange={setBallroomImageUrl}
                label="Foto Oficial para Convites (RSVP Debutantes)"
                aspectRatio="16:9"
                folder="venues"
              />
            </div>

            {/* Logotipo e Vídeo de Indicação */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <ImageUploadField
                value={logoUrl}
                onChange={setLogoUrl}
                label="Logotipo da Casa (Fundo Transparente PNG)"
                aspectRatio="1:1"
                folder="venues"
              />

              <VideoUploadField
                value={welcomeVideoUrl}
                onChange={setWelcomeVideoUrl}
                label="Vídeo de Indicação da Unidade (Stories 9:16)"
                customKey={venueToEdit?.id ? `video_indicacao_${venueToEdit.id}.mp4` : undefined}
              />
            </div>
          </div>

          {/* Seção 3: Endereço, Localização & Mapas */}
          <div style={{ borderTop: '1px solid var(--adm-border, rgba(255,255,255,0.08))', paddingTop: '20px' }}>
            <div style={sectionHeaderStyle}>
              <MapPin size={15} />
              <span>3. Endereço & Localização</span>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>
                Endereço Completo
              </label>
              <input
                type="text"
                placeholder="Ex: Av. das Américas, 1500 - Barra da Tijuca, Rio de Janeiro - RJ"
                value={address}
                onChange={e => setAddress(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Link do Google Maps</label>
                <input
                  type="url"
                  placeholder="https://maps.google.com/..."
                  value={googleMapsLink}
                  onChange={e => setGoogleMapsLink(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Link do Waze</label>
                <input
                  type="url"
                  placeholder="https://waze.com/ul/..."
                  value={wazeLink}
                  onChange={e => setWazeLink(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>URL Embed do Google Maps (iFrame)</label>
                <input
                  type="url"
                  placeholder="https://maps.google.com/maps?..."
                  value={googleMapsEmbedUrl}
                  onChange={e => setGoogleMapsEmbedUrl(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* Seção 4: Canais de Atendimento & Contatos Oficiais */}
          <div style={{ borderTop: '1px solid var(--adm-border, rgba(255,255,255,0.08))', paddingTop: '20px' }}>
            <div style={sectionHeaderStyle}>
              <Phone size={15} />
              <span>4. Canais Comerciais & Atendimento Oficial</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <div>
                <label style={labelStyle}>WhatsApp Comercial Oficial</label>
                <input
                  type="tel"
                  placeholder="(21) 99999-9999"
                  value={whatsappNumber}
                  onChange={e => setWhatsappNumber(maskPhoneInput(e.target.value))}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Telefone Recepção / Fixo</label>
                <input
                  type="tel"
                  placeholder="(21) 3456-7890"
                  value={phone}
                  onChange={e => setPhone(maskPhoneInput(e.target.value))}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>E-mail Comercial Oficial</label>
                <input
                  type="email"
                  placeholder="contato@casadefestas.com.br"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* Seção 5: Métricas de Autoridade */}
          <div style={{ borderTop: '1px solid var(--adm-border, rgba(255,255,255,0.08))', paddingTop: '20px' }}>
            <div style={sectionHeaderStyle}>
              <Award size={15} />
              <span>5. Números de Autoridade da Unidade</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Anos de Tradição</label>
                <input
                  type="number"
                  min={0}
                  value={yearsInBusiness}
                  onChange={e => setYearsInBusiness(parseInt(e.target.value) || 0)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Eventos Realizados</label>
                <input
                  type="number"
                  min={0}
                  value={eventsCompleted}
                  onChange={e => setEventsCompleted(parseInt(e.target.value) || 0)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Convidados Atendidos</label>
                <input
                  type="number"
                  min={0}
                  value={guestsDelighted}
                  onChange={e => setGuestsDelighted(parseInt(e.target.value) || 0)}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>
        </form>

        {/* ── 3. MODAL FOOTER (Padrão de Referência AdminNewLeadModal) ─────── */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--adm-border, rgba(255,255,255,0.1))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '12px',
          background: 'var(--adm-bg-card, #14151F)',
        }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              background: 'transparent',
              border: '1px solid var(--adm-border, rgba(255,255,255,0.15))',
              color: 'var(--adm-text-title, #fff)',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s ease',
            }}
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="adm-btn-primary"
            style={{
              padding: '10px 22px',
              borderRadius: '10px',
              fontSize: '0.84rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Salvando Dados...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>{venueToEdit ? 'Salvar Alterações' : 'Criar Casa de Festas'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
