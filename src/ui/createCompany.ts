import { LOGO_ICONS } from '../data/logos';
import { getCity, nearestCity } from '../sim/catalog';
import { LIVERY_STYLES, validateCompanyInput, type CompanyInput, type CompanyInputError } from '../sim/newGame';
import type { Catalog, CityId, Company, Difficulty, LiveryStyle, LogoIconId, LogoRef } from '../sim/types';
import { busSvg, liveryThumb } from './busSvg';
import { h } from './dom';
import { formatPeople } from './format';
import { fileToLogoDataUrl, type UploadError } from './logoUpload';
import { logoView } from './logoView';
import { applyTheme, DEFAULT_PRIMARY, DEFAULT_SECONDARY } from './theme';

export interface CreateProps { catalog: Catalog; mode: 'create' | 'edit'; initial?: Company; onSubmit(input: CompanyInput): void; onCancel(): void; }

const FIELD_ERRORS: Record<CompanyInputError, string> = {
  nome: 'Dê um nome à sua viação (até 30 letras).',
  sede: 'Escolha a cidade-sede.',
  cor: 'Escolha as duas cores.',
  logo: 'Escolha um ícone ou envie uma imagem.',
  pintura: 'Escolha uma pintura.',
};
const UPLOAD_ERRORS: Record<UploadError, string> = {
  tipo: 'Use uma imagem PNG, JPG ou WebP.',
  tamanho: 'A imagem precisa ter até 5 MB.',
  leitura: 'Não foi possível ler essa imagem.',
};
const DIFFICULTY: Record<Difficulty, string> = { facil: 'Começo fácil', medio: 'Começo médio', dificil: 'Começo difícil' };
const LIVERY_LABELS: Record<LiveryStyle, string> = { plain: 'Lisa', stripe: 'Faixa reta', diagonal: 'Faixa diagonal', wave: 'Onda' };

/** Criação (e edição) da viação: formulário com prévia ao vivo do ônibus pintado. */
export function renderCreateCompany(p: CreateProps): HTMLElement {
  const init = p.initial;
  const state = {
    name: init?.name ?? '',
    hq: (init?.hqCityId ?? null) as CityId | null,
    primary: init?.primaryColor ?? DEFAULT_PRIMARY,
    secondary: init?.secondaryColor ?? DEFAULT_SECONDARY,
    logo: (init ? structuredClone(init.logo) : { kind: 'icon', iconId: 'bus' }) as LogoRef,
    livery: (init?.defaultLivery ?? 'diagonal') as LiveryStyle,
  };

  // ----- prévia -----
  const previewBus = h('div', { class: 'preview-bus' });
  const previewLogo = h('span', { class: 'preview-logo' });
  const previewName = h('span', { class: 'preview-name' });
  const preview = h('section', { class: 'card create-preview', dataset: { preview: '' }, 'aria-label': 'Prévia' },
    previewBus,
    h('div', { class: 'preview-id' }, previewLogo, previewName),
  );

  function refreshPreview() {
    previewBus.replaceChildren(busSvg({ shape: 'conv', primary: state.primary, secondary: state.secondary, livery: state.livery, logo: state.logo }));
    previewLogo.replaceChildren(logoView(state.logo, { primary: state.primary, secondary: state.secondary }, 36));
    previewName.textContent = state.name.trim() || 'Sua viação';
    previewName.classList.toggle('is-empty', state.name.trim() === '');
    applyTheme(document.documentElement, { primaryColor: state.primary, secondaryColor: state.secondary });
    refreshLiveryThumbs();
  }

  // ----- campos -----
  const errorSlots = new Map<CompanyInputError, HTMLElement>();
  const errorSlot = (key: CompanyInputError) => {
    const el = h('p', { class: 'field-error', role: 'alert', hidden: true });
    errorSlots.set(key, el);
    return el;
  };
  const setPressed = (group: HTMLElement, attr: string, value: string | null) => {
    for (const btn of group.querySelectorAll<HTMLElement>(`[${attr}]`)) btn.setAttribute('aria-pressed', String(btn.getAttribute(attr) === value));
  };

  const nameInput = h('input', {
    class: 'text-input', name: 'name', id: 'company-name', type: 'text', maxlength: '30', autocomplete: 'off',
    placeholder: 'Expresso Catarina', value: state.name,
    onInput: () => { state.name = nameInput.value; refreshPreview(); },
  });

  const cityGrid = h('div', { class: 'choice-grid city-grid' },
    ...p.catalog.cities.map((city) => {
      const other = getCity(p.catalog, nearestCity(p.catalog, city.id));
      return h('button', {
        type: 'button', class: 'choice city-card', dataset: { city: city.id }, 'aria-pressed': 'false',
        onClick: () => { state.hq = city.id; setPressed(cityGrid, 'data-city', city.id); },
      },
        h('span', { class: 'city-top' },
          h('span', { class: 'city-name' }, city.name),
          h('span', { class: `badge badge-${city.difficulty}` }, DIFFICULTY[city.difficulty]),
        ),
        h('span', { class: 'muted small' }, formatPeople(city.population)),
        h('span', { class: 'small' }, `Linha inicial: ${city.name} ⇄ ${other?.name ?? '—'}`),
      );
    }),
  );

  const colorInput = (name: 'primary' | 'secondary', label: string) => {
    const input = h('input', {
      type: 'color', name, class: 'color-input', value: state[name], 'aria-label': label,
      onInput: () => { state[name] = input.value; refreshPreview(); },
    });
    return h('label', { class: 'color-field' }, input, h('span', null, label));
  };

  const uploadError = h('p', { class: 'field-error', role: 'alert', hidden: true });
  const fileInput = h('input', {
    type: 'file', accept: 'image/png,image/jpeg,image/webp', hidden: true, tabindex: '-1',
    onChange: async () => {
      const file = fileInput.files?.[0];
      fileInput.value = '';
      if (!file) return;
      const result = await fileToLogoDataUrl(file);
      if (!result.ok) { uploadError.textContent = UPLOAD_ERRORS[result.error]; uploadError.hidden = false; return; }
      uploadError.hidden = true;
      state.logo = { kind: 'image', dataUrl: result.dataUrl };
      setPressed(iconGrid, 'data-icon', null);
      uploadButton.setAttribute('aria-pressed', 'true');
      refreshPreview();
    },
  });
  const iconGrid = h('div', { class: 'choice-grid icon-grid' },
    ...(Object.keys(LOGO_ICONS) as LogoIconId[]).map((id) => h('button', {
      type: 'button', class: 'choice icon-choice', dataset: { icon: id }, 'aria-pressed': 'false', 'aria-label': LOGO_ICONS[id].label, title: LOGO_ICONS[id].label,
      onClick: () => {
        state.logo = { kind: 'icon', iconId: id };
        setPressed(iconGrid, 'data-icon', id);
        uploadButton.setAttribute('aria-pressed', 'false');
        refreshPreview();
      },
    }, logoView({ kind: 'icon', iconId: id }, { primary: 'transparent', secondary: 'currentColor' }, 40))),
  );
  const uploadButton = h('button', { type: 'button', class: 'choice upload-choice', 'aria-pressed': 'false', onClick: () => fileInput.click() }, 'Enviar minha logo');

  const liveryGrid = h('div', { class: 'choice-grid livery-grid' },
    ...LIVERY_STYLES.map((style) => h('button', {
      type: 'button', class: 'choice livery-choice', dataset: { livery: style }, 'aria-pressed': 'false', 'aria-label': LIVERY_LABELS[style],
      onClick: () => { state.livery = style; setPressed(liveryGrid, 'data-livery', style); refreshPreview(); },
    })),
  );
  function refreshLiveryThumbs() {
    for (const btn of liveryGrid.querySelectorAll<HTMLElement>('[data-livery]')) {
      const style = btn.dataset.livery as LiveryStyle;
      btn.replaceChildren(liveryThumb(style, state.primary, state.secondary), h('span', { class: 'small' }, LIVERY_LABELS[style]));
    }
  }

  const field = (label: string, labelFor: string | null, ...children: (Node | null)[]) =>
    h('div', { class: 'field' }, labelFor ? h('label', { class: 'field-label', for: labelFor }, label) : h('p', { class: 'field-label' }, label), ...children);

  const isCreate = p.mode === 'create';
  const form = h('form', { class: 'card create-form', novalidate: true, onSubmit: (e: Event) => { e.preventDefault(); submit(); } },
    h('h1', { class: 'title' }, isCreate ? 'Crie sua viação' : 'Editar viação'),
    field('Nome da viação', 'company-name', nameInput, errorSlot('nome')),
    isCreate ? field('Cidade-sede', null, cityGrid, errorSlot('sede')) : null,
    field('Cores', null, h('div', { class: 'color-row' }, colorInput('primary', 'Cor primária'), colorInput('secondary', 'Cor secundária')), errorSlot('cor')),
    field('Logo', null, iconGrid, uploadButton, fileInput, uploadError, errorSlot('logo')),
    field('Pintura padrão', null, liveryGrid, errorSlot('pintura')),
  );

  const actions = h('div', { class: 'create-actions' },
    h('button', { type: 'button', class: 'btn btn-light', onClick: p.onCancel }, 'Voltar'),
    h('button', { type: 'button', class: 'btn btn-primary', dataset: { action: 'submit' }, onClick: () => submit() }, isCreate ? 'Começar' : 'Salvar'),
  );

  function submit() {
    const input: CompanyInput = {
      name: state.name,
      hqCityId: isCreate ? state.hq ?? '' : init?.hqCityId ?? '',
      primaryColor: state.primary,
      secondaryColor: state.secondary,
      logo: state.logo,
      defaultLivery: state.livery,
    };
    const errors = validateCompanyInput(input, p.catalog);
    for (const [key, slot] of errorSlots) {
      const has = errors.includes(key);
      slot.hidden = !has;
      slot.textContent = has ? FIELD_ERRORS[key] : '';
    }
    if (errors.length > 0) {
      errorSlots.get(errors[0]!)?.closest('.field')?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      return;
    }
    p.onSubmit(input);
  }

  if (state.hq) setPressed(cityGrid, 'data-city', state.hq);
  if (state.logo.kind === 'icon') setPressed(iconGrid, 'data-icon', state.logo.iconId);
  else uploadButton.setAttribute('aria-pressed', 'true');
  setPressed(liveryGrid, 'data-livery', state.livery);
  refreshPreview();

  return h('div', { class: 'create-page' },
    h('div', { class: 'create-layout' }, preview, form),
    actions,
  );
}
