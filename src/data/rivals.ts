// ÚNICO lugar do jogo com nomes de viações reais. Trocar os nomes aqui troca no jogo inteiro
// (para nomes fictícios, basta editar o campo `name`). Sem logotipos: o jogo só mostra o texto.
// Ordem de dificuldade crescente; os requisitos de cada tipo também crescem na ordem da lista.

export type RivalRequirement =
  | { kind: 'patrimonio'; cents: number }
  | { kind: 'linhas'; count: number }
  | { kind: 'frota'; count: number };
export interface Rival { id: string; name: string; region: 'SC' | 'Sul' | 'Brasil'; requirement: RivalRequirement }

const mil = (n: number) => n * 1000 * 100; // reais → centavos
const milhoes = (n: number) => n * 1_000_000 * 100;

export const RIVALS: readonly Rival[] = [
  { id: 'reunidas', name: 'Reunidas', region: 'SC', requirement: { kind: 'linhas', count: 2 } },
  { id: 'santo-anjo', name: 'Santo Anjo', region: 'SC', requirement: { kind: 'frota', count: 5 } },
  { id: 'brasil-sul', name: 'Brasil Sul', region: 'Sul', requirement: { kind: 'patrimonio', cents: mil(500) } },
  { id: 'expresso-nordeste', name: 'Expresso Nordeste', region: 'Brasil', requirement: { kind: 'linhas', count: 4 } },
  { id: 'penha', name: 'Penha', region: 'SC', requirement: { kind: 'frota', count: 10 } },
  { id: 'garcia', name: 'Viação Garcia', region: 'Sul', requirement: { kind: 'patrimonio', cents: milhoes(1) } },
  { id: 'unesul', name: 'Unesul', region: 'Sul', requirement: { kind: 'linhas', count: 6 } },
  { id: 'planalto', name: 'Planalto', region: 'Sul', requirement: { kind: 'frota', count: 15 } },
  { id: 'ouro-e-prata', name: 'Ouro e Prata', region: 'Sul', requirement: { kind: 'patrimonio', cents: milhoes(2) } },
  { id: 'catarinense', name: 'Auto Viação Catarinense', region: 'SC', requirement: { kind: 'linhas', count: 8 } },
  { id: 'eucatur', name: 'Eucatur', region: 'Brasil', requirement: { kind: 'frota', count: 25 } },
  { id: 'aguia-branca', name: 'Águia Branca', region: 'Brasil', requirement: { kind: 'patrimonio', cents: milhoes(3.5) } },
  { id: 'real-expresso', name: 'Real Expresso', region: 'Brasil', requirement: { kind: 'linhas', count: 12 } },
  { id: 'gontijo', name: 'Gontijo', region: 'Brasil', requirement: { kind: 'frota', count: 40 } },
  { id: 'sao-geraldo', name: 'São Geraldo', region: 'Brasil', requirement: { kind: 'patrimonio', cents: milhoes(6) } },
  { id: 'itapemirim', name: 'Itapemirim', region: 'Brasil', requirement: { kind: 'linhas', count: 16 } },
  { id: '1001', name: 'Auto Viação 1001', region: 'Brasil', requirement: { kind: 'frota', count: 60 } },
  { id: 'cometa', name: 'Cometa', region: 'Brasil', requirement: { kind: 'patrimonio', cents: milhoes(20) } },
];
