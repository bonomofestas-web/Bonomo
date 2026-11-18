import autoAnimate from '@formkit/auto-animate';

const registered = new WeakSet<HTMLElement>();

/**
 * Ref callback: anima entrada, saida e reordenacao dos filhos diretos do elemento.
 * Seguro para usar em ref inline (nao registra o mesmo elemento duas vezes).
 * Respeita prefers-reduced-motion (comportamento nativo do auto-animate).
 */
export const animateList = (el: HTMLElement | null) => {
  if (!el || registered.has(el)) return;
  registered.add(el);
  autoAnimate(el, { duration: 160, easing: 'ease-out' });
};
