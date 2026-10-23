# Kit fixo reutilizável (motion, marca e peças prontas)

**Regra:** antes de criar qualquer motion graphic, procure aqui. Tudo que for fixo ou reaproveitável (intro, apresentação com @, encerramento, ícones, transições-assinatura, painéis) vira:
- **componente parametrizado** em `00_SISTEMA/motor/src/kit/`: reutilizar custa zero token, basta chamar pelo nome no `edicao.json`; ou
- **clipe renderizado** em `02_BIBLIOTECA/kit/clipes/` (webm com alfa quando for overlay).

Cada peça nova ganha uma linha aqui, com prévia (gif/jpg) em `02_BIBLIOTECA/kit/previas/`. Peça nova num formato fixo só entra a pedido do usuário e depois das regressões (`CLAUDE.md`, seção "Regressões").

Os parâmetros completos de cada peça estão no comentário do topo do arquivo dela em `00_SISTEMA/motor/src/kit/pecas/`; cada peça tem uma vitrine de teste em `00_SISTEMA/motor/src/testes/entrada-<peça>.tsx` (comando de still no topo do arquivo).

## Marca
- Dados em `marca/marca.json`: nome de exibição, profissão/cargo, credencial, @, redes, fonte e paleta. Preencha antes do primeiro vídeo.
- As peças de marca mostram nome, cargo, credencial e @. O card final do PAPER VOX lê `nome`, `profissao`, `credencial` e `handle` direto do `marca.json` (`lerMarca` em `scripts/lib/mural.mjs`). Nas camadas (`apresentacao-redes`, `encerramento-insta`, `encerramento-youtube`), passe os textos **explicitamente** nos parâmetros, copiados do `marca.json` (os padrões do código são textos de exemplo, e o @ padrão fica no campo `arroba` de `src/modelos/estilos.ts`). Confira num still (`quadros.mjs`) antes do primeiro render de cada formato.
- **Paleta padrão do framework (troque pela sua):** acento carmim `#B90015`, acento profundo `#5E0E06`, creme `#F5F1EA`; no PAPER VOX, fundo `#0E0C10`, texto `#F2EFEA` e os 3 degradês das palavras-chave (salmão → vermelho `#F08C70 → #D9483A → #B90015`, salmão → laranja `#F4A285 → #EC8257 → #E26934`, vermelho → laranja `#C21A1F → #D95721 → #E9782F`). As cores de cada formato moram em `00_SISTEMA/motor/src/modelos/estilos.ts` (CUT e MIX) e `00_SISTEMA/motor/src/modelos/paper-vox/elementos.tsx` (PAPER VOX); trocar a paleta é mudança de motor (regressões).
- **Fonte A** (padrão): Instrument Serif itálica + Inter Tight.

## Ícones
- **Redes:** `simple-icons` (Instagram, YouTube, TikTok, WhatsApp, Threads, Spotify, X, Facebook, Telegram; LinkedIn não existe no pacote). Uso: `import {siInstagram} from 'simple-icons'` → `<svg viewBox="0 0 24 24"><path d={siInstagram.path}/></svg>`; cor oficial em `siInstagram.hex`.
- **Interface e infos:** `lucide-react` (milhares de ícones de linha, visual "Apple"): `<Timer size={64} strokeWidth={1.5}/>`.

## Componentes prontos
| Peça | Onde | Uso no `edicao.json` | Formatos |
|---|---|---|---|
| Card de texto palavra por palavra (+ órbita de objetos) | `Edicao.tsx` → `CardTexto`, `Orbita` | layout `texto` (+ `orbita`) | 9:16 (TELA DIVIDIDA) |
| Gráfico de barras com mola, contagem e selo | `Edicao.tsx` → `GraficoBarras` | layout `grafico` | 9:16 (TELA DIVIDIDA) |
| Stop-motion de imagens | `Edicao.tsx` → `CenaVisual` | `sequencia` + `quadroDur` | 9:16 (TELA DIVIDIDA) |
| Transições blur / whip / flash / glitch (com SFX automático) | `Edicao.tsx` → `Entrada` | `transicao` | 9:16 (TELA DIVIDIDA) |
| Legenda palavra a palavra com destaques | `Edicao.tsx` → `Legenda` | automático (`destaques`) | 9:16 (TELA DIVIDIDA) |
| Cena-teste (3D, motion blur, ícones, curva, papel rasgado, texto atrás) | `src/testes/TesteKit.tsx` | composição `TesteKit` | 16:9 |
| **Motor de camadas** (CUT DINÂMICO e MIX EDIT) | | | |
| Título cinético (cascata de palavras, `*destaque*`, 4 fontes) | `src/modelos/camadas.tsx` → `titulo` | `camadas: [{tipo: "titulo", texto, x, y, tamanho, fonte, cor, plano}]` | 9:16 e 16:9 |
| Objeto/imagem com pop de mola e flutuação | `camadas.tsx` → `imagem` | `{tipo: "imagem", arquivo, x, y, largura, rot}` | 9:16 e 16:9 |
| Texto/objeto atrás da pessoa | `MotorCamadas` + `scripts/recortar.mjs` | camada com `"plano": "atras"` + `recortes` | 9:16 e 16:9 |
| Zoom progressivo, rosto desfocado, escurecer | `MotorCamadas` → cena `fala` | `zoom`, `curva`, `foco`, `desfoque`, `escurecer` | 9:16 e 16:9 |
| Tela escura/grade com trilha (pausa inserida) | `MotorCamadas` → `montagem` + cena `tela` | `{pausa: s}` + `{layout: "tela", fundo: "grade"}` + `musica.fim` | 9:16 e 16:9 |
| Transições corte/flash/blur/zoom/**lente**/**silhueta** com SFX Motionix | `MotorCamadas` → `Entrada`/`SaidaLente`/`Recortado` | `transicao` (silhueta precisa de recorte no começo da cena; `silhueta: {texto}`) | 9:16 e 16:9 |
| **Legenda cinética** (100% da fala como tipografia: voz/conector/destaque, padrões linha/pilha/mae/larga, zera no corte) | `src/modelos/LegendaCinetica.tsx` | automática no CUT; `destaques`; camada com `legenda: false` (+ `legendaAte`) esconde | 9:16 |
| P&B seletivo + retícula | `MotorCamadas` → `filtroCena`/`Reticula` | cena `pb: true`, `reticula: true` | 9:16 e 16:9 |
| Zoom alternando sozinho entre cenas `fala` | `MotorCamadas` → `resolverCenas` | cena sem `zoom` | 9:16 e 16:9 |
| **Motor do MIX EDIT** (tudo opt-in; formato dos campos e exemplos em `src/tipos.ts`) | | | |
| Enquadramentos A (aberto), B1 (médio), B2 (parede livre à direita), C (close), com o sentido do zoom alternando | `MotorCamadas` → `resolverCenas` + `estilos.ts` → `enquadramentos` | cena `fala`: `"enquadramento": "B2"` (`zoom`/`foco` da cena têm prioridade) | 16:9 |
| Chaves de câmera: zoom, foco, desfoque e escurecer animados de chave em chave, com curva por trecho (pessoa e recorte juntos) | `MotorCamadas` → `animar`/`camCena` | cena `fala` ou `tela`: `"chaves": [{t, zoom?, foco?, desfoque?, escurecer?, curva?}]` (t em s desde o início da cena) | 9:16 e 16:9 |
| Golpe 3D flash: flash 2 q a 70%, punch 1→1,10 em 4 q, zoom-blur 60→0 em 6 q ou aberração 12→0 em 4 q (WebGL no vídeo e na foto; blur CSS na tela) + whoosh e sub | `MotorCamadas` → `golpeEm`/`FlashGolpes` | cena: `"golpes": [{t, efeito?: "zoomBlur"\|"aberracao"\|"nenhum", punch?, flash?, dur?, som?: false}]` (t em s da saída) | 9:16 e 16:9 |
| Câmera virtual na tela + camadas presas à câmera (tela e fala; acompanham também as transições da cena) | `MotorCamadas` → `TelaCena`/`CameraCamada` | cena `tela` com `zoom`, `foco`, `chaves` ou `golpes`; camada com `"camera": true` | 9:16 e 16:9 |
| Transições por movimento: chicote (3 q + 4 q, blur direcional SVG), mergulho (11 q no `alvo` + 10 q saindo do escuro), esticão (3 q + 3 q); flash do estilo (MIX: 2 q a 70% + 6 q) | `MotorCamadas` → `Movimento`/`SaidaMix`/`Entrada` | `"transicao": "chicote"` (+ `"direcao": "dir"`), `"mergulho"` (+ `"alvo": [x, y]`, ponto do quadro da cena anterior), `"esticao"` | 16:9 |
| Várias trilhas (intro, corpo A, corpo B) com o mesmo ducking; `quedas` com vol > 1 sobem a trilha | `MotorCamadas` → `trilhas` | `"musica": [{arquivo, de, ini, fim, fade, entrada, vol, volSemFala, quedas}]` (objeto = trilha única) | 9:16 e 16:9 |
| Microfade da voz (0,04 s) nas emendas da montagem; grade técnica (#0D0E13, linha #222634 a cada 96 px pelo centro); ganho de SFX das peças (× 1,25, entre 0,55 e 1) | `estilos.ts` → `microfade`, `grade`, `ganhoSfx` | automático no MIX | 16:9 |
| Palavra de impacto (caixa-alta 900 pela largura, extrusão, letras/pop/virar, saída blur/chicote/corte; funciona atrás da pessoa) | `src/kit/pecas/palavra-impacto.tsx` | `{tipo: "palavra-impacto", texto, y, largura, condensar, entrada, saida, plano}` | 9:16 e 16:9 |
| Caixa de seleção estilo Figma (ponto, alças, tracejado, rótulo, virada para o acento, faíscas) | `src/kit/pecas/selecao.tsx` | `{tipo: "selecao", texto, x, y, rotulo, virarEm, veu}` (use sobre fundo escuro) | 9:16 e 16:9 |
| Checklist de vidro com ✓ desenhados no tempo da fala | `src/kit/pecas/checklist.tsx` | `{tipo: "checklist", titulo, itens: [{t, texto}], y, largura}` (não cobrir o rosto) | 9:16 e 16:9 |
| **Fora do padrão** (sem @ fixo nos vídeos; só se o usuário pedir). @ com ícone do Instagram que se monta + brilho em gradiente; troca de canto | `src/kit/pecas/marca.tsx` → `MarcaArroba` | `{tipo: "marca-arroba", pos: "a"\|"b", brilho: [s], trocas, arroba}` (som do brilho vai à mão: `motionix/pop/pop_06_sweet-ui-open`) | 9:16 e 16:9 |
| Card final do Instagram (ícone 150 px → gradiente, @, linha serifada) | `src/kit/pecas/marca.tsx` → `EncerramentoInsta` | `{tipo: "encerramento-insta", texto, arroba}` + `{pausa: 2}` + cena `tela` | 9:16 e 16:9 |
| Papel rasgado com texto que revela a cena de baixo | `src/kit/pecas/papel-rasgado.tsx` | `{tipo: "papel-rasgado", texto, rasgarEm, angulo, entrada}` (sons do rasgo automáticos no instante do rasgo) | 9:16 e 16:9 |
| Régua em card de vidro com faixa ideal no meio e duas pontas de alerta, agulha com número contando | `src/kit/pecas/escala-ph.tsx` → `EscalaPh` | `{tipo: "escala-ph", y, momentos: [{t, valor, rotulo?}], titulo, min, max, normal, marcas, casas, rotuloBaixo, rotuloAlto, rotuloNormal}`. Nasceu como régua de pH: os padrões do código são de pH, então passe sempre `titulo`, `min`, `max`, `normal` e os rótulos das pontas para usar como régua genérica. O som de alerta ainda usa a faixa 7,35–7,45 fixa no registro (`camadas.tsx`) | 9:16 e 16:9 |
| Rodapé de fonte do dado | `src/kit/pecas/escala-ph.tsx` → `Fonte` | `{tipo: "fonte", texto}` (26 px, o padrão, também no MIX: a 40 px engolia o gráfico; ≥ 3 s no ar) | 9:16 e 16:9 |

### Peças do YOUTUBE - MIX EDIT
Vitrines em `src/testes/entrada-{intro,cards,dados,3d,colagem}.tsx`. No MIX, o `edicao.json` costuma sair de um gerador do projeto (`03_roteiro/montar_edicao.mjs`) a partir dos tempos do bruto.

| Peça (`tipo`) | O que faz | Uso típico |
|---|---|---|
| `ponto-luz` | Ponto creme com halo no acento, pulsando; nasce em `origem` e viaja; sai em colapso/cometa | Tela escura da intro, antes do `titulo-quente` |
| `titulo-quente` | Título leve (Inter Tight 300, caixa baixa) que nasce do ponto, letras quentes → creme, sublinhado; estouro e colapso em `colapsoNa` (s da saída = última nota da trilha) | Título na intro |
| `flash-foto` | Fotos em tela cheia de 6–10 q com flash de 2 q, aberração e Ken Burns; respeita ≤ 3 flashes/s e ≥ 12 q de rosto | Substantivos do gancho |
| `match-cut` / `match-cut-tipo` | Text Match Cut de prints reais (palavra travada pela tinta medida no PNG; hold com veículo e data) / versão tipográfica | Logo depois da pergunta do gancho; prints via `scripts/capturar-manchete.mjs` |
| `manchete-falada` | Frase falada no topo com karaokê no acento | Telas de mecanismo/explicação |
| `painel-tecnico` | Painel de traço fino com linhas digitadas no tempo da fala; modo mecanismo (conectores até o destino) ou roteiro | Rosto desfocado ou tela grade |
| `grafico-barras` | Barras com mola sem quique, contagem, escala linear ou log, rodapé de fonte (26 px numa linha; o mesmo do contador, do gráfico de linha e do painel) | 1 número verificável |
| `grafico-linha` | 1–3 séries desenhando com cabeça de brilho; selo "esquemático" sem fonte | Tendências, ciclos |
| `contador` | Número contando (tabular), sufixo, rótulo, fonte; fundo acento/escuro | Pico de número (ex.: +40%, 90%) |
| `diff` | Linha "−" riscada sobre linha "+" no acento | Mito × prática, antes × depois de uma ideia |
| `ficha-papel` | Papel creme com caneta tremida, ✓/☒ e carimbo (sem rodapé: ponha a fonte no texto dos itens) | Desenho de estudo, quebra de modo |
| `card-vidro` | Card Apple (vidro escuro/claro/sólido) com ícone Lucide, número, título, itens no tempo da fala | Informação lateral na parede livre (≤ 520 px) |
| `apresentacao-redes` | 2–3 cards de vidro: nome, cargo, credencial (`credencial`; `''` = sem o card da credencial), ícones das redes e @. Passe `nome`, `cargo`, `credencial`, `credencialIcone`, `arroba` e `redes` do `marca.json` | Apresentação depois do gancho (enquadramento B2) |
| `card-capitulo` | "01" + título serifado + linha desenhando | Início de capítulo sobre rosto desfocado |
| `dicionario` | Verbete com sílabas acendendo, classe e definições (passe `palavra` com as sílabas, ex.: `pro·cras·ti·na·ção`) | Termo pouco conhecido |
| `encerramento-youtube` | Tela final: ponto de luz, @ e ícones à esquerda, metade direita livre (passe `arroba` e `redes`) | Últimos 10–20 s |
| `texto-3d` | Texto extrudado em CSS 3D, voo e giro; paletas parede/escuro/acento; frente ou atrás da pessoa | Picos de ênfase |
| `objeto-3d` | Objeto WebGL modelado por código (`lua`, `relogio`, `capsula`, `sol`, `prato`) flutuando, passando ou orbitando a cabeça (`--gl=angle`) | 3D flash |
| `piso-3d` | Câmera 3D inclinada sobre piso de grade com títulos/cards de pé (1 item com `*destaque*` por vez) | Quebra de modo sobre `tela` grade |
| `colagem-papel` | Cards de papel creme: palavra/número grande no acento, texto com *trecho* sublinhado a caneta, foto P&B rasgada, círculo de caneta; cada card entra pela direita e o anterior some no corte | Substantivos do gancho (no lugar do `flash-foto`) |
| `colagem-titulo` | Título em stop-motion: fotos P&B caem uma a uma com "tremido" quadro a quadro; em `bateEm` o título carimba numa tira de papel (junto com a parada brusca da trilha) | Título do vídeo na intro |

### Peças do INSTAGRAM - PAPER VOX ANIMATION
Composição própria `PaperVox` (não é o motor de camadas: nada disso entra no `edicao.json`). Código em `00_SISTEMA/motor/src/modelos/paper-vox/` (campos em `tipos.ts`, objetos em `objetos.tsx`); as peças vão no `03_roteiro/quadro.json`, que o gerador do vídeo escreve sobre `00_SISTEMA/motor/scripts/lib/mural.mjs` (atalhos de peça, câmera, `voa` + boia, degradês, card). Regras de uso: `01_REFERENCIAS/modelos/paper-vox-instagram/guia-de-estilo.md`. Texto sempre em HTML, nunca em `<text>` de SVG.

| Peça (`tipo`) | O que faz | Uso típico |
|---|---|---|
| `papel` | Papel escuro com textura procedural (manchas, fibras, colunas de "texto fantasma", vincos, borda rasgada) | Fundo de cada estação do mural |
| `foto` | Foto P&B com borda, halftone e zoom interno opcionais | Still de IA numa estação |
| `recorte` | PNG sem fundo (`scripts/recorte-chroma.mjs --pb --aparar`, fundo azul `#0000FF`) | Figura ou objeto que voa e boia |
| `texto` | Palavra a palavra (blur → nítido); escalas `apoio` (Inter Tight 600, branco), `chave` (Instrument Serif itálica, nos 3 degradês em rodízio) e `capitulo`; `recua` (escala extrema que encolhe), `torto` (letras que tremem a 8 fps) | Palavras-chave e frases de apoio (sempre por cima das outras peças do plano) |
| `objeto` | 24 objetos de papel em código (SVG/CSS), animados pelos instantes `ev`: `silhuetas`, `aspas`, `carimbo`, `riscos`, `persiana`, `bateria`, `celular`, `relogio`, `calendario`, `lista`, `manometro`, `spot`, `espelho`, `coracao`, `folhas`, `perfis`, `balanca`, `agenda`, `engrenagens`, `espiral`, `caminho`, `fichas`, `icones`, `flash` | Uma ideia por objeto; `icones` (Instagram e YouTube) no card; `flash` carmim de 2 quadros, máx. 2 por vídeo. Objeto fora desta lista = peça nova (⏸ usuário) |
| `marca` | Marca-texto carmim que se desenha | Grifo sob uma palavra (texto branco por cima) |
| `fita` | Fita adesiva; a peça presa não boia | Prender foto ou papel |
| `traco` | Traço à mão (SVG `d`) que se desenha a 8 fps | Circular, riscar, ligar (por cima do texto) |
| `luz` | Poço de luz radial | Acabamento da estação |
| `entra` | Entradas `pousa`, `sobe`, `escala`, `slam`, `surge`, `desliza`, `voa` (de fora da tela, 1.400 px, em arco, giro de 24°, blur 18 → 0, expo-out 0,36–0,42 s, depois que a câmera assenta) e `nenhuma` | Recorte, foto e objeto físico = `voa` |
| `boia` / `boiaId` | Deriva sutil depois de entrar (±7 px, ±1,1°); `boiaId` boia junto com outra peça; peça presa = `boia: 0` | Nada fica estático |
| `camera` | Chaves `{t, x, y, zoom, rot, curva, arco}`; chegadas `chicote`, `deslize`, `snap`, `snap-zoom`, `giro`, `queda`, `recuo`, `recursao`, `emerge`; parallax em 3 planos (`fundo` 0,55, `meio` 1, `frente` 1,35); motion blur nos chicotes | Viagem de estação em estação, sem corte |
| `montagens` | A câmera mergulha num elemento, planos P&B de 0,12–0,4 s em tela cheia (`push`, `pull`, `pan-e`, `pan-d`, `tilt`) e emerge na estação seguinte | Silêncios da fala (~0,2 s por plano) |
| card da marca (`M.card` no `mural.mjs`) | Nome no degradê, profissão, credencial (sem a linha se vazia), ícones e @, lidos de `marca/marca.json` | Fim do vídeo (o único lugar do @) |

## Ferramentas disponíveis (já no motor)
- `@remotion/effects` (WebGL, render com `--gl=angle`): tear, glow, chromatic-aberration, zoom-blur, light-leak, light-trail, halftone, duotone, grayscale, exposure, paper, scanlines, tv-signal-off, color-key, wave, vignette, blur progressivo…
- `@remotion/motion-blur`, `@remotion/three`, `@remotion/paths`, `@remotion/noise`, `@remotion/shapes`, `@remotion/layout-utils`, `@remotion/lottie`, `@remotion/light-leaks`, `@remotion/animation-utils`, `@remotion/transitions`.
- Recorte da pessoa: `scripts/recortar.mjs` (usa `npx hyperframes remove-background`, local; ver `CLAUDE.md`).

## A construir
Faltam: mosaico de recortes · texto em arco.

## Clipes renderizados
_(nenhum ainda)_
