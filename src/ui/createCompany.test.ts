// @vitest-environment jsdom
import { expect, test } from 'vitest';
import type { CompanyInput } from '../sim/newGame';
import { testCatalog, testCompany } from '../sim/testkit';
import { renderCreateCompany, type CreateProps } from './createCompany';

const mount = (over: Partial<CreateProps> = {}) => {
  const submitted: CompanyInput[] = [];
  const el = renderCreateCompany({ catalog: testCatalog, mode: 'create', onSubmit: i => submitted.push(i), onCancel() {}, ...over });
  document.body.replaceChildren(el);
  const type = (sel: string, value: string) => { const i = el.querySelector<HTMLInputElement>(sel)!; i.value = value; i.dispatchEvent(new Event('input', { bubbles: true })); };
  const click = (sel: string) => el.querySelector<HTMLElement>(sel)!.click();
  return { el, submitted, type, click };
};
test('enviar vazio mostra os erros e não cria nada', () => {
  const { el, submitted, click } = mount();
  click('[data-action="submit"]');
  expect(submitted).toHaveLength(0);
  expect(el.textContent).toContain('Dê um nome à sua viação');
  expect(el.textContent).toContain('Escolha a cidade-sede.');
});
test('preenchido, envia a empresa completa', () => {
  const { submitted, type, click } = mount();
  type('[name="name"]', '  Expresso Catarina ');
  click('[data-city="gama"]');
  type('[name="primary"]', '#0055aa');
  click('[data-icon="pine"]');
  click('[data-livery="wave"]');
  click('[data-action="submit"]');
  expect(submitted).toEqual([{ name: '  Expresso Catarina ', hqCityId: 'gama', primaryColor: '#0055aa', secondaryColor: '#ffffff', logo: { kind: 'icon', iconId: 'pine' }, defaultLivery: 'wave' }]);
});
test('a prévia acompanha a cor e a pintura', () => {
  const { el, type, click } = mount();
  type('[name="primary"]', '#0055aa'); click('[data-livery="plain"]');
  const preview = el.querySelector('[data-preview] svg')!;
  expect(preview.querySelector('[data-region="body"]')!.getAttribute('fill')).toBe('#0055aa');
  expect(preview.querySelector('[data-region="stripe"]')).toBeNull();
});
test('cada cidade mostra dificuldade e linha inicial', () => {
  const card = mount().el.querySelector('[data-city="gama"]')!;
  expect(card.textContent).toContain('gama ⇄ beta'.replace('gama', testCatalog.cities.find(c => c.id === 'gama')!.name).replace('beta', testCatalog.cities.find(c => c.id === 'beta')!.name));
});
test('no modo edição a sede não aparece e os valores vêm preenchidos', () => {
  const { el, submitted, click } = mount({ mode: 'edit', initial: testCompany });
  expect(el.querySelector('[data-city]')).toBeNull();
  click('[data-action="submit"]');
  expect(submitted[0]).toEqual(testCompany);
});
test('a escolha fica marcada para quem usa leitor de tela', () => {
  const { el, click } = mount();
  click('[data-city="beta"]');
  expect(el.querySelector('[data-city="beta"]')!.getAttribute('aria-pressed')).toBe('true');
  expect(el.querySelector('[data-city="alfa"]')!.getAttribute('aria-pressed')).toBe('false');
});
