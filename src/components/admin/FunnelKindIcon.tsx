import React from 'react';
import { HeartHandshake, Target } from 'lucide-react';

/** Funil de pos-venda? (flag, categoria ou o funil padrao de pos-venda) */
export const isPostSaleFunnel = (f?: { id?: string; isPostSale?: boolean; category?: string } | null): boolean =>
  Boolean(f && (f.isPostSale || f.category === 'Pós-Venda' || f.category === 'pos_venda' || f.id === 'post_sale_default'));

/** Icone do tipo de funil: alvo para Comercial, aperto de maos com coracao para Pos-venda (relacionamento). */
export const FunnelKindIcon: React.FC<{ postSale: boolean; size?: number; color?: string }> = ({ postSale, size = 14, color }) =>
  postSale ? <HeartHandshake size={size} color={color} /> : <Target size={size} color={color} />;
