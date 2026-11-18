import { expect, test, type Page } from '@playwright/test';

/** Nenhuma tela pode ter rolagem horizontal (360 px para cima). */
async function expectNoHorizontalScroll(page: Page, where: string) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, `rolagem horizontal em: ${where}`).toBeLessThanOrEqual(0);
}

test('criar uma viação, seguir o tutorial, ganhar dinheiro e continuar depois de recarregar', async ({ page, isMobile }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.goto('/');
  await expect(page.getByRole('button', { name: /^Continuar/ })).toHaveCount(0);
  await expectNoHorizontalScroll(page, 'tela inicial');
  await page.getByRole('button', { name: 'Começar uma viação' }).click();

  await page.locator('[name="name"]').fill('Expresso Teste');
  await page.locator('[data-city="ibirama"]').click();
  await page.locator('[data-livery="wave"]').click();
  await expectNoHorizontalScroll(page, 'criação');
  await page.locator('[data-action="submit"]').click();

  // começo sem ônibus: R$ 35.000 em caixa e o tutorial no passo 1
  const cash = page.locator('[data-live="cash"]');
  const tutorial = page.locator('.tutorial-card');
  await expect(page.locator('.top-name')).toHaveText('Expresso Teste');
  await expect(page.locator('.leaflet-container')).toBeVisible();
  await expect(cash).toHaveText('R$ 35.000');
  await expect(tutorial).toContainText('Passo 1 de 3');
  await expectNoHorizontalScroll(page, 'mapa com o tutorial');

  // passo 1: Loja → comprar o micro usado
  await tutorial.getByRole('button', { name: 'Abrir a Loja' }).click();
  await expect(page.locator('[data-model]')).toHaveCount(3);
  await expectNoHorizontalScroll(page, 'loja');
  await page.locator('[data-model="micro"] [data-action="buy"]').click();
  await page.locator('.dialog-panel [data-action="confirm"]').click();
  await expect(cash).toHaveText('R$ 15.000');
  await expect(tutorial).toContainText('Passo 2 de 3');

  // passo 2: Garagem → manter a pintura
  await tutorial.getByRole('button', { name: 'Abrir a Garagem' }).click();
  await expect(page.locator('[data-bus] .bus-card-art svg')).toHaveCount(1);
  await expectNoHorizontalScroll(page, 'garagem');
  await tutorial.getByRole('button', { name: 'Manter esta pintura' }).click();
  await expect(tutorial).toContainText('Passo 3 de 3');

  // passo 3: Nova linha com o ônibus, sem taxa
  await tutorial.getByRole('button', { name: 'Nova linha' }).click();
  const route = page.locator('[data-route="blumenau-ibirama"]');
  await expect(route).toContainText('Taxa de abertura: grátis (primeira linha)');
  await expectNoHorizontalScroll(page, 'nova linha');
  await route.click();
  await expect(page.locator('select[aria-label="Ônibus para a linha"]')).not.toHaveValue('');
  await page.locator('.dialog-panel [data-action="confirm"]').click();
  await expect(tutorial).toHaveCount(0);
  await expect(cash).toHaveText('R$ 15.000');

  await page.locator('[data-tab="lines"]').click();
  await expect(page.locator('[data-line]')).toHaveCount(1);
  await expect(page.locator('[data-line] .line-buses li')).toHaveCount(1);
  await expectNoHorizontalScroll(page, 'linhas');
  const startCash = await cash.textContent();

  await page.locator('[data-speed="4"]').click();
  await expect(cash).not.toHaveText(startCash!, { timeout: 90_000 }); // a primeira viagem chega

  // mexer no jogo não pode recriar o marcador do ônibus (a animação dele recomeçaria);
  // o Leaflet reaproveita a div externa no setIcon e troca o miolo, então conferir os dois
  await expect(page.locator('.bus-marker')).toHaveCount(1);
  const marker = await page.locator('.bus-marker').elementHandle();
  const body = await page.locator('.bus-marker .bus-marker-body').elementHandle();
  const slider = page.locator('.price-slider').first();
  const price = page.locator('[data-live="price"]').first();
  const priceBefore = await price.textContent();
  await slider.fill((await slider.getAttribute('min'))!);
  await expect(price).not.toHaveText(priceBefore!);
  expect(await marker!.evaluate((el) => el.isConnected), 'marcador do ônibus foi recriado').toBe(true);
  expect(await body!.evaluate((el) => el.isConnected), 'ícone do ônibus foi recriado').toBe(true);

  if (isMobile) await page.locator('[data-tab="map"]').click();
  await expectNoHorizontalScroll(page, 'mapa com a linha');

  await page.reload();
  await page.getByRole('button', { name: 'Continuar: Expresso Teste' }).click();
  await expect(page.locator('[data-live="clock"]')).not.toHaveText('Dia 1 · 00:00');
  await expect(page.locator('.tutorial-card')).toHaveCount(0);
  expect(errors).toEqual([]);
});
