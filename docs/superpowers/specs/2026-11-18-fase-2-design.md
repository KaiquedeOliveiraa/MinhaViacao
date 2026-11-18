# Minha Viação — Fase 2: mapa próprio, economia inicial, frota e rivais

18/11/2026 · pedido do Kaique (trabalho autônomo; decisões do Claude marcadas como **escolha do Claude**)

## Intenção

O MVP está jogável. A fase 2 tira a dependência de um mapa-base de terceiros (Esri) e dá ao jogo uma cara própria, no estilo "mapa de jogo de estrada": fundo escuro, Santa Catarina inteira desenhada em vetor e os vizinhos esmaecidos como promessa de expansão. Ao mesmo tempo, o começo do jogo vira uma decisão do jogador (comprar o primeiro ônibus e abrir a primeira linha), a frota ganha desenhos e uma loja mais realistas, e aparecem as viações rivais como metas futuras.

## Objetivos (na ordem de prioridade do Kaique)

1. **Mapa próprio em escala real.** Municípios de SC (IBGE), contornos de PR, RS e Argentina esmaecidos, rodovias principais do OSM, rotas do jogador em destaque na cor da viação. As 295 cidades aparecem em cinza; as 4 jogáveis continuam clicáveis e com nome. Coordenadas reais (lat/lon): distâncias, rotas e simulação não mudam. Sem tiles. Meta: 60 fps no zoom/arraste num celular intermediário e menos de 1,5 MB comprimido de geometria. Atribuição IBGE + OSM (ODbL) + Natural Earth no mapa e no README. Corrigir o marcador do ônibus que reinicia a animação a cada ação.
2. **Economia inicial, Lista, save versionado.** Começo sem ônibus, com caixa para o primeiro veículo e a primeira linha; tutorial curto (comprar, pintar, abrir linha). Segundo ônibus continua chegando em 20–30 min reais (sede Ibirama). Tela "Lista" com as linhas em tabela e coluna "Motorista" vazia. Campo de motorista no modelo, save versionado com migração testada. Nome do ônibus sem corte no cartão da linha.
3. **Ônibus e logos.** Desenhos SVG originais (van, micro, convencional, rodoviário) com proporções reais e camadas separadas; mais ícones de logo; galeria com tudo.
4. **Loja realista.** Catálogo por categoria, novos e usados com ficha técnica, filtros (categoria, novo/usado, cabe no orçamento) e ordenação. Venda imediata (depreciação) ou anúncio (vende depois, com chance que cai quanto mais acima do valor justo). Dados de loja prontos para futuras lojas no mapa. Empréstimo: só análise no ledger.
5. **Viações rivais bloqueadas.** Lista com cadeado e requisito; nomes reais num único arquivo de dados, sem logotipos.

**Não-objetivos:** cidades novas jogáveis, motoristas funcionando, desbloqueio de rivais funcionando, lojas no mapa, empréstimo, mexer no equilíbrio do micro sem registrar.

**Seria um fracasso:** mapa bonito e travando no celular; save antigo do Kaique deixar de abrir; o começo do jogo ficar mais confuso que antes.

## Abordagens

### Renderização do mapa

| Abordagem | Troca | Decisão |
| --- | --- | --- |
| Leaflet sem tiles, camadas GeoJSON num renderizador canvas | Mantém popups, marcadores, tooltips, testes e e2e; canvas desenha 295 polígonos sem custo de DOM; zoom e arraste usam a transformação CSS do Leaflet | **Escolha do Claude** |
| SVG/canvas próprio com d3-geo | Controle total do desenho, mas reescreve pan/zoom/toque/popups e adiciona dependência | Descartada: muito trabalho para o mesmo resultado |
| Leaflet com tudo em SVG | Simples, mas 295 caminhos + rodovias no DOM pesam no zoom do celular | Descartada pelo desempenho |

### Arquivos de geometria

GeoJSON estático em `public/map/` (baixado sob demanda pelo navegador, fora do bundle JS), coordenadas com 4 casas decimais (~11 m), linhas simplificadas por Douglas-Peucker num script próprio (`npm run map`). TopoJSON economizaria bytes mas pede dependência; com a malha mínima do IBGE o total fica muito abaixo de 1,5 MB, então não compensa. **Escolha do Claude.**

### Primeira linha

As taxas de abertura da linha inicial variam de R$ 6.924 (Ibirama) a R$ 31.896 (Blumenau). Um caixa inicial igual para todos quebraria a dificuldade por sede. **Escolha do Claude:** a primeira linha da viação não paga taxa; o caixa inicial é o preço do ônibus mais barato à venda (micro usado, R$ 20.000) mais os R$ 15.000 de hoje = **R$ 35.000**. Assim, depois do tutorial, o jogador fica exatamente na situação calibrada do MVP.

### Loja

Ofertas fixas em `src/data/dealers.json`, agrupadas por loja (`cityId: null` e coordenadas nulas por enquanto, prontas para lojas no mapa). Estoque ilimitado nesta fase (**escolha do Claude**: sem reposição de estoque para modelar). Valor justo por depreciação de idade e quilometragem; venda imediata a 80% do valor justo; anúncio vende com chance por hora que cai do valor justo até 1,5× o valor justo (acima disso não vende). O sorteio é determinístico (hash do ônibus e da hora), para a simulação continuar pura e testável.

## Restrições

- Custo zero, site estático no GitHub Pages; o CI publica com `DEPLOY_PAGES=true`.
- Todas as cores em variáveis CSS (`src/ui/tokens.css`); o canvas do mapa lê essas variáveis. Exceções registradas: cores fixas do desenho dos ônibus, manifest e ícones PNG.
- Dependência nova só com motivo e licença no ledger (meta: nenhuma).
- Toda mudança no formato do estado sobe a versão do save, com passo de migração e teste usando um save real da versão anterior.
- Textos do jogo em português; nada de logotipos ou nomes de modelo reais de fabricantes; nomes reais de viações só em `src/data/rivals.ts`.
- 149 testes atuais continuam passando (os que mudarem por decisão de design são atualizados e registrados).

## O que fica para o construtor

Proporções exatas dos desenhos, textos finos do tutorial, cores exatas do mapa (dentro dos tokens), layout da tabela no celular, tolerâncias de simplificação desde que o tamanho e a aparência fiquem bons.
