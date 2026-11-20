// ÚNICO lugar do jogo com nomes de viações reais. Trocar os nomes aqui troca no jogo inteiro
// (para nomes fictícios, basta editar o campo `name`). Sem logotipos: o jogo só mostra o texto.
// Ordem de dificuldade crescente; os requisitos de cada tipo também crescem na ordem da lista.

import type { LiveryStyle } from '../sim/types';

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

// Pinturas "inspiradas em" viações conhecidas, oferecidas na criação da viação. As cores e os estilos
// são PRÓPRIOS do jogo: de propósito não reproduzem as cores nem a combinação da identidade real de
// ninguém, e não há logotipos. Só o nome (campo `inspiredBy`) lembra a viação.
export interface LiveryPreset { id: string; inspiredBy: string; article?: 'na' | 'no'; primary: string; secondary: string; livery: LiveryStyle }

export const LIVERY_PRESETS: readonly LiveryPreset[] = [
  { id: 'catarinense', inspiredBy: 'Catarinense', primary: '#1f7a63', secondary: '#f2c14e', livery: 'diagonal' },
  { id: 'reunidas', inspiredBy: 'Reunidas', primary: '#a8322d', secondary: '#f3e6d0', livery: 'stripe' },
  { id: 'gontijo', inspiredBy: 'Gontijo', article: 'no', primary: '#5b3d8f', secondary: '#e6d44a', livery: 'wave' },
  { id: 'aguia-branca', inspiredBy: 'Águia Branca', primary: '#ece8dc', secondary: '#0e7490', livery: 'plain' },
  { id: 'cometa', inspiredBy: 'Cometa', primary: '#0f6b8a', secondary: '#f4a261', livery: 'stripe' },
  { id: 'mil-e-um', inspiredBy: '1001', primary: '#b83a74', secondary: '#ffd9e4', livery: 'wave' },
  { id: 'guanabara', inspiredBy: 'Guanabara', primary: '#39424e', secondary: '#e8742a', livery: 'diagonal' },
];
