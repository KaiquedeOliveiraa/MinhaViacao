# Minha Viação — Design do MVP

Nov 12, 2026 · @Kaique de Oliveira

## Intenção

Minha Viação é um jogo de navegador, para um jogador, em que você cria uma empresa de ônibus em Santa Catarina, dá nome, logo e pintura a ela, e a faz crescer operando linhas entre cidades reais em um mapa real.

É um projeto de férias do Kaique, feito por diversão e para aprender. O que torna o jogo especial são duas coisas: a identidade da empresa (ver a sua pintura rodando na BR-470) e o cenário local, com cidades e rodoviárias reais de Santa Catarina.

O jogo se chama Minha Viação (decisão do Kaique em 14/11). O MVP cobre Santa Catarina, mas o nome não prende o jogo ao estado: a ideia é expandir depois para os outros estados e para países vizinhos.

## Objetivos

**O MVP precisa entregar**

- Um jogo completo de ponta a ponta: criar a empresa, operar uma linha, ganhar dinheiro, comprar outro ônibus, abrir outra linha.
- Identidade visível: nome, logo e pintura da empresa aparecem na garagem, no mapa e no topo da tela.
- Progresso salvo no navegador, sem perder nada ao fechar a aba.
- Publicação no GitHub Pages, com custo zero.

**Fica fora de propósito (não-objetivos)**

- Contas, ranking público, multijogador ou qualquer coisa que exija servidor.
- Aplicativo de loja (App Store ou Play Store). O jogo roda no navegador, no celular e no computador.
- Paradas intermediárias: toda linha liga duas cidades direto.
- Realismo de tarifas, horários ou empresas reais.

**Seria um fracasso, mesmo funcionando**

- Virar uma planilha com mapa, sem a parte de identidade que motiva o projeto.
- Um escopo que não termina nas férias.
- O jogador ficar parado olhando o ônibus andar, sem nenhuma decisão para tomar.
- Depender de serviço pago para rodar.

## Restrições

- **Custo zero.** Sem servidor e sem banco de dados. Tudo roda no navegador e é publicado como site estático no GitHub Pages.
- **Um jogador, um navegador.** O jogo salvo vive no navegador onde foi criado. Não há login.
- **Dados fixos no repositório.** Cidades, modelos de ônibus e traçado das rodovias são arquivos gerados uma vez e versionados. O jogo não chama nenhum serviço de rotas enquanto roda.
- **Celular e desktop.** Desenhado primeiro para o celular e aberto para telas grandes, a partir de 360 px de largura.
- **Tamanho de projeto de férias.** Cada sistema novo entra como uma etapa separada depois do MVP.

## Abordagens consideradas

A dúvida era o recorte do MVP. Kaique escolheu a **fatia fina de tudo**.

| Abordagem | O que entrega | Por que sim ou não |
| --- | --- | --- |
| Economia primeiro | Mapa, linhas, demanda e caixa bem feitos; ônibus de cor fixa | Descartada: deixa de fora a identidade, que é o coração do jogo |
| Identidade primeiro | Editor rico de logo e pintura, garagem bonita; economia depois | Descartada: vira um editor de ônibus sem jogo por trás |
| Fatia fina de tudo | Um pouco de identidade, mapa e economia, funcionando de ponta a ponta | **Escolhida:** é a única em que já se joga algo completo na primeira versão |

Outras decisões tomadas na conversa:

- **Tempo contínuo**, com pausa e velocidades, em vez de passar dia a dia. Decisão do Kaique.
- **Linhas que repetem sozinhas**, em vez de despachar cada viagem na mão. O jogo começa com uma linha pronta. Decisão do Kaique.
- **Demanda estimada pela população** das cidades, já que não há dado real de demanda. Ideia do Kaique.
- **Quatro cidades:** Ibirama (sede), Blumenau, Itajaí e Florianópolis. Decisão do Kaique.
- **Logo por ícone pronto ou imagem enviada.** Ideia do Kaique.
- **Vite + TypeScript, sem framework de UI.** Escolha delegada ao Claude.

## O que o jogador faz

Na primeira vez, o jogador cria a empresa e cai direto no mapa com um ônibus já rodando.

1. **Criar empresa.** Digita o nome, escolhe a cidade-sede, escolhe duas cores, escolhe a logo (ícone pronto ou imagem enviada) e um estilo de pintura. Vê o ônibus pintado ao lado enquanto escolhe.
2. **Ver a linha inicial rodar.** O jogo abre no mapa com uma linha já ativa, da sede até a cidade mais próxima, e um micro-ônibus usado nela.
3. **Ajustar o preço.** Mexe no preço da passagem da linha e observa a lotação e o caixa reagirem.
4. **Comprar outro ônibus.** Com dinheiro em caixa, compra na loja e dá um nome a ele.
5. **Abrir outra linha.** Escolhe duas cidades, um ônibus parado e um preço. A linha passa a repetir sozinha.

**Tela inicial.** Ao abrir o endereço do jogo, a pessoa vê uma tela de entrada, e não o mapa (ideia do Kaique). Ela tem o nome do jogo, uma frase explicando o que ele é, um ônibus ilustrado e os botões:

- **Começar uma viação:** leva à criação da empresa.
- **Continuar:** aparece só quando existe jogo salvo, mostrando o nome e a logo da empresa. Vai direto ao mapa.
- **Importar jogo salvo:** carrega um arquivo exportado.

É uma tela dentro do próprio jogo, não um site separado. Com jogo salvo, começar uma viação nova pede confirmação antes de apagar o anterior.

**Tela principal** (proposta do Claude; o visual final será definido por mockups antes de construir a interface):

```
┌──────────────────────────────────────────────────────────────┐
│ [logo] Nome da Empresa      R$ 12.480     Dia 3 · 14:20  ⏸ 1x 2x 4x │
├───────────────────────────────────────┬──────────────────────┤
│                                       │ Linhas│Garagem│Loja  │
│             MAPA (Leaflet)            │──────────────────────│
│   Ibirama ●━━🚌━━━● Blumenau          │ Ibirama ⇄ Blumenau   │
│                    ┃                  │ Preço: R$ 30  [──●─] │
│             Itajaí ●                  │ Lotação média: 68%   │
│                    ┃                  │ Lucro hoje: R$ 1.240 │
│                    ● Florianópolis    │ Ônibus: Guerreiro #1 │
│                                       │ [Pausar] [Excluir]   │
└───────────────────────────────────────┴──────────────────────┘
```

- **Barra superior:** logo e nome, caixa em destaque, dia e hora do jogo, pausa e velocidade.
- **Aba Linhas:** lista das linhas com preço, lotação média, lucro do dia e ônibus alocados. Botão para criar linha.
- **Aba Garagem:** cada ônibus desenhado de lado com a pintura da empresa, nome, modelo e onde está (parado ou em qual linha).
- **Aba Loja:** modelos à venda com preço, lugares e conforto.
- **Clicar em um ônibus no mapa:** abre um balão com nome, linha, passageiros a bordo e tempo até a chegada.
- **Clicar em uma cidade:** abre um balão com população e passageiros esperando em cada linha sua que passa ali.
- **Menu da empresa:** editar identidade, exportar e importar o jogo salvo, começar novo jogo.

**Ajustes após os mockups gerados pelo Kaique**

- A tela do mapa segue o mockup: mapa à esquerda, painel com as abas Linhas, Garagem e Loja à direita.
- Ao abrir Garagem ou Loja, o painel se expande sobre o mapa e mostra os ônibus em grade, como no mockup da garagem. O jogo continua rodando por trás.
- O menu da empresa fica no botão à esquerda da logo.
- Os mockups mostram coisas que não existem no jogo e não devem ser copiadas: a cidade de Curitiba, um quarto botão de velocidade e nomes de fabricantes reais.

**Celular e estilo (decisão do Kaique em 13/11).** O jogo precisa funcionar muito bem no celular. Abaixo de 900 px de largura, o mapa ocupa a tela, as abas viram uma barra no rodapé (Mapa, Linhas, Garagem, Loja) e cada aba abre em tela cheia. O estilo segue a referência enviada por ele: títulos condensados em maiúsculas, cartões de cantos largos com faixa na cor de destaque, dois botões empilhados na entrada e números grandes do que o jogo tem. A tela inicial vira uma página de entrada nesse estilo, com um cartão para instalar o jogo na tela inicial do celular. As regras detalhadas estão no plano de implementação.

## Regras do jogo

Todos os números desta seção são valores iniciais propostos pelo Claude. Eles serão calibrados com uma simulação sem tela, que usa as próprias regras do jogo, antes de existir interface.

### Tempo

- 1 segundo real vale 1 minuto de jogo na velocidade 1x. Um dia de jogo dura 24 minutos reais.
- Controles: pausa, 1x, 2x e 4x.
- Com a aba fechada ou em segundo plano, o jogo fica parado. Não há progresso offline.
- A demanda é igual em qualquer hora do dia. Dia e noite não mudam nada no MVP.

### Linhas

- Uma linha liga duas cidades direto, ida e volta, sem paradas no caminho.
- Só existe uma linha por par de cidades. Com 4 cidades, são no máximo 6 linhas.
- Uma linha tem um preço de passagem e um ou mais ônibus. Um ônibus está em uma linha ou parado.
- O ônibus vai, espera 10 minutos de jogo na ponta, volta, espera de novo e repete.
- A garagem é uma lista, não um lugar no mapa. Um ônibus alocado aparece direto na primeira cidade da linha.
- O jogador pode mudar o preço, trocar ônibus, pausar ou excluir a linha a qualquer momento.

**Regras adicionadas na revisão de brechas**

- **Rede conectada.** Uma linha nova precisa tocar uma cidade que a empresa já atende. Quem começa em uma cidade pequena não pode pular direto para a linha mais lucrativa do mapa; precisa chegar até ela.
- **Taxa de abertura.** Abrir uma linha custa um valor único, maior quanto maior o potencial dela. O valor entra na calibração.
- **Saídas espaçadas.** Com mais de um ônibus na linha, as partidas de cada ponta são espaçadas por igual. Sem isso, os ônibus andariam colados e o primeiro levaria todos os passageiros.
- **Linha sem ônibus.** Fica inativa: não acumula fila e usa conforto 1,0 no preço de referência.

### Demanda

Cada linha tem um potencial diário de passageiros em cada sentido, calculado pela população das duas cidades e pela distância:

```latex
\text{potencial} = K \cdot \frac{\sqrt{pop_A \cdot pop_B}}{dist}
```

Com a população em milhares, a distância em km e K = 120, os potenciais ficam assim:

| Linha | Distância aprox. (km) | Potencial por dia, por sentido |
| --- | --- | --- |
| Blumenau ⇄ Itajaí | 50 | 741 |
| Itajaí ⇄ Florianópolis | 95 | 476 |
| Blumenau ⇄ Florianópolis | 140 | 377 |
| Ibirama ⇄ Blumenau | 70 | 142 |
| Ibirama ⇄ Itajaí | 120 | 71 |
| Ibirama ⇄ Florianópolis | 210 | 58 |

O preço ajusta esse potencial. Cada linha tem um preço de referência, e cobrar acima dele afasta passageiros:

```latex
\text{preçoRef} = (5 + 0{,}35 \cdot dist) \cdot conforto
\qquad
\text{fator} = \min\left(1{,}5,\ \left(\frac{\text{preçoRef}}{\text{preço}}\right)^{1{,}5}\right)
```

- No preço de referência, o fator é 1. No dobro, cai para cerca de 0,35. Preço baixo atrai até 50% a mais.
- O conforto da linha é a média do conforto dos ônibus alocados nela.
- Os passageiros se acumulam em uma fila em cada ponta da linha, no ritmo de potencial × fator por dia.
- A fila guarda no máximo 3 horas de passageiros. Quem espera mais que isso desiste.
- Quando o ônibus parte, embarca o que couber. Por isso, capacidade e número de ônibus importam.

* **Limites do preço.** O controle de preço vai de 30% a 300% do preço de referência. Preço zero ou negativo não existe, o que evita divisão por zero na fórmula.

### Dinheiro

- **Receita:** passageiros embarcados × preço, creditada na chegada.
- **Diesel:** cobrado por km rodado, conforme o consumo do modelo, a R$ 6,00 o litro.
- **Custo fixo diário:** R$ 350 por ônibus, cobrado à meia-noite do jogo. Representa motorista e seguro; ônibus parado também paga.
- **Caixa negativo:** é permitido, aparece em vermelho e bloqueia compras. Não há fim de jogo no MVP.
- **Venda:** um ônibus pode ser vendido por metade do preço de compra. O último ônibus da empresa não pode ser vendido, para o jogador nunca ficar sem como ganhar dinheiro.

### Ônibus

Todos andam a 60 km/h de média.

| Modelo | Lugares | Conforto | Consumo (km/l) | Preço |
| --- | --- | --- | --- | --- |
| Micro-ônibus usado | 24 | 0,9 | 4,5 | R$ 60 mil |
| Convencional | 44 | 1,0 | 3,2 | R$ 180 mil |
| Rodoviário | 46 | 1,2 | 2,8 | R$ 350 mil |

O jogador começa com um micro-ônibus usado e R$ 15 mil em caixa.

**Meta de calibração:** o segundo ônibus deve ser alcançável em 20 a 30 minutos reais de jogo. Preços e custos serão ajustados até isso acontecer. Uma simulação com os números acima mostrou que eles ainda não cumprem a meta: a linha inicial rende cerca de R$ 5,5 mil por dia, então o segundo micro-ônibus levaria 11 dias de jogo (mais de 4 horas reais em 1x). Já Blumenau ⇄ Itajaí paga um micro-ônibus em 3 dias, o que faria o dinheiro disparar. A calibração precisa baratear o começo e segurar as linhas grandes. Todo valor em dinheiro é guardado em centavos inteiros, para não acumular erro de arredondamento.

## Mapa

O mapa mostra Santa Catarina em Leaflet, com quatro cidades e o traçado real das rodovias entre elas.

| Cidade | Papel no jogo | População aprox. (mil) |
| --- | --- | --- |
| Ibirama | Cidade pequena, começo difícil | 19 |
| Blumenau | Polo do Vale, começo fácil | 361 |
| Itajaí | Litoral, perto de Blumenau | 264 |
| Florianópolis | Capital, viagem longa | 537 |

As populações e distâncias deste documento são aproximadas, de memória. Na implementação, a população vem do Censo 2022 do IBGE e a distância vem do traçado gerado.

- **Rodovias pré-geradas.** Um script roda uma única vez, consulta um serviço de rotas (OSRM ou OpenRouteService) para os 6 pares de cidades e salva cada traçado como arquivo no repositório, com a distância em km.
- **Movimento do ônibus.** A posição no mapa é calculada pelo progresso da viagem ao longo do traçado salvo.
- **Crescer depois.** Cidade e rota são dados. Adicionar uma cidade é incluir uma linha no arquivo de cidades e rodar o script de novo.
- **Fundo do mapa.** Um mapa-base escuro e gratuito, com a atribuição exigida. Os termos de uso do provedor precisam ser conferidos antes de publicar.
- **Marcadores.** Cada ônibus aparece como um marcador pequeno nas cores da empresa. Cada cidade é um ponto com o nome.

**Sede escolhida pelo jogador.** Na criação da empresa, o jogador escolhe a sede entre as cidades do mapa (decisão do Kaique). A linha inicial liga a sede à cidade mais próxima. A sede funciona como nível de dificuldade: começar em Ibirama é difícil, porque a linha inicial rende pouco; começar em Blumenau ou Itajaí é fácil, porque a linha inicial é a melhor do mapa. A tela de escolha mostra essa dificuldade (proposta do Claude).

**Ponto da cidade na rodoviária.** O ponto de cada cidade no mapa fica na rodoviária real, quando ela existe, e no centro da cidade quando não existe (ideia do Kaique). As rotas são geradas de rodoviária a rodoviária. As coordenadas vêm do OpenStreetMap e são conferidas uma a uma na implementação.

## Identidade e frota

A identidade da empresa tem quatro partes, todas editáveis depois pelo menu da empresa.

- **Nome:** texto de até 30 caracteres.
- **Cores:** uma primária e uma secundária, escolhidas no seletor de cores do navegador.
- **Logo:** um entre 6 ícones prontos, coloridos com as cores da empresa, ou uma imagem enviada pelo jogador.
- **Pintura:** um entre 4 estilos de faixa como padrão da empresa (por exemplo: lisa, faixa reta, faixa diagonal, onda).

**Pintura por ônibus.** Todo ônibus novo nasce com o estilo padrão da empresa. Na garagem, o jogador pode trocar o estilo de um ônibus específico entre os 4 disponíveis. As cores são sempre as da empresa, para a frota continuar reconhecível (escolha do Claude; Kaique ainda não confirmou).

**Interface nas cores da empresa.** A cor primária vira a cor de destaque da interface: botões, aba ativa e realces. Verde e vermelho ficam reservados para dinheiro e não mudam. Se a cor escolhida for escura demais para o fundo escuro, o jogo usa uma versão mais clara dela só na interface.

**Nomes dos modelos.** Os modelos têm nomes inventados. O jogo publicado não usa marcas reais de fabricantes.

**Imagem enviada.** Aceita PNG, JPG ou WebP. O jogo reduz a imagem para 128 × 128 pixels antes de guardar, para caber no armazenamento do navegador. A imagem nunca sai do computador do jogador.

**Desenho do ônibus.** Cada modelo tem um desenho vetorial de lado, dividido em regiões: carroceria, faixa, saia, janelas e rodas. As regiões leem as cores da empresa, então trocar a pintura muda a frota inteira na hora. São três desenhos, um por modelo.

**Nome do ônibus.** Cada ônibus pode receber um nome ao ser comprado. Sem nome, ele usa o modelo e um número.

A identidade aparece em três lugares: na barra superior (logo e nome), na garagem (ônibus pintado) e no mapa (marcador nas cores da empresa).

## Arquitetura

O jogo é um site estático em Vite + TypeScript, sem framework de UI, com a simulação separada da interface.

```
src/
  data/   cidades, modelos de ônibus, ícones de logo, traçados das rotas (JSON)
  sim/    estado do jogo e regras: tempo, linhas, demanda, dinheiro
  save/   salvar, carregar, exportar, importar, migrar versões
  map/    Leaflet: mapa-base, cidades, traçados, marcadores dos ônibus
  ui/     barra superior, abas, criação da empresa, desenho dos ônibus
scripts/
  gerar-rotas   roda uma vez, grava os traçados em src/data
```

- **`sim` não conhece a tela.** Recebe o estado e o tempo decorrido e devolve o novo estado. Não toca em HTML nem em Leaflet, então pode ser testado sozinho (Vitest).
- **Um único estado.** Empresa, caixa, relógio, frota, linhas e filas ficam em um objeto só. `ui` e `map` apenas leem esse estado e se redesenham quando ele muda.
- **Ações.** Tudo o que o jogador faz (comprar, criar linha, mudar preço) passa por funções de `sim`. A interface nunca altera o estado direto.
- **Laço do jogo.** O navegador avisa a cada quadro; o jogo acumula o tempo real, converte pela velocidade e avança a simulação em passos fixos de 1 minuto de jogo. Com a aba em segundo plano, o laço para.
- **Pontos de extensão.** Motoristas, manutenção e fretamento entrarão como novos módulos em `sim` e novos campos no estado. O estado já nasce com número de versão para permitir isso.

### Salvamento

- O estado inteiro é gravado no armazenamento local do navegador, com um número de versão.
- Grava a cada hora de jogo e a cada ação importante (compra, venda, criar ou excluir linha, editar identidade).
- **Exportar e importar:** o jogador pode baixar o jogo salvo como arquivo e carregá-lo de volta. Serve de backup, já que limpar os dados do navegador apaga o jogo.
- **Novo jogo:** apaga o jogo salvo, com confirmação.

**Proteções do salvamento (revisão de brechas)**

- **Só tempo de jogo.** O arquivo guarda o relógio do jogo e o progresso de cada viagem como fração do trajeto. Nenhuma hora real entra no arquivo, então mudar o relógio do computador não afeta nada.
- **Referências por identificador.** O arquivo guarda o identificador da cidade, do modelo e da rota, não os números deles. Se a calibração mudar um preço ou um traçado for gerado de novo, o jogo salvo continua válido.
- **Validação ao carregar.** Um arquivo corrompido ou importado com formato errado é recusado com uma mensagem, sem apagar o jogo atual.
- **Cópia de segurança.** Antes de gravar, o jogo guarda a gravação anterior. Se a nova falhar ou vier corrompida, ele volta para a anterior.
- **Migração de versão.** Cada versão nova do jogo sabe converter o arquivo da versão anterior. É assim que motoristas e manutenção entram depois sem perder o progresso.
- **Duas abas abertas.** Só uma aba joga por vez. A segunda mostra um aviso em vez de gravar por cima da primeira.
- **Gravar ao sair.** Além da gravação periódica, o jogo grava quando a aba é escondida ou fechada.
- **Textos do jogador.** Nome da empresa e dos ônibus são sempre exibidos como texto puro. Isso importa porque um arquivo importado pode vir de outra pessoa.
- **Trapaça.** O jogador pode editar o próprio arquivo. Como não há ranking, isso não é tratado como problema.

### Publicação

O repositório fica no GitHub. Uma ação automática compila e publica no GitHub Pages a cada envio para a branch principal.

## Fora do MVP

Estes sistemas ficam para depois, um de cada vez, nesta ordem proposta:

1. **Motoristas:** contratação, salário, experiência e fadiga.
2. **Manutenção:** desgaste por viagem, oficina, quebra na estrada e depreciação do valor de revenda.
3. **Fretamento e reputação:** contratos temporários com prazo e multa.
4. **Conquistas** temáticas de Santa Catarina.
5. **Mais cidades:** Joinville, Lages, Chapecó, Criciúma e o resto do estado; depois os outros estados de forma simplificada (por exemplo, só a capital) e países vizinhos, como Argentina e Uruguai. Nessa etapa as rodovias passam a ligar só cidades vizinhas, em vez de todos os pares.
6. **Upgrades visuais:** Wi-Fi, ar-condicionado e insulfilme como camadas no desenho do ônibus, e a vista de frente de cada modelo.
7. **Clima e eventos na estrada.**
8. **Concorrentes e compra de empresas: viações rivais fictícias disputam passageiros nas mesmas linhas, e mais adiante o jogador pode comprá-las.**
9. **Ranking online,** se um dia houver um serviço gratuito que compense.

**Ideias mais distantes (do Kaique):** um modo motorista, em que se joga como motorista de uma viação em vez de dono; e viações reais apoiadoras aparecendo no jogo como concorrentes, o que só pode ser feito com autorização por escrito de cada empresa.

## Em aberto

**Depende do Kaique**

- [ ] Aprovar este documento.
- [ ] Escolher o visual da interface a partir de mockups, antes de construir as telas.
- [ ] Nome final definido em 14/11: Minha Viação.

**Fica a cargo de quem implementa**

- Os desenhos vetoriais dos três ônibus, dos 4 estilos de pintura e dos 6 ícones de logo.
- A escolha do provedor do mapa-base escuro e do serviço de rotas usado pelo script.
- A organização interna de cada pasta e os nomes de arquivos e funções.
- A calibração dos números de demanda, preço e custo, guiada pela meta de 20 a 30 minutos até o segundo ônibus.
