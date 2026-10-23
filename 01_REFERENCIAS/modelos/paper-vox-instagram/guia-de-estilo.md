# Guia de estilo: INSTAGRAM - PAPER VOX ANIMATION (v1)

Id `paper-vox-instagram` · composição `PaperVox` · status: **fixo** (não congelado): formato, estilo e guia só mudam a pedido do usuário; mudança no motor passa nas regressões (ver "Checagens").

## Resumo do formato
| | |
|---|---|
| **O que é** | Vídeo vertical **100% dark feito só a partir de um áudio narrado**: ninguém aparece. Todas as cenas moram num **mural contínuo de papel escuro animado por código**; a câmera desliza de estação em estação sem corte (parallax em 3 planos, motion blur nos chicotes), palavras-chave gigantes em degradê, recortes/fotos/objetos que voam de fora em arco e ficam "boiando", objetos de papel desenhados em código, montagens de ~0,2 s por plano nos silêncios, recuo final com o mural inteiro e card da marca. |
| **Quando usar** | Quando você tem uma narração forte e não quer (ou não pode) aparecer: opinião, ensaio, crônica, explicação de um conceito. Ex.: "por que a gente vive com pressa", "a história do café". |
| **Entrada necessária** | **Só um áudio narrado** (`.mp3`, `.wav` ou `.m4a`; o `.oga` do WhatsApp se converte antes). Não há vídeo bruto, cor nem decupagem. |
| **Proporção e fps** | Vertical 9:16, **1080×1920, 24 fps**, `gl: angle`. Render próprio (`render-paper-vox.mjs`); arquivo de props `03_roteiro/quadro.json` (nunca `edicao.json`). |
| **Pode mudar** | O conteúdo de cada vídeo: estações, peças, imagens, montagens, trilha, SFX curados, textos do card (dados da sua marca). A paleta e os degradês podem virar os da sua marca (mudança no código, com ⏸ e nova referência de regressão). Objetos de papel novos entram com ⏸. |
| **Não pode mudar** | A linguagem do formato: mural contínuo sem corte (só a montagem, escondida num mergulho), 100% dark, texto sempre por cima das peças, texto de tela só com palavras da fala, travas de SFX, trilha ≤ 1/4 da voz, 24 fps, render e `quadro.json` próprios. Os outros formatos não podem ser afetados por mudanças aqui. |

**Ordem de precedência:** "Regras consolidadas" prevalece sobre o resto do guia.
**O código é a fonte de verdade do comportamento:** `00_SISTEMA/motor/src/modelos/paper-vox/*.ts*` e `00_SISTEMA/motor/scripts/lib/mural.mjs`. Os números deste guia foram lidos de lá; se divergirem, vale o código e o guia se corrige.
Apoio nesta pasta: `prompts-flow.md` (blocos de prompt e geração das imagens) e `shotlist-esquema.md` (esquema real da `shotlist.json` e como gerar).

**Origem do formato:** treinado com 8 vídeos de referência de terceiros (não incluídos no repositório; para treinar outro estilo, use os seus com `/novo-modelo`) e consolidado num vídeo de validação de 142 s de áudio (144,3 s com o card; final −14,3 LUFS, pico −0,9 dB). Nenhuma referência é 100% dark, nenhuma tem mural contínuo entre cenas nem montagem ≤ 0,3 s por plano: essas três coisas são peças próprias do formato.

| Ref | O que é | Linguagem aproveitada | Não aproveitado |
|---|---|---|---|
| ref-01 | "Article effect" (After Effects), 32,9 s, 23,976 fps | Página que nunca para (zoom, snap), textura de papel real, marca-texto que se desenha, papel a 12 fps com câmera a 24. Uma página gigante como canvas é o mais perto do mural | Papel claro (aqui o jornal é escuro), veículos reais na tela, legenda queimada, o criador na câmera |
| ref-02 | Colagem de papel em stop-motion, 24 s, 30 fps | Peças que entram da borda, giram, desaceleram e travam; papelão; colagem | Vídeo gerado por IA, membros articulados, papel milimetrado claro |
| ref-03 | "Page Turn + Posterize 8 fps", 47,3 s | Traço que treme a 8 fps, mesa vista de cima, persiana, virada de página | Tela do editor, legenda queimada, pessoa |
| ref-04 | Dioramas de papel (vídeo gerado), 25,4 s, 30 fps | Cena que se monta camada a camada (elemento novo a cada 0,3–0,6 s) | Vídeo gerado (custa crédito: só exceção com ⏸) |
| ref-05 | Ensaio com estátuas (PT-BR), 39,2 s, 30 fps | Estátuas + tipografia em duas escalas, palavra entrando de borrada para nítida, 1 acento, ~2,4 palavras/s | Paleta clara; **palavra atrás da estátua** (reprovada: o texto nunca fica coberto); montagem de clipes de cinema |
| ref-06 | Tipografia + ícones (EN), 20,4 s, 24 fps, 4:3 | Flash vermelho de abertura, spotlight, escala extrema, rajada de planos curtos (0,25–0,42 s) | O 4:3, pixel-art (aqui só recorte realista), inversão para fundo claro |
| ref-07 | Interface como palco (EN), 37 s, 30 fps | Zoom-through, recursão (a foto vira anexo), mesa que gira | Propaganda de template, sala 3D, barras pretas |
| ref-08 | Tutorial de shot list com IA, 50,1 s, 30 fps | O esqueleto da shot list (estilo / texto de tela / planos com duração), colagem halftone | A pessoa na tela, vídeo gerado |

Convenções:
- **q = quadro a 24 fps** (1 q = 41,7 ms; 2 q = 83 ms). 24 fps está fixo no código (`calcularPaperVox` usa × 24).
- **Tempos em segundos da saída**, que são os segundos do áudio da voz a partir de `vozIni` (0 no vídeo inteiro). O card soma ~3,2 s no fim.
- **px do mundo × px da tela:** tamanhos e posições do `quadro.json` são px do mundo. Com a câmera em zoom 1, 1 px do mundo = 1 px da tela 1080×1920.
  - Estação em escala `k` (uma estação-filha dentro de outra, ex.: uma estação dentro da tela de um celular com k 0,42): as peças saem × k e a câmera chega com zoom 1/k. Na tela, tudo fica do mesmo tamanho.
  - Planos de parallax: o plano anda × 0,55 (`fundo`), × 1 (`meio`) ou × 1,35 (`frente`) a câmera. A coordenada de uma peça no plano é a do meio × esse fator.
  - Em px de tela: `viva` (deriva da câmera, 5 px), o limiar e o espaço do motion blur.

Princípio:
- **Só a voz. Ninguém aparece.** O vídeo nasce de um áudio. É 100% dark.
- **Um mural só.** Todas as cenas moram num mundo grande de papel escuro, e a câmera desliza de estação em estação sem corte, com parallax em 3 planos e motion blur nos chicotes. A cena anterior fica no mural. No fim, a câmera recua e mostra o mural inteiro ligado pelo traço do "caminho", e mergulha no card da marca.
- **O dinamismo vem da câmera e das peças, não de cortes:** um evento a cada ~0,43 s na validação. O único "corte" é a montagem, escondida num mergulho da câmera.
- **Feito à mão:** papel e objetos de papel a 12 fps, traço que treme a 8 fps, câmera e blur nos 24 fps cheios.
- **Chega rápido, assenta macio:** expo-out e `assento`, blur só no pico de velocidade, nada fica estático (tudo "boia").
- **A palavra-chave é o cursor do olho:** gigante, em degradê da marca, com punch-in da câmera.
- **Som econômico:** a voz manda; SFX só nos acentos que contam a história; trilha a 1/4 da voz, que para seco nos momentos tensos.

## Regras consolidadas (prevalecem sobre o resto do guia)
Nasceram das prévias do vídeo de validação; cada uma corrige um problema real.
- **Sem vídeo gerado por IA.** Estilo por código + stills de gerador de imagem; vídeo gerado só como exceção, com ⏸ e custo informado.
- **Quadro contínuo 100% por código**; as montagens usam stills (planos 9:16 do gerador de imagem).
- **Proposta de cenas** com alto impacto visual, dinamismo, fluidez, referência visual e magnetismo.
- **Montagem de ~0,2 s por plano nos silêncios** (peça própria do formato).
- **Dúvidas da transcrição:** o usuário responde por texto; até lá, a palavra em dúvida fica FORA da tela.
- **SFX econômicos** (a 1ª versão saiu com "SFX altos e extremamente repetitivos": 106 SFX, 0,7 por segundo, um por entrada de peça, 5–11 dB mais altos):
  - ~1 SFX a cada 5 s, 12–17 dB abaixo da voz (transição ~12 dB, pop ~17 dB; alvos `ALVO_M` e `ALVO_PICO` em `lib/mural.mjs`), ≥ 1,15 s entre eles, nunca a mesma categoria em seguida;
  - entrada de imagem, papel, fita e plano de montagem **sem som**;
  - o `M.sfx` **para com erro** se dois SFX ficarem a < 1,15 s ou se a mesma categoria vier em seguida.
- **Palavra-chave sempre no degradê da marca** (`cor: 'marca'`, degradê com `background-clip: text` no próprio nó, sombra por `drop-shadow`): a cor da palavra não pode se confundir com o papel escuro. Branco `#F2EFEA` só sobre a marca-texto na cor de acento.
- **Degradês variados:** os 3 degradês (`DEGRADES` em `elementos.tsx`) em rodízio (`M.degrades()`), dois seguidos nunca iguais; não uma cor só.
- **Recortes, fotos e objetos vêm de fora** com curva smooth "extremamente dinâmica" e ficam "boiando"; aparições rápidas e nunca estáticas:
  - entrada `voa` (de fora da tela, em arco, giro, blur) e `M.voaBoia()` (a peça só sai 0,05 s depois que a câmera assenta, vinda do lado em que mora); depois, `boiar`;
  - peças presas não boiam (`boia: 0`); o traço sobre uma peça boia junto (`boiaId`);
  - entradas rápidas no geral (`pousa` 0,4 s, `sobe` 0,24 s, `desliza` 0,3 s).
  - Causa do problema original: a peça nascia no mesmo instante da estação e ficava parada.
- **Texto nunca por baixo de imagem ou linha:** `camada()` em `PaperVox.tsx`. Dentro de cada plano, o texto fica sempre por cima de papel, foto, recorte e objeto; traço à mão e flash ficam por cima do texto. (Causa original: a ordem de desenho era a do array, e uma palavra ficou atrás de uma estátua e outra atrás da linha do caminho.)
- **Trilha com respiro nos momentos tensos:** a composição não toca a trilha. O `mixar-audio.mjs` mistura depois do render: ≤ 1/4 da voz, **para seco** em 12 ms nos cortes só voz e volta em 0,12 s com a frase seguinte. Comparar trilhas leva segundos, sem re-render.
- **Trilha:** buscar a trilha que serve ao arco do texto, cortar a música e deixar só a voz nos momentos mais tensos ou que pedem ênfase; 2 opções (A e B) em toda prévia.
- **Timing milimétrico dos SFX:** etapa P7 (`refinar-sfx.mjs`, `M.ev.*`, `sfxNaMixagem`, ponto do som medido) em todo vídeo novo.

## Formato
- **Quadro:** vertical 9:16, **1080×1920, 24 fps**, `gl: angle` (linha `paper-vox-instagram` no `src/modelos.json`; composição registrada no `src/Root.tsx`).
- **Composição:** `PaperVox` (`src/modelos/paper-vox/PaperVox.tsx`). Props = `03_roteiro/quadro.json`, com **`"modelo": "paper-vox-instagram"`**, gravado pelo `M.gravar()` e conferido pelo `render-paper-vox.mjs`.
  - O arquivo se chama `quadro.json`, nunca `edicao.json`: o validador de `edicao.json` confere a estrutura do motor de camadas e daria ERRO.
  - Os tipos (`QuadroProps`, `Elemento`, `ChaveCamera`…) moram em `src/modelos/paper-vox/tipos.ts`, nunca no `src/tipos.ts`.
- **Render:** `scripts/render-paper-vox.mjs`, sempre pela fila (`vez.mjs`). Não usa o `render.mjs` (os 3 outros modelos ficam sem nenhuma mudança).
- **Entrada:** só um áudio (`01_bruto/bruto.mp3`, `.wav` ou `.m4a`; o `.oga` do WhatsApp se converte antes). As pausas da fala são o lugar das montagens.
- **Duração:** a do áudio + 3,2 s de card (fim da última fala + 0,1 s + 3,1 s). Validação: 142 s de áudio → 144,29 s.
- **Áreas seguras do Reels** (proposta; conferir na folha de quadros):
  - texto fora de ~250 px embaixo, ~180 px em cima e ~70 px nas laterais;
  - nada na coluna de botões (x > 86%, y 55–90%).
- **Marca:** sem @ fixo. O @ só aparece no card final.

## Estrutura do vídeo
| Parte | O que se vê | Regra |
|---|---|---|
| Gancho (0–3 s) | A 1ª estação já com a imagem mais forte e a 1ª frase; a câmera abre (`abre`, zoom 0,98 do alvo) e a foto voa a 0,05 s | **≥ 4 eventos nos 3 primeiros s** (ERRO no `validar-shotlist.mjs`); nada de preto vazio |
| Blocos | Uma coluna do mural por bloco do texto (validação: 7 blocos de 2 a 7 estações) | 1 look por bloco, alternando: `editorial` (jornal escuro), `colagem` (mesa de papelão), `marmore` (estátuas). Nunca 3 receitas iguais seguidas (ERRO) |
| Estações | Uma frase ou meia frase por estação: base de papel + apoio + palavra-chave + 1 foto, recorte ou objeto + alvo de câmera | Validação: 36 estações de 1,14–7,23 s (mediana 3,43 s). Estação < 1 s = AVISO |
| Montagens | Nos silêncios longos, a câmera mergulha numa peça, passam 4–10 planos de ~0,2 s em tela cheia e a câmera emerge na estação seguinte | Ver "Montagens" |
| Recuo final | Nas últimas frases, a câmera acompanha o traço do caminho e recua até o **mural inteiro** (zoom ~0,1), com o texto gigante por cima | `M.caminho()` + estação do mural inteiro |
| Card | A câmera mergulha num papel em branco do mural: o seu nome no degradê, profissão/título, credencial (se houver), ícones do Instagram e do YouTube, @seu_perfil | o vídeo fecha 3,2 s depois do fim da última fala; fixo (`M.card()`), com os textos de `02_BIBLIOTECA/kit/marca/marca.json` (`nome`, `profissao`, `credencial`, `handle`; credencial vazia = sem a linha); fade da trilha de 2,5 s |

- **Receitas** (campo `receita` da shot list) e uso na validação: `tipo-escala` 7, `objeto-papel` 9, `jornal-vivo` 3, `mesa-escura` 3, `interface-palco` 3, `estatua-sanduiche` 3, `colagem-vox` 2, `cena-em-camadas` 2, `capitulo-vox` 1, `silhueta-gradiente` 1, `colagem-monta` 1, `icone-orbital` 1. A `estatua-sanduiche` é só estátua + palavra **por cima** (nunca atrás).
- **Respiro** (`respiro: true` na shot list): frase delicada, câmera quase parada, sem ruído visual (validação: 3 estações). Não conta no aviso de buraco sem evento.

## Ritmo (números do vídeo de validação)
| Medida | Validação | Regra |
|---|---|---|
| Fala | 142 s, 311 palavras (2,2 por s) | — |
| Eventos (chegada, cada palavra de texto de tela, evento, plano de montagem) | 328, 1 a cada 0,43 s | ≥ 4 nos 3 primeiros s (ERRO); buraco > 1,5 s sem evento fora de respiro = AVISO |
| Estações | 36 em 7 blocos; mediana 3,43 s | < 1 s = AVISO (exceto `rajada`) |
| Chaves de câmera | 167 (22 em `snap`: punch-ins e chegadas snap) | câmera nunca parada (deriva + câmera viva) |
| Palavras-chave em degradê | 34 (≈ 1 por estação) | rodízio dos 3 degradês |
| Peças que voam | 26 | todo recorte, foto e objeto físico (os objetos de efeito, como silhuetas, spot e engrenagens, entram pelos próprios `ev`) |
| Montagens | 5, com 37 planos, nas pausas de 1,08 · 1,48 · 1,98 · 3,04 · 2,6 s | plano 0,12–0,4 s; cabe na pausa |
| SFX | 26, 1 a cada 5,5 s; mínimo de 1,2 s entre dois | ~1 a cada 5 s; ≥ 1,15 s |
| Cortes só voz da trilha | 7 (20,4 s no total) | nos momentos tensos ou de ênfase |
| Elementos | 268: papel 97, texto 87, luz 31, objeto 27 (24 tipos), recorte 8, foto 7, fita 5, traço 5, marca 1 | — |

## Mural e câmera
**Layout em serpentina** (`criarMural` em `lib/mural.mjs`)
- `celulas: {1: [ids…], 2: […]}`: uma coluna por bloco; a última termina em `CARD`.
- Coluna de 1.500 px (`COLW`) e linha de 1.900 px (`ROWH`). Bloco ímpar desce, bloco par sobe.
- Desvio sorteado com semente fixa (1234567): ±160 px em x, ±120 px em y, ±2,5°.
- Estação-filha (sem célula própria) reaproveita a de outra, com outro alvo de câmera ou outra escala (ex.: uma estação dentro do celular de outra, com k 0,42; duas estações na mesma célula com alvos diferentes).
- **A ordem das chamadas no gerador importa** (ids, sementes e sorteio dependem dela): estações (`ctx`/`base`/`alvo`/`extraCam`) → `caminho()` → estação do mural inteiro → `card()` → `decoracao()` → `camera()` → `voaBoia()` → `degrades()` → `sfx(plano)` → `trilha()` → `gravar()`.

**Chave de câmera:** `{t, x, y, zoom, rot, curva, arco}`. O zoom é interpolado em escala log; a `curva` vale para o trecho que chega na chave; `arco` = recuo de zoom no meio do trecho (0,22 = 22%), que transforma o chicote num arco suave.

**Curvas** (`CURVAS_LAB` em `camera.ts`): `suave`, `entrada` (expo-out), `saida`, `linear`, `expo`, `assento` (do kit) + `snap` (bezier 0,3/1,45/0,45/1, overshoot curto) e `chicote` (0,9/0/0,1/1). `snap` e `chicote` só existem no `camera.ts`.

**Chegada por tipo** (`CHEGADA` em `lib/mural.mjs`)

| Chegada | dur (s) | Curva | Arco | Extra | Uso típico |
|---|---|---|---|---|---|
| `abre` | 0 | — | — | zoom 0,98 do alvo | 1ª estação |
| `chicote` | 0,55 | `suave` | 0,22 | — | troca de bloco, pausa curta |
| `deslize` | 0,8 | `suave` | 0,06 | **padrão** (texto sem nome conhecido) | a maioria |
| `snap` / `snap-zoom` | 0,32 | `snap` | 0 | — | entrar num detalhe |
| `giro` | 0,6 | `suave` | 0,1 | rot ±8°, alternando por estação | virada de assunto |
| `queda` | 0,45 | `assento` | 0,04 | — | algo que "cai" |
| `recuo` | 0,7 | `suave` | 0,35 | — | sair de um detalhe |
| `recursao` | 0,6 | `expo` | 0 | — | a estação mora dentro de uma peça (ex.: dentro de um celular) |
| `emerge` | 0,45 | `assento` | — | feita pela montagem | estação depois de cada montagem |

- **Início da chegada:** `ts = max(fim da fala anterior − 0,05; 1ª palavra − 0,8 × dur; última chave + 0,05)`; `te = ts + dur` = o instante em que a câmera "chegou".
- **Punch-in na palavra-chave:** de `tc − 0,02` a `tc + 0,16` s, zoom × 1,055 e 8 px para cima, curva `snap`. Pulado se cair a < 0,12 s da última chave, a < 0,35 s da próxima estação ou a < 0,8 s de uma chave própria da estação.
- **Deriva:** zoom × 1,03 (`suave`) até o fim da estação (0,6 s antes da 1ª palavra da seguinte, ou 0,03 s antes da montagem).
- **Chaves próprias** (`extraCam[id] = [{t, dx, dy, zoom, rot, curva}]`): viagem dentro da estação (ex.: descer uma lista longa; recuar para mostrar engrenagens; girar junto com uma espiral).
- **Câmera viva** (`viva` 5): ruído de ±5 px na tela, zoom ±0,6%, rotação ±0,25°, também com a câmera parada.
- **Montagem (mergulho, teleporte, emergência):** segura no início da pausa → mergulha na peça (`mergulho: {Mn: [estação, dx, dy]}`) com zoom (1/k) × 3,4 em `saida`, no tempo da entrada → 0,03 s depois salta escondida (`linear`) para a estação seguinte, já com zoom × 3,4 → segura até o fim dos planos → emerge com `assento` em max(0,45 s; saída + 0,2 s). Falta o mergulho de uma montagem? O gerador para com erro.
- **Recuo final** (`final: {de, recuo, card, tRecuo, tMural, tSegura, tSai, tCard}`): as chaves depois de `tRecuo` saem; a câmera vai a meio caminho entre a última estação e o centro do mural, com zoom 0,32, em `tMural`; chega ao mural inteiro 1,6 s depois, cresce × 1,02 e × 1,03, sobe para o card com zoom 0,35 em `tCard − 0,1`, assenta no zoom 1 em `tCard + 0,7` (`assento`) e termina em 1,04.
- **Zoom do mural inteiro:** `min(1080/largura, 1920/altura) × 0,96` do retângulo das células com folga de 700 px nas laterais e 1.100 px em cima e embaixo (na validação, 0,098).
- **Motion blur de câmera:** liga quando a velocidade na tela passa de 18 px por quadro (`limiar`). Rastro = velocidade × obturador 0,5; de 3 a 8 cópias sub-quadro (`maxAmostras`), uma a cada 14 px (`espaco`), somadas em `plus-lighter`. Com cópias a mais de 5 px, um blur leve de meio espaçamento no conjunto. Desligado enquanto a montagem cobre a tela.
- **Fundo infinito:** ladrilho preto-fosco de 512 px que anda a 0,4 da câmera (mais longe que o plano de fundo).

## Elementos e entradas
**Tipos de elemento** (`tipos.ts`; desenho em `elementos.tsx`; atalho no `ctx` do mural)

| Tipo | Campos próprios | Atalho e padrões do mural |
|---|---|---|
| `papel` | `cor`, `semente`, `vincos`, `colunas` (texto fantasma em barras), `rasgado` | `c.papel(dx, dy, w, h, o)`; `base(c, look)` = papel 1040×1640 do look + luz. Sombra de contato, filete de luz na borda de cima, borda rasgada |
| `foto` | `src`, `borda` (14), `halftone`, `zoomInterno` | `c.foto(src, dx, dy, w, h, o)`: `voa` 0,36 s, rot ±2°, zoom interno 1 → 1,07. Borda creme `#E4DED2` rasgada; halftone de 6 px (desligar com `halftone: false` nas fotos que já vêm halftone) |
| `recorte` | `src` (PNG com alfa) | `c.rec(src, dx, dy, w, h, o)`: `voa` 0,42 s, boia 1 |
| `texto` | `palavras [{t, w}]`, `escala` (`apoio`, `chave`, `capitulo`), `tamanho`, `cor`, `alinhar`, `recua`, `torto`, `degrade` | `c.tx(frase, escala, dx, dy, o)`: as palavras saem do áudio (cada uma entra 0,03 s antes da fala dela); largura 940; chave com `cor: 'marca'` e `tamChave` |
| `objeto` | `nome`, `ev {}`, `p {}` | `c.obj(nome, dx, dy, w, h, ev, p, o)`; `o.voa: true` = `voa` 0,36 s |
| `marca` | `cor`, `dur` | `c.marca(dx, dy, w, h, ini)`: marca-texto na cor de acento que se desenha em 0,26 s, borda rasgada, −1,5° |
| `fita` | `semente` | `c.fita(dx, dy, ini, rot)`: 230×56, −30°, `pousa`, passo 2; não boia (segura a peça) |
| `traco` | `d`, `vb`, `cor`, `espessura`, `dur` | `c.traco(d, vb, dx, dy, w, ini, o)`: desenho em 0,4 s (curva `risco`), passo 3, treme ±1,5 px, espessura 6, tinta clara (acento nos destaques) |
| `luz` | `cor`, `forca` | `c.luz(forca)`: poço radial em `screen`, 1.500 px, 0,07 (0,1 no mármore) |

- **Campos de base:** `id`, `x`, `y` (centro, no mundo), `w`, `h`, `rot`, `plano`, `ini`, `fim` (sem `fim`, a peça fica até o fim do vídeo, o que permite o mural inteiro), `entra`, `passo`, `boia`, `boiaId`.
- **Saída** (quando há `fim`): blur 8 + fade em 0,13 s.

**Entradas** (`entra: {tipo, dur, de, dist}`; duração padrão em `DUR_PADRAO`)

| Entrada | dur (s) | Como |
|---|---|---|
| `surge` | 0,25 | fade (padrão sem `entra`) |
| `pousa` | 0,4 | mola `snappy`: escala 1,18 → 1, giro 7° → 0, cai de −50 px; opacidade em 0,08 s |
| `sobe` | 0,24 | sobe 70 px, blur 10 → 0 (expo-out) |
| `escala` | 0,15 | 0,9 → 1, blur 8 → 0 |
| `slam` | 0,16 | 1,55 → 1, blur 6 → 0; no texto, cada palavra 1,45 → 1 com opacidade em 0,05 s |
| `desliza` | 0,3 | atravessa 900 px da direita, blur 12 → 0, giro 4° → 0 |
| `voa` | 0,42 (padrão; o mural usa 0,36 em foto e objeto) | ver abaixo |
| `nenhuma` | 0 | — |

**`voa`, todos os parâmetros** (`elementos.tsx` + `M.voaBoia()`)
- Vem de fora: `dist` 1.400 px do mundo, do lado `de` (`esq`, `dir`, `baixo`, `cima`, `ne`, `no`, `se`, `so`).
- O mural escolhe o lado pelo setor de 45° em que a peça mora em relação ao alvo da câmera. Peça a < 160 px do centro alterna baixo → esq → cima → dir.
- Curva `entrada` (expo-out): quase todo o caminho nos primeiros ~0,12 s, assenta macio.
- Trajetória em arco: desvio lateral de sen(π·(1−p)) × dist × 0,24.
- Giro de ±24° → 0; escala 1,12 → 1; blur 18 × (1−p)^1,5 → 0; opacidade em 0,04 s.
- **Só começa 0,05 s depois que a câmera chega na estação** (`ini = max(ini, chegou + 0,05)`). O `voaBoia` tira o `passo` da peça que voa.

**Boiar** (deriva orgânica depois que a peça entra; rampa de 0,5 s)
- ±7 px em x, ±9 px em y, ±1,1°, ±1% de escala, × a intensidade `boia`.
- Padrão: recorte 1, foto 0,7, objeto 0,8, texto 0,3 (o texto usa metade), traço 0. Papel, fita, marca e luz não boiam.
- Estação em escala k: o mural multiplica a intensidade por k (o mesmo "boiando" na tela).
- **Não boia** (`boia: 0`): peça presa com fita, peça que contém outra estação (ex.: o celular com uma estação-filha dentro), foto com persiana por cima, objeto preso pela fita.
- `boiaId`: boia junto com outra peça, sem rampa (ex.: uma rachadura desenhada sobre um recorte).

**Passos (feito à mão):** `passo` 1 = 24 fps; **2 = 12 fps** (fita, papel que pousa, papéis do card); **3 = 8 fps** (traço que treme). A câmera e o blur seguem em 24 fps. Dentro dos objetos: `riscos` em passo 3; `bateria`, `calendario`, `lista`, `folhas`, `agenda` e `caminho` em passo 2.

**Planos de parallax** (`PARALLAX`): `fundo` 0,55 · `meio` 1 · `frente` 1,35.
- Decoração automática (`M.decoracao()`), por célula: uma folha grande `#141215` de 1.300×1.000 no fundo e uma lasca `#26221F` de 140–210 × 180–250 px na frente, no canto (± 640 px em x, ± 980 px em y), fora da zona de texto.

**Camadas dentro de cada plano** (`camada()` em `PaperVox.tsx`)

| Camada | O que fica nela |
|---|---|
| 0 | papel, foto, recorte, objeto, marca, fita, luz |
| 1 | **texto** (sempre por cima das peças) |
| 2 | traço à mão e o objeto `flash` (o risco que corta a palavra continua cortando) |

- A ordem do `quadro.json` vale dentro de cada camada.
- **Entre planos, a frente fica por cima do meio:** as lascas da frente podem passar por cima do texto do meio. Por isso ficam nos cantos, fora da zona de texto.

## Objetos de papel (catálogo)
Desenhados em código em `objetos.tsx` (SVG e CSS, nada é imagem gerada), cada um numa caixa w×h do mundo. `ev` = instantes (s) ancorados nas palavras pelo gerador; `p` = parâmetros. Texto dentro de objeto sempre em HTML.

| Objeto | `ev` | `p` | Exemplo de uso |
|---|---|---|---|
| `silhuetas` | `entra` (uma cabeça a cada 2 q), `tinta` | `n` (7) | "todo mundo faz igual": cabeças iguais, sem rosto, tinta na cor de acento na palavra-chave |
| `aspas` | `entra` (mola `snappy`) | — | uma expressão citada ("o que chamam de sucesso") |
| `carimbo` | `bate` (escala 1,8 → 1 em 0,12 s, tremor de 3 q) | `texto`, `tamanho` (150) | a palavra-veredito ("ATRASADO"), rot −9° |
| `riscos` | `desenha` (passo 3, 0,05 s entre riscos) | `n` (4) | "correndo" |
| `persiana` | `passa` (1,4 s) | — | sobre uma foto (que não boia) |
| `bateria` | `esvazia` (1 s, passo 2), `pisca` (0,75 s) | — | "sem energia" |
| `celular` | `rola` (620 px/s) | — | "tela de celular"; pode conter uma estação-filha (não boia) |
| `relogio` | `gira` | — | "horas" |
| `calendario` | `monta`, `marca`, `repete` (passo 2) | — | "todo dia igual" |
| `lista` | `checks`, `cresce`, `marca` (passo 2) | `n` (8), `altura` (84), `rotulo`, `idx` (5) | lista de tarefas; lista longa (40 linhas) com um item no último lugar |
| `manometro` | — | `niveis [[t, valor 0–1]]` (o último ≥ 0,99 em `snap`; treme acima de 0,9; faixa de acento de 0,8 a 1) | "pressão" |
| `spot` | `acende`, `apaga` (0,3 s) | — | uma palavra isolada no escuro ("Exatamente.") |
| `espelho` | `foco` (blur 12 → 0 em 0,4 s) | `src` (o recorte, espelhado) | "olhar para si" |
| `coracao` | `rasga` (0,3 s), `cai` (0,8 s) | — | algo que se rompe (preso com fita) |
| `folhas` | `vira` (passo 2, 3 q entre folhas) | — | "deixo para depois" |
| `perfis` | `surge`, `fio`, `vibra`, `pulso` | — | conexão entre pessoas |
| `balanca` | `desce`, `oscila`, `afunda`, `volta` | — | pesar escolhas (pratos vazios, sem ponteiro e sem número) |
| `agenda` | `cai`, `tenta`, `empurra` (passo 2) | `rotulo` | prioridades que não cabem |
| `engrenagens` | — | `gears [{x, y, r, n, dir, ini, para}]` | "produtividade de máquina"; todas param numa virada ("Mas") |
| `espiral` | `desenha`, `fecha`, `acelera` | `voltas` (4,5) | ciclo, ansiedade, obsessão |
| `caminho` | `desenha`, `fim`, `acende` (passo 2) | `d`, `espessura` (14; o mural usa 30) | o traço que liga o mural (`M.caminho()`) |
| `fichas` | `separa` (0,45 s) | — | separar coisas que se confundem |
| `icones` | `entra` (0,12 s entre eles) | — | Instagram e YouTube, só no card |
| `flash` | `em` (cor de acento em `screen`: 2 q a 0,8 + 1 q a 0,35) | — | a palavra de maior impacto. **No máximo 2 por vídeo**; fica na camada de cima |

- **Objeto novo é peça nova num modelo fixo:** só entra com ⏸ do usuário. Proponha na shot list (camada marcada "objeto novo") e peça o ok. Quem implementa é a conversa principal (o `diretor-paper-vox` não mexe em `src/`): componente + linha no `MAPA` do `objetos.tsx`, conferência com `quadros.mjs` e depois a regressão (ver "Checagens", item 11), antes do P5.
- Nome fora do `MAPA`: o gerador do mural **para com erro** no `M.gravar()` (sem essa trava, a peça sumiria calada).
- Cabeça é sempre a forma simples sem rosto (`CABECA` no `objetos.tsx`).

## Montagens
- **Onde:** só nos silêncios da fala (pausas longas). Validação: 5 montagens em pausas de 1,08 a 3,04 s.
- **Validador (ERRO):** plano fora de 0,12–0,4 s; planos + entrada + saída maior que a pausa + 0,3 s; palavra da fala dentro da montagem.
- **Medidas:** entrada de 0,25–0,4 s; saída de 0,1–0,3 s; 4–10 planos de 0,2 s. Na maior pausa (~3 s), rampa que acelera: 0,3 → 0,15 s, com o último plano segurando 0,2 s.
- **Como aparece** (`Montagem` em `PaperVox.tsx`):
  - entrada: a tela do 1º plano cresce de 2,2 → 1 de dentro do mergulho, com blur 14 → 0;
  - planos em tela cheia, em P&B (contraste 1,08), com movimento em rodízio `push` → `pan-e` → `pull` → `pan-d` → `tilt`;
  - cada troca: 2 q de blur 9 + clarão de 35%;
  - saída: encolhe 1 → 0,45 com blur 12 e some enquanto a câmera emerge.
- **Planos:** stills 9:16 (bloco MONT do `prompts-flow.md`), em `04_broll/ia_flow/Mnn.jpg`. Só mãos, objetos e gente de costas; telas e papéis ilegíveis.
- **Sem repetição visual.** Confira na `shotlist.json` que nenhuma `fonte` (`flow:Fnn`, `flow:Mnn`, `biblioteca:<arquivo>`) aparece em duas estações ou planos de montagem: o `validar-shotlist.mjs` só conta o teto. Repetições entre montagens só como rima de propósito (ex.: tênis na caixa → mãos amarrando o cadarço).
- **Plano claro demais** (área clara > 15%): `escurecer` no gerador (ex.: `{M27: 0.68, M25: 0.85}`).
- **Som:** o plano de montagem não tem SFX. Antes dela entra um whoosh (início da montagem − 0,05 s) ou um swell/riser com o pico no mergulho; a trilha sobe um pouco na pausa (`volSemFala`). Uma montagem pode entrar sem SFX quando a trilha volta.
- **Gerador:** `mergulho: {M1: ['E06', 40, 170], …}` = estação e deslocamento da peça onde a câmera some. A montagem casa com as estações pelos tempos (fim da estação de antes = início da pausa; início da seguinte = fim da pausa, ±0,02 s).

## Tipografia
Fonte A, sem fonte nova: Inter Tight + Instrument Serif itálica (`src/kit/fontes.ts`).

| Papel | Fonte | Tamanho (px do mundo) | Entrada | Cor | Uso |
|---|---|---|---|---|---|
| Apoio | Inter Tight 600, −0,01em, linha 1,1 | 64 (padrão); 44–60 no card; 46 nos rótulos de ícone | palavra a palavra: blur 8 → 0 e 0,9 → 1 em 0,15 s | `#F2EFEA` com sombra `0 4px 24px rgba(0,0,0,.65)` | o resto da frase, em geral acima da chave |
| Chave | Instrument Serif itálica, −0,02em, linha 0,95 | `tamChave(frase, 920)`, até 210; explícito de 120 a 250; escala extrema até 520 (ex.: um "não" gigante) | igual, em 0,2 s; ou `slam` | `cor: 'marca'` = um dos 3 degradês | 1 palavra-chave por estação; punch-in da câmera |
| Capítulo | Instrument Serif itálica | 560 | — | — | existe no código; não foi usado na validação |
| Carimbo | Inter Tight 900, caixa-alta, +0,1em | 150 (140 na validação) | `bate` | cor de acento | objeto `carimbo` |
| Card | chave e apoio | nome 170 · profissão 56 · credencial 44 · @ 60 | em cascata (0,3 → 1,3 s) | nome no degradê; o resto `#F2EFEA` | fixo |
| Mural inteiro | chave e apoio | tamanho × 1/zoom do mural (≈ × 10: 70 → 717; 200 → 2.049) | — | **até o apoio no degradê** (o branco some sobre as fotos) | estação do recuo final |

- **`tamChave(t, larg, max)`** = `round(min(max, larg ÷ (letras da maior palavra × 0,47)))`, com `larg` 920 e `max` 210 no `ctx`.
- **Truques de texto:** `recua` (a palavra gigante encolhe até virar legenda, curva `expo`, 0,6 s); `torto` (letras caem uma a uma e tremem a 8 fps); `rot` inclinado; branco sobre a marca-texto de acento.
- **Sem legenda separada:** na tela entram só os trechos da fala escolhidos na shot list (apoio + chave). Todo texto de tela vem da fala da estação (ERRO no validador).
- **Texto sempre em HTML**, nunca `<text>` dentro de SVG.

**Degradês da marca** (paleta padrão do framework, troque pela sua; `DEGRADES` em `elementos.tsx`; `linear-gradient(100deg, …)`)

| Nome | Cores (paradas) |
|---|---|
| `salmao-vermelho` | `#F08C70` 0% → `#D9483A` 52% → `#B90015` 100% |
| `salmao-laranja` | `#F4A285` 0% → `#EC8257` 45% → `#E26934` 100% |
| `vermelho-laranja` | `#C21A1F` 0% → `#D95721` 55% → `#E9782F` 100% |

- **Rodízio** (`M.degrades()`): por ordem de entrada, salmão-vermelho → vermelho-laranja → salmão-laranja → …; dois seguidos nunca iguais (validação: 12, 11 e 11).
- Aplicado com `background-clip: text` no próprio nó de cada palavra, cor transparente, `paddingRight: 0.06em` (a itálica não corta) e sombra por `drop-shadow(0 6px 18px rgba(0,0,0,.7))`.
- **Trocar pela sua marca:** edite `DEGRADES` e `COR` em `elementos.tsx` (e o acento em `objetos.tsx`, se mudar o carmim), com ⏸ do usuário. É mudança de modelo: depois, grave a nova referência da regressão do PAPER VOX (ver `00_SISTEMA/regressao/README.md`). Mantenha 3 degradês legíveis sobre `#0E0C10`.

## Cor e acabamento
Paleta padrão do framework (troque pela sua, ver acima):

| Papel | Hex | Uso |
|---|---|---|
| Preto-fosco (fundo) | `#0E0C10` | fundo infinito, montagem |
| Carvão | `#1C1A18` | papel do look `editorial` (com colunas de texto fantasma e vincos) |
| Papelão | `#2E2620` | papel do look `colagem` (o `#4A3A2A` existe no `COR`) |
| Mármore | `#141316` | papel do look `marmore` |
| Folha de fundo / tela | `#141215` | decoração do plano de fundo; tela de celular |
| Lasca da frente | `#26221F` | decoração do plano da frente |
| Papéis do card | `#2B2522`; papel em branco `#1E1B19` | card |
| Tinta clara (texto) | `#F2EFEA` | apoio, traço, objetos |
| Carmim (acento da marca) | `#B90015` | marca-texto, carimbo, flash, acentos dos objetos. **Nunca como cor de texto sobre o escuro** |
| Borda da foto | `#E4DED2` | moldura rasgada |
| Sombra dos objetos | `#2A2624` | engrenagens e afins |

- **100% dark:** área clara ≤ 15% do quadro (conta fundo, papel e superfície; texto e traço não contam). Não há script que meça: conferência visual na folha de contato e na folha de quadros. O plano claro de montagem é escurecido no código (`escurecer`).
- **Acabamento** (`Acabamento` em `PaperVox.tsx`, por cima de tudo):
  - poço de luz radial (70% × 55%, centro em y 45%) a 6% de `#F2EFEA` em `screen`;
  - vinheta radial (85% × 75%) até 62% de preto;
  - grão `grao` 0,09 (`Grao` do kit).
- **Papel:** sombra de contato `0 28px 60px rgba(0,0,0,.75)`, filete `inset 0 2px 0 rgba(242,239,234,.16)`, borda rasgada, textura com manchas, grão, fibras, colunas de texto fantasma (só barras, nunca letra) e vincos (`texturas.ts`). A textura segura o quadro até decodificar (`delayRender`): sem isso, um quadro podia sair sem grão nem fibras e dois renders do mesmo código diferiam mais (PSNR mín. 41 dB; com a trava, ≥ 42–44 dB).
- **Foto:** P&B, sombra `0 30px 70px rgba(0,0,0,.8)`, halftone de 6 px em `multiply` a 55%.
- **Flash:** só na cor de acento, 2 q, no máximo 2 por vídeo. Nunca branco.

## Imagens
- **Origem:** stills de um gerador de imagem (padrão: Google Flow; alternativas: API Gemini via `scripts/gen.mjs`, ChatGPT Imagens, Higgsfield via MCP; ver `prompts-flow.md` e `docs/03-IMAGENS-E-BROLL.md`). Sem vídeo gerado. Fotos da biblioteca (`02_BIBLIOTECA/broll-reutilizavel`) viram P&B no gerador (`pb()`: 1.200 px, contraste 1,22, brilho −0,05, cópia em `04_broll/meus/*_pb.jpg`).
- **Três blocos de prompt** (texto exato em `prompts-flow.md`):
  - **FOTO** (foto do jornal ou da estação, halftone P&B, 3:4 ou 4:3);
  - **RECORTE** (objeto ou estátua em fundo azul `#0000FF`, 1:1);
  - **MONT** (plano de montagem, 9:16, P&B cinematográfico de pouca luz).
- **Ids:** `Fnn` nas estações (fotos e recortes), `Mnn` nas montagens. Variações: x2 (x4 nas de destaque).
- **P&B sempre:** as fotos já vêm halftone; os recortes passam por `--pb`; os planos de montagem são P&B no código.
- **Recorte:** `node scripts/recorte-chroma.mjs <proj>/04_broll/ia_flow/<id>.jpg <proj>/04_broll/ia_flow/recortes/<id>.png --pb --aparar [--choke 1|2]` (de dentro do motor, com os caminhos completos: o script não recebe `<proj>`; comando inteiro em `prompts-flow.md`). A cor-chave é medida nos 4 cantos; halo > 3% (> 6% com `--pb`) = refazer. Objeto fino (tubo, fio) pede `--choke`.
- **Resolução:** a escolhida precisa ter **≥ 2K no lado maior** (no Flow, o "Baixar lote" entrega 1K, que serve só para escolher). Os planos de montagem são ampliados 1,6–1,8× no final.
- **Escolha:** nota de cada variação em `04_broll/ia_flow/escolhas.json` (`{id: {v, nota}}`) → folha de contato `06_previas/imagens-escolhidas_<n>.jpg` → ⏸ usuário.
- **Pastas:** escolhidas em `04_broll/ia_flow/<id>.jpg`; recortes em `04_broll/ia_flow/recortes/Fnn.png`; variações em `04_broll/ia_flow/_brutos/<id>/` até a prévia ser aprovada (guarde a variante escolhida antes de apagar, para poder recortar de novo).
- **Orçamento:** teto de 25 imagens por minuto (ERRO); ≥ 35% das estações sem imagem (AVISO). Validação: 47 imagens geradas + 5 da biblioteca.
- Texto nunca dentro da imagem.

## Áudio
### Voz
- A narração é a base: a composição toca `01_bruto/bruto.mp3` (ou `.wav`/`.m4a`) desde `vozIni`.
- Na etapa 0, perguntar "Ajustar o áudio?" (`tratar-voz.mjs`/`estudio-audio.mjs` só se o usuário marcar). O áudio de validação já veio tratado (voz a −19,8 LUFS).
- Se o usuário marcar e escolher uma versão, ela entra no gerador do mural: `criarMural(PROJ, {celulas, voz: '05_audio/<arquivo>.wav'})`. Sem `voz`, o mural volta sozinho para o `01_bruto/bruto.*`, e o volume da trilha e dos SFX é medido sobre a voz que entrar.

### SFX
**Banco por categoria** (`BANCO` em `lib/mural.mjs`). Os pacotes de terceiros (Motionix, Mixkit) e os SFX curados do lab **não vêm no repositório**: ver `02_BIBLIOTECA/sfx/README.md` e `05_LAB/sfx/README.md` para o que colocar em cada pasta. Categoria com pasta vazia faz o gerador do mural parar com "sem som na categoria (banco vazio)". Alvos para voz a −19,8 LUFS; com outra gravação, andam junto com a voz (`vozI`).

| Categoria | Fonte (pasta lida) | Alvo M máx. | Alvo de pico | Uso típico (validação) |
|---|---|---|---|---|
| `whoosh` | `02_BIBLIOTECA/sfx/motionix/whooshes` (arquivos com fast, simple, short, mediam, smooth-and-fast no nome) | −32 | −17 | mergulhos e viagens grandes (6) |
| `impacto` | `05_LAB/sfx/impacto` + `02_BIBLIOTECA/sfx/impact_sub.wav` | −31 | −13 | onde a trilha corta (5) |
| `papel` (virar página) | `05_audio/sfx/lab/papel/` do projeto, se houver; senão `05_LAB/sfx/papel/` | −35 | −24 | carimbo, card (2) |
| `gear` | `02_BIBLIOTECA/sfx/motionix/gear` | −34 | −22 | manômetro, engrenagens (2) |
| `riser` | `02_BIBLIOTECA/sfx/motionix/risers` | −33 | −19 | viradas (2) |
| `swell` | `reverse_swell`, `shimmer` (`02_BIBLIOTECA/sfx`, gerados na instalação) | −33 | −19 | viradas, mural inteiro (2) |
| `scroll-ui` | `05_LAB/sfx/scroll-ui` | −36 | −26 | celular, lista longa (2) |
| `ui` | `02_BIBLIOTECA/sfx/motionix/ui-sound-effects` (click, button, enter, open, select) | −36 | −25 | bateria (1) |
| `glitch` | `05_LAB/sfx/glitch` (8 primeiros) | −35 | −25 | uma palavra polêmica (1) |
| `clique` | `05_LAB/sfx/clique` | −27 (padrão) | −25 | spot que acende (1) |
| `ding` | `05_LAB/sfx/ding` | −35 | −24 | perfis ligados (1) |
| `pop` | `02_BIBLIOTECA/sfx/motionix/pop` | −36 | −24 | ícones (1) |

- Som curto (< 0,4 s) se mede pelo pico; o longo, pelo menor entre o M máx. e o pico. `vol` = 10^(dB/20), teto 1, × o multiplicador da linha do plano.
- **Regras** (travas do formato; o gerador para com erro):
  - ~1 SFX a cada 5 s, 12–17 dB abaixo da voz;
  - **≥ 1,15 s entre dois SFX**;
  - **nunca a mesma categoria em seguida** (e nunca o mesmo arquivo: o banco gira).
- **Só nos acentos:** impacto onde a trilha corta, whoosh nos mergulhos e viagens grandes, swell/riser nas viradas, um som próprio por objeto.
- **Sem som:** entrada de imagem, papel, fita e plano de montagem.
- O plano do gerador é a lista curada; os `sfx` da shot list são só candidatos.

### Refino milimétrico (P7, para todo vídeo novo)
- **Por quê:** a composição só acerta a grade de 1/24 s (41,7 ms) e o ponto que "bate" em cada som é diferente. Um riser que bate no começo e decai (pico em 0,05 s), posto para "terminar no mergulho", soou 2,3 s antes. Um reverse swell tem o pico a 0,89 s de 1,21 s, não no fim. **Medir, não supor.**
- **Cada SFX declara o instante visual** (use depois de `M.camera()` e `M.voaBoia()`):

  | `M.ev.*` | Instante |
  |---|---|
  | `palavra(id, frase, n)` | início da palavra |
  | `slam(textoEl)` | a palavra bate (90% da escala) |
  | `pouso(el)` | a peça que voa assenta (92% do caminho) |
  | `viagem(id)` | meio da viagem da câmera até a estação (velocidade máxima) |
  | `chegada(id)` | a câmera chega |
  | `mergulho(j)` | a câmera some na peça da montagem j |
  | `objeto(el, chave, atraso)` | evento interno de um objeto (ex.: `'bate'` do carimbo) |
  | `em(tipo, t)` | instante livre |

- **Ponto do som** que cai no evento: `ataque` (o transiente: impacto, papel, clique, pop, ding, glitch, ui, gear) ou `pico` (whoosh, riser, swell; `ALVO_PADRAO`). Medido no arquivo (`pontosDoSom`: envelope de 5 ms; ataque refinado na amostra). O `alvo` só aceita `'ataque'` ou `'pico'` (`SfxLab` em `tipos.ts`).
- **Cache das medidas:** `05_audio/sfx/lab/medidas.json` do projeto. Os instantes ficam em `t_ataque`/`t_pico` (s no arquivo), separados do `pico` (nível em dB) da medida de volume.
- **Linha do plano:** `[null, 'whoosh', 0.8, M.ev.viagem('E05'), {ajuste: 0}]` (opcional `alvo: 'ataque' | 'pico'`) e `M.sfx(plano, {naMixagem: true})`. Com `sfxNaMixagem`, a composição não toca os SFX e o `mixar-audio.mjs` põe cada um na amostra exata.
- **Ciclo:** `refinar-sfx.mjs <proj> --video <prévia com trilha>` → `03_roteiro/sfx_refino.md` (cada SFX: evento, ponto do som, desvio em ms, quadro) + carretel `06_previas/sfx-refino_<data>.mp4` (1 clipe de 1,5 s por SFX, número e evento escritos, barra na cor de acento no quadro exato) → o usuário ouve e pede "o 7 entra 2 quadros antes" → `{ajuste: -83}` (ms; negativo = antes) no plano → gerador → `node scripts/mixar-audio.mjs <proj> --video 06_previas/previa_<AAAAMMDDHHMM>_paper.base.mp4 --props 03_roteiro/quadro.json --trilha <X> [--saida …]` (segundos; sem `--saida`, sai `…_paper.base_trilha-<X>.mp4`, o `--video` do `refinar-sfx.mjs` seguinte) → carretel novo → ⏸.

### Trilha
- **Da biblioteca** (`02_BIBLIOTECA/musicas/`; o gerador para se o arquivo não estiver lá). **2 opções** mixadas para comparar (A e B) em toda prévia.
- **Trilha nova:** sem 2 opções adequadas no `02_BIBLIOTECA/musicas/catalogo.md` (evite as do vídeo anterior)? Busque no Pixabay Music (ou outra fonte com licença para redes) conforme o arco, ⏸ apresente 2–3 com link, duração e aviso de Content ID e baixe só as aprovadas **direto em `02_BIBLIOTECA/musicas/`** (o `lib/mural.mjs` recusa trilha fora de lá; não use `05_audio/musica`). Depois, acrescente a linha no `catalogo.md`.
- **≤ 1/4 da voz** (`volTrilha`): com fala, o pico curto da trilha (S máx.) fica 13 dB abaixo da voz; sem fala (pausas ≥ 0,5 s e montagens), 12 dB.
- **Cortes só voz** nos momentos tensos ou de ênfase: a trilha para seco em 12 ms e volta em 0,12 s com a frase seguinte. No gerador: `fimFala(id)` = fim da fala + 0,06 s; `ateProxima(id)` = o silêncio segura até 0,08 s antes da frase seguinte.
- **Fade de 2,5 s** no card. Loudness final −14 LUFS / −1 dBTP em 2 passadas lineares (`mixar-audio.mjs`).
- **Validação:** A = suspense de investigação (tensão contínua; o final natural cai no card), desde 0,7 s (vol 0,0624 com fala, 0,07 sem; S máx. −8,7), a escolhida; B = quarteto de cordas documental, desde 0 (0,055 / 0,0617; S máx. −7,6). 7 cortes, 24 pausas. As duas tinham Content ID no YouTube: confira isso antes de publicar.

## Ética de conteúdo e regras visuais do formato
- **Regras da sua área:** se a sua profissão tem conselho com regras de publicidade (saúde, direito, finanças…), elas valem aqui também: sem promessa de resultado, sem antes/depois, sem depoimento, sem preço, identificação profissional no card quando for exigida.
- **Texto de tela:** só da fala da estação (ERRO); palavra em dúvida fora da tela até o usuário responder (ERRO); palavras de promessa absoluta vetadas: promessa, cura, curar, garantia, garantido(a), 100%, milagre, definitivo(a) (ERRO; lista `VETADAS` no `validar-shotlist.mjs`).
- **Conferência do texto de tela:** antes das imagens, revise (ou peça a um agente que revise) cada afirmação do texto de tela com a fala da estação ao lado. A fala está gravada: correção só com palavras da própria fala (ou no visual). Grave o resultado em `03_roteiro/checagem-texto-tela.md`.
- **Tema sensível sobre corpo** (peso, aparência, doença): nenhum corpo. Cabeças iguais e sem rosto; estátua só com cabeça e ombros; balança sem ponteiro e sem número.
- **Montagens** só com mãos, objetos e gente de costas. Telas, jornais e papéis ilegíveis; sem veículo nem marca real.
- **Imagens:** sem rosto reconhecível, sem marca ou logo, sem "no estilo de", texto nunca dentro da imagem.
- Ponto de opinião vira opinião na tela (ex.: "uma opinião polêmica"), com ressalva e fecho.

## Passo a passo (P0–P9)
Scripts de dentro do motor (`00_SISTEMA/motor`); geradores de dentro do projeto. Render, alinhamento e regressão sempre pela fila (`node scripts/vez.mjs node scripts/…`). Do áudio à prévia 2 da validação: ~5 h, contando as esperas de aprovação.

| Etapa | O que fazer | Script / agente | ⏸ | Tempo (validação) |
|---|---|---|---|---|
| P0 Entrada | Chega um ÁUDIO. `.oga` do WhatsApp → mp3 (`ffmpeg -i "<áudio>.oga" "<áudio>.mp3"`); mp3/wav/m4a direto. Projeto: `novo-projeto.mjs "<nome>" "<áudio>"` (aspas: o nome do WhatsApp costuma ter parênteses e espaços) → `01_bruto/bruto.mp3`. Pergunta da etapa 0: o formato (com áudio, este é o óbvio, mas pergunte junto) + "Ajustar o áudio?". Sem "corrigir cor" nem decupagem | `novo-projeto.mjs` | ⏸ etapa 0 | — |
| P1 Transcrição | **Nesta ordem:** `transcrever.mjs <proj>/01_bruto/bruto.mp3 <proj>/02_analise --principal` → `02_analise/correcoes.json` (à mão) → `corrigir-palavras.mjs <proj> <proj>/02_analise/correcoes.json` → `alinhar-palavras.mjs <proj>` → `02_analise/transcricao_corrigida.md` (à mão) com as dúvidas ⚠ (ver "P1 em detalhe") | `transcrever`, `corrigir-palavras`, `alinhar-palavras`; conversa principal | ⏸ dúvidas | transcrição ~5 min; alinhamento ~12 min para 142 s |
| P2 Proposta de cenas | Copiar o `03_roteiro/montar_shotlist.mjs` do molde do formato (o piloto em `00_SISTEMA/regressao/pilotos.json`, senão o último vídeo PAPER VOX aprovado; no 1º vídeo, escrever do zero) e reescrever o criativo (ver `shotlist-esquema.md`) → `node 03_roteiro/montar_shotlist.mjs` → `shotlist.json`/`.md` → `validar-shotlist.mjs <proj>` 0 ERRO → repetição visual conferida → conferência do texto de tela → `03_roteiro/checagem-texto-tela.md` (ver "P2 em detalhe") | agente `diretor-paper-vox` (modo "cenas") | ⏸ shot list (+ objeto novo, se houver) | — |
| P3 Prompts de imagem | `03_roteiro/prompts_flow.md` e `.json` (blocos FOTO, RECORTE, MONT) | `diretor-paper-vox` (modo "prompts"); `prompts-flow.md` | ⏸ prompts e gerador (com custo) | — |
| P4 Imagens | Geração no gerador escolhido (padrão: Flow pelo seu Chrome com Claude in Chrome) → escolha → escolhida em ≥ 2K → `recorte-chroma.mjs <proj>/04_broll/ia_flow/<id>.jpg <proj>/04_broll/ia_flow/recortes/<id>.png --pb --aparar [--choke 1-2]` → folha de contato | Claude in Chrome (ou `gen.mjs` / MCP) | ⏸ downloads e imagens | operação estimada em 45–60 min |
| P5 Mural | Copiar o `03_roteiro/montar_quadro.mjs` do molde do formato (no 1º vídeo, escrever do zero pelo esqueleto abaixo) e reescrever só o criativo: células, peças de cada estação, `mergulho`, `escurecer`, `final`, plano de SFX com `M.ev.*` e `naMixagem: true`, cortes da trilha e 2 opções (trilha nova: ver Áudio › Trilha), voz tratada se houver → `node 03_roteiro/montar_quadro.mjs` → `quadro.json` (ver "Gerador do mural: esqueleto") | `diretor-paper-vox` (modo "mural") | ⏸ trilha nova, se baixar | — |
| P6 Prévia | `render-paper-vox.mjs <proj> --previa --manter-base` → 2 versões (trilha A e B) em `06_previas/previa_<AAAAMMDDHHMM>_paper_trilha-<X>.mp4` + a base sem trilha `06_previas/previa_<AAAAMMDDHHMM>_paper.base.mp4` + folha de quadros + revisão | `render-paper-vox`; `revisor-de-video` | ⏸ prévia | ~10 min para 144 s (4,2 s/s) |
| P7 Refino dos SFX | `refinar-sfx.mjs <proj> --video <prévia com trilha>` → `sfx_refino.md` + carretel → ajustes → gerador → `mixar-audio.mjs <proj> --video 06_previas/previa_<AAAAMMDDHHMM>_paper.base.mp4 --props 03_roteiro/quadro.json --trilha <X> [--saida …]` → carretel novo | `refinar-sfx`, `mixar-audio` | ⏸ refino | mixagem em segundos |
| P8 Final | Render longo: `render-paper-vox.mjs <proj>` → `07_final/<proj>_final.mp4` com a trilha escolhida (`musica`) → folha de quadros + loudness | `render-paper-vox` | ⏸ render longo | ~30 min para 144 s (12,4 s/s) |
| P9 Fechamento | Entregar o final. Se o usuário quiser, sugerir a legenda do post a partir de `02_analise/transcricao_corrigida.md` + `03_roteiro/shotlist.md` | conversa principal | ⏸ antes de publicar ou enviar qualquer coisa | — |

- **P1 em detalhe:** nenhum script gera o `correcoes.json` nem a `transcricao_corrigida.md`. Quem escreve os dois é a conversa principal.
  - `correcoes.json`: lido da `transcricao_turbo.md` + `suspeitos_turbo.json`; lista de trocas `{t, de, para}` e inserções `{t, inserir, ini, fim}` (formato no cabeçalho do `corrigir-palavras.mjs`).
  - `transcricao_corrigida.md`: escrita depois do alinhamento, a partir do `palavras.json` alinhado. Cabeçalho (áudio, passadas, nº de correções, se veio ou não de roteiro) e uma linha `- [m:ss.d] frase` por frase; embaixo de cada dúvida, `⚠ "o que se ouviu"; "alternativa"?`. O `diretor-paper-vox` (modo cenas) para sem ela.
  - Cada dúvida também entra em `duvidas` na shot list, e a palavra fica FORA da tela até o usuário responder (por texto). Rodou o `corrigir-palavras` de novo? Rode o alinhamento depois.
- **P2 em detalhe:**
  - **Sem repetição visual:** nenhuma `fonte` (`flow:Fnn`, `flow:Mnn`, `biblioteca:<arquivo>`) em duas estações ou planos de montagem da `shotlist.json` (o `validar-shotlist.mjs` só conta o teto). Rima entre montagens só de propósito.
  - **Conferência do texto de tela:** ver "Ética". Resultado em `03_roteiro/checagem-texto-tela.md`.
  - **Objeto fora do catálogo:** vai junto com a shot list, marcado "objeto novo" (⏸ usuário), e é implementado antes do P5 (ver "Objetos de papel").
- Mudou a trilha escolhida depois do render? `mixar-audio.mjs` na base guardada (`--manter-base`), sem renderizar de novo.
- Prévia de um trecho: `--trecho a b` (a trilha entra alinhada com `--desde`).

## Gerador do mural (`montar_quadro.mjs`): esqueleto
O repositório não traz um gerador pronto (o do vídeo de validação tinha conteúdo pessoal). O `diretor-paper-vox` (modo "mural") escreve um por vídeo, copiando o do molde do formato quando houver; depois do seu 1º vídeo aprovado, registre-o como piloto (`00_SISTEMA/regressao/README.md`) e ele vira o molde. Esqueleto (resumo do gerador de validação; confira as assinaturas exatas em `lib/mural.mjs`):

```js
// <proj>/03_roteiro/montar_quadro.mjs — só o criativo; o genérico mora em 00_SISTEMA/motor/scripts/lib/mural.mjs
// Rode de dentro do projeto: node 03_roteiro/montar_quadro.mjs
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const PROJ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let raiz = PROJ;
while (!fs.existsSync(path.join(raiz, '00_SISTEMA', 'motor'))) raiz = path.dirname(raiz);
const {criarMural} = await import(pathToFileURL(path.join(raiz, '00_SISTEMA/motor/scripts/lib/mural.mjs')).href);

// layout: uma coluna por bloco (serpentina); a última termina no CARD
const CELULA = {1: ['E01', 'E02', 'E03'], 2: ['E04', 'E05', 'E06'], 3: ['E07', 'CARD']};
const M = criarMural(PROJ, {celulas: CELULA /* , voz: '05_audio/<voz-tratada>.wav' */});
const {T, primeira, ultimaFim, pos, ctx, base, alvo, cam, extraCam, pb, B} = M;

// estações: uma por linha; comentário no meio da linha só com /* */ (um // apagaria o alvo())
{ const c = ctx('E01', pos.E01); base(c, 'editorial'); c.foto(`${B}/F01.jpg`, 0, 60, 880, 1140, {halftone: false, boia: 0}); c.tx('Todo mundo', 'apoio', 0, -700); c.tx('cansado', 'chave', 0, -540); alvo('E01'); }
{ const c = ctx('E02', pos.E02); base(c, 'colagem'); c.tx('sem energia', 'apoio', 0, -560); c.obj('bateria', 0, 120, 600, 300, {esvazia: T('E02', 'energia')}); alvo('E02'); }
// … uma linha por estação …

// recuo final: caminho → estação do mural inteiro → papel do card
const {bcx, bcy, zMural} = M.caminho({de: 'E05', ev: {desenha: T('E05', '<palavra>'), fim: T('E06', '<palavra>'), acende: T('E06', '<palavra>')}});
{ const c = ctx('E06', {x: bcx, y: bcy}, 1 / zMural); c.tx('<apoio>', 'apoio', 0, -260, {tamanho: 70, cor: 'marca'}); c.tx('<chave>', 'chave', 0, -100, {tamanho: 200}); cam.E06 = {x: bcx, y: bcy, zoom: zMural, rot: 0}; }
{ const c = ctx('E07', pos.CARD); c.papel(0, 0, 1000, 1500, {cor: '#1E1B19', colunas: false, vincos: false}); c.luz(0.08); cam.E07 = {x: pos.CARD.x, y: pos.CARD.y, zoom: 1, rot: 0}; }
const {tCard} = M.card('E07', pos.CARD);
M.decoracao();

M.camera({
	mergulho: {M1: ['E02', 40, 170]},            // montagem → estação e deslocamento da peça onde a câmera some
	escurecer: {M03: 0.8},                        // planos de montagem claros demais
	final: {de: 'E05', recuo: 'E06', card: 'E07', tRecuo: T('E05', '<palavra>'), tMural: T('E06', '<palavra>'),
		tSegura: T('E06', '<palavra>'), tSai: T('E07', '<palavra>'), tCard: T('E07', '<palavra>')},
});
M.voaBoia();
M.degrades();

// SFX curados (refino P7: [null, categoria, mult, M.ev.*(…), {ajuste: ms}])
M.sfx([
	[null, 'impacto', 1, M.ev.palavra('E02', 'energia'), {ajuste: 0}],
	[null, 'whoosh', 0.8, M.ev.mergulho(0), {ajuste: 0}],
	[null, 'papel', 1, M.ev.em('card', tCard), {ajuste: 0}],
], {naMixagem: true});

// trilha: ≤ 1/4 da voz; cortes só voz nos momentos tensos; 2 opções [arquivo em 02_BIBLIOTECA/musicas, início na trilha, descrição]
const {fimFala, ateProxima} = M;
M.trilha({
	cortes: [[T('E02', '<palavra>') - 0.03, ateProxima('E02')]],
	opcoes: {A: ['<trilha-a>.mp3', 0, '<descrição>'], B: ['<trilha-b>.mp3', 0, '<descrição>']},
	escolhida: 'A',
});
M.gravar(); // grava 03_roteiro/quadro.json (ou --saida <arquivo>) e confere os objetos contra o MAPA
```
- `T(id, palavra)` = instante da palavra dentro da estação; `primeira(id)` e `ultimaFim(id)` = início da 1ª e fim da última palavra; `pos[id]` = centro da célula; `alvo(id, dx, dy, zoom, rot, deOutra?)` = alvo de câmera; `pb(arquivo)` = foto da biblioteca em P&B; `B` = pasta das imagens geradas (`04_broll/ia_flow`).
- Toda estação precisa de `alvo()` (senão: "sem alvo de câmera"); toda montagem precisa de `mergulho` (senão o gerador para).

## Custo de render (medido numa máquina de 7,7 GB de RAM, sem GPU)
| Item | Custo | Base |
|---|---|---|
| Prévia (meia resolução, CRF 26) | **601 s para 144 s = 4,2 s/s**; ~15,7 MB | prévia 2 da validação |
| Final (1080×1920, CRF 17, AAC 320k) | **1.786 s para 144 s = 12,4 s/s** (~30 min); 388 MB | final da validação |
| Quadro parado | 0,3–0,5 s por quadro | protótipo |
| Quadro de chicote com motion blur | 1,2–1,45 s por quadro (era 3,9 com um blur por cópia) | protótipo |
| Mixagem e troca de trilha | segundos (sem re-render) | `mixar-audio.mjs` |
| Alinhamento das palavras | ~12 min para 142 s, com a máquina carregada | `alinhar-palavras.mjs` |

- Um render por vez. Avise o usuário do tempo antes de rodar.
- Não operar o Flow (navegador) com um render rodando: falta RAM e o Chrome para de responder (ver "Armadilhas").

## Checagens antes da prévia e do final
**Antes da prévia**
1. `node scripts/validar-shotlist.mjs <proj>` com **0 ERRO** (ler os avisos: buraco sem evento, estação < 1 s, chegada ou categoria 3× seguidas).
2. Conferência do texto de tela feita, com a fala de cada estação (`03_roteiro/checagem-texto-tela.md`); nenhuma palavra em dúvida na tela.
3. **Sem repetição visual:** nenhuma `fonte` repetida em duas estações ou planos de montagem da `shotlist.json` (o validador não confere).
4. O gerador do mural roda sem erro (travas de SFX, mergulho de toda montagem, alvo de câmera de toda estação, todo objeto existe no `MAPA`, nenhuma categoria de SFX vazia).
5. **Área clara ≤ 15%** em cada quadro: conferir os planos de montagem e as fotos claras na folha de contato; acima disso, `escurecer`. (Não há script para isso: conferência visual.)
6. **Folha de quadros** dos pontos novos (`node scripts/quadros.mjs <proj> <t1> <t2> … --edicao 03_roteiro/quadro.json`).
7. **Texto coberto:** nenhum texto por baixo de foto, recorte, objeto ou linha; lascas da frente nos cantos, longe do texto.

**Antes do final**
8. `refinar-sfx.mjs` **sem avisos** (nenhum SFX sem evento, fora do quadro, colado ou com categoria repetida) e o carretel aprovado pelo usuário.
9. Folha de quadros da prévia aprovada (`revisor-de-video`): texto coberto, área clara, peça que surge sem voar.
10. **Loudness** do final: −14 LUFS integrado, pico ≤ −1 dBTP (`ffmpeg -af ebur128=peak=true`).
11. Mexeu no motor (`src/modelos/paper-vox/`, `src/kit/`, `Root.tsx`, `render-paper-vox.mjs`, `lib/mural.mjs` ou pacotes)? Rode as regressões dos 4 formatos (comandos e como gravar as suas referências em `00_SISTEMA/regressao/README.md`; o repositório não traz as referências: você grava a sua depois do 1º vídeo aprovado em cada formato):
    - `node scripts/vez.mjs node scripts/regressao-paper-vox.mjs`: IDÊNTICO ou EQUIVALENTE ≥ 40 dB (limiar calibrado em `regressao-paper-vox.mjs`: o ruído entre dois renders fica ≥ 42 dB; uma palavra de 30×15 px trocada de cor dá 38,6 dB).
    - `regressao.mjs` (TELA DIVIDIDA, IDÊNTICO), `regressao.mjs --cut` (EQUIVALENTE ≥ 42 dB) e, para o MIX, `node scripts/vez.mjs node scripts/regressao.mjs --mix` (EQUIVALENTE ≥ 42 dB).
    - Mudou o `lib/mural.mjs`? O gerador do piloto do formato (`00_SISTEMA/regressao/pilotos.json`) tem de gerar o mesmo `quadro.json`, sem sobrescrever o dele: de dentro do piloto, `node 03_roteiro/montar_quadro.mjs --saida <pasta-temporária>/quadro.json` e compare por md5 com o `03_roteiro/quadro.json` do piloto. Diferente = mudança do modelo (⏸ usuário).

## Armadilhas aprendidas
1. **`<text>` dentro de SVG** saiu 2,4× maior no render longo (quadro isolado e trecho curto saíam certos). Texto sempre em HTML (o rótulo da `lista` é HTML por isso).
2. **`CURVAS.snap` não existe no kit:** `snap` e `chicote` só moram no `CURVAS_LAB` do `camera.ts`. Não pôr no kit: mudaria o CUT e o MIX.
3. **Plano da frente × 1,35 e fundo × 0,55:** a coordenada de mundo de uma peça nesses planos é a da estação × o fator; senão a peça aparece longe.
4. **Comentário `//` no meio de uma linha de estação:** as estações do gerador ficam numa linha só, e um `//` no meio apaga o resto (o `alvo()`): o gerador para com "sem alvo de câmera". No meio, use `/* */`; `//` só no fim da linha.
5. **`background-clip: text` só funciona no nó do texto** (não pega filho com transform). Sombra por `drop-shadow` (o `text-shadow` vazaria pelo texto transparente); itálica com `paddingRight: 0.06em`.
6. **Whisper em pedaços longos deriva:** uma frase saiu 2,7 s cedo, com um "Obrigado" alucinado no silêncio. O `alinhar-palavras.mjs` retranscreve em trechos ≤ 8 s; rodou o `corrigir-palavras.mjs` de novo? Rode o alinhamento depois.
7. **A cor do chroma tem de ser medida:** o fundo veio ~`#0035FF`, não `#0000FF`. O `recorte-chroma.mjs` mede nos cantos; objeto fino pede `--choke`.
8. **Flow com a máquina sem RAM:** evento de mouse dá timeout e o texto colado por JS não chega ao editor. Espere o render terminar; não clique "às cegas" (saíram 7 lotes repetidos).
9. **Stills em 1K:** o "Baixar lote" do Flow entregou fotos de 896×1200 e planos de 768×1376; um recorte bruto de 1024×1024 virou 458×914 depois de aparado. Baixe a escolhida em 2K.
10. **Chegada em texto livre:** o `tipoChegada` procura os nomes na ordem chicote, deslize, snap-zoom, snap, giro, queda, recuo, recursão, emerge, abre. "giro 8° + deslize ←" vira `deslize`. Use o nome de código exato.
11. **`pushK` descarta em silêncio** a chave a ≤ 5 ms da anterior. O recuo final apaga as chaves depois de `tRecuo`.
12. **O validador é mais fraco que o gerador:** categoria de SFX 3× seguidas é só AVISO na shot list, mas 2× seguidas faz o gerador parar. A trava que vale é a do `M.sfx`.
13. **Montagem casa com a estação pelos tempos** (±0,02 s): mexeu no `ini`/`fim` de uma estação à mão? Gere a shot list de novo.
14. **Palavra com pontuação na âncora:** a âncora da shot list leva a palavra como está no `palavras.json` (ex.: `e-mail.@22.45`); o validador ignora a pontuação.

## Preferências do usuário (preencha/ajuste)
Valores atuais = padrão sugerido.
| Preferência | Padrão |
|---|---|
| Duração típica | livre (a do áudio + 3,2 s); a validação tem 144 s |
| Entrada | qualquer áudio narrado (com ou sem roteiro escrito antes) |
| Card final | sem CTA: nome, profissão/título, credencial (se houver), ícones e @ (dados de `02_BIBLIOTECA/kit/marca/marca.json`) |
| Trilha | 2 opções (A e B) em toda prévia; ≤ 1/4 da voz com cortes só voz |
| Refino milimétrico dos SFX (P7) | em todo vídeo |
| Paleta | carmim `#B90015` + 3 degradês salmão/vermelho/laranja (paleta padrão do framework) |

## Peças
### Já existe no código
| Peça | Onde | O que faz |
|---|---|---|
| `PaperVox` + `calcularPaperVox` | `src/modelos/paper-vox/PaperVox.tsx` | Mundo em 3 planos + fundo infinito, motion blur de câmera, montagens, acabamento, voz e SFX |
| Câmera | `camera.ts` | `cameraEm` (chaves, zoom log, `arco`), `cameraViva`, `velocidadeTela`, `transformPlano`, `PARALLAX`, `CURVAS_LAB` |
| Elementos | `elementos.tsx` | 9 tipos, 8 entradas, `boiar`, `tempoPasso`, `DEGRADES`, `COR` |
| Objetos de papel | `objetos.tsx` | os 24 objetos do catálogo (`MAPA`) |
| Texturas | `texturas.ts` | papel, borda rasgada, ladrilho do fundo, prng; segura o quadro até a textura decodificar |
| Tipos | `tipos.ts` | `QuadroProps`, `Elemento`, `ChaveCamera`, `SfxLab`, `Musica`, `MontagemLab` |
| Biblioteca do gerador | `scripts/lib/mural.mjs` | âncoras, serpentina, `ctx` e atalhos, looks, caminho, card, decoração, câmera, `voaBoia`, degradês, SFX com travas e `M.ev.*`, trilha, `gravar` (confere os objetos contra o `MAPA`; `--saida <arquivo>` grava fora do `03_roteiro/quadro.json`), `acharRaiz` |
| Scripts | `scripts/` | `render-paper-vox`, `mixar-audio`, `refinar-sfx`, `validar-shotlist`, `alinhar-palavras`, `recorte-chroma`, `regressao-paper-vox` |
| Geradores por vídeo | `<proj>/03_roteiro/` | `montar_shotlist.mjs` e `montar_quadro.mjs`, escritos por vídeo (ver `shotlist-esquema.md` e "Gerador do mural: esqueleto") |

### O que pode crescer
- **Objetos novos** no `objetos.tsx` (um componente + uma linha no `MAPA`), só com ⏸ do usuário (regra dos fixos), implementados pela conversa principal. Depois, a regressão (os objetos antigos não podem mudar).
- **Som de papel real:** a categoria `papel` pode trocar os sintetizados por gravações de papel com licença (registre a licença em `LICENCAS.md`).
- Existem no código e não foram usados na validação: escala `capitulo`, entrada `desliza`.
- **Proposta (não feita):** receitas como funções na biblioteca (`jornalVivo`, `estatuaSanduiche`…) e peças declaradas na `shotlist.json` (célula, peças, câmera, corte de trilha), para o gerador por vídeo encolher.
