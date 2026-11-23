// Fonte unica de cor e rotulo para Visita e Degustacao.
// Antes cada tela usava uma cor (visita azul ou verde, degustacao dourada ou laranja).

export type AppointmentKind = 'visit' | 'tasting';

export interface AppointmentTheme {
  kind: AppointmentKind;
  /** Nome curto: "Visita" / "Degustação". */
  label: string;
  /** Nome completo para titulos: "Visita Comercial" / "Degustação Gastronômica". */
  fullLabel: string;
  /** Cor principal (icone, borda, destaque). */
  color: string;
  /** Fundo suave (chips, cards). */
  soft: string;
  /** Borda suave. */
  border: string;
  /** Texto sobre o fundo suave (contraste AA em fundo claro). */
  text: string;
}

export const APPOINTMENT_THEMES: Record<AppointmentKind, AppointmentTheme> = {
  visit: {
    kind: 'visit',
    label: 'Visita',
    fullLabel: 'Visita Comercial',
    color: '#0EA5E9',
    soft: 'rgba(14, 165, 233, 0.10)',
    border: 'rgba(14, 165, 233, 0.35)',
    text: '#0369A1',
  },
  tasting: {
    kind: 'tasting',
    label: 'Degustação',
    fullLabel: 'Degustação Gastronômica',
    color: '#D97706',
    soft: 'rgba(217, 119, 6, 0.10)',
    border: 'rgba(217, 119, 6, 0.35)',
    text: '#B45309',
  },
};

export const getAppointmentTheme = (kind?: string | null): AppointmentTheme =>
  kind === 'tasting' || kind === 'degustacao' ? APPOINTMENT_THEMES.tasting : APPOINTMENT_THEMES.visit;
