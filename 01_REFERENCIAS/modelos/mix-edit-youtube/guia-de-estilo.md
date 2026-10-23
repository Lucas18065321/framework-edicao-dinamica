# Guia de estilo: YOUTUBE - MIX EDIT (v1)

Id `mix-edit-youtube` · composição `MixEdit` (`MotorCamadas`) · status: **fixo**: formato, estilo e guia só mudam a pedido do usuário; mudança no motor passa nas regressões (ver `00_SISTEMA/regressao/README.md`).

## Resumo do formato
| | |
|---|---|
| **O que é** | Vídeo longo de YouTube (10–25 min), horizontal, que mistura **três linguagens com uma identidade**: intro cinematográfica e densa; corpo "Apple premium", calmo, 1 ideia por tela, com o movimento dentro do plano; e picos de **3D flash**. Fala sem respiro (pausas apertadas por código), zoom in/out a cada corte, Text Match Cut com manchetes e artigos reais, colagem em papel e título em stop-motion na intro, música só na intro (parada brusca no título), apresentação com redes e @, capítulos, rosto desfocado com infos técnicas, gráficos, 3D na frente e atrás da pessoa. |
| **Quando usar** | Vídeo explicativo/aprofundado em que você fala para a câmera por vários minutos e quer um acabamento de canal grande. Ex.: "como nasce um café especial", "tudo sobre juros compostos". |
| **Entrada necessária** | Um **vídeo bruto horizontal** (1920×1080 ou 4K) com você falando, câmera fixa. Pode vir com os silêncios já tirados (as junções internas são tratadas). |
| **Proporção e fps** | Horizontal 16:9, **1920×1080, 30 fps** (`modelos.json`; a regra de 24 fps do Instagram não vale aqui). Render com `--gl=angle`, por partes (`render.mjs --partes`). |
| **Pode mudar** | O conteúdo de cada vídeo (falas mantidas, peças, B-roll, capítulos, manchetes), a cor de acento e a paleta da sua marca (`estilos.ts`, com ⏸ e nova referência de regressão), a calibração do seu cenário (enquadramentos, área livre), as "Preferências do usuário". |
| **Não pode mudar** | As regras de junção (toda junção muda o enquadramento; plano ≥ 1 s; rosto desfocado em bloco), a fala sem respiro, as regras de legibilidade e de flash (WCAG), a ética do Text Match Cut (só print real e conferido) e as checagens do `checar-mix.mjs`. Os outros formatos não podem ser afetados. |

**Ordem de precedência** (de cima para baixo): "Regras consolidadas" → "Correções da crítica" → "Calibração do cenário" → resto do guia. **O código é a fonte de verdade:** `00_SISTEMA/motor/src/modelos/` (`MotorCamadas.tsx`, `estilos.ts`, `camadas.tsx`) e `src/kit/pecas/`; se o guia divergir, vale o código e o guia se corrige.

**Origem do formato:** consolida 5 análises paralelas (ritmo e curvas da ref. principal, medidos quadro a quadro; composição, tipografia e cor reprojetadas para 1920×1080; pesquisa "Apple style" + "3D flash edit"; gancho + Text Match Cut; retenção no corpo de vídeo longo), passou por crítica adversarial e foi validado num piloto de ~20 min. Referências (vídeos de terceiros, não incluídos no repositório; para treinar outro estilo, use os seus com `/novo-modelo`):
- **ref. principal** (102 s, 30 fps): um celular filmando um notebook que mostra uma peça 16:9.
  - Vale pelo **fluxo, curvas, ritmo e composição**. Não vale pelo formato.
  - Cor e blur têm erro: a câmera estoura o laranja, levanta os pretos e soma o rastro de uma tela de 60 Hz.
  - A embalagem do repost não conta (título fixo, ícones de apps e @ do criador trocando de canto).
- **ref. de intro** (colagem em papel): define a intro em colagem e título em stop-motion.
- **Briefing da intro:** define a ordem dos beats.
- **Refs do CUT:** texto atrás da pessoa, palavras 3D, flash.
- **Pesquisa externa:** Apple HIG (motion, materiais), WWDC23 (molas), Ajuda do YouTube (capítulos, métrica "Intro"), WCAG 2.3.1, Mayer (redundância), Lang 2000 (edits), Guo 2014 (rosto). Números de blogs valem só como ordem de grandeza.

Convenções:
- **q = quadro a 30 fps** (segundos × 30). É o fps do formato e da ref. principal, então os quadros medidos na ref valem direto. A coluna "Ref" traz os tempos (s ou q) da ref de onde a medida saiu: é só rastro.
- Os tempos do `edicao.json` são da SAÍDA (depois da `montagem`); os da `montagem`, do BRUTO.
- Tamanhos em px de 1920×1080. "Maiúscula" = altura de maiúscula. Corpo (font-size) ≈ maiúscula ÷ 0,727 na Inter Tight (a conferir num quadro renderizado).
- **Níveis de evento:**
  - **micro:** reenquadramento, palavra-chave, número, rodapé de fonte;
  - **beat:** B-roll, card, tela gráfica, gráfico, card de capítulo, quebra de modo;
  - **pico:** 3D flash, texto atrás da pessoa, Text Match Cut, papel rasgado.

Princípio:
- **Três linguagens, uma identidade.**
  - A intro é cinematográfica e densa como a ref (de 0 a ~50 s).
  - O corpo é **Apple premium**: calmo, 1 ideia por tela, e o movimento vem de dentro do plano, não do corte.
  - O **3D flash** é só tempero nos picos, com ≤ 20 q por golpe.
  - As três usam a mesma fonte, a mesma paleta e as mesmas curvas. Só mudam amplitude e velocidade.
- **O rosto é a âncora:** 65–75% do corpo. Ele sustenta a autoridade, e o rosto intercalado com slides engaja mais que só slides (Guo 2014).
- **Fluidez da ref:**
  - chega rápido e pousa devagar (sai em 2–4 q, assenta em 10–16 q);
  - o que sai vira o que entra;
  - blur só no pico de velocidade;
  - nada fica parado;
  - um acento único funciona como cursor de atenção ("o que está ativo agora");
  - sem quique.
- **Dinâmico mas clean:** sem tremida, sem RGB split contínuo, sem neon, sem vários acentos.

## Regras consolidadas (prevalecem sobre tudo)
- **Acento único da marca** (padrão do framework: carmim `#B90015`, o mesmo do CUT). Onde o guia diz "acento", leia a cor do `acento` em `estilos.ts`. Sobre parede clara do cenário o acento perde contraste: texto direto na parede sai na cor de tinta escura (`tinta` `#1C0A06`); o acento entra em cards escuros, telas e destaques.
- **Apresentação** com os dados da sua marca (`02_BIBLIOTECA/kit/marca/marca.json`): nome de exibição, profissão/título, credencial (se houver), ícones das redes (Instagram, YouTube…), @.
- **Text Match Cut:** manchetes reais de veículos sérios **e** artigos de fontes sólidas (ex.: científicos recentes de alto impacto, quando o tema pede), cada um conferido e aprovado pelo usuário antes de entrar.
- **Intro reordenada** (gancho primeiro, apresentação ~0:36). Legenda: só CC.
- **Ritmo sem respiração:** acabou a frase, emenda na outra; cortar as pausas de pensar e os alongamentos ("tãããão").
  - Aperto automático: corta pausa/respiração < −36 dB com ≥ 0,14 s, deixando 0,06 s depois da palavra e 0,05 s antes da próxima (`02_analise/pausas_aperto.json` + `apertar` no gerador). No piloto tirou ~95 s de 19 min.
- **Zoom in/out a cada corte:** rodízio A → C → B2 → A → C → B1 nas junções (close C ≤ 4 s), com plano mínimo de 1 s e sem corte no rosto desfocado.
- **Análise de coerência antes de montar:** comparar tomadas parecidas e explicações repetidas em pontos diferentes do vídeo e deixar só a melhor; cortar metacomentário e trechos irrelevantes (lista `REMOVER` no gerador).
- **Intro em colagem** (estilo da ref. de intro). Substitui os beats 3 e 4 da tabela da intro; `flash-foto`, `ponto-luz` e `titulo-quente` ficam no kit como opção.
  - **Colagem em papel** (`colagem-papel`): palavra/número grande no acento, caneta circulando, foto P&B rasgada. Entra no lugar das fotos-flash.
  - **Título em colagem stop-motion** (`colagem-titulo`) com fotos geradas. Entra no lugar da tela escura com ponto de luz.
  - O Text Match Cut com artigos e manchetes continua.
- **Música (padrão, ver "Preferências"):** só na intro, tensão investigativa crescendo até uma **parada brusca quando o título aparece**; **corpo sem música** (mais sério). Não oferecer várias trilhas para escolher: uma trilha de intro bem cortada. Na validação, a trilha da intro foi sintetizada por código (sem Content ID).
- **Rosto desfocado é um bloco só.** Nada de corte nem troca de enquadramento dentro dele. O desfoque entra (0,3 s, `entrada`) e sai (0,3 s, `saida`) só nas pontas do bloco. Blocos a menos de 1 s um do outro viram um. O trecho que continua o bloco depois de um B-roll já começa desfocado.
  - Causa: cada pedaço de cena refazia o desfoque (24 → 0 → 24). O corte mostrava 1 quadro nítido e +14 a +24 de brilho ("a imagem pisca a cada zoom"; 14 piscadas no piloto).
- **Plano mínimo de 30 q (1 s)** em toda troca de enquadramento.
  - A junção mais perto que isso fica como jump cut no mesmo enquadramento.
  - Rosto de menos de 0,6 s entre dois eventos (B-roll, tela) não aparece: o evento anterior vai até o seguinte.
  - Causa: planos de 2 a 12 q com outro zoom (sobras do aperto das pausas + rodízio) "gaguejavam".
- **Rodapé de fonte com 26 px** (peça `fonte` e o `Rodape` de gráfico, contador e painel), numa linha só, abaixo do gráfico.
  - Linha longa encolhe até 20 px; nunca passa de 2 linhas.
  - Causa: a 40 px a citação quebrava em 3 linhas e subia por cima dos rótulos das barras ("a fonte engolia o gráfico").
- **Conferência obrigatória.**
  - `checar-mix.mjs` dá ERRO nos itens do rosto desfocado e do plano mínimo.
  - Com `--video <mp4>`, mede as piscadas de 1–2 quadros (≥ 6 de YAVG; o detector de flash, ≥ 26, não pegava).
  - Antes do render final, `node scripts/quadros.mjs <proj> <t1> <t2> …` tira stills dos pontos novos (≈ 20 s + 17 s por quadro).

### Como montar (o gerador do MIX)
O `edicao.json` do MIX **não se escreve à mão**: sai de um gerador por vídeo, `03_roteiro/montar_edicao.mjs`. O molde é, nesta ordem: o piloto do formato registrado em `00_SISTEMA/regressao/pilotos.json`, senão o último projeto MIX aprovado, senão o gerador é escrito do zero seguindo este guia (o 1º vídeo do formato leva mais tempo). Para um vídeo novo: copiar o do molde e trocar só os eventos (falas, peças, B-roll, capítulos, `REMOVER`). O gerador faz:
- âncoras em tempo do bruto → saída;
- aperto das pausas (`pausas_aperto.json`), remoções (`REMOVER`) e rodízio de enquadramento com plano mínimo de 1 s;
- blocos de rosto desfocado inteiros, capítulos e rodapés de fonte de 26 px.

## Correções da crítica (prevalecem sobre o resto, menos as regras consolidadas)
1. **Junções em px da saída, não em fração de foco.** O `foco` é o ponto fixo do zoom: Δfoco 0,08 a 1,10 move só ~15 px. Conta como troca de enquadramento: rosto deslocado ≥ 5% W **ou** escala ≥ 10% diferente; troca lateral só B1 ↔ B2 (~99 px a 1,12). Reenquadrar só saltos visíveis, com ≥ 3 s entre reenquadramentos; o resto com dissolve de 2–4 q ou cobertura (B-roll, card, tela). Detector de junções **só por imagem** (`juncoes.mjs`): o Whisper do FFmpeg dá tempos de palavra colados (3674 de 3750 lacunas valiam 0).
2. **Proteger os tempos.** Congelar a `montagem` antes de posicionar cenas e camadas (qualquer ajuste nela desloca tudo depois). Final **por partes** (`render.mjs --partes`, por capítulo, junção sem recompressão); áudio mixado inteiro e normalizado uma vez só no master (2 passadas lineares, `--loudnorm-linear`).
3. **Áudio e SFX.** Piso de vol 0,55 para SFX durante a fala (`ganhoSfx` do estilo); palavra-chave sem som obrigatório; `volSemFala` não sobe nos cards (os tempos de palavra são colados): para a trilha subir num card, usar `quedas` com vol > 1 ou trilha própria. Medir SFX numa trilha só de efeitos, não na mixagem.
4. **Intro enxuta como opção.** Gancho reordenado pela `montagem` (cortando a conversa e o "fala, galera" do começo do bruto); nome + credencial num rodapé discreto até ~15 s; capítulo 1 até ~0:40. Re-gancho só com material que já existe no bruto (reordenação, texto ou teaser visual). A intro longa de 7 beats (~50 s) fica como opção do usuário.
5. **Área livre depende de zoom e foco.** Medir a área livre de cada enquadramento (A, B1, B2, C) antes de posicionar: cards ≤ 520 px de largura (ou usar B2, que abre um lado do cenário); título atrás da cabeça ≤ 64% W, dentro da parede lisa, sem passar na frente de objetos do cenário.
6. **Legibilidade de quem dá confiança.** Rodapé `fonte` ≥ 3 s no ar, com corpo de **26 px** numa linha só (40–44 px engolia o gráfico); números de painel com maiúscula ≥ 44 px. `manchete-falada` só em telas de mecanismo; no resto, palavras-chave (resolve a contradição com a redundância de Mayer).
7. **Evidência e ética.**
   - `03_roteiro/fontes.json` por afirmação baseada em dado (tempo, frase, fonte primária com DOI/link, desenho do estudo, n, população, efeito); o usuário revisa as afirmações da fala antes dos grafismos; rótulo "esquemático" em toda curva sem dado.
   - Se a sua área tem conselho profissional com regras de publicidade (saúde, direito, finanças…): identificação profissional, sem sensacionalismo nem promessa de resultado, sem número de clientes/seguidores como autopromoção.
   - Imagens de corpo não estigmatizantes (sem corpo sem cabeça, sem close de partes do corpo como "problema").
   - Marcar "conteúdo alterado ou sintético" no YouTube Studio quando houver imagem de IA realista.
   - **Text Match Cut só com cada manchete conferida** (diz o que a fala diz, veículo sério, data visível no hold); se não, `match-cut-tipo`. Captura pelo `capturar-manchete.mjs` (Chrome headless), com recusa de cookies.
8. **Correções sobre a ref.** Título da tela escura é leve (Inter Tight 300, caixa baixa, sublinhado), não 900 caixa-alta; `texto-3d` vem das refs do CUT, não da ref. principal; gráfico de curva desenhando em ~14,7–17,0 s e arco com cabeça de brilho em ~88,3–92,7 s; a tela final da ref é embalagem do repost; há ≥ 7 trocas de mundo (algumas com estouro branco); medidas em px e quadros são ordem de grandeza (celular filmando tela de 60 Hz). Pico barato: **câmera 3D inclinada em CSS** (`perspective` + `rotateX` sobre piso de grade; peça `piso-3d`). Quebras de modo: 5–7 por vídeo de 20–25 min.
9. **Motor.** `grao` é global (não por cena); o estilo MIX usa `cor {1,1,0}` e `vinheta` 0,25; `seguro` (zonas do Reels) é `false` nas peças do MIX; bruto com GOP ≈ 5 s: se o render medido vier lento, reencodar uma vez com `-g 30`.

## Calibração do cenário (obrigatória no 1º vídeo de cada cenário)
O MIX depende do cenário: onde fica o rosto, onde há parede lisa (área livre para cards e texto atrás da cabeça) e a cor da parede (contraste do texto). Meça em 4 quadros espalhados pelo bruto (ex.: 0:30, 6:40, 15:00, 21:40), com câmera fixa, e registre no plano do vídeo.

**Regras que valem para bruto 1080:**
- **Escala máxima de 1,20 no corpo.** 1,25 só em golpe de ≤ 1 s, conferindo a nitidez com `--trecho`. Push-in de 1,5–2× só com bruto 4K.
- **Com zoom 1,0 o `foco` não desloca nada:** o bruto tem o mesmo aspecto do quadro. A 1,12, o deslocamento lateral possível é de ~±115 px.
- **Cor:** se a cor do bruto já veio corrigida, `cor: {contraste: 1, saturacao: 1, calor: 0}` (não se empilha correção). `vinheta` 0,25; `grao` 0,03.
- **Junções internas** (silêncios já tirados no bruto) não aparecem na `montagem`, mas também precisam de reenquadramento (ver "Ritmo").

**O que medir (exemplo de um cenário de validação: parede clara alaranjada, abajur à esquerda, tablet à direita)**

| Elemento | Posição (fração do quadro) | Cor medida |
|---|---|---|
| Parede | fundo inteiro, em degradê | `#E26E3C` perto do abajur → `#DF7D4F` (x 0,3) → `#D5986D` à direita |
| Rosto | centro em x ≈ 0,47; olhos em y ≈ 0,27–0,29; cabeça de y 0,12 a 0,42 | — |
| Ombros e mãos | x 0,29–0,67; as mãos gesticulam até x ~0,62 | camisa clara |
| Objeto de cena 1 (abajur aceso) | x 0,05–0,26, y 0,05–0,88; lâmpada em ~(0,20; 0,21) | — |
| Objeto de cena 2 (tablet de costas) | x 0,64–0,92, y 0,62–0,88 | preto |
| Mesa | y > 0,88 | preta |

- **`foco` inicial** = centro do rosto medido (no exemplo, [0.47, 0.28]). Confirmar num quadro em resolução cheia antes da prévia. Os `enquadramentos` A/B1/B2/C do `estilos.ts` estão calibrados para esse exemplo: ajuste o `foco` deles ao seu rosto.
- **Área livre padrão:** a parede lisa do lado sem objetos (no exemplo, à direita: x 0,66–0,95 e y 0,06–0,58, acima do tablet). É ali que entram card, painel e título lateral.
- **Contraste sobre a parede (crítico):** meça o contraste de cada cor de texto contra a parede.

  | Texto | Contraste com a parede do exemplo |
  |---|---|
  | Acento laranja `#ff6a1a` | ≈ 1,1:1 (some) |
  | Creme `#F5F1EA` | 2,2–2,6:1 (fraco) |
  | Tinta escura `#1C0A06` | 6–7,8:1 (bom) |

  - **Com o rosto nítido, o texto direto numa parede clara sai só na tinta escura.** Creme e acento só entram sobre superfície escura: card de vidro escuro, rosto desfocado com `escurecer` ≥ 0,4 ou tela grade. Com parede escura, inverta (creme direto na parede).
- **Texto atrás da pessoa:** só na parede lisa acima e ao lado da cabeça. Objetos de cena não entram no recorte, que só pega o "humano": um texto atrás passaria na frente deles.
- **Ideia opcional:** um ponto de luz real do cenário (lâmpada) como o "ponto de luz" da ref. Mergulho na lâmpada (zoom até 1,25 + estouro de brilho) → tela escura com o ponto no mesmo lugar (continuidade de objeto).

## Formato
- **Quadro:** horizontal 16:9, **1920×1080, 30 fps** (`modelos.json`). A regra do Instagram (24 fps) não vale aqui.
- **Composição:** `MixEdit` (`MotorCamadas`), com `"modelo": "mix-edit-youtube"`. Render com `--gl=angle`, que já está no `modelos.json`.
- **Duração típica:** 10–25 min.
- **Áreas seguras:**
  - margem de 5% para tudo (96 px nas laterais, 54 px em cima e embaixo);
  - títulos a partir de 7,5% (144 px);
  - nada essencial abaixo de y 88% (barra do player e legenda CC);
  - canto inferior direito livre (x > 85%, y > 80%), para a marca d'água do canal;
  - nos últimos 5–20 s, a metade direita fica livre para os elementos da tela final do YouTube.
- **Legibilidade no celular em pé:** o 16:9 fica com ~390 pt de largura (escala ≈ 0,2).
  - Todo texto que precisa ser lido tem **maiúscula ≥ 44 px** (corpo ≥ 60 px).
  - Micro-rótulo abaixo disso é só textura.
- **Capítulos do YouTube:** 0:00 obrigatório, no mínimo 3, cada um com ≥ 10 s.

## Estrutura do vídeo
### Intro (0 a ~50 s), beat a beat
- **O quadro 0 já é o rosto falando a promessa do título.** A métrica "Intro" do YouTube Studio mede a % do público que passa dos 30 s.
- **Nada antes da fala:** sem ponto de luz, logo ou "fala, pessoal" no começo. A apresentação vem depois da pergunta e do título.
- **Tempos:** são alvos; o corte final segue a fala.
- **Beats 3 e 4:** pela regra consolidada, entram a **colagem em papel** (`colagem-papel`) e o **título em colagem stop-motion** (`colagem-titulo`, com a parada brusca da música). As versões abaixo (fotos-flash e tela escura) ficam como opção.

| # | Saída (s) | Duração | O que se vê | Peças | Som |
|---|---|---|---|---|---|
| 1 | 0,0–5,0 | 120–150 q | **Gancho falado.** Rosto com `zoom` `[1.00, 1.20]` `linear`. A 1ª palavra em ≤ 6 q e a palavra-chave do título nos 3 primeiros segundos. 1 `titulo` com 2–4 palavras-chave (para o autoplay mudo), na área livre, na cor que contrasta com a parede | `fala` + `titulo` | `risers/risers_03_riser-2` (6 s), vol 0,25, terminando no 1º cartão do beat 2 |
| 2 | 5,0–7,6 | 78 q | **Text Match Cut** (seção própria) | `tela` + `match-cut` (sobre `{pausa: 2.6}` ou sobre a fala) | ver a seção |
| 3 | 7,6–15,0 | 150–270 q | **Volta ao rosto** (a pergunta) com zoom no sentido oposto (`[1.18, 1.05]`, `suave`) + **colagem em papel** (padrão) ou 3–5 **flashes de fotos** nos substantivos (opção) | `fala` + `colagem-papel` (ou `flash-foto`) | flash de foto: `camera-shutters/camera-shutters_02_little-bit-hard-cammera-shutter`, vol 0,45 por foto |
| 4 | 15,0–20,0 | 90–180 q (manda a música) | **Título em colagem stop-motion** com a música parando seco (padrão) ou **tela escura com trilha crescente**: ponto de luz, título quente→frio, corte na última nota (opção) | `colagem-titulo` (ou `{pausa}` + `tela` `escuro` + `ponto-luz` + `titulo-quente`) | trilha sozinha; nenhum SFX na nota |
| 5 | 20,0–24,5 (validação: ~0:36) | 120–150 q | **Apresentação "Apple"** (≤ 5 s): cards de vidro com nome, credencial, ícones das redes e @. Mostra credencial, não "me segue" | `fala` + `apresentacao-redes` | `ui-sound-effects/ui-sound-effects_03_ui-premium-open` 0,55; `pop/pop_06_sweet-ui-open` 0,45 nos ícones |
| 6 | 24,5–34,0 | 150–300 q | **Rosto desfocado com infos técnicas** = prévia do vídeo ("NESTE VÍDEO" + 01/02/03), com termo técnico em card de dicionário | `fala` (`chaves` de desfoque) + `painel-tecnico` (+ `dicionario`) | `data-collect/data-collect_04_data-collect` 0,6 nos números; `ui-sound-effects/ui-sound-effects_21_v4-type-delete-2` 0,35 por linha |
| 7 | 34–50 | 2–3 golpes de 12–24 q | **3D flash** na frente e atrás da pessoa; entra o capítulo 1 | `golpes` / `texto-3d` / `objeto-3d` + `recortes` + `card-capitulo` | `whooshes/whooshes_20_epic-fast-whoosh-345469` 0,6 + `impact_sub` 0,5 |

**O capítulo 1 começa até 0:45–1:00.**

**Beat 3, opção flashes de fotos**
- **Fotos:** 6–10 q cada, em tela cheia.
- **Flash:** branco de 2 q a 60–80% (nunca 100%).
- **Efeitos:** aberração cromática de 10–14 px → 0 em 4 q; Ken Burns 1,00→1,05.
- **Rosto entre fotos:** ≥ 12 q.
- **Limite:** **≤ 3 flashes por segundo** (WCAG 2.3.1).
- **Fonte:** afirmação da pergunta só com fonte conferida.

**Beat 4, opção tela escura**
- **Fundo:** `#0D0E13` sem grade, como a abertura da ref.
- **Ponto de luz** (q 0–8):
  - acende no centro, em y 47%;
  - núcleo creme de 6–8 px + halo no acento de 60–120 px;
  - pulsa de 0,9 a 1,1 em 30 q;
  - cantoneiras "L" de visor a 3% das bordas (opcional).
- **Título** (2–4 palavras), nasce do ponto:
  - Inter Tight 900, caixa-alta, maiúscula 130–150 px, 1–1,5 q por letra (a crítica prefere a abertura leve: Inter Tight 300, caixa baixa, sublinhado);
  - cada letra chega no acento com glow e esfria para creme em 6–12 q, em onda da esquerda para a direita;
  - sublinhado de 2 px desenhando em 12 q (`entrada`);
  - subtítulo opcional em Instrument Serif itálica, 44–56 px, creme a 70%.
- **Câmera:** push de 1,00 a 1,04, `linear`.
- **Na última nota (±1 q):**
  1. estouro de brilho de 3 q (brightness 1→1,8);
  2. colapso para um ponto em 6–8 q (escala Y 1→0,02, X 1→0, `saida`);
  3. preto por 3–6 q;
  4. beat 5.

**Beat 5: apresentação**
- **Cards:** na área livre (no cenário de exemplo, à direita, em x 0,58–0,94 e y 0,24–0,76).
- **Enquadramento:** `zoom` 1,12 com o `foco` deslocado para o lado oposto aos cards (no exemplo, [0.9, 0.28]: o rosto vai de x 0,47 para ~0,42, ≈ 100 px, e abre a parede direita).
- **Material:** card de **vidro escuro** quando a parede é clara.
- **Entrada:** subida de 24 px + blur 12→0 + fade em 10–12 q (`entrada`), com cascata de 4 q entre cards.
- **Ícones:** mola `snappy`, 3 q entre eles.
- **Detalhes:** reflexo diagonal atravessando 1× em 18 q; gradiente do Instagram 1× no ícone.
- **Saída:** blur 0→12 + escala 0,96 em 8 q.

**Beat 6: rosto desfocado**
- **Rosto:** `desfoque` 20–24 px (≈ 1% W) + `escurecer` 0,4, entrando em 8–10 q (um bloco só, sem corte dentro).
- **Composição:** igual à da tela grade:
  - frase de apoio em cima (linha de base em y 21–27%);
  - objeto visual em y 55–60%;
  - grade opcional a 50%.
- **Linhas:** digitadas a ~2 q por letra, no tempo da fala.
- **Conectores:** desenhados por `evolvePath` em 10–14 q.
- **Dado de estudo:** sempre com `fonte`.

**Beat 7: 3D flash**
- **Golpe** (`golpes` na cena: `{t, dur, punch, flash, efeito}`): até 3 ingredientes:
  - flash de 2 q a 70%;
  - punch 1,0→1,10 em 4 q;
  - texto 3D, zoom-blur de 40–80 px→0 em 5–6 q, ou aberração de 10–14 px→0 em 3–4 q.
- **Motion blur:** `CameraMotionBlur` (6–8 amostras) só em trechos de até 24 q.
- **Orçamento de recorte na intro:** ≤ 6 s.

**Versão enxuta (~25 s)**, para temas sem manchetes reais ou com gancho curto:
- Ordem: 1 (0–4 s) → 3 (4–9) → `match-cut-tipo` (9–11) → 4 (11–15) → 6 com o roteiro (15–25) → capítulo 1.
- A apresentação passa para ~1:30 (4 s, card de vidro lateral) ou só para a tela final.

### Corpo
| Elemento | Regra |
|---|---|
| Capítulo | A cada 2,5–4 min (5–8 num vídeo de 20–25 min), nos cortes do roteiro. Os mesmos títulos vão para a descrição |
| Card de capítulo | 60–90 q, sobre rosto desfocado (24 px, `escurecer` 0,45) ou tela grade. `{pausa: 0.8–1.5}` opcional, com a trilha subindo |
| Re-gancho | No início de cada capítulo e em 40–50% do vídeo: uma frase sobre "o que vem" + teaser visual de 2–4 s. Reengajamentos fortes em ~3:00 e ~6:00 |
| Pico | 4–6 por vídeo, 1 por capítulo, ≥ 90 s entre picos, 60–120 q cada. Lugares: o número central, a virada mito × verdade, o mecanismo principal e a conclusão |
| Quebra de modo (troca de paleta: tela de acento, ficha de papel, papel rasgado) | 1 a cada 2–3 min, durando 2–6 s. Nunca o mesmo tipo duas vezes seguidas; cada tipo no máximo 3× |
| Gráfico | 1 por número verificável, no máximo 1 por minuto (6–12 por vídeo) |

### Fechamento e CTA
1. **Último capítulo:** ~4 s entre eventos. A conclusão é o último pico. O resumo entra num `checklist` de vidro na área livre (3–5 itens, no tempo da fala).
2. **CTA falado** ("se inscreve", "me segue"): **só aqui**, mais 1 menção curta opcional em 40–50%. Card de vidro com ícone e @ por 3–4 s.
3. **Tela final (10–20 s):** `tela` grade, ou rosto desfocado com `escurecer` 0,45, + `encerramento-youtube`.
   - O ponto de luz fecha o vídeo como abriu a tela escura (se usado).
   - @ e ícones ficam à esquerda (x 0,08–0,45).
   - **A metade direita fica livre** para o vídeo sugerido e o botão de inscrever, que o usuário posiciona no YouTube Studio. A peça desenha molduras-guia só na prévia (`guias: true`).
   - Trilha (se houver) com `fim` na última nota e `fade` 0,25.
4. **Pós-render:** os capítulos (com 0:00) vão para a descrição e o `.srt` vai como legenda (ver "Legenda").

## Ritmo (regras mensuráveis)
**O que a ref. principal mede (30 fps):**
- 24 trocas de painel em ~96 s.
- Intervalo médio entre trocas: 2,3 s (0–17 s) → 4 s (17–53 s) → 5,9 s (53–94 s).
- ~6,4 eventos/s no gancho e ~2,3/s no miolo.
- No máximo ~15 q sem elemento novo, sempre com algo ambiente vivo.
- Só 4 cortes secos, todos em troca de mundo.

| Medida | Ref. principal | Intro (0–50 s) | Corpo |
|---|---|---|---|
| Troca de ideia visual | mediana 100 q (3,3 s); 70 q em 0–17 s | 45–90 q | micro: mediana 120–180 q (4–6 s). Beat: a cada 600–1200 q (20–40 s), nunca > 1800 q (60 s) |
| Eventos | 6,4/s no gancho; 2,3/s no miolo | 4–6/s nos beats 2–3; 1–2/s nos outros | 10–15 por minuto (micro + beat) |
| Lacuna máxima sem evento | ~15 q | 45 q | 300 q (10 s) no rosto. Exceção: frase emocional até 450 q, com push-in contínuo ≥ 4% |
| Dentro de tela gráfica (painel, gráfico, grade) | algo novo a cada 10–45 q | igual | igual; nunca > 60 q sem elemento novo e sempre com algo ambiente vivo (deriva, glow, cursor) |
| Plano de fala sem troca | — | ≤ 150 q | 90–360 q (3–12 s); teto de 450 q (15 s) |
| Corte seco | só na troca de mundo | idem | idem + junções da fala (com reenquadramento) |

**Arco do corpo**
- Do 1º ao 3º minuto depois do gancho: mediana de 3–4 s entre eventos. É onde a queda de público é mais íngreme.
- Meio do vídeo: 5–6 s.
- Rampa de 2–3 s nos 10–15 s antes de cada pico.
- Último capítulo: ~4 s.

**Junções da fala** (as da `montagem` e as que já vêm dentro do bruto)
- **Toda junção muda o enquadramento**, com uma de três saídas:
  - escala ≥ 8% diferente;
  - `foco` x ≥ 0,08 diferente (só funciona com zoom ≥ 1,08);
  - cobrir a junção com B-roll, card ou tela.
  - Base: mais trocas de câmera dentro da mesma cena aumentam atenção e memória sem custo cognitivo (Lang 2000).
- Nunca dois planos seguidos no mesmo enquadramento.
- Junções a menos de 45 q uma da outra: de preferência não reenquadrar duas vezes (cobrir o trecho). **Nunca um plano com menos de 30 q trocando o enquadramento** (pisca o zoom).
- Dentro do rosto desfocado não há corte.
- **Corte:** sempre em fim de palavra (`palavras.json`), no grid de quadros.
- **Respiro:** sem respiro entre frases (aperto automático); pausa só onde a edição pede (título, capítulo).
- **Microfade:** 1–2 q na voz em cada junção (`microfade` 0,04 s no estilo MIX).

**Junções internas do bruto**
- **Como achar:** `node scripts/juncoes.mjs <proj>` (só por imagem: diferença de luminância entre quadros vizinhos, com cache em `02_analise/difs_quadros.json`; ~5 min para 25 min de bruto 1080p).
- O limiar do `assistir.mjs` (0,3) não pega jump cut no mesmo enquadramento.
- Conferir também nas folhas de quadros.

**Decupagem**
- Rodar `decupar.mjs` (fica a última tomada) e revisar `decupagem.md` lendo o texto.
- Erro que não se repete sai com `--tirar N`.

## Layouts e camadas
| Layout | Uso | % do corpo |
|---|---|---|
| `fala` A/B/C em tela cheia (ver "Movimento contínuo") | Padrão | 65–75% |
| `fala` + card ou painel na área livre | Lista curta, número, definição rápida, com a pessoa nítida | dentro dos 65–75% |
| `fala` desfocada + infos (`desfoque` 20–28 px, `escurecer` 0,35–0,45; o bloco inteiro numa cena só) | Definição, mecanismo, lista, roteiro. É o "beat" mais barato | 8–12% |
| `fala` + título atrás (recorte) | Conceito central | picos (≤ 4 usos, ≤ 10 s) |
| `tela` grade (mundo técnico) | Título-impacto, diagrama, gráfico, painel, manchete falada | 8–12% |
| `tela` acento, papel ou escura | Quebra de modo, beat 4 e tela final | 2–4% |
| `broll` com Ken Burns | Substantivo concreto, número, print de estudo | 8–12% |

**Cobertura total** (B-roll + telas + rosto desfocado): 25–35% do corpo, com teto de 40% num capítulo muito visual.

**Composição das telas gráficas** (vale também sobre o rosto desfocado):
- **Grade de layout:** 20 colunas de 96 px.
  - Margem mínima de 1,5 coluna (144 px).
  - Títulos nas colunas 2–3 (x 192–288).
- **Divisão vertical:**
  - frase falada no terço de cima, com linha de base em y 21–27%;
  - objeto visual com centro em y 55–60%;
  - rodapé (12–15% de baixo) vazio ou só com micro.
- **Respiro:** ≥ 60% do quadro é só fundo; no máximo 12 palavras legíveis por tela.
- **Alinhamento:** à esquerda, com frase e objeto na mesma borda esquerda. Só o título-impacto é centrado.
- **Duas colunas:** objeto com 44% W à esquerda, vão de ~58 px, lista com 48% W à direita.

**Hierarquia por tela**
- 1 destaque (título-impacto **ou** objeto) + 1 frase de apoio + 0–n micro-rótulos decorativos.
- Escala: título ≈ 4,2× a frase; frase ≈ 3,5× o micro.

**Sobre o rosto nítido**
- Fora dos picos, no máximo 1 peça por vez (+ rodapé de fonte).
- Nada na faixa de ±12% da altura em volta do rosto.
- Card nunca cobre o rosto. Grade nunca sobre o rosto nítido.

**Nos picos:** até 4 camadas ao mesmo tempo (vídeo + 3D + texto + efeito).

## Tipografia
- **Fonte:** A (Inter Tight + Instrument Serif); nada de fonte nova.
- **Pesos carregados:** Inter Tight 300/500/600/800/900; Instrument Serif itálica (a normal só onde a peça `dicionario` carrega).

| Papel | Fonte | Maiúscula (corpo) | Tracking e linha | Cor | Uso |
|---|---|---|---|---|---|
| Título-impacto | Inter Tight 900, caixa-alta | 200–250 px (275–345 px); 60–76% W; até 2 linhas, a 2ª com 80–100% da 1ª | −0,02em (mais aberto que o CUT); linha 0,9 | creme, com gradiente horizontal até gelo `#AFC8DA` na última sílaba; palavra-chave no acento | Tela grade: número ou conceito central |
| Palavra na tela de acento | Inter Tight 900, caixa-alta | 330–360 px (455–495 px); 60–76% W; 1 palavra | −0,02em | tinta `#1C0A06` | Quebra de modo, `match-cut-tipo` |
| Título com a pessoa | Inter Tight 900 | lateral: 110–150 px (150–205 px). Atrás da cabeça: 260–340 px, 70–80% W, y 12–45% | −0,02em | na parede clara, tinta `#1C0A06`; no escuro, creme ou acento | Conceito central com a pessoa em cena |
| Título da tela escura | Inter Tight 900, caixa-alta (ou 300 caixa baixa, ver crítica) | 130–150 px (180–205 px) | −0,02em | acento → creme | Beat 4 (opção) |
| Palavra-chave (sinalização) | Inter Tight 800–900 | 70–115 px (96–160 px) | −0,02em | na parede clara, tinta; no escuro, creme ou acento | 1–4 palavras sobre o rosto |
| Número | Inter Tight 900, `tabular-nums` | 100–130 px (140–180 px); em painel, 35–52 px (48–72 px) | −0,02em | creme, com o valor-chave no acento | Contador, gráfico, painel |
| Frase falada (apoio, manchete falada) | Inter Tight 600, sentence case | 44–56 px (60–77 px); 1 linha ≤ 66% W; 2ª linha a 1,63× a maiúscula (base a base) | −0,02em | creme a 85%; palavra ativa no acento | Telas gráficas e rosto desfocado |
| Abertura leve | Inter Tight 300 | 90–100 px (~130 px), ~70% W, sublinhado de 2–3 px no acento | +0,01em | creme | 1ª frase de uma tela escura |
| Serifa | Instrument Serif itálica | corpo de 72–96 px no título de capítulo; 44–56 px no subtítulo; 40 px na credencial | −0,01em | creme (70–100%) | Elegância, contraste com a grotesca |
| Dicionário | Instrument Serif **normal** + itálica | entrada com corpo de 110–130 px; definições em itálica de 30–36 px, entrelinha 1,6 | — | creme; as sílabas viram acento da esquerda para a direita | Termo técnico (ex.: "pro·cras·ti·na·ção") |
| Rótulo de painel | Inter Tight 500–600, caixa-alta | corpo de 20–24 px | +0,08 a +0,16em, `tnum` | creme a 60% / `#8A8F9C` | Apoio. Nada essencial fica só no rótulo |
| Micro (meta, "Fig. 1 —") | Inter Tight 600 caixa-alta, 16–22 px; "Fig." em Instrument Serif itálica, 24–28 px | — | +0,16em | `#9C9CA8` | Textura (ilegível no celular) |
| Fonte do dado | Inter Tight 500 | corpo de **26 px** numa linha (20 px no mínimo; nunca > 2 linhas) | — | creme a 70% | Peça `fonte` e rodapés |
| Marca | Inter Tight 600 | @ com corpo de 36–40 px | — | creme | Apresentação e tela final |

- **Mono para código ou prompt:** **não**, por padrão (a fonte está decidida). O painel usa Inter Tight 500 com `tnum`.
- **Gelo:** nunca em palavra solta.

### Animações de texto (q a 30 fps)
**Entradas**

| Nome | Como | Uso | Ref |
|---|---|---|---|
| Cascata Apple (`titulo`) | Palavra por palavra: blur 12→0, subida de 0,35em, escala 0,92→1, em 11 q (`entrada`), cascata de 2–3 q | Padrão do corpo | pesquisa Apple |
| Digitação quente | 1–1,5 q por letra em título (2 q quando acompanha a fala). A letra nasce no acento com glow e 1 q de blur, sem interpolar posição, e esfria para creme 6–12 q depois, em onda (atraso de 1–1,5 q por letra) | Títulos de tela escura e grade | 1,77–3,3; 4,0–5,0 |
| Fantasma | A linha aparece antes só em contorno (1,5 px, `#9AA0B0` a 40%); depois o preenchimento varre da esquerda para a direita | Variante da digitação | q194–204 |
| Slam (palavra batendo) | Escala 1,10–1,15→1 e blur 10→0 px em 2–3 q (expo-out), sem overshoot. O glow decai em 8–12 q | Título-impacto, palavra de pico | q371, q382, q2790 |
| Karaokê | A palavra surge em cinza fantasma (35%) quando a fala dela começa, enche no acento letra a letra junto com a fala e vira creme quando a próxima começa. A próxima não aparece antes da hora | Manchete falada | 3,3–8,0 |
| Máscara de linha | Cada linha sobe de translateY 100% para 0 dentro de `overflow: hidden`, em 14–18 q, com defasagem de 4 q | Listas e frases longas em card | pesquisa Apple |
| Texto vira cabeçalho | A frase sobe e encolhe para ~70% em 4 q (expo-out) e passa a ser o título da tela seguinte | Continuidade entre telas | 3,30 |
| Contador | Conta em 30–45 q (expo-out, `Intl.NumberFormat('pt-BR')`) e assenta com escala 1,04→1 em 6 q. Variante caça-níquel: 6–8 q por dígito, em sequência; sublinhado desenhado em 8 q | Números | q395–420 |
| Palavra por batida | 1 palavra por tela, trocando no ritmo da fala (2–13 q por palavra; a última segura 15 q), com 1 q de fantasma sobreposto na troca | Tela de acento | 31,3–33,3 |

**Saídas**
- **Apple (padrão):** 9–12 q, ease-in, blur 0→10 px, subida de −20 px. O `titulo` sai assim: 9 q, blur 14.
- **Chicote:** 3 q em expo-in + blur direcional crescente até 20–40 px, sem fade. Usar na troca entre telas.
- **Outras:** o texto vira cabeçalho (continuidade) ou morre no corte da cena.
- **Sobreposição mínima entre saída e entrada:** 1 q.

**Brilho e sombra**
- Texto no acento: glow na cor do acento, ex. `0 0 18px <acento a 55%>, 0 0 48px <acento a 25%>`, para maiúscula de ~150 px; escalar na proporção.
- Título creme: `0 0 30px rgba(245,241,234,.18)`.
- Creme sobre o rosto escurecido: `0 4px 14px rgba(0,0,0,.35)`.
- Tinta escura sobre parede clara: sem sombra.

## Legenda
- **Padrão do MIX: sem legenda queimada** (`legenda: false` no estilo). Motivos:
  - texto que repete a narração piora a aprendizagem (Mayer, redundância);
  - a dublagem automática do YouTube e a TV mostrariam o texto queimado;
  - a legenda CC atende acessibilidade e busca.
- **Legenda CC:**
  - gerar um `.srt` PT-BR a partir do `palavras.json` **corrigido** (`corrigir-palavras.mjs`) e **no tempo da saída** com `scripts/srt-saida.mjs` (o `palavras.srt` do `assistir.mjs` está no tempo do bruto);
  - o arquivo sobe no YouTube como legenda.
- **Texto queimado é sinalização** (palavra-chave junto do gráfico ajuda, pelo próprio Mayer):
  - 1–4 palavras: palavra-chave, número, termo ou nome de estudo;
  - frequência: 1 a cada 10–20 s (≈ 1 em cada 3–4 frases);
  - no ar: 0,5 s + 0,33 s por palavra, com mínimo de 45 q e padrão de 60–90 q;
  - entrada: blur 8→0 + subida de 2% da altura em 6–10 q; saída em 6–9 q;
  - **primeiros 5 s: palavras-chave na tela**, por causa do autoplay mudo no feed.
- **Manchete falada:** só em telas gráficas e no rosto desfocado. É a frase dita em 1 linha no topo à esquerda (x 7,5–10%, linha de base em y 21–27%), com karaokê no acento.
- **Se o usuário pedir legenda queimada:** `legenda: true` (legenda padrão do motor, palavra a palavra) com `legendaY` 0,82, para não passar de y 88%.
- **Transcrição:** corrigir antes da prévia continua obrigatório, porque os textos queimados e o SRT saem dela.

## Text Match Cut
**Definição:** a mesma palavra fica travada no mesmo ponto da tela enquanto o layout em volta troca muito rápido. São 8–12 trocas por segundo, 1 palavra focal e um som percussivo curto.

| Parâmetro | Valor |
|---|---|
| Palavra focal | 1 (ex.: "café", "juros") |
| Âncora | Centro da caixa da palavra em (960, 500) px = (0,5; 0,463) |
| Altura da caixa da palavra | 120 px (11% H), igual em todos os cartões rápidos. A largura segue a fonte do veículo |
| Prints | 15 reais. Mínimo 8; com menos, alongar os cartões para 4–6 q e nunca repetir print |
| Rampa (q) | 8, 6, 5, 4, 4, 3, 3, 3, 2, 2, 2, 2, 2, 2 = 48 q (mediana de 3 q ≈ 10 trocas/s). Mínimo de 2 q: 1 q vira tremida |
| Último cartão (hold) | 30 q no print mais forte. q 0–4 parado; q 4–18, recuo ancorado até a manchete inteira **e o veículo** caberem em 1728×880 px (`entrada`); a partir do q 10, rodapé `fonte` ("Veículo, dd/mm/aaaa") |
| Push | Escala global de 1,00 a 1,06 (`linear`) nos cartões rápidos, ancorada na palavra |
| Destaque | Caixa na cor de acento em `multiply` a 85%; padding de 0,15×h na horizontal e 0,08×h na vertical; raio de 6 px. Nasce no 1º cartão (`scaleX` 0→1 em 4 q, da esquerda) e fica; a largura acompanha cada palavra |
| Fora do print | `#0D0E13` + o próprio print desfocado em 40 px a 30%; vinheta 0,35; grão 0,04 |
| Luminância | Só prints claros (sem modo escuro alternando). No máximo 3 inversões por segundo de ≥ 10% de luminância em > 25% da tela |
| Deriva | ≤ 2 px, conferida com `debug` numa folha recortada em volta da âncora |
| Som | `camera-shutters/camera-shutters_01_camera-shutter` 0,4 só nos cartões de ≥ 4 q. 1 `risers/risers_02_rjd-riser` (1,0 s) terminando no hold. `clicks/clicks_01_cinematic-click` 0,6 no 1º q do hold |

**Ética (regra do formato)**
- **Só print real, intacto e com o veículo visível.**
  - Sem IA: nem gerar, nem "melhorar".
  - Sem templates que imitam veículos nem ferramentas que geram manchete por IA.
  - Sem montar manchete com fonte de jornal.
- **O destaque é anotação nossa por cima** (`multiply`, letras intactas). O hold mostra a manchete inteira, para o recorte não mudar o sentido. Exemplo do risco: travar "juros" em "juros não vão cair".
- **A manchete diz o que a fala diz.** Nada de manchete de outro contexto usada como "prova".
- **Registro** de cada print: arquivo, caixa da palavra, caixa da manchete, veículo, URL, data da matéria e data de acesso (o `capturar-manchete.mjs` grava em `04_broll/internet/capturas.json`).
- **Alternativa sem manchetes: `match-cut-tipo`.** Usa as fontes do kit e nunca simula jornal. Dois modos:
  - **palavra por tela:** tinta `#1C0A06` sobre o acento, Inter Tight 900, 60–74% W, 10–20 q por palavra, no ritmo da fala;
  - **frases-tema:** a palavra travada no centro e o resto mudando ("FOCO SE TREINA?", "O FOCO ACABOU?"), em 8–12 tratamentos (Inter Tight 300/500/800/900, Instrument Serif itálica; creme, acento ou tinta sobre acento).
- **Opção de autoridade:** títulos reais de estudos (ex.: Google Scholar), layout idêntico, revista visível. A palavra pode ficar em inglês: decisão do usuário.

**Captura dos prints**
- **Fontes, em ordem:** Google Notícias (o card já junta veículo e manchete) → página da matéria.
  - Recusar cookies não essenciais.
  - **Não contornar paywall nem CAPTCHA:** se o site bloquear, pular.
- **Caminho A (padrão): `capturar-manchete.mjs`.** Chrome invisível com perfil novo (sem login nem cookies), recusa os cookies não essenciais quando há botão, põe o título a ~30% da altura e fotografa em alta resolução; mede no HTML a caixa da palavra e a do título (vão direto para a peça `match-cut`, `itens[].caixa` e `caixaManchete`).
  - `node scripts/capturar-manchete.mjs <proj> <id> <url> --palavra <Palavra> [--seletor "h1"] [--largura 1440] [--altura 900] [--escala 2] [--esperar 4] [--posicao 0.3]` → `04_broll/internet/<id>.png` + registro em `04_broll/internet/capturas.json`.
- **Caminho B: Claude in Chrome** (o seu Chrome), quando a página só abre logado:
  1. Zoom do navegador em 175–200%.
  2. Rodar a função abaixo no `javascript_tool`. Ela devolve a caixa em px do print; no Chrome, o `devicePixelRatio` já inclui o zoom.
  3. Capturar e salvar em `04_broll/internet/<id>.png`.
  - Se a captura vier reduzida, multiplicar a caixa por `larguraPNG / (innerWidth × dpr)`.
- **Caminho C:** caixa digitada à mão e conferida com `debug`.
- **Qualidade:** a palavra precisa ter ≥ 100 px de altura de caixa no PNG (escala ≤ 1,2; nunca ampliar mais de 1,3×).

```js
async (palavra) => {
  await document.fonts.ready;
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${palavra}(?![\\p{L}\\p{N}])`, 'iu');
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = w.nextNode()); ) {
    const m = re.exec(n.data); const h = n.parentElement?.closest('h1,h2,h3,[role=heading]');
    if (!m || !h) continue;
    h.scrollIntoView({block: 'center', behavior: 'instant'});
    const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length);
    const b = r.getBoundingClientRect(), d = devicePixelRatio;
    return {caixa: [b.x * d, b.y * d, b.width * d, b.height * d], largura: innerWidth * d, altura: innerHeight * d,
      manchete: h.innerText, veiculo: document.querySelector('meta[property="og:site_name"]')?.content,
      data: document.querySelector('meta[property="article:published_time"]')?.content, url: location.href};
  }
}
```

## Motion e efeitos (catálogo: quando usar)
| Efeito (peça) | Linguagem | Quando usar | Duração | Máx. por vídeo | Ref |
|---|---|---|---|---|---|
| Card de vidro (`card-vidro`) | Apple | Lista curta, número, credencial, definição ao lado do rosto | 90–240 q (entrada em 15–18 q) | livre (é o beat padrão) | 43,0–44,0 (reflexo) |
| Checklist de vidro (`checklist`) | Apple | Solução ou resumo em itens | 4–10 s | 2 | CUT |
| Painel técnico (`painel-tecnico`) | ref | Mecanismo; roteiro "NESTE VÍDEO", sobre rosto desfocado ou grade | 150–300 q | 1 por capítulo | 19,6; 30,5; 47,6 |
| Manchete falada (`manchete-falada`) | ref | Junto com toda tela gráfica de mecanismo | a da tela | — | 3,3–8,0 |
| Título-impacto com slam (`palavra-impacto` com `entrada: 'pop'`) | ref | Número ou conceito central na tela grade | 45–90 q | 1 por capítulo | 5,0; 13,6; 93,7 |
| Título quente→frio (`titulo-quente`) | ref | Tela escura (beat 4, opção), abertura de capítulo forte | 60–150 q | 2–3 | 1,77–3,3; 12,3–13,6 |
| Colagem em papel (`colagem-papel`) | ref. de intro | Beat 3 da intro: palavra/número grande no acento, caneta circulando, foto P&B rasgada | — | intro | ref. de intro |
| Título em colagem stop-motion (`colagem-titulo`) | ref. de intro | Beat 4 da intro, com a parada brusca da música | — | 1 | ref. de intro |
| Dicionário (`dicionario`) | ref | Termo técnico (ex.: "procrastinação", "inflação") | 90–150 q | 2–3 | 64–67 |
| Diff mito/verdade (`diff`) | ref | "− fazer tudo ao mesmo tempo / + uma coisa por vez" | 60–120 q | 2 | 75 |
| Ficha de papel (`ficha-papel`) | ref | Quebra de modo: mitos riscados à caneta (8 q, curva `risco`), carimbo "MITO" girado −5°, ☒ e ✓. Claramente gráfica: sem timbre, registro profissional ou cara de documento oficial | 120–300 q | 2 | 53,7–64; 82–88 |
| Tela de acento (`match-cut-tipo`, modo palavra) | ref | Quebra de modo: frase de virada em 3–6 palavras | 45–75 q | 1–2 | 31,3–33,3 |
| Gráfico de barras (`grafico-barras`) | Apple + ref | Comparação de 2–4 valores. Monta em 45–75 q, segura ≥ 60 q, sai em 10–12 q | 150–270 q | ≤ 1/min | Tela Dividida |
| Gráfico de linha (`grafico-linha`) | ref | Curva no tempo (ex.: audiência ao longo do dia, preço ao longo dos anos). A linha desenha em 16 q por segmento (`desenho`), com cabeça de glow e anéis no ponto final | 150–270 q | ≤ 1/min | 66,6–78,5 |
| Contador (`contador`) | Apple | Número isolado | 60–120 q | — | 13,6 |
| Escala (`escala-ph`: `min`, `max`, `normal`, `titulo` e rótulos configuráveis; o padrão é uma escala de pH) | Apple | Valor numa faixa (ex.: horas de foco de 0 a 8, com a faixa recomendada destacada) | 4–10 s | 1–2 | CUT |
| Traços e conectores | ref | Ligar rótulo a objeto, sublinhar, X de negação. Ponta no acento esfriando para creme | 3–14 q por traço | — | q111–359 |
| Faísca ou cometa | ref | Ponta de linha chegando. Impacto: anéis em 5–6 q + partículas por 8–10 q | 6–10 q | — | 11,33 |
| Ponto de luz (`ponto-luz`) | ref | Abre a tela escura e fecha o vídeo (se usado); é o fio condutor | — | 2–3 | 0–1,75; 94–98 |
| Flash de fotos (`flash-foto`) | 3D flash | Beat 3 da intro (opção); re-gancho com 2–3 fotos | 6–10 q por foto | intro + 1–2 | briefing |
| Texto 3D extrudado (`texto-3d`) | 3D flash | Palavra de pico. Entra em rotateY 70°→−5°→0° e z de −800 a 0 em 8–12 q (mola com bounce 0,15); segura 15–30 q com deriva de 4°/s; sai voando para a câmera (escala 1→2,5 + blur de 40 px) em 4–6 q | 30–48 q | 1 por pico | 5,33 |
| Objeto 3D (`objeto-3d`) | 3D flash | Objeto do tema (ex.: relógio, xícara, lâmpada) passando rente à câmera como wipe, ou orbitando atrás da cabeça | 12–48 q | 2–3 | TesteKit |
| Piso 3D (`piso-3d`) | ref | Câmera 3D inclinada em CSS sobre piso de grade | — | pico barato | 21–31 |
| Golpe (`golpes` na cena) | 3D flash | Picos e beat 7. Até 3 ingredientes: flash de 2 q a 70%; punch 1,0→1,10 em 4 q ou recuo 1,12→1,0 em 8 q; zoom-blur de 40–80 px→0 em 5–6 q ou aberração de 10–14 px→0 em 3–4 q | ≤ 20 q | 1–2 por pico | pesquisa 3D flash |
| Texto atrás da pessoa (`recortes` + `plano: "atras"`) | 3D flash | Conceito central; 1ª palavra de um capítulo forte | 36–90 q | ≤ 4 usos, ≤ 10 s | CUT |
| Caixa de seleção (`selecao`) | CUT | A palavra do mito que o público acha que importa | 30–45 q | 2 | CUT |
| Papel rasgado (`papel-rasgado`) | CUT | Número revelado; quebra de modo | 32–45 q | 1 | CUT |
| Light leak | Apple | Só na entrada do card de capítulo (não implementado no motor) | 12–20 q | 1 por capítulo | — |

**Motion blur**
- Filtro SVG direcional (barato) em chicotes e voos.
- `CameraMotionBlur` (6–8 amostras) só em trechos de ≤ 12–24 q.
- Eco de saída com `Trail` (4–6 camadas): ideia não implementada.

**Não usar:**
- tremida de câmera, RGB split contínuo, glitch, posterize ou "look de filme retrô", neon, mais de um acento;
- flash branco fora dos picos;
- vidro sobre fundo liso: vira "plástico sujo"; usar card sólido `#141416`;
- o tema da ref (editor de curvas, código, wireframes de software).

## Transições (campo `transicao`: como a cena ENTRA)
Lógica da ref: **dentro do mesmo mundo, a troca é por movimento**. Corte seco só na troca de mundo (rosto ↔ grade técnica ↔ papel ↔ tela de acento) e nas junções da fala, com reenquadramento.

| Nome | Duração | Quando | % das trocas | Som automático (Motionix) |
|---|---|---|---|---|
| `corte` (com reenquadramento) | 0 | Junções da fala; troca de mundo | ~70% | — |
| `lente` | 2 q de desfoque na saída + corte seco + 4 q de foco (26 px, escala 1,03→1) | Troca de ideia no rosto | ~15% | `whooshes_14_simple-whoosh` em 1 de cada 3, vol 0,55 no MIX (`volTrans`) |
| `chicote` | Saída em 3 q (expo-in, blur direcional, deslocamento até 45% W) + entrada em 4 q já em movimento no mesmo sentido, com o blur caindo; `direcao` `esq`/`dir` | Entre telas gráficas e gráficos; rosto ↔ tela no mesmo assunto | ~10% | `whooshes_16_smooth-and-fast-whoosh` 0,5 |
| `mergulho` | 11 q de saída + 10 de entrada, ease-in num ponto-alvo (`alvo: [x, y]`), terminando no escuro | Entrar num detalhe; tela → beat 4 | ≤ 1 por capítulo | `whooshes_03_cinematic-fast-whoosh` (vol 1 no MIX) |
| `zoom` | 7 q (escala 1,22→1 + blur de 16 px) | Corte disfarçado de ângulo | ≤ 1 por capítulo | `whooshes_20_epic-fast-whoosh-345469` 0,45 |
| `blur` | 9 q, crossfade | Só na entrada e saída do card de capítulo e da tela final | ≤ 2 por capítulo | `whooshes_16_smooth-and-fast-whoosh` 0,35 |
| `flash` | Pico de 2 q a 70% + decaimento de 6 q (`trans.flash` [2, 6], `flashPico` 0,7) | Só nos picos | ≤ 2 por pico | `camera-shutters_03_smooth-cammera-shutter` 0,45 |
| `esticao` | 3 q de esticão vertical de pixels (scaleY 1→3 + blur vertical) | Troca de tela no mesmo mundo; variação do chicote | ≤ 3 por vídeo | `whooshes_08_fast-whoosh` (vol 1 no MIX) |
| `silhueta` | — | **Não usar no MIX** (é assinatura do CUT) | 0 | — |

- **Estouro + colapso para um ponto:** saída especial da tela escura e do fim do vídeo. Faz parte do `titulo-quente` e do `ponto-luz`.
- **Continuidade de objeto** vale mais que qualquer transição: frase → cabeçalho, ponto → linha → moldura, card → tela. Use sempre que a peça permitir.
- **Momento do corte:** a transição cai sempre em fim de palavra.

## Movimento contínuo (zoom, câmera e tokens de curva)
### Tokens de movimento (30 fps)
| Token | q (s) | Curva (cubic-bezier) | Uso |
|---|---|---|---|
| `micro` | 2 (0,067) | expo-out (0.16, 1, 0.3, 1) | Dissolve, esticão, blur→nítido do slam, troca de cor |
| `rapido` | 4 (0,133) | expo-out | Entrada de palavra, texto virando cabeçalho, achatamento |
| `base` | 8 (0,267) | expo-out; pan em `suave` (0.65, 0, 0.35, 1) | Linha curta, conector, pan curto, contorno |
| `lento` | 12 (0,4) | push: expo-out. Mergulho: (0.55, 0, 1, 0.45). Relayout: `expo` (0.87, 0, 0.13, 1) | Push-in, mergulho, card |
| `desenho` | 16 (0,533) | (0.25, 0.15, 0.5, 1) | Arco, moldura dobrando a esquina, gráfico desenhando |
| `risco` | 8 (0,267) | (0.37, 0, 0.63, 1) | Tachado, X, caneta |
| `assento` | 14 (0,467) | quint-out (0.22, 1, 0.36, 1) | Câmera assentando depois de movimento grande |
| `saida` (Apple) | 9–12 (0,3–0,4) | expo-in (0.7, 0, 0.84, 0) | Saída de card e título, com blur 0→10 |
| `chicote` | 3 (0,1) | expo-in + blur direcional de 20–40 px | Saída por chicote, sem fade |
| `ambiente` | ≥ 90 (3 s) | linear ou seno | Deriva, órbita, glow pulsando |

- Os tokens globais do kit (`src/kit/tempo.ts`, `DUR`) são compartilhados com o CUT: mudança neles muda o CUT aprovado. Tokens novos entram ao lado, nunca no lugar.

**Molas**
- A mola padrão do Remotion (stiffness 100, damping 10, fator 0,5) está **proibida**.
- Predefinições da Apple (mass 1):

  | Mola | Stiffness | Damping | Uso |
  |---|---|---|---|
  | `smooth` (0,5 s) | 158 | 25 | padrão |
  | `snappy` | 158 | 21 | pop de ícone |
  | `bouncy` | 158 | 18 | só 3D |
  | elementos pequenos (0,35 s) | 322 | 36 | — |

- Confira com `measureSpring()` quantos quadros cada mola leva para assentar.
- Fora de ícone e 3D: **nenhum overshoot visível**. A `imagem` do kit usa damping 12 e passa do ponto: evite-a onde o overshoot apareça.

**Regras de timing**
- **Cascata:** letras a cada 1–1,5 q (2 q com a fala); palavras a cada 2–3 q; filhos de card a cada 3–5 q.
- **Sobreposição mínima entre saída e entrada:** 1 q.
- **Esfriamento de cor:** 6–12 q por letra, em onda. A cor continua animando depois que a posição parou, e o olho ainda vê movimento.
- **Blur só no pico de velocidade (2–4 q).** O assentamento é sempre nítido.

### Zoom na pessoa (bruto 1080; `enquadramentos` do estilo e campo `enquadramento` da cena)
| Enquadramento | Escala | `foco` (cenário de exemplo) | Parcela do corpo |
|---|---|---|---|
| A, aberto | 1,00–1,03 | não desloca | 45–55% |
| B1, médio centrado | 1,10–1,12 | centro do rosto ([0.47, 0.28]) | 30–40% (B1 + B2) |
| B2, médio com a área livre aberta | 1,10–1,12 | deslocado para o lado oposto à área livre ([0.9, 0.28]: rosto em x ≈ 0,42) | (junto com B1) |
| C, close | 1,18–1,20 | centro do rosto ([0.47, 0.28]) | ≤ 15%, no máximo 3–4 s seguidos |

- **Zoom contínuo em todo plano:** 2–4%, alternando o sentido, com `curva` `suave`. Exemplos: A `[1.00, 1.03]`, B `[1.12, 1.09]`, C `[1.18, 1.20]`.
  - Use `enquadramento: 'A' | 'B1' | 'B2' | 'C'` na cena (o gerador faz o rodízio) ou declare `zoom`/`foco` (têm prioridade).
- **Frase-chave:** push-in de 6–8% em 60–90 q, com `entrada`.
- **Gancho:** `[1.00, 1.20]` `linear` em ~5 s. Beat 3: `[1.18, 1.05]` `suave`.
- **Rosto desfocado:** o motor amplia o vídeo em 1 + 2,5 × desfoque / 1080 para esconder a borda (≈ 1,05 a 24 px). Isso conta como escala.
- **`chaves`:** zoom, desfoque e escurecer animados. O rosto desfoca em 9 q (`entrada`) e volta em 9 q (`saida`), só nas pontas do bloco desfocado (cena que continua um bloco começa com a chave `{t: 0, desfoque: 24, escurecer: 0.45}`, sem rampa).

### Câmera virtual nas telas gráficas
- **Nunca parada:** deriva de 1,00 para 1,03–1,08 em ≥ 90 q (`linear`), ou órbita leve de 1–2°.
- **Push-in:** 1,0→1,2 em 12 q (expo-out), com blur só nos 4–5 q iniciais.
- **Pan para revelar o próximo painel:** 10–15% W em 12–18 q, `suave`; às vezes em 2 tempos (6 + 5 q).
- **Assentamento** depois de movimento grande: 12–14 q (`assento`).
- **No motor:** a cena `tela` aceita `zoom`, `foco` e `chaves` (câmera virtual no fundo); camadas com `camera: true` andam junto.

## Cor e acabamento
Proporção 60/30/10: 60% escuro (ou a parede), 30% creme, 10% acento. Valores do `estilos.ts` (MIX), paleta padrão do framework (troque pela sua):

| Papel | Hex | Uso e contraste |
|---|---|---|
| Fundo técnico | `#0D0E13` (`fundoEscuro`) | Tela grade e escura; levemente azulado, como a ref |
| Linha da grade | `#222634`, 1,5 px, passo de **96 px** (`grade`) | Linhas passando pelo centro (960, 540). Só em tela grade e sobre rosto desfocado (a 50%). Testar 1,5–2 px a 8–10% contra a compressão do YouTube |
| Luz de topo | elipse de 60% W × 50% H, centro em y −10%, branco a 4–6% (`grade.luz` 0,05) | Tela grade |
| Texto | creme `#F5F1EA` | Identidade |
| Acento | carmim `#B90015` | 1 conceito por tela, < 5% da área. **Nunca direto sobre parede clara do cenário** |
| Texto sobre o acento e sobre parede clara | tinta `#1C0A06` | Bom contraste sobre o acento e sobre parede clara |
| Gelo (2ª cor) | `#AFC8DA` | Só no fim do gradiente dos títulos e em objetos de "estado novo" |
| Cinza de apoio | `#9C9CA8` (rótulos em `#8A8F9C`) | — |
| Contorno fantasma | `#9AA0B0` a 40% | — |
| Painel | preenchimento `#0A0B0F` a 92% (esconde a grade); traço de 1,5–2 px `#C9CFDA` a 75% | Cantoneiras "+" ou "L" de 12–16 px. Borda tracejada 8/6 = "não existe" |
| Card sólido | `#141416` | Sobre fundo liso |
| Papel | `#EFEBE4`, tinta `#C2381A` | A tinta dá 4,5:1 no papel |
| Acento profundo | `#5E0E06` | Extrusão 3D, gradiente de card |

**Vidro (`card-vidro`)**
- **Sobre imagem rica** (rosto desfocado, B-roll):

  | Propriedade | Valor |
  |---|---|
  | Fundo | rgba(255,255,255,.08–.12) |
  | Filtro | `backdrop-filter: blur(20–28px) saturate(140–180%)` |
  | Borda | 1 px rgba(255,255,255,.18) |
  | Sombra | `0 20px 60px rgba(0,0,0,.35)` |
  | Brilho de borda | `inset 0 1px 0 rgba(255,255,255,.3)` |
  | Medidas | raio de 28–36 px, padding de 40–48 px, largura de 560–720 px |

- **Sobre parede clara (rosto nítido): vidro escuro**, rgba(13,14,19,.55–.70) + blur de 24 px, para o creme ler. O `checklist` já faz assim (`vidro` 0,55).
- **Sobre a grade lisa:** card sólido `#141416` ou painel. O vidro sobre fundo liso some.
- **Custo:** animar só a opacidade e chegar ao blur final em ≤ 15 q. Blur de backdrop animado é caro.

**Pessoa**
- Cor neutra quando o bruto já vem corrigido. Pele natural: o "punch" de cor vem dos grafismos.
- `vinheta` 0,25: com parede clara, mais que isso suja os cantos.
- `grao` 0,03 (global).

**Flashes (WCAG 2.3.1)**
- No máximo 3 por segundo.
- Flash a 60–80%, nunca 100%.
- Sem flash vermelho saturado em tela cheia.
- A tela de acento cheia entra e sai com corte seco (1 inversão por troca).

## Marca (@seu_perfil)
- **Sem @ fixo durante o vídeo.** No YouTube o nome do canal já aparece.
  - A marca d'água do canal é ativada pelo próprio usuário no YouTube Studio (canto inferior direito, que fica livre).
- **Apresentação** (beat 5, ≤ 5 s): mostra credencial, não "me segue". Dados em `02_BIBLIOTECA/kit/marca/marca.json`:
  - nome de exibição;
  - redes e o @ de cada uma;
  - credenciais (registro profissional, especializações), se houver;
  - números (só os que o usuário fornecer e quiser mostrar).
- O @ dos cards vem do campo `arroba` do estilo (`estilos.ts`) ou do parâmetro `arroba` da peça: deixe igual ao de `marca.json`.
- **Ícones das redes:** `simple-icons` (Instagram, YouTube, TikTok…), em creme monocromático, 44 px.
  - Gradiente do Instagram (`#FEDA75→#D62976→#962FBF→#4F5BD5`) 1× na apresentação e 1× na tela final, por 48 q.
- **Ícones de informação:** `lucide-react`, traço 1,5 no viewBox de 24, 64–88 px, desenhados por `evolvePath` em 15–20 q.
- **CTA** ("se inscreve", "me segue"): só no fechamento, mais 1 menção opcional em 40–50%.
- **Assinatura da tela final:** ícone do Instagram em creme → gradiente → creme, com o @ embaixo.
- **Não copiar da ref:** título fixo, ícones de apps, @ do criador.

## B-roll
- **Sem repetição visual** (regra comum). Termos recorrentes (ex.: "tempo", "foco", "dinheiro") ganham 3–5 variações. Liste os `broll` repetidos antes da prévia.
- **Cobertura:**
  - 25–35% do corpo, somando as telas e o rosto desfocado;
  - plano de B-roll de 3–6 s (90–180 q);
  - no máximo 3 planos seguidos (12 s); voltar ao rosto em ≤ 15 s.
- **Literal, nunca decorativo.** Entra 0–6 q antes do substantivo concreto ou do número. Imagem decorativa atrapalha ("detalhes sedutores": g = −0,33, pior com imagem estática).
- **Ken Burns:** vídeo com 4–8%; foto com 8–12%.
- **Ordem por custo:**
  1. rosto desfocado + card de vidro;
  2. tela grade com diagrama e manchete falada;
  3. biblioteca (`biblioteca.mjs buscar`), depois `04_broll/meus`;
  4. banco gratuito (`stock.mjs`), sempre revisado numa folha de miniaturas;
  5. imagem gerada por IA com Ken Burns (Flow, API Gemini via `gen.mjs`, ChatGPT Imagens, Higgsfield via MCP: `docs/03-IMAGENS-E-BROLL.md`);
  6. vídeo gerado por IA, só com aprovação de custo.
- **Conta para 20 min:** 5–7 min de cobertura ≈ 70–90 inserções sem repetir. Metade sai em telas por código (sem custo de busca) e metade em B-roll.
- **Print de estudo ou manchete:**
  - intacto, com o veículo ou a revista visível;
  - 3–5 s, push-in de 5%;
  - marca-texto no acento a 35% (`multiply`) no trecho citado;
  - acompanhado da peça `fonte`.
- **Fotos da intro:** banco, gerador de imagem ou domínio público. Nunca "melhorar" foto achada no Google.
- **IA:** imagem gerada só como metáfora claramente fictícia ou ilustração genérica. Nunca para ilustrar um dado, e sem pessoas reais identificáveis.
- **Objetos para 3D e overlays:** gerar com fundo azul `#0000FF` e recortar com `scripts/recorte-chroma.mjs`.

## Áudio
### Música
**Padrão (ver "Preferências"):** trilha só na intro, com parada brusca no título, e corpo sem música. O resto desta seção vale se o usuário pedir trilha no corpo.
- **Pelo menos duas trilhas:**
  - **intro:** investigativa e crescente, com batida final clara, que **some na última nota**;
  - **corpo:** outra trilha, documental calma ou ambient com pulso, 80–110 BPM, sem vocal.
  - Trocar de trilha ou de seção a cada 1–2 capítulos (5–8 min).
  - Pedir 2–3 opções com link por bloco (intro, corpo A, corpo B).
  - Não repetir a trilha do vídeo anterior.
  - O motor aceita `musica` em lista (uma faixa por trecho: `de`, `ini`, `fim`, `fade`, `entrada`, `vol`, `volSemFala`, `quedas`).
- **Alinhamento da intro pelo fim:**
  - `musica.ini = t_ultimaNota_na_trilha − t_corte_do_beat4_na_saida`;
  - achar o ataque da nota pelo RMS do ffmpeg em janelas de 50 ms (salto de ≥ 10 dB depois do trecho baixo) e **validar ouvindo**;
  - `fim` = fim natural da nota (≤ 1,5 s depois do ataque); `fade` 0,25.
- **Níveis:**

  | Trecho | `vol` (com fala) | `volSemFala` | Nota |
  |---|---|---|---|
  | Intro | 0,10 | 0,55–0,7 nos beats 2 e 4 | a trilha é protagonista |
  | Corpo | 0,06–0,09 | 0,2–0,28 nas pausas e nos cards | trilha 18–25 dB abaixo da voz (a medir) |

  - Trilha presente em 70–85% do corpo. Tirar (fade de 12–18 q) em 1–2 momentos sérios, deixando 5–15 s de voz seca.
  - `quedas` com vol 0,7 (−3 dB) por 0,3 s junto de cada SFX de pico.
- **Master:**
  - −14 LUFS integrado, pico real ≤ −1 dBTP (`ffmpeg -af ebur128=peak=true`);
  - se estiver fora, perguntar junto com a pergunta do áudio. Nada de tratamento por padrão.
- **Content ID:**
  - faixas do Pixabay podem estar registradas;
  - preferir faixas sem esse aviso;
  - guardar o certificado de licença para contestar.

### Efeitos (Motionix, em `02_BIBLIOTECA/sfx/motionix/`, sem `.wav` no nome; pacote de terceiros não incluído, ver o README da pasta)
**Por que os volumes são mais altos que no CUT:** lá, os sons de gráfico e texto ficaram em 0,3–0,45 e os cliques de 0,09–0,14 s (`clicks/clicks_01_cinematic-click`, `clicks/clicks_05_high-click`) sumiram por baixo da voz.

Regras no MIX:
- **Todo gráfico, card, rodapé de fonte, card de capítulo e palavra-chave entra com som.** Evento de nível beat ou pico sem som conta como erro na checagem.
- **Volume final de 0,55–0,8.** O estilo MIX tem ganho próprio (`ganhoSfx`: × 1,25, piso 0,55, teto 1,0).
- **Durante a fala, preferir sons com corpo (≥ 0,3 s):** `pop/pop_05_smooth-pop`, `ui-sound-effects/ui-sound-effects_03_ui-premium-open`, `data-collect/data-collect_04_data-collect`. Clique curto só em silêncio, ou com vol ≥ 0,6.
- **Conferir na prévia com `astats`:** o pico do SFX fica no máximo ~6 dB abaixo do pico da voz no mesmo trecho. **Validar ouvindo** (o Claude não ouve áudio: quem valida é o usuário).

| Evento | Som | Vol final |
|---|---|---|
| `titulo` e palavra-chave | `whooshes/whooshes_02_cinematic-fast-normal-whoosh` (automático) + `pop/pop_05_smooth-pop` no pouso | 0,45 / 0,55 |
| Slam (título-impacto) | `whooshes/whooshes_03_cinematic-fast-whoosh` + `clicks/clicks_01_cinematic-click` no assento | 0,5 / 0,65 |
| Digitação de título ou de linha de painel | `ui-sound-effects/ui-sound-effects_21_v4-type-delete-2`, 1 por palavra ou linha (não por letra) | 0,35 |
| Card de vidro, checklist, apresentação | `ui-sound-effects/ui-sound-effects_03_ui-premium-open` | 0,55 |
| Item de lista (✓) | `ui-sound-effects/ui-sound-effects_13_ui-granular-button-select-9` | 0,55 |
| Ícone das redes, brilho do Instagram | `pop/pop_06_sweet-ui-open` | 0,45 |
| Barras do gráfico | `pop/pop_05_smooth-pop` por barra (≥ 8 q de distância) + `data-collect/data-collect_04_data-collect` na contagem | 0,55 / 0,6 |
| Linha do gráfico desenhando | `whooshes/whooshes_07_data-whoosh` | 0,5 |
| Selo ou destaque do gráfico | `clicks/clicks_01_cinematic-click` | 0,65 |
| Contador | `data-collect/data-collect_04_data-collect` | 0,6 |
| Conector desenhando | `ui-sound-effects/ui-sound-effects_18_ui-stretch` | 0,4 |
| Rodapé `fonte` | `clicks/clicks_05_high-click` | 0,5 |
| Card de capítulo | `ui-sound-effects/ui-sound-effects_03_ui-premium-open` + `whooshes/whooshes_15_slow-and-smooth-whoosh` | 0,55 / 0,35 |
| Dicionário | `ui-sound-effects/ui-sound-effects_10_ui-enter` | 0,5 |
| Caneta riscando (ficha) | `swish_air` (sintetizado) | 0,45 |
| Carimbo | `impact_sub` + `clicks/clicks_01_cinematic-click` | 0,4 / 0,6 |
| Dinheiro ou preço | `money/money_02_cinematic-money-2` | 0,45 |
| Golpe 3D | `whooshes/whooshes_20_epic-fast-whoosh-345469` + `impact_sub` | 0,6 / 0,5 |
| Antes de um pico | `risers/risers_05_smooth-riser` (2,5 s) ou `risers/risers_02_rjd-riser` (1 s), terminando no golpe | 0,35 |
| Flash de foto | `camera-shutters/camera-shutters_02_little-bit-hard-cammera-shutter` | 0,45 |
| Ponto de luz acendendo | `shimmer` (sintetizado) | 0,3 |
| Transições | automáticas (tabela de transições) | — |

- **Densidade:**
  - no corpo, 1 som a cada 5–10 s em média;
  - nunca 2 sons a menos de 8 q um do outro (exceto os pares da mesma peça);
  - na tela de acento, a fala marca o ritmo: sem som por palavra.
- **`impact_sub`:** no máximo 2 na intro e 1 por pico (≤ 6 no vídeo). **Risers:** no máximo 2 na intro e 1 por pico.
- **Voz:** perguntar no fim, como sempre. Se o bruto já veio tratado, o comparativo inclui o original sem tratamento.

## Custo de render
| Item | Custo | Base |
|---|---|---|
| Base (rosto + camadas DOM) | Final: **6–9 s de render por segundo de vídeo**, ou seja, ≈ 2,2–3,3 h para 22 min. Prévia em meia resolução: ≈ 3–4 s/s (≈ 1–1,5 h) | Estimativa: o 9:16 a 24 fps mede 7,1 s/s no final, e o MIX tem 25% mais quadros. Meça no seu 1º vídeo com `--trecho 0 60` |
| 3D (`ThreeCanvas`) e efeitos WebGL em resolução cheia | ≈ 0,8–1,2 s por quadro (24–36 s/s) | 0,4 s/q medido no TesteKit a meia resolução, × 2–3 |
| `CameraMotionBlur` | Multiplica o custo da cena pelo número de amostras (6–8×) | — |
| Recorte da pessoa | 1,3 s de CPU por quadro do bruto 1080 (39 s por segundo de recorte). Etapa separada, nunca junto com render | `CLAUDE.md` |
| `backdrop-filter` animado | Caro: chegar ao blur final em ≤ 15 q e mantê-lo fixo | — |
| Arquivo final | ~10–11 Mbit/s (CRF 17) → ~1,5–1,8 GB para 22 min | — |

**Orçamento por vídeo de 20 min**

| Peça | Limite | Custo extra |
|---|---|---|
| 3D | ≤ 15 s no total (4–6 picos de 2–3 s) | ≈ +6–9 min |
| Recorte | ≤ 10 s, em até 4 usos (≤ 6 s na intro) | ≈ 6,5 min de CPU |
| WebGL leve (glow, aberração em foto) | ≤ 30 s | — |
| `CameraMotionBlur` | só em chicotes e golpes de ≤ 12–24 q | — |

- **Meta:** peças pesadas em ≤ 2% do corpo; o final em ≤ 1,15× o custo base.
- **Prévia:** por capítulo (`--trecho`), com aprovação por partes.
- **Final:** em segundo plano, avisando o usuário para não fechar a sessão. Render por partes (`render.mjs --partes`, retomável: as partes prontas são puladas), para uma falha não custar horas.
- **Sempre** `--gl=angle --concurrency=2`. Nunca rodar render e recorte ao mesmo tempo.

## Checagens antes da prévia (`checar-mix.mjs`)
1. Nenhuma lacuna > 300 q sem evento no rosto; nenhuma > 60 q dentro de tela gráfica.
2. Nenhuma junção sem mudança de enquadramento (escala ≥ 8% ou `foco` x ≥ 0,08) ou sem cobertura; **nenhum plano de fala < 30 q trocando o enquadramento; nenhum corte dentro do rosto desfocado** (ERRO no checador).
3. Nenhum `broll` repetido.
4. Todo número com `fonte`.
5. Todo evento de nível beat ou pico com som; nenhum par de sons a < 8 q.
6. Cobertura de 25–35% em cada capítulo.
7. Picos a ≥ 90 s um do outro; 3D e recorte dentro do orçamento.
8. No máximo 3 flashes por segundo. Medição aproximada: `signalstats` por quadro, contando inversões de YAVG ≥ 26 com o lado escuro < 204. **Nenhuma piscada de 1–2 quadros** (≥ 6 de YAVG fugindo dos vizinhos), fora transição flash e golpe: `checar-mix.mjs <proj> --video <prévia ou final>`. Rodar também no final, antes de entregar.
9. Nenhum texto creme ou no acento direto sobre parede clara (cena `fala` sem desfoque, sem escurecer e sem card por baixo).
10. Nada essencial abaixo de y 0,88; tela final com a metade direita livre.

## Preferências do usuário (preencha/ajuste)
Valores atuais = padrão sugerido.
| Preferência | Padrão | Alternativas |
|---|---|---|
| Cor de acento | carmim `#B90015` (paleta padrão do framework) | um laranja como `#ff6a1a` combina com parede laranja, mas some sobre ela (texto na parede vai na tinta escura) |
| Dados da apresentação | os de `02_BIBLIOTECA/kit/marca/marca.json` | — |
| Posição da apresentação | ~0:36, depois do gancho, do Text Match Cut e do título (intro reordenada) | ~20 s (intro longa de 7 beats); ~1:30 ou só na tela final (versão enxuta) |
| Intro | colagem em papel + título em colagem stop-motion | fotos-flash + tela escura com ponto de luz; versão enxuta (~25 s) |
| Text Match Cut | manchetes reais conferidas + artigos de fontes sólidas | `match-cut-tipo` (sem prints); títulos de estudos em inglês |
| Legenda | só CC (`.srt`), sem legenda queimada | legenda queimada com `legendaY` 0,82 |
| Trilha | só na intro, parada brusca no título; corpo sem música | intro + 1 ou 2 trilhas no corpo; pausa de respiro nos capítulos |
| Ponto de luz | opcional | usar um objeto de luz real do cenário |
| Dica de gravação | 4K para closes de 1,5–2×; mãos livres e parede lisa atrás da cabeça nos trechos de texto atrás | — |

## Peças do formato
- As peças medem em `min(W, H)/1080`. No 16:9 essa escala é 1, então os px de 1080 valem direto; larguras em fração do quadro valem sobre 1920 px.
- `seguro` (zonas do Reels) fica `false` no MIX.
- Catálogo completo das peças e parâmetros: `02_BIBLIOTECA/kit/KIT.md`.

### Já existe no motor
| Peça | Onde | O que faz |
|---|---|---|
| Estilo do MIX | `src/modelos/estilos.ts` | Paleta (acento, tinta, gelo, cinza, fundo escuro), grade de 96 px, `trans` (zoom 7 q, lente [2, 4], flash [2, 6] a 70%), `ganhoSfx`, `volTrans`, `microfade`, `enquadramentos` A/B1/B2/C, sem legenda queimada |
| Cena `fala` (`zoom`, `curva`, `foco`, `desfoque`, `escurecer`, `chaves`, `enquadramento`, `golpes`) | cena | Zoom contínuo, rodízio de enquadramento, rosto desfocado, 3D flash |
| Cena `tela` (`grade`, `escuro`, CSS; câmera virtual) e `broll` | cena | Fundos e Ken Burns |
| `corte`, `lente`, `chicote`, `mergulho`, `zoom`, `blur`, `flash`, `esticao` | transição | Com SFX automático |
| `musica` em lista, `quedas`, `{pausa}`, `microfade` | edição | Trilhas por trecho, pausas, fade na voz em cada junção |
| `titulo`, `palavra-impacto`, `selecao`, `checklist`, `escala-ph`, `fonte`, `papel-rasgado`, `contador` | camada | Ver catálogo |
| `card-vidro`, `apresentacao-redes`, `card-capitulo`, `painel-tecnico`, `dicionario`, `manchete-falada`, `diff`, `ficha-papel` | camada | Linguagem Apple e telas técnicas |
| `grafico-barras`, `grafico-linha` | camada | Gráficos com som por evento |
| `match-cut`, `match-cut-tipo` | camada | Text Match Cut (prints reais) e a versão tipográfica |
| `flash-foto`, `ponto-luz`, `titulo-quente`, `colagem-papel`, `colagem-titulo` | camada | Intro |
| `texto-3d`, `objeto-3d`, `piso-3d` | camada | 3D flash e câmera 3D inclinada |
| `encerramento-youtube` | camada | Tela final com metade direita livre e molduras-guia na prévia |
| `recortes` + `plano: "atras"` + `recortar.mjs` | edição + camada | Texto atrás da pessoa |
| Scripts | `scripts/` | `checar-mix.mjs`, `juncoes.mjs`, `srt-saida.mjs`, `capturar-manchete.mjs`, `render.mjs --partes`, `quadros.mjs` |

### Não implementado (ideias com especificação)
- **Light leak** na entrada do card de capítulo (12–20 q).
- **`Trail`** (eco de saída com 4–6 camadas, atraso de 0,5–1).
- **Parâmetro `mola`** na peça `imagem` (hoje damping 12, com overshoot).
- Peça nova num formato fixo só com pedido do usuário, prévia na vitrine (`src/testes/entrada-<peça>.tsx`, em 16:9) e as regressões dos 4 formatos. Mudanças em `tempo.ts` e `fontes.ts` não podem alterar o CUT aprovado: tokens novos entram ao lado dos atuais.
