import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTab?: string;
  onResetTab?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AdminErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AdminErrorBoundary capturou um erro não tratado:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.setItem('bonomo_admin_active_tab', 'home');
    } catch {}
    if (this.props.onResetTab) {
      this.props.onResetTab();
    }
    this.setState({ hasError: false, error: null });
  };

  private handleReload = () => {
    try {
      localStorage.setItem('bonomo_admin_active_tab', 'home');
    } catch {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            height: '100%',
            width: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px',
            boxSizing: 'border-box',
            fontFamily: "'Poppins', sans-serif",
            background: 'var(--adm-bg-app)',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              maxWidth: '420px',
              textAlign: 'center',
              background: 'var(--adm-bg-card)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '20px',
              padding: '36px 28px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
            }}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '18px',
              }}
            >
              <AlertTriangle size={26} color="#EF4444" />
            </div>

            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#FFFFFF', margin: '0 0 8px 0' }}>
              Instabilidade temporária no módulo
            </h3>

            <p style={{ fontSize: '0.8rem', color: '#94A3B8', margin: '0 0 16px 0', lineHeight: 1.5 }}>
              O sistema protegeu sua sessão para evitar tela preta. Clique abaixo para retornar à página inicial com segurança.
            </p>

            {this.state.error && (
              <div style={{
                width: '100%',
                maxHeight: '140px',
                overflowY: 'auto',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: '8px',
                padding: '10px',
                marginBottom: '20px',
                fontSize: '0.72rem',
                color: '#EF4444',
                textAlign: 'left',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                <strong>Erro capturado:</strong>
                <br />
                {this.state.error.message || String(this.state.error)}
                {this.state.error.stack && (
                  <div style={{ marginTop: '6px', opacity: 0.75, fontSize: '0.66rem' }}>
                    {this.state.error.stack.split('\n').slice(0, 5).join('\n')}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #14A9D7 0%, #0284C7 100%)',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <RotateCcw size={15} />
                <span>Ir para Início</span>
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#E2E8F0',
                  fontSize: '0.82rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Recarregar
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
