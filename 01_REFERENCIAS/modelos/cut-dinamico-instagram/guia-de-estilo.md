# Guia de estilo: INSTAGRAM - EDIÇÃO CUT DINÂMICO (v1)

Id `cut-dinamico-instagram` · composição `CutDinamico` (`MotorCamadas`) · status: **fixo**: formato, estilo e guia só mudam a pedido do usuário; mudança no motor passa nas regressões (ver `00_SISTEMA/regressao/README.md`).

## Resumo do formato
| | |
|---|---|
| **O que é** | Reels de fala vertical com **ritmo alto e poucos cortes**: a pessoa fica em tela cheia ~70% do tempo, a câmera nunca para (zoom contínuo, degraus, punch-out) e entra **uma camada nova de motion a cada ~4 quadros**. A fala inteira vira **tipografia cinética** (sem faixa de legenda), com a 1ª palavra atrás da cabeça, palavras de impacto com extrusão, papel rasgado, P&B seletivo, flash de silhueta e recortes de objetos como elemento gráfico. Dinâmico, mas **clean**. |
| **Quando usar** | Vídeo de fala curto (60–120 s) com gancho forte: opinião, mito × fato, explicação com número. Quando você quer retenção alta sem depender de muito B-roll. Ex.: "o erro que todo mundo comete ao fazer café", "3 mitos sobre produtividade". |
| **Entrada necessária** | Um **vídeo bruto** vertical com você falando, câmera fixa. Ideal: 4K vertical (permite closes de até 2×); com 1080×1920 (celular), o zoom máximo é 1,25. |
| **Proporção e fps** | Vertical 9:16, **1080×1920, 24 fps** (fixo no `modelos.json`; não subir). Render com `--gl=angle` (já no `modelos.json`). |
| **Pode mudar** | O conteúdo de cada vídeo (texto, peças, B-roll, recortes, trilha), a cor de acento e a paleta da sua marca (`estilos.ts`, com ⏸ e nova referência de regressão), as quantidades dentro das faixas deste guia, as "Preferências do usuário". |
| **Não pode mudar** | As regras de ritmo, de legenda cinética (100% da fala, zerada no corte), de composição (rosto livre, 1 bloco + 1 objeto por plano), as regras consolidadas e as travas do `validar-edicao.mjs`. Os outros formatos não podem ser afetados (regressões). |

**Ordem de precedência:** "Regras consolidadas" prevalece sobre o resto do guia. **O código é a fonte de verdade:** `00_SISTEMA/motor/src/modelos/` (`MotorCamadas.tsx`, `LegendaCinetica.tsx`, `estilos.ts`, `camadas.tsx`) e `src/kit/pecas/`; se o guia divergir, vale o código e o guia se corrige.

**Origem do formato:** treinado com 3 vídeos de referência de terceiros (não incluídos no repositório; para treinar outro estilo, use os seus com `/novo-modelo`), analisados em 5 frentes (ritmo, tipografia, motion, cor/marca, refs de apoio) mais uma crítica adversarial que conferiu as medidas no vídeo a 30 fps, e validado num vídeo-piloto de ~110 s:
- **ref. principal** (33 s): o conteúdo vai de 0 a 24,0 s; de 24,0 a 33,1 s é a vinheta da marca, que fica fora das métricas.
- **ref. de apoio 1:** a mesma edição dentro de uma vitrine de antes/depois. Útil porque mostra o bruto: um único plano aberto e fixo. Todos os "ângulos" da edição são recortes digitais desse plano, com zoom de 1,3× a 3×.
- **ref. de apoio 2:** tela de editor filmada pelo celular. Apoio para palavra gigante atrás da pessoa, 3D extrudado, tela tipográfica e cartão 3D.

Convenções:
- **q = quadro a 24 fps** (segundos × 24).
- As colunas "Ref (s)" trazem os tempos (em segundos da própria referência) de onde cada medida saiu. As refs são de 30 fps, então há erro de ±1 q. Servem só de rastro: as referências não vêm no repositório.
- Os tempos do `edicao.json` são da SAÍDA, ou seja, depois da `montagem`.

Princípio:
- O dinamismo vem de **um elemento novo a cada ~4 q (mediana)** e da **câmera que nunca para**, não de B-roll. A pessoa fica em tela cheia ~70% do tempo.
- Dinâmico mas **clean** e legível: o público é amplo (inclusive mais velho) e o conteúdo precisa passar confiança. Não usar texto de cabeça para baixo, rabisco agressivo, tremida nem documento falso.

## Regras consolidadas (prevalecem sobre o resto do guia)
Vieram da crítica adversarial e da validação no piloto (dinâmico mas clean; quem passa autoridade precisa passar confiança).

**Quantidade**
- Momentos-assinatura: **6–8 por vídeo de ~110 s** (não 12–16). No gancho, 2–3 até 7 s; depois, 1 a cada 10–15 s.
- Depois dos 30 s: mediana de 8–12 q entre eventos (o gancho segue a ref: ≤ 5 q).
- Saídas especiais (chicote, estilhaço, voo): no máximo 2–3 por vídeo.
- Padrões de empilhamento da legenda: só os 4 do código (`linha`, `pilha`, `mae`, `larga`). Inclinação de 0–4° nas explicações; −6° a −12° só no gancho.

**Cortado ou limitado**
- Flash vermelho de tela cheia no meio do vídeo: **não usar** (agressivo e arriscado para fotossensíveis). A silhueta fica só na abertura, 1×.
- Mosaico de olhos e boca: **não usar** (estranho para quem passa autoridade e inviável em 1080).
- Rabisco "fervendo" e ornamento prata: **não usar**.
- Cena de IA fotorrealista: padrão 0. Se houver, ilustração gráfica, nunca foto falsa.
- P&B com pretos esmagados: no máximo 1×.
- Impacto (`palavra-impacto`, estilhaço) em termo técnico ou sério soa sensacionalista: reservar para **números verificáveis**, com a peça `fonte` (rodapé "Fonte: revista, ano") quando for dado de estudo.
- Câmera: sem pan de 25% em 3–4 q, sem giro de 15°; punch-out de no máximo 12% em 5 q.

**Bruto 1080×1920**
- Escala máxima 1,25. Variação de zoom por plano: 6–12%. Toda junção muda o zoom em pelo menos 8% **ou** entra `lente`.
- Close de 1,8–2× só com bruto 4K vertical (peça a exportação em 2160×3840 quando houver punch-in forte planejado).
- Com zoom 1,0 o `foco` não desloca nada: alternar o enquadramento só com zoom ≥ 1,08.

**Correções de medida**
- Silhueta de abertura: `#9D0A00` (não o acento profundo). A do meio (`#F7171F`) não é usada.
- Marca: ícone completo em ~0,4 s (quadrado 0,13 s, lente 0,27 s, ponto 0,33 s); @ entra de 0,85 a 1,0 s. Card final: virada creme → gradiente em 6–12 q.
- Cartão (card dentro de card): sai com **chicote** (blur horizontal de ~2 q, sem mudar de escala), não com voo.
- Dolly da cena de IA da ref: ~2,5× no total.
- Impacto definido pela **largura** (70–85% do quadro), em 2 linhas ou com falsa condensada (`scaleX` 0,6–0,7): Inter Tight 900 não é condensada, e uma palavra de 9 letras a 85% da largura só dá ~120–130 px de altura de maiúscula.
- Cor: 10º percentil de luma 25–50 nas falas (não 20–35); saturação 11–17 é do quadro inteiro, não da pele.
- Acento medido na ref: carmim `#8A0010`–`#B90015`.

**Exceções e peças que faltavam**
- Número traduzido ao lado da fala é permitido ("cinquenta minutos" na voz + "50 min" gigante), exceção à regra "a mesma fala nunca aparece duas vezes".
- Peças para dado: `fonte` (rodapé de fonte do dado), `contador` (número contando), `objeto-3d` (adesivo com texto próprio, ex.: "MITO", "2×", nunca marca real). `texto-curvo` (texto em curva parada acompanhando a cabeça) é ideia não implementada.
- Orçamento de recorte (até 6 s), em ordem de prioridade: 1ª palavra atrás da cabeça no gancho → palavra gigante atrás no conceito central → neon atrás no fim (peça não implementada).

**Obrigatórios em todo vídeo**
- **Enquadramento:** rosto centralizado, cabeça inteira, pouca mesa. Equipamento de estúdio (softbox, luz) no topo pode aparecer. Plano base com o menor zoom que centraliza o rosto (num estúdio típico, ≈ 1,15) e closes a partir dele, até 2,0 com 4K.
- **1ª palavra do gancho SEMPRE atrás da cabeça**, qualquer que seja a posição da cabeça: meça a cabeça no quadro da própria cena (já com zoom e foco) e posicione a `palavra-impacto` `plano: "atras"` cruzando o topo dela, com a cabeça cobrindo 10–30%. Mudou o enquadramento? Reposicione a palavra.
- **Recortes de objetos como elemento gráfico** (`imagem` PNG sem fundo, gerado com fundo azul e recortado, ou de banco, com pop, órbita ou voo, perto do corpo): no mínimo **max(3, duração ÷ 20 s)** por vídeo (2 min → 6), complementando a fala nos planos de `fala`. Não substituem o B-roll, somam a ele. Nunca sobre o rosto nem sobre a legenda.
- **Travas (`validar-edicao.mjs`, AVISO):** `abertura-atras` se nenhuma camada `plano: "atras"` começar nos primeiros 3 s; `recortes-objeto` se houver menos `imagem`/`orbita` que o mínimo acima. A posição da palavra em relação à cabeça não é medida pelo script: confira no `quadros.mjs`.

## Formato
- Vertical 9:16, **1080×1920, 24 fps**. É a regra do Instagram, gravada em `modelos.json`; não subir.
- Composição `CutDinamico` (`MotorCamadas`), com `"modelo": "cut-dinamico-instagram"`. Arquivo `03_roteiro/edicao.json` (tipo `EdicaoCamadas` em `src/tipos.ts`).
- Duração típica: 60–120 s. A ref tem 24 s, então as métricas abaixo valem por trecho.
- Marca depois da última fala: **no máximo 2,5 s**. A ref usa 9 s (27% do vídeo); não copiar.
- Áreas seguras do Reels:
  - texto entre y 10% e 75% (o impacto pode descer até 80%);
  - nada nos 18% de baixo;
  - nada na coluna de botões (x > 86%, y 55–90%).
- Bruto:
  - o ideal é câmera 4K vertical (2160×3840 depois do `preparar.mjs`), que permite closes de até 2×;
  - com bruto 1080×1920 (celular), a escala máxima é 1,25.

## Ritmo (regras mensuráveis)
Medido na ref. principal: 13 planos e 12 trocas em 24 s, e 100 eventos (palavra, objeto, efeito, corte ou movimento de câmera) em 24 s.

| Medida | Ref. principal | Alvo CUT |
|---|---|---|
| Duração do plano | 20–73 q; média 44 q (1,82 s); mediana 41 q | igual |
| Plano no gancho (0–7 s) | média 33 q (1,39 s); máx. 38 q | ≤ 38 q |
| Plano depois do gancho | 40–73 q (média 2,2 s) | 40–73 q. Em vídeo > 60 s, depois dos 30 s, até 84 q, só com câmera em movimento e bloco novo |
| Teto sem troca de plano | 73 q | 75 q (84 q no caso acima) |
| Intervalo entre eventos | mediana 4 q; p75 8 q; p90 14 q; máx. 27 q | mediana ≤ 5 q; p90 ≤ 15 q; lacuna máx. de 27 q, só com câmera em movimento |
| Densidade | 5,3/s (0–6 s), caindo para 3,5/s (18–24 s) | 5/s no gancho; 3,5–4/s até 30 s; 2,5–3,5/s depois |
| Momento-assinatura | a cada 2–4 s | a cada 2–4 s até ~15 s; depois, a cada 6–10 s (teto das regras consolidadas: 6–8 por vídeo de ~110 s) |

- **Contas para um vídeo de ~110 s:** ~45–55 cenas, 6–10 palavras de impacto e 2–3 textos atrás da pessoa (momentos-assinatura: 6–8, pelas regras consolidadas).
- **Arco de densidade:** o gancho concentra ~30% dos eventos, com planos curtos. Depois os planos alongam e o dinamismo passa para a câmera (zoom contínuo, degraus, dolly) e para animações longas.
- **Todo corte zera o texto.** Nenhum bloco atravessa uma troca de cena. O bloco novo entra 0–4 q depois do corte (padrão: 2 q).
- **Toda junção da `montagem`** (corte de silêncio ou de tomada) **é troca de cena**: muda o enquadramento (zoom ou `foco` pelo menos 15% diferente) ou entra uma transição. Nunca jump cut no mesmo enquadramento.
- Corte de cena sempre em fim de palavra (`palavras.json`), alinhado ao grid de quadros (o `validar-edicao.mjs` dá ERRO em corte no meio de palavra).

## Layouts e camadas
| Layout (`cenas[].layout`) | Uso | % do tempo |
|---|---|---|
| `fala`: pessoa em tela cheia, em 3 tamanhos (aberto 1,0×; médio ~1,3×; close 1,8–2× com bruto 4K) | Padrão: gancho, frases de impacto, explicação | 65–75% |
| `broll`: tela cheia com Ken Burns | Quando a fala cita algo mostrável; o bloco de texto continua por cima | 15–20%, planos de 36–72 q |
| `tela` com fundo `acentoProfundo` (papel rasgado) ou `escuro` (card final) | Número revelado, virada de bloco, encerramento | 5–10% (1–2 telas + card final) |

- **Por plano:** 1 bloco de texto + no máximo 1 objeto ou efeito (sem @ fixo).
- Até 3 camadas ao mesmo tempo só nos momentos-assinatura (vídeo + texto + objeto/efeito).
- No máximo 6 palavras na tela.
- Escolha o momento-assinatura pela função da frase (catálogo em "Motion e efeitos"). Cada tipo aparece 1× por vídeo; silhueta e P&B, até 2×; impacto e primeiro plano repetem conforme a tabela.

## Tipografia
Papéis fixos, todos com a fonte A (Inter Tight + Instrument Serif; `src/kit/fontes.ts`; sem fonte nova):

| Papel | Fonte | Cor | Tamanho em 1080×1920 | Uso |
|---|---|---|---|---|
| Voz | Inter Tight 500–600 (`base`) | creme `#F5F1EA` | x-height 60–75 px (corpo ≈ 110–135 px; na Inter Tight, corpo ≈ 1,83 × x-height) | Toda palavra sem papel especial |
| Destaque | Inter Tight **900** | acento | 1,2–1,6× a voz: x-height 75–90 px (corpo ≈ 135–165 px) | 1 por bloco (máx. 2), da lista `destaques` |
| Conector | Instrument Serif itálica (`serifa`) | creme a 90% ou cinza quente `#BDB7AE` | 0,6–0,8× a voz; altura de maiúscula 45–60 px | Artigo, preposição, pronome, verbo de ligação. 1 por bloco, encaixado no vão entre duas linhas |
| Impacto | Inter Tight 900 em caixa-alta, tracking −0,04em, altura de linha 0,85; `skewX` de −8° a −12° opcional | face no acento, extrusão creme para baixo e para a direita (3–6% da altura da letra), sombra escura | altura de maiúscula 200–460 px (3–6× a voz; corpo ≈ 275–630 px) | Número ou conceito central (peça `palavra-impacto`) |
| Marca | Inter Tight 600 | creme a 92% | 40 px | @ só no card final |

- **"a" de um andar:** testar `fontFeatureSettings: '"cv11" 1'` na Inter Tight num quadro renderizado. Se a versão do Google não tiver o cv11, fica o "a" normal; não trocar de fonte por isso.
- **Sem Anton, Bebas, cursiva de pincel ou grunge.** A condensada de impacto da ref vira Inter Tight 900 em caixa-alta apertada, mantendo a fonte A.

### Empilhamento (padrões da legenda cinética)
No código (`LegendaCinetica.tsx`) existem `linha`, `pilha`, `mae` e `larga`, em rodízio. Os outros padrões da ref ficam como especificação (não implementados).

| Padrão | Como | No motor | Ref (s) |
|---|---|---|---|
| `linha` | Bloco simples em linha | existe | — |
| `pilha` | 3 linhas: voz 500 / conector encaixado / destaque 900 maior. Entrelinha de 0,72–0,85 (20–30% de sobreposição), inclinação de −6° a −12° (só no gancho; 0–4° nas explicações), alinhada à esquerda com recuos de 4–10% da largura | existe | 2,25; 11,6–12,4; 19,53 |
| `mae` | Apoio pequeno (voz + conector) sobre uma palavra de impacto | existe | 17,07–17,5; 6,5 |
| `larga` | Palavra de voz + destaque em caixa-alta larga, inclinada −8° | existe | 15,0–15,2 |
| `crescente` | Cresce para cima: 1ª palavra grande na base, as seguintes acima e menores | não implementado | 3,3–3,7 |
| `escada` | Linhas descendo em diagonal, cada uma 6–10% mais à direita. **Sem** virar espiral nem inverter | não implementado | 0,23–0,5 |
| `etiqueta` | Palavra no acento dentro de uma barra creme, no meio da linha | não implementado | 13,6–14,85 |

- Nunca repetir o mesmo padrão em blocos seguidos.
- `pilha` em até 40% dos blocos.
- Palavra na vertical: no máximo 1 por vídeo e nunca de cabeça para baixo.
- Posição do texto: perto do rosto e do tronco, sem cobrir o rosto.
  - Close: y 40–72%.
  - Médio: tronco, y 35–70%.
  - Aberto: acima da cabeça, y 10–18%.
- `legendaY` da cena muda a altura da legenda naquela cena (padrão do estilo: 0,66).

### Animações (em q a 24 fps)
**Entradas:**
- **Palavra inteira (padrão):** fade de 2 q a partir de um "fantasma" (60% de opacidade, blur de 4 px).
- **Digitação:** 1 letra por quadro, cada letra com fade de 2 q. Em palavras de 6+ letras, em 1 de cada 2–3 blocos (ref 1,9–2,17; 9,87–10,13).
- **Slide com motion blur:** 3–4 q, vindo da esquerda (ref 5,70–5,83; 19,53).
- **Conector:** revelação da esquerda para a direita em 3–4 q, com `clipPath: inset()` (ref 13,4–13,57).
- **Destaque:** blur para nítido em 2–3 q.
  - Virada de creme para acento com clarão em 1–2 q, só 1–2× por vídeo (ref 2,5; 14,4).
- **Impacto:** letra a letra, a cada 1,5 q. Cada letra surge creme a 50% e vira acento em 2 q; a palavra fica completa em 6–9 q (ref 17,10–17,50).
- **Brilho de entrada** (glow creme de 8–15 px): só nas palavras principais, decaindo em 6–8 q.
- **Teto:** nunca fade acima de 4 q. O `titulo` (peça genérica) leva ~8 q, com blur de 12 e cascata de 3 q: lento para o CUT.

**Saídas:**
- Padrão: o bloco morre no corte.
- Especiais, no máximo 1 a cada ~5 s (e 2–3 no vídeo):
  - chicote para a direita com motion blur, 8 q (ref 15,93–16,27);
  - estilhaço, 9–10 q (ref 16,23–16,6; peça `particulas`, não implementada);
  - voo para a frente com escala 2× e blur, 7 q (ref 16,8–17,1);
  - desfoque junto com a câmera (ref 2,57–3,2);
  - empurrado para a borda pelo pan (ref 12,5–13,1).

**Acabamento:**
- Sombra em todo texto: `0 4px 10px rgba(0,0,0,.45)`.
- Extrusão só no papel de impacto.

## Legenda
- **No CUT, a legenda é a própria tipografia cinética.** Não há faixa no rodapé.
  - O motor monta os blocos sozinho para este modelo (`LegendaCinetica.tsx`) a partir do `palavras.json` (já no tempo da saída), aplica os papéis e padrões acima e zera em cada troca de cena.
- **100% das palavras faladas aparecem** (a ref mostra ~85–99%). Ficam de fora só as muletas ("né", "tipo", "ah", "tá") e as repetições cortadas.
- **Blocos:**
  - 2–6 palavras (a ref vai de 2 a 9, média 4,4);
  - 24–60 q no ar (1,0–2,5 s);
  - 1 por plano; até 3 em plano longo, trocando com saída de 4–8 q.
- **Sincronismo:** cada palavra entra de 0 a +2 q do início falado (tolerância de −2 a +5 q).
  - Adiantar ou atrasar até 22 q só para fechar a frase antes do corte ou para cair num evento de câmera (ref 7,7–8,4 e 19,53).
- **Corrigir a transcrição antes da prévia é obrigatório** (`corrigir-palavras.mjs`), porque 100% da fala vira texto. O Whisper erra nomes próprios, termos técnicos e gírias: no piloto, 7 termos técnicos saíram errados.
- **Papéis automáticos:**
  - `destaques` define a palavra no acento de cada bloco (1 por bloco).
  - Os conectores saem de uma lista fixa: o/a/os/as, de/da/do, em/no/na, pra/para, com, que, e, um/uma, se, seu/sua, teu/tua.
- **A mesma fala nunca aparece duas vezes na tela.** Quando uma peça (`palavra-impacto`, card) já mostra a fala, esconda a legenda daquele trecho com `legenda: false` (ou `legendaAte`) na camada.

## Texto atrás da pessoa e recortes
- **O recorte é a etapa mais cara.**
  - Custo: ~1,3 s por quadro em 1080×1920 (≈ 31 s de CPU por segundo de recorte); 2–7 s por quadro em 4K.
  - Orçamento: **até 6 s de recorte por vídeo** (≈ 144 q ≈ 3 min de CPU em 1080).
  - Nunca rodar em paralelo com render ou conversão.

| Uso | Duração | Vezes por vídeo | Ref (s) |
|---|---|---|---|
| 1ª palavra do gancho atrás da cabeça (acento, 900) — **obrigatória** | ~34 q | 1 | 0,2–1,6 |
| Palavra gigante atrás (`palavra-impacto` com `plano: "atras"`, 80–85% da largura, y 12–38%) no conceito central do vídeo | 36–48 q | 1–2 | apoio 2: 10,5–12,0; 22,0–22,5 |
| Silhueta (alfa do plano que entra; transição `silhueta`) | 6–12 q | 2 | 0,000–0,200; 4,467–4,567 |
| Neon atrás da pessoa na última frase (peça `neon-atras`, não implementada) | ~20 q | 1 | 23,2–23,9 |

- **Fluxo:** `node scripts/recortar.mjs <proj> <brutoIni> <brutoFim> [nome]` e copiar a linha impressa para `recortes`. A camada `atras` precisa ficar dentro do intervalo do recorte.
- A cabeça cobre no máximo ~30% da palavra, numa letra que não muda a leitura.
- Objeto na mão some no recorte, porque não é "humano". Escolha trechos sem objeto na mão (ex.: sem a xícara do gancho).
- P&B e silhueta usam o recorte só na abertura; P&B no meio não precisa de recorte.

## Motion e efeitos (catálogo: quando usar)
| Efeito (peça) | No motor | Quando usar | Duração | Máx. por vídeo | Ref (s) |
|---|---|---|---|---|---|
| Flash de silhueta (transição `silhueta`, `silhueta.texto` na cena) | existe | Abertura (e, se usar, 1 virada forte) | 5 q (abertura: 2 no acento profundo + 3 brancos) ou 3 q (meio: 2 + 1) | 2 (regra consolidada: só na abertura, 1×) | 0,000–0,200; 4,467–4,567 |
| P&B seletivo com retícula (cena `pb: true`, `reticula: true`) | existe | Frase de confronto (ex.: "você tá perdendo seu tempo"). O texto no acento continua colorido | 14–20 q | 2 (pretos esmagados: 1×) | 1,000–1,833 |
| Palavra de impacto (`palavra-impacto`) | existe | Número ou conceito central ("50 MIN", "2×", "PRAZO") | 15–36 q | 1 a cada 4–6 s no gancho; depois, 1 a cada 10–15 s | 17,10–17,95; 10,03–11,45; 6,53–7,15 |
| Caixa de seleção (`selecao`) | existe | A palavra do mito que o público acha que importa | 30–34 q | 2 | 1,83–3,2 |
| Papel rasgado (`papel-rasgado`, em `tela`) | existe | Número ou dado revelado | 32–37 q | 1 | 5,633–7,167 |
| Rodapé de fonte (`fonte`) | existe | Todo dado de estudo | ≥ 3 s | — | — |
| Contador (`contador`) | existe | Número contando, para dado | 60–120 q | — | — |
| Adesivo 3D (`objeto-3d`) | existe | Selo com texto próprio ("MITO", "2×"), nunca marca real | 12–48 q | 2–3 | — |
| Recorte de objeto (`imagem` PNG sem fundo) | existe | Elemento gráfico perto do corpo (obrigatório, ver regras) | — | ≥ max(3, duração ÷ 20 s) | — |
| Peças de informação (`ficha-papel`, `card-vidro`, `escala-ph`, `grafico-barras`, `grafico-linha`) | existe | Quando a fala pede um dado, lista ou escala (rodízio: ver "Preferências") | 4–10 s | — | — |
| Texto em arco ou anel (`texto-arco`) | não implementada | Frase curta do gancho em volta do corpo; CTA em anel 3D no fecho | 26–60 q, girando 20–40°/s | 2 | 0,2–1,83; 4,567–5,633; 20,65–23,15 |
| Etiqueta (`etiqueta`) | não implementada | Palavra de confiança no meio da frase | ~30 q | 2 | 13,63–14,85 |
| Card dentro de card (cena `cartao`) | não implementada | Frase de autoridade; sai com chicote | 36–42 q | 1 | 13,200–14,933 |
| Letterbox com light leak (`letterbox`) | não implementada | Entrada de uma inserção ou de um B-roll | ~15 q | 1 | 3,567–4,40 |
| Primeiro plano desfocado (`primeiro-plano`) | não implementada | Moldura de profundidade em `tela` e `broll`; variante wipe esconde um corte | 30–40 q | 3–5 | 5,633–7,167; 10,40–11,50 |
| Cena surreal de IA (`broll` + `amplitude` + `rack`) | não implementada | Metáfora claramente fictícia; nunca para ilustrar um dado | 60–72 q | 0–1 | 14,933–17,967 |
| Tela tipográfica (`tela-tipografica`) | não implementada | Divisor de bloco ("VAMOS VIRAR A PÁGINA") | 24–48 q | 1 | apoio 2: 6,0–6,5; 23,0–23,5 |
| Cartão 3D (`cartao-3d`) | não implementada | Definição de termo técnico | 36–60 q | 2 | apoio 2: 20,0–21,5 |
| Estilhaço de saída (`particulas`) | não implementada | Palavra negada ("não precisa de mais NADA") | 9–10 q | 1 | 16,23–16,6 |
| Neon atrás da pessoa (`neon-atras`) | não implementada | Última frase | ~16 q | 1 | 23,200–23,900 |
| Mosaico de recortes do rosto, rabisco | — | **Não usar** (regras consolidadas) | — | 0 | — |
| Motion blur direcional | parcial | Palavras deslizando, voos, giros. Filtro SVG direcional (barato); `CameraMotionBlur` só em trechos ≤ 24 q | junto com o movimento | — | 1,17–1,30; 5,70–5,87 |
| Tremida de câmera | — | **Não usar** (não aparece na ref) | — | 0 | — |

## Transições (campo `transicao`: como a cena ENTRA)
| Nome | Duração | Quando | % das trocas | Som automático | No motor |
|---|---|---|---|---|---|
| `lente` | 2 q de desfoque no plano que sai, corte seco, 4 q de foco no que entra (`trans.lente` [2, 4]; pico de 24–30 px; escala 1,03→1). Sem crossfade | Padrão do formato | ~55% | `whooshes_14_simple-whoosh`, vol 0,2, em 1 de cada 3 | existe |
| `corte` | 0 | Com a câmera já em movimento ou escondido por wipe | ~10% | — | existe |
| `zoom` | 4 q no CUT (`trans.zoom` 4; escala 1,22→1 + blur) | Corte disfarçado de ângulo (aberto ↔ close ou contra-plongée) | ~10% | `whooshes_20_epic-fast-whoosh`, vol 0,45 | existe |
| `silhueta` | 5 q (abertura) ou 3 q (meio) | Abertura | 1–2 por vídeo | `camera-shutters_02_little-bit-hard-cammera-shutter`, vol 0,5 (+ `impact_sub` na abertura) | existe |
| `flash` | 6 q (branco que decai) | Só como substituto da `silhueta` quando não houver recorte | ≤ 2 | `camera-shutters_03_smooth-cammera-shutter`, vol 0,45 | existe |
| `chicote` | saída rápida com blur horizontal | Saída de card; troca entre telas | raro | `whooshes_16_smooth-and-fast-whoosh`, vol 0,5 | existe |
| `voo` | 3 q (o card voa para a câmera: escala 1→1,6 + blur horizontal de 40 px) | Saída de card | 1 | `whooshes_10_high-and-fast-whoosh`, vol 0,4 | não implementada |
| `giro` | 6 q (rotação 0→15°, escala 1→1,25, zoom-blur crescente, ease-in) | Saída do P&B do gancho | 1 | `whooshes_02_cinematic-fast-normal-whoosh`, vol 0,35 | não implementada |
| `blur` | 7 q, crossfade | **Não usar no CUT** (a ref não tem crossfade; fica para o MIX) | 0 | `whooshes_16_smooth-and-fast-whoosh` | existe |

- Os sons automáticos são do pacote Motionix (`02_BIBLIOTECA/sfx/motionix/`, não incluído; ver o README da pasta).
- A proporção fica em ~2/3 de cortes (`lente` + `corte`) e ~1/3 de cortes disfarçados (`zoom`, `silhueta`, wipe por objeto).
- A transição cai sempre em fim de palavra, e o texto zera no mesmo quadro.

## Movimento contínuo (zoom e câmera)
- **Todo plano `fala` tem `zoom` contínuo**, com variação de 12–35% ao longo do plano (a ref vai de ×0,63 a ×1,4; com bruto 1080, 6–12% por causa do teto de 1,25; o mínimo é 5–10% no B-roll).
  - O sentido alterna entre planos vizinhos.
  - Zoom-out é o mais comum (5 dos 8 planos de fala da ref). Exemplos: `[1.3, 1.0]`, `[1.0, 1.18]`, `[1.25, 1.0]`.
  - Declare `zoom` em toda cena `fala`: o padrão do estilo (`[1, 1.08]`) é fraco para este formato.
- **Limite de escala:** 1,25 com bruto 1080; 2,0 com bruto 4K vertical. Conferir a nitidez num quadro renderizado com `--trecho`.
- **`curva`:**
  - `suave` é o padrão;
  - `entrada` (expo-out) para push-in rápido de 8–9 q (ref: ×1,17 em 0,37 s);
  - `linear` em dolly longo.
- **`foco`:** medir no rosto num quadro em resolução cheia. Com câmera fixa, alternar o x entre 0,42 e 0,58 em cenas vizinhas para variar o enquadramento (só funciona com zoom ≥ 1,08).
- **No máximo 1 aceleração por plano** (campo `chaves`: `[{t, zoom?, foco?, desfoque?, escurecer?, curva?}]`, `t` em s desde o início da cena):
  - punch-out de até 12% em 5 q (regra consolidada; a ref usa ~20%);
  - ou rampa de dolly no último segundo.
- **Plano parado:** só até 26 q, e com outro elemento em movimento.
- **Texto preso ao cenário** (`camera: true` na camada): o bloco acompanha o zoom e o pan da cena.
  - Em movimentos fortes, paralaxe de 1,2–1,5× (o texto anda mais que o fundo).
  - A marca fica fora da câmera.
- **B-roll:** vídeo com push-in de 5–10%; foto com 10–15%.

## Cor e acabamento
- **Valores do `estilos.ts` (CUT), paleta padrão do framework (troque pela sua):**
  - `acento: '#B90015'` (carmim); `acentoProfundo: '#5E0E06'`; `creme: '#F5F1EA'`;
  - `cor: {contraste: 1.04, saturacao: 1, calor: 0}`;
  - `vinheta: 0.3`; `grao: 0.03` (a ref não mostra grão); `fundoTela: 'escuro'`.
- **Paleta fechada**, com uma cor de destaque só:

  | Uso | Cor |
  |---|---|
  | Texto (creme) | `#F5F1EA` |
  | Acento | `#B90015` |
  | Painéis (acento profundo) | `#5E0E06`, escurecendo até `#2A0603` |
  | Brilho | `#FF5A3C` a 40% |
  | Preto | `#0B0B0C` |
  | Card | gradiente do acento até `#1E1D1C` |

- **Pele natural:** rosa quente, nunca laranja. A saturação da pele fica contida (na ref, 11–17, contra 36–43 nos painéis): o "punch" de cor vem dos grafismos.
- **Low-key sem esmagar os pretos:** luma média de 66–120 (de 255) nas falas; 10º percentil de 25–50. A exceção é o P&B do gancho, com pretos esmagados.
- **Divisão de tons** (sombras azul-petróleo `#192129`/`#25353B`, realces quentes): não cabe nos campos do motor. Testar no `preparar.mjs --comparar` (opção `cinema`, não verificada).
- **Retícula (halftone):** só no P&B, com pontos de passo 9–10 px a 45°.
- **Vinheta:** mais por desfoque de borda que por escurecimento.
- **Bruto com cor já ajustada:** não empilhe correção nem preset; pergunte ao usuário antes de mexer na cor.

## Marca (@seu_perfil)
- **Sem @ fixo durante o vídeo.** A peça `marca-arroba` (ícone do Instagram + @ no canto) existe no motor, mas **não entra** em nenhum vídeo deste formato. O @ só aparece no card final (`encerramento-insta`). Ele vem do campo `arroba` do estilo em `estilos.ts`: deixe igual ao @ de `02_BIBLIOTECA/kit/marca/marca.json`.
- **Gradiente do Instagram** (`#FEDA75→#D62976→#962FBF→#4F5BD5`) por 48 q: só no card final.
- **Não copiar da ref:** monograma, nome e site do criador da ref, glitch com orbe, carmim `#8C000B`.

## Abertura e fechamento
**Abertura (0–2 s, estados visuais):**
1. **q 0–1:** silhueta do 1º plano no acento profundo, com "???" creme brilhando no rosto ou um símbolo do tema (`silhueta: {texto: "???"}` na cena).
2. **q 2–4:** silhueta branca com bloom quente (`#fff6c8`/`#ffe9a0`) sobre o plano estourado (brightness 1,6, blur de 6 px), com SFX de impacto.
3. **q 5:** corte seco para `fala`, já com o primeiro bloco no 1º quadro útil. **A 1ª palavra fica atrás da cabeça** (recorte de ~34 q; obrigatório).
4. **P&B seletivo de 14–20 q** na frase de confronto.
5. **Close colorido** com `selecao` ou `palavra-impacto`.

Regras do gancho:
- Até 7 s: planos ≤ 38 q, 5 eventos/s, 2–3 momentos-assinatura.
- Escolher uma tomada inicial com gesto para a câmera.

**Fechamento (no máximo 2,5 s de marca depois da última palavra):**
1. **Última frase (CTA):** bloco normal (o anel `texto-arco` e o `neon-atras` da ref não estão implementados).
2. **Card final:**
   - `{pausa: 2}` na `montagem` + cena `tela` com fundo `escuro` (`#0B0B0C`) + `encerramento-insta`;
   - ícone de 150 px no centro (y 47%), creme virando gradiente em 24 q;
   - @ em Inter Tight 600, 40 px;
   - linha opcional em Instrument Serif itálica.
3. **Trilha** com `fim` na última nota do card e `fade` de 0,25 s.

## B-roll
- **Sem repetição visual** (regra comum). Termos recorrentes (ex.: "foco", "rotina", "prazo") ganham 3–5 variações. Liste os `broll` repetidos antes da prévia.
- **Uso:**
  - 15–20% do tempo, em planos de 36–72 q;
  - entra com `lente`;
  - sempre com bloco de texto novo e push-in.
- **Ordem de busca:**
  1. biblioteca (`biblioteca.mjs buscar`);
  2. `04_broll/meus`;
  3. banco (`stock.mjs`);
  4. internet, só com direito de uso;
  5. imagem gerada por IA (Flow, API Gemini via `gen.mjs`, ChatGPT Imagens, Higgsfield via MCP: `docs/03-IMAGENS-E-BROLL.md`); vídeo gerado só com aprovação de custo.
- **As telas gráficas (`tela`) contam como B-roll:** número em `papel-rasgado`.
- **Cena de IA:** no máximo 1, e só como metáfora claramente fictícia (ex.: um "atalho milagroso" exagerado). Nunca para ilustrar um dado ou uma afirmação.
- **Proibido:** documento, estudo, laudo, manchete ou logo inventado. Estudo ou manchete real só como print intacto, com o veículo visível.
- **Objetos para `imagem`:** gerar com fundo azul `#0000FF` e recortar com `scripts/recorte-chroma.mjs`.

## Áudio
### Música
- Pixabay Music (ou outra fonte com licença para redes), sempre 2–3 opções com link. Sem vocal, com pulso marcado (95–125 BPM; sugestão: a trilha da ref não foi medida).
- Não repetir a trilha nem o estilo de trilha dos últimos vídeos.
- **`musica`:**
  - `vol` 0,10 com fala e `volSemFala` 0,28;
  - `quedas` com vol 0,4 nos 0,5 s antes da virada;
  - `fim` na última nota do card final, com `fade` de 0,25.
- **`{pausa}`** na montagem só no card final: o CUT não respira com tela vazia.

### Efeitos (Motionix, em `02_BIBLIOTECA/sfx/motionix/`, sem `.wav` no nome; pacote de terceiros não incluído)
| Evento | Som | Vol |
|---|---|---|
| Transições `zoom`, `flash`, `silhueta`, `lente`, `chicote` | Automáticos, ver tabela de transições | — |
| `palavra-impacto` | `whooshes/whooshes_02_cinematic-fast-normal-whoosh` + `clicks/clicks_01_cinematic-click` na última letra | 0,3 / 0,35 |
| Digitação de uma palavra | `ui-sound-effects/ui-sound-effects_21_v4-type-delete-2` (1 por palavra, não por letra) | 0,15 |
| `selecao` | `ui-sound-effects/ui-sound-effects_07_ui-click-digital-04` | 0,3 |
| `imagem` (automático) | `pop/pop_05_smooth-pop` | 0,35 |
| Dinheiro ou preço (painel com R$) | `money/money_02_cinematic-money-2` | 0,35 |
| Número ou percentual contando | `data-collect/data-collect_04_data-collect` | 0,3 |
| Antes da virada (o riser termina no corte) | `risers/risers_05_smooth-riser` | 0,35 |
| Gradiente do @ | `pop/pop_06_sweet-ui-open` | 0,3 |
| `encerramento-insta` | `ui-sound-effects/ui-sound-effects_03_ui-premium-open` | 0,35 |
| Papel rasgando | `swish_air` (sintetizado) + `clicks/clicks_01_cinematic-click` | 0,35 |

- No máximo 1 som por evento visual, e em média 1 som a cada 24–48 q. Não sonorizar cada palavra.
- `impact_sub`: no máximo 2–3 por vídeo. Risers: no máximo 2.
- Os SFX da ref não foram medidos: os pares acima são proposta, a validar ouvindo a prévia.
- **Voz:** perguntar no fim, como sempre (regra comum do `CLAUDE.md`).

## Preferências do usuário (preencha/ajuste)
Valores atuais = padrão sugerido.
| Preferência | Padrão | Alternativas |
|---|---|---|
| Cor de acento | carmim `#B90015` (fundo `#5E0E06`) | tomate `#D7311E` (fundo `#5E0E06`); laranja-cenoura `#E0601A` (fundo `#4A1A06`); evite vermelho neon (`#ff2e2e`) |
| @ fixo na tela | não (só no card final) | — |
| Densidade de texto | 100% da fala como texto cinético, com hierarquia limpa | legenda limpa + 1 destaque por frase |
| Rodízio de peças de informação (sem trava) | quando houver ensejo, alternar no mesmo vídeo `ficha-papel`, `card-vidro`, `escala-ph` (régua que serve para qualquer escala de valores), `contador`, `grafico-barras`/`grafico-linha` e B-roll com objeto recortado; nunca o mesmo tipo de card em seguida | — |
| Cor do bruto | se já vem ajustada, não mexer | correção leve pelo `cor` do estilo |
| Dica de gravação | 4K vertical; roupa neutra + 1 objeto de cena na cor do acento; mãos livres nos trechos que vão para recorte; abrir com um gesto para a câmera | — |

## Peças do kit
Depois de qualquer peça nova ou mudança: prévia curta na vitrine (`src/testes/`) e as regressões dos 4 formatos (ver `00_SISTEMA/regressao/README.md`).

### Já existe no motor
| Peça | Onde | O que faz |
|---|---|---|
| Estilo do CUT | `src/modelos/estilos.ts` + `src/kit/fontes.ts` | Paleta, zoom padrão, cor, vinheta, grão; Inter Tight até 900; duração das transições do estilo (`trans`: zoom 4 q, lente [2, 4]) |
| Legenda cinética | `src/modelos/LegendaCinetica.tsx` (automática no CUT) | Blocos por cena, papéis voz/destaque/conector, padrões `linha`/`pilha`/`mae`/`larga` em rodízio, entrada sincronizada, zerada no corte |
| `lente`, `zoom`, `silhueta`, `flash`, `blur`, `chicote` | `transicao` | Transições com SFX automático |
| `chaves` | cena | Zoom, foco, desfoque e escurecer animados; pessoa e recorte continuam alinhados |
| `camera: true` | camada | Texto preso ao cenário (acompanha zoom, foco, chaves e transições da cena) |
| `pb` + `reticula` | cena | P&B seletivo com retícula; o texto continua colorido |
| `palavra-impacto` | camada (frente ou atrás) | Caixa-alta 900 pela largura, extrusão, entradas letra a letra/pop/virar |
| `recortes` + `plano: "atras"` + `recortar.mjs` | edição + camada | Pessoa sem fundo por cima das camadas de trás |
| `selecao`, `papel-rasgado`, `fonte`, `contador`, `objeto-3d`, `imagem`, `titulo` | camada | Ver catálogo |
| `ficha-papel`, `card-vidro`, `escala-ph`, `grafico-barras`, `grafico-linha`, `checklist` | camada | Peças de informação |
| `marca-arroba` (não usar neste formato), `encerramento-insta` | camada | Ícone + @; card final do Instagram |
| `montagem` + `{pausa}`, `musica.fim`/`quedas` | edição | Trechos, pausas, trilha |

Catálogo completo das peças e parâmetros: `02_BIBLIOTECA/kit/KIT.md`.

### Não implementadas (especificação, para quem quiser construir)
Peça nova num formato fixo só com pedido do usuário, prévia na vitrine e regressões.

| Peça | Onde | O que faz | Como implementar no Remotion | Refs (s) |
|---|---|---|---|---|
| `texto-arco` | camada | Palavras num trilho elíptico em volta da cabeça ou do corpo, girando 20–40°/s. `perspectiva: true` vira anel 3D (a palavra mais próxima cresce 2–3×) | SVG `<textPath>` numa elipse (raio de 0,35–0,50 da largura), animando `startOffset` e a rotação do grupo; palavras no tempo da fala. Anel 3D: CSS 3D por letra (`rotateY(θ) translateZ(R)`), contêiner com `rotateX(-15°)`, `perspective: 1200px`, blur proporcional ao z (6–10 px na frente). O lado invertido fica sempre desfocado | 0,2–1,83; 4,567–5,633; 20,65–23,15 |
| `etiqueta` | camada ou padrão da legenda | Barra creme com glow que nasce como linha; palavra 900 no acento dentro | `scaleY` 0→1 em 3 q (expo-out); palavra em fade de 2 q aos +4 q | 13,63–14,85 |
| `cartao` | cena (`cartao: {escala, raio, fundo}`) | O plano encolhe para um card arredondado sobre gradiente, com a palavra da marca desfocada atrás; sai com chicote | Div com `borderRadius` (4% da largura) e `overflow: hidden`, escala 1→0,73 em 5 q (`Easing.out(Easing.exp)`), borda de 1 px, retícula fina. Fundo do acento até `#1E1D1C` | 13,200–14,933 |
| `primeiro-plano` | camada | Objeto PNG muito desfocado na frente, com paralaxe; variante `wipe` cobre mais de 90% da tela no pico do corte | `blur` de 25–40 px, escala 1,5–2×, deslocamento 1,5–2× o da cena; entra e sai por uma borda | 5,633–7,167; 10,40–11,50 |
| `neon-atras` | camada `atras` + recorte de ~20 q | Monograma ou @ em contorno creme de 25–30 px desenhado por segmentos atrás da cabeça, com luz de recorte no cabelo | `evolvePath` (@remotion/paths) em 6 q; glow crescendo em 12 q; `radial-gradient` `#FFB070` em `screen` a 20–30% | 23,200–23,900 |
| `letterbox` | camada | A tela cheia vira uma faixa de 33–38% da altura, inclinada 1–2°, com light leak dourado nos cantos | `clipPath: inset()` animado em expo-out (~9 q) + `@remotion/light-leaks` (`#C8A050`) | 3,567–4,40 |
| `voo` | `transicao` | O card voa para a câmera | escala 1→1,6 + `feGaussianBlur stdDeviation="40 0"` em 3 q | 16,8–17,1 |
| `giro` | `transicao` | Rotação de 0→15° com escala 1→1,25 e zoom-blur crescente, depois corte seco | `rotate` + `scale` em ease-in por 6 q + `zoom-blur({amount})` (WebGL) ou blur radial em SVG | 1,600–1,833 |
| `fade-tinta` | camada | Escurece por manchas orgânicas, a partir da esquerda e da base | `feTurbulence` + `feColorMatrix` com limiar animado em 6 q, usado como máscara preta | 23,867–24,100 |
| `cena-ia` | cena `broll` (`amplitude`, `rack: [px0, px1, dur]`) | Ken Burns forte (1,0→1,6) com rack focus de 40→0 px | Parametrizar a amplitude do Ken Burns e interpolar o blur | 14,933–17,967 |
| `cartao-3d` | camada | Card no gradiente do acento (75% da largura, contorno creme de 2 px) que gira em 3D e para de frente, com brilho cruzando; define um termo | CSS 3D `rotateX/rotateY` com `spring` (~24 q), faixa de brilho em `linear-gradient` animado | apoio 2: 20,0–21,5 |
| `tela-tipografica` | camada sobre `tela` | Fundo no acento com listras curvas (cilindro) ou cortina; palavra de impacto passando em pan com motion blur | Listras em SVG com `path` curvo; `palavra-impacto` grande com `translateX` e blur direcional | apoio 2: 6,0–6,5; 23,0–23,5 |
| `particulas` | camada (saída especial) | 20–40 cacos triangulares no acento caindo e girando a partir da palavra | Trajetória com `noise2D` + `rotate3d`, em 9–10 q, com seed fixa | 16,0–16,8 |
