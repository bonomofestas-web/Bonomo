import React, { useState, useEffect, useRef } from 'react';
import { 
  X, QrCode, Key, RefreshCw, CheckCircle2, Smartphone, 
  Copy, Check, Building2, AlertTriangle, ShieldCheck, History 
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { uazapiService } from '../../services/uazapiService';
import { formatPhone } from '../../utils/phoneFormatter';
import type { Source } from '../../types/sources';

interface AdminWhatsAppConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  source: Source | null;
  onConnected?: () => void;
  onOpenHistoryTriage?: () => void;
}

export const AdminWhatsAppConnectModal: React.FC<AdminWhatsAppConnectModalProps> = ({
  isOpen,
  onClose,
  source,
  onConnected,
  onOpenHistoryTriage,
}) => {
  const { venues, updateSource } = useAdminState();

  const [connectionMode, setConnectionMode] = useState<'qrcode' | 'pairing_code'>('qrcode');
  const [pairingPhone, setPairingPhone] = useState('');
  const [pairingCodeData, setPairingCodeData] = useState<string | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [copiedPairingCode, setCopiedPairingCode] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [connectedPhone, setConnectedPhone] = useState<string>('');
  const [connectedProfileName, setConnectedProfileName] = useState<string>('');
  const [connectedAvatar, setConnectedAvatar] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState('');

  const pollIntervalRef = useRef<any>(null);

  const venue = venues.find(v => v.id === source?.venueId);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (isOpen && source) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      setQrCodeData(null);
      setPairingCodeData(null);
      setErrorMsg('');

      const config = (source.configuration as any) || {};
      const existingPhone = config.connectedPhone || '';
      const existingAvatar = config.connectedAvatar || '';
      const existingName = config.connectedProfileName || '';

      if (existingPhone || source.whatsappInstanceId) {
        setConnectedPhone(existingPhone);
        setConnectedAvatar(existingAvatar);
        setConnectedProfileName(existingName);
        setConnectionStatus(existingPhone ? 'connected' : 'disconnected');
      } else {
        setConnectionStatus('disconnected');
        setConnectedPhone('');
        setConnectedAvatar('');
        setConnectedProfileName('');
      }

      // Auto-inicia conexão via QR code ao abrir o modal
      handleStartConnection('qrcode', source);
    }
  }, [isOpen, source?.id]);

  const handleStartConnection = async (mode: 'qrcode' | 'pairing_code', targetSource?: Source | null) => {
    const src = targetSource || source;
    if (!src) return;

    if (mode === 'pairing_code') {
      const cleanPhone = pairingPhone.replace(/\D/g, '');
      if (!cleanPhone || cleanPhone.length < 10) {
        setErrorMsg('Informe o número de telefone com DDD para gerar o código de pareamento.');
        return;
      }
    }

    setIsConnecting(true);
    setErrorMsg('');
    setPairingCodeData(null);
    setQrCodeData(null);

    try {
      let token = src.whatsappInstanceId?.trim();

      // Resolve ou cria token da instância no servidor UAZAPI
      if (!token) {
        const resolved = await uazapiService.getOrCreateInstance(src.name);
        token = resolved.token;
      }

      let cleanPhone = '';
      if (mode === 'pairing_code') {
        let rawPhone = pairingPhone.replace(/\D/g, '');
        if (rawPhone.length === 10 || rawPhone.length === 11) {
          rawPhone = `55${rawPhone}`;
        }
        cleanPhone = rawPhone;
      }

      const connectRes = await uazapiService.connectInstance(token, {
        phone: cleanPhone || undefined,
        browser: 'auto',
        systemName: (src.configuration as any)?.whatsappDisplayName || src.name || 'F5 System',
      });

      if (connectRes.status === 'connected' || connectRes.loggedIn) {
        const ownerPhone = connectRes.instance?.owner || '';
        const profileName = connectRes.instance?.profileName || '';
        const profilePic = connectRes.instance?.profilePicUrl || '';

        setConnectionStatus('connected');
        setConnectedPhone(ownerPhone);
        setConnectedProfileName(profileName);
        setConnectedAvatar(profilePic);

        await updateSource(src.id, {
          whatsappInstanceId: token,
          status: 'active',
          configuration: {
            ...((src.configuration as any) || {}),
            connectedPhone: ownerPhone,
            connectedProfileName: profileName,
            connectedAvatar: profilePic,
            isConnected: true,
            connectionStatus: 'connected',
          },
        });

        // Mantém o modal aberto para o usuário ver o status e gerenciar a fonte
        return;
      }

      if (connectRes.pairingCode) {
        setPairingCodeData(connectRes.pairingCode);
        setConnectionStatus('connecting');
      } else if (connectRes.qrcode) {
        setQrCodeData(connectRes.qrcode);
        setConnectionStatus('connecting');
      } else {
        setConnectionStatus('connecting');
      }

      // Polling de 2s para verificar quando o usuário escanear
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = setInterval(async () => {
        try {
          const statusRes = await uazapiService.getInstanceStatus(token);
          if (statusRes.status === 'connected' || statusRes.loggedIn) {
            clearInterval(pollIntervalRef.current);
            const ownerPhone = statusRes.phone || '';
            const profileName = statusRes.profileName || '';
            const profilePic = statusRes.profilePictureUrl || '';

            setConnectionStatus('connected');
            setQrCodeData(null);
            setPairingCodeData(null);
            setConnectedPhone(ownerPhone);
            setConnectedProfileName(profileName);
            setConnectedAvatar(profilePic);

            await updateSource(src.id, {
              whatsappInstanceId: token,
              status: 'active',
              configuration: {
                ...((src.configuration as any) || {}),
                connectedPhone: ownerPhone,
                connectedProfileName: profileName,
                connectedAvatar: profilePic,
                isConnected: true,
                connectionStatus: 'connected',
              },
            });

            if (onConnected) onConnected();
          }
        } catch {
          // Ignora falhas transitórias
        }
      }, 2000);

    } catch (err: any) {
      console.warn('Conexão UAZAPI:', err);
      setErrorMsg(err.message || 'Falha ao conectar com o WhatsApp. Verifique sua conexão.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleCopyPairingCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedPairingCode(true);
    setTimeout(() => setCopiedPairingCode(false), 2000);
  };

  const handleDisconnect = async () => {
    if (!source) return;
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    if (source.whatsappInstanceId) {
      await uazapiService.disconnectInstance(source.whatsappInstanceId).catch(() => {});
    }

    setConnectionStatus('disconnected');
    setQrCodeData(null);
    setPairingCodeData(null);
    setConnectedPhone('');
    setConnectedProfileName('');
    setConnectedAvatar('');

    await updateSource(source.id, {
      whatsappInstanceId: undefined,
      status: 'inactive',
      configuration: {
        ...((source.configuration as any) || {}),
        connectedPhone: '',
        connectedProfileName: '',
        connectedAvatar: '',
        isConnected: false,
        connectionStatus: 'disconnected',
      },
    });

    if (onConnected) onConnected();
  };

  if (!isOpen || !source) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '20px',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <div style={{
        background: 'var(--adm-bg-card)',
        border: '1px solid var(--adm-border)',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '540px',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}>
        {/* Header */}
        <div style={{
          padding: '22px 24px 18px 24px',
          borderBottom: '1px solid var(--adm-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Smartphone size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--adm-text-title)', margin: 0, letterSpacing: '-0.3px' }}>
                Conectar WhatsApp
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
                <span>{source.name}</span>
                {venue && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: 'var(--adm-accent)' }}>
                    • <Building2 size={11} /> {venue.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--adm-text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {errorMsg && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid #EF4444',
              color: '#EF4444',
              fontSize: '0.80rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <AlertTriangle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Estado: CONECTADO */}
          {connectionStatus === 'connected' ? (
            <div style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1.5px solid #10B981',
              borderRadius: '18px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '16px',
            }}>
              {connectedAvatar ? (
                <img
                  src={connectedAvatar}
                  alt="Avatar WhatsApp"
                  style={{ width: '68px', height: '68px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #10B981' }}
                />
              ) : (
                <div style={{ width: '68px', height: '68px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={36} />
                </div>
              )}

              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '8px', background: '#10B981', color: '#FFF', fontSize: '0.72rem', fontWeight: 800, marginBottom: '6px' }}>
                  <CheckCircle2 size={13} /> Conexão Ativa & Online
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--adm-text-title)', margin: 0 }}>
                  {connectedProfileName || source.name}
                </h3>
                <div style={{ fontSize: '0.88rem', color: '#10B981', fontWeight: 800, marginTop: '4px' }}>
                  📱 {formatPhone(connectedPhone) || 'Número Oficial Conectado'}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginTop: '6px' }}>
                {onOpenHistoryTriage && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenHistoryTriage();
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      borderRadius: '10px',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      background: 'rgba(16, 185, 129, 0.1)',
                      color: '#10B981',
                      fontSize: '0.80rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <History size={15} />
                    <span>Sincronizar Histórico Anterior (Triagem Pré-CRM)</span>
                  </button>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      borderRadius: '10px',
                      border: '1px solid rgba(239, 68, 68, 0.35)',
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: '#EF4444',
                      fontSize: '0.80rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    Desconectar Aparelho
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="adm-btn-primary"
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      borderRadius: '10px',
                      fontSize: '0.80rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      background: '#10B981',
                      color: '#FFF',
                      border: 'none',
                    }}
                  >
                    Concluir
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Estado: DESCONECTADO (QR Code ou Pairing Code) */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Seletor de Modo */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setConnectionMode('qrcode');
                    setPairingCodeData(null);
                    handleStartConnection('qrcode');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: connectionMode === 'qrcode' ? '2px solid #10B981' : '1px solid var(--adm-border)',
                    background: connectionMode === 'qrcode' ? 'rgba(16, 185, 129, 0.12)' : 'var(--adm-bg-input)',
                    color: connectionMode === 'qrcode' ? '#10B981' : 'var(--adm-text-body)',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <QrCode size={15} />
                  <span>Escanear QR Code</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setConnectionMode('pairing_code');
                    setQrCodeData(null);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: connectionMode === 'pairing_code' ? '2px solid #10B981' : '1px solid var(--adm-border)',
                    background: connectionMode === 'pairing_code' ? 'rgba(16, 185, 129, 0.12)' : 'var(--adm-bg-input)',
                    color: connectionMode === 'pairing_code' ? '#10B981' : 'var(--adm-text-body)',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Key size={15} />
                  <span>Código de Pareamento</span>
                </button>
              </div>

              {/* MODO 1: QR CODE */}
              {connectionMode === 'qrcode' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', textAlign: 'center' }}>
                  {qrCodeData ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
                      <div style={{
                        padding: '16px',
                        borderRadius: '16px',
                        background: '#FFFFFF',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
                      }}>
                        <img
                          src={qrCodeData.startsWith('data:') || qrCodeData.startsWith('http') ? qrCodeData : `data:image/png;base64,${qrCodeData}`}
                          alt="WhatsApp QR Code"
                          style={{ width: '220px', height: '220px', display: 'block' }}
                        />
                      </div>

                      <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
                        Abra o WhatsApp &gt; Aparelhos conectados &gt; Conectar um aparelho
                      </div>

                      <div style={{ fontSize: '0.74rem', color: '#10B981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <RefreshCw size={13} className="spin" />
                        <span>Aguardando leitura da câmera...</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleStartConnection('qrcode')}
                        disabled={isConnecting}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--adm-text-muted)',
                          fontSize: '0.74rem',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                        }}
                      >
                        Atualizar QR Code
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '20px 0' }}>
                      <RefreshCw size={32} color="#10B981" className="spin" />
                      <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                        Gerando QR Code de Conexão...
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}>
                        Aguarde alguns instantes enquanto contatamos o servidor.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* MODO 2: PAIRING CODE */}
              {connectionMode === 'pairing_code' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', textAlign: 'center' }}>
                  {pairingCodeData ? (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '14px',
                      background: 'var(--adm-bg-input)',
                      border: '1.5px solid rgba(16, 185, 129, 0.35)',
                      borderRadius: '16px',
                      padding: '20px 28px',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}>
                      <div style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase' }}>
                        Código de Pareamento (8 dígitos)
                      </div>

                      <div style={{
                        fontSize: '2.2rem',
                        fontWeight: 900,
                        letterSpacing: '5px',
                        fontFamily: "'Courier New', Courier, monospace",
                        color: '#10B981',
                        background: 'rgba(16, 185, 129, 0.12)',
                        padding: '10px 24px',
                        borderRadius: '12px',
                        border: '2px dashed #10B981',
                      }}>
                        {pairingCodeData}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyPairingCode(pairingCodeData)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '7px 16px',
                          borderRadius: '8px',
                          border: '1px solid var(--adm-border)',
                          background: copiedPairingCode ? '#10B981' : 'var(--adm-bg-card)',
                          color: copiedPairingCode ? '#FFF' : 'var(--adm-text-body)',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {copiedPairingCode ? <Check size={14} /> : <Copy size={14} />}
                        <span>{copiedPairingCode ? 'Copiado!' : 'Copiar Código'}</span>
                      </button>

                      <div style={{ fontSize: '0.74rem', color: '#10B981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <RefreshCw size={12} className="spin" />
                        <span>No WhatsApp: Aparelhos conectados &gt; Conectar com número de telefone.</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '340px' }}>
                      <label style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--adm-text-title)', textAlign: 'left' }}>
                        Número do WhatsApp com DDD:
                      </label>
                      <input
                        type="text"
                        value={pairingPhone}
                        onChange={(e) => setPairingPhone(e.target.value)}
                        placeholder="Ex: (21) 98845-9201"
                        className="adm-input"
                        style={{ height: '42px', borderRadius: '10px', fontSize: '0.84rem', textAlign: 'center', fontWeight: 700 }}
                      />
                      <button
                        type="button"
                        onClick={() => handleStartConnection('pairing_code')}
                        disabled={isConnecting || !pairingPhone.trim()}
                        className="adm-btn-primary"
                        style={{
                          height: '42px',
                          borderRadius: '10px',
                          fontSize: '0.82rem',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          background: '#10B981',
                          color: '#FFF',
                          border: 'none',
                          cursor: isConnecting || !pairingPhone.trim() ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {isConnecting ? <RefreshCw size={15} className="spin" /> : <Key size={15} />}
                        <span>{isConnecting ? 'Gerando Código...' : 'Gerar Código de Pareamento'}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
