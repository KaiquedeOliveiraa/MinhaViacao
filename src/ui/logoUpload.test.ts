// @vitest-environment jsdom
import { expect, test } from 'vitest';
import { fileToLogoDataUrl, MAX_UPLOAD_BYTES } from './logoUpload';

const file = (type: string, bytes: number) => new File([new Uint8Array(bytes)], 'logo', { type });
test('foco de revisão: arquivo que não é imagem é recusado', async () => {
  expect(await fileToLogoDataUrl(file('application/pdf', 10))).toEqual({ ok: false, error: 'tipo' });
  expect(await fileToLogoDataUrl(file('image/svg+xml', 10))).toEqual({ ok: false, error: 'tipo' });
});
test('foco de revisão: imagem acima de 5 MB é recusada antes de ser lida', async () => {
  expect(await fileToLogoDataUrl(file('image/jpeg', MAX_UPLOAD_BYTES + 1))).toEqual({ ok: false, error: 'tamanho' });
});
test('bytes que não formam uma imagem dão erro de leitura', async () => {
  expect(await fileToLogoDataUrl(file('image/png', 10))).toEqual({ ok: false, error: 'leitura' });
});
