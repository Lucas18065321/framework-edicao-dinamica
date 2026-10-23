# Guia de estilo: INSTAGRAM - TELA DIVIDIDA

Id `tela-dividida-instagram` · composição `Edicao` · status: **fixo e congelado** (`"congelado": true` em `00_SISTEMA/motor/src/modelos.json`).

## Resumo do formato
| | |
|---|---|
| **O que é** | Vídeo de fala vertical, dinâmico e clean. O B-roll ocupa a metade de cima e a pessoa a metade de baixo, com a legenda exatamente na emenda. Entre os trechos divididos entram a pessoa em tela cheia (com punch-in), cards de B-roll, cards de texto com a frase-chave, gráficos de barras animados e stop-motion. |
| **Quando usar** | Vídeo de fala em que o texto cita muita coisa "mostrável" (pessoa, lugar, objeto, número): explicações, listas, dados, curiosidades. Ex.: "5 hábitos de produtividade", "como escolher uma faca de cozinha". |
| **Entrada necessária** | Um **vídeo bruto** vertical com você falando (celular ou câmera). Pode vir decupado ou não. |
| **Proporção e fps** | Vertical 9:16, **1080×1920, 24 fps** (fixo no `modelos.json`). |
| **Pode mudar** | O conteúdo de cada vídeo: B-roll, textos dos cards, palavras de destaque, gráficos, trilha, SFX manuais, a paleta e o @ da sua marca (`02_BIBLIOTECA/kit/marca/marca.json`). |
| **Não pode mudar** | O formato é **congelado**: layouts, tipografia, transições, tempos, acabamento e o código da composição `Edicao` não mudam. Ferramenta nova (SFX, motion) só a pedido explícito do usuário, e qualquer mudança no motor tem de passar na regressão da TELA DIVIDIDA com resultado **IDÊNTICO** (ver `00_SISTEMA/regressao/README.md`). Quer outro estilo? Treine um formato novo com `/novo-modelo`. |

**Origem do formato:** treinado a partir de 3 vídeos de referência de terceiros (não incluídos no repositório; para treinar o seu próprio estilo, use os seus com `/novo-modelo`):
- **ref 1 (tela dividida, ~90 s):** base da estrutura.
- **ref 2 e ref 3 (só o lado "DEPOIS/EDITADO"):** base da tipografia, das transições e do acabamento. Os lados "ANTES/BRUTO" foram ignorados.

## Formato
- Vertical 9:16, 1080×1920, 24 fps.
- Arquivo de edição: `03_roteiro/edicao.json` (tipos em `00_SISTEMA/motor/src/tipos.ts`, tipo `Edicao`). **Os tempos das cenas (`ini`, `fim`) são segundos do BRUTO.**

## Layouts (campo `layout` da cena → uso → % do tempo)
| Layout | Uso | % |
|---|---|---|
| `split`: B-roll em cima (50%), você embaixo (50%) | Sempre que a fala cita algo mostrável (pessoa, lugar, objeto, número) | ~55% |
| `card`: B-roll em tela cheia num card arredondado sobre fundo preto | História/ilustração, sem rosto | ~15% |
| `fala`: você em tela cheia, com punch-in alternando 100% e 112% (campo `punch`) | Frases de impacto, perguntas, viradas | ~25% |
| `texto`: card limpo, escuro ou claro (`fundo`), com a frase-chave (`*destaque*` marca a palavra na fonte de destaque) | Abertura de bloco, conceito central, CTA final | ~5% |
| `grafico`: barras animadas com contagem (campo `grafico`: `titulo`, `barras`, `sufixo`, `nota`, `destaqueEm`, `selo`) | Sempre que a fala citar números/percentuais | pontual |
| stop-motion (`sequencia` de imagens em `split`/`card`, trocadas a cada `quadroDur` s) | Ganchos visuais de "transformação" (ex.: uma mesa de trabalho bagunçada que vai se arrumando quadro a quadro) | pontual |
| órbita (`orbita` no layout `texto`: PNGs sem fundo girando em volta da frase) | Frase-chave com objetos do tema em volta | pontual |

- No `split` não há linha divisória; a legenda fica exatamente na emenda.
- Troca de layout a cada **2–5 s**; troca de B-roll dentro do `split` a cada **1,5–3 s**.
- `rostoY` (0..1) diz a altura do rosto no bruto, para o enquadramento da metade de baixo.

## Legenda
- Posição: na emenda do `split`; no terço inferior em `fala` e `card`; nenhuma no `texto` (`semLegenda` desliga numa cena).
- Blocos de até 3 palavras / 18 caracteres, sincronizados palavra a palavra.
- Base: sans fina. **Palavra-chave**: fonte de destaque grande, ~1 a cada 1–2 frases (lista `destaques`).
- Entrada palavra a palavra: blur 8→0 px + subida de 10 px em ~200 ms. Saída: fade de ~130 ms.
- A transcrição tem de estar corrigida antes da prévia (`corrigir-palavras.mjs`): a legenda sai dela.

## Fontes (campo `fonte` = `"A"` em todos os vídeos)
- **Destaque: Instrument Serif itálica.** Serifa editorial fina, a "assinatura" dos editores premium de Reels em 2025–26 e a mesma linha visual das referências.
- **Base: Inter Tight.** Sans neutra, compacta, ótima leitura no celular.
- Por que não as fontes "virais" (Montserrat Bold, Anton, Bebas): são o padrão do caption chamativo e saturado. Este formato é dinâmico mas **clean**; o contraste vem da serifa itálica grande contra a sans pequena, não de caixa-alta pesada.
- As alternativas B/C/D continuam no motor (`src/fonts.ts`) só para testes pontuais.

## Transições (campo `transicao`: como a cena ENTRA)
| Nome | Duração | Quando | Som automático |
|---|---|---|---|
| `corte` | 0 | Padrão dentro do mesmo layout (~60%) | — |
| `blur` | 330 ms | Mudança de layout | `whoosh_soft` |
| `whip` | 230 ms | Mudança de assunto | `whoosh_fast` |
| `flash` | 300 ms | Viradas fortes (máx. 1–2 por vídeo) | `shimmer` |
| `glitch` | 200 ms | No máximo 1 vez por vídeo | `glitch` |
- Easing ease-in-out; transição sempre num respiro da fala, nunca no meio de uma palavra.

## Movimento contínuo
- Foto: Ken Burns de 10% (`movimento`: `in`, `out`, `esq`, `dir`). Vídeo de B-roll: 4%. Rosto: zoom leve contínuo.

## Cor e acabamento
- Contraste +8%, saturação −5%, leve calor (campo `cor`). Vinheta sutil e grão fino (`grao`, padrão 0.07).
- Se o seu bruto já vem com a cor ajustada, não empilhe correção: pergunte ao usuário antes de mexer na cor.

## Abertura e fechamento
- Abertura (0–3 s): `split` com o B-roll mais forte + palavra-chave grande.
- Fechamento: `fala` → card `texto` com CTA.

## B-roll: sem repetição visual
- **Nunca repita o mesmo arquivo (nem variações quase idênticas) dentro de um vídeo.** Termos que voltam na fala (ex.: "rotina", "foco", "tempo") recebem **3 a 5 variações visuais diferentes** (ângulo, tipo de mídia — foto, vídeo, ilustração, 3D, gráfico — e composição).
- No plano, liste os termos recorrentes e quantas aparições cada um tem; prepare uma variação por aparição.
- Na biblioteca, catalogue as variações com as mesmas tags do termo, para que a próxima busca já traga várias opções.

## B-roll: ordem de preferência
1. **Seus arquivos** (`04_broll/meus`): sempre primeiro.
2. **Banco gratuito** (`04_broll/banco` e `fotos`): Pexels/Pixabay (vídeo), Openverse/Wikimedia (fotos). Créditos registrados em `04_broll/creditos.json`.
3. **Internet** (`04_broll/internet`): só material que você tem direito de usar (seu, licenciado, domínio público).
4. **Imagem gerada por IA** (`04_broll/ia_flow`): só quando o conceito é específico demais para banco. Prompts em `03_roteiro/prompts_flow.md`. Como gerar (Google Flow no navegador, API Gemini via `scripts/gen.mjs`, ChatGPT Imagens ou Higgsfield via MCP): `docs/03-IMAGENS-E-BROLL.md`.

## Áudio
### Música
- Pixabay Music (ou outra fonte com licença para redes), escolhida por vídeo conforme o arco: tensão → construção → queda antes da virada → resolução. `musica.arquivo` é relativo ao projeto (ex.: `05_audio/musica/<faixa>.mp3`); as faixas reutilizáveis ficam catalogadas em `02_BIBLIOTECA/musicas/` (não incluídas no repositório; ver o README da pasta).
- Ducking automático: `vol` com fala (padrão 0.10) e `volSemFala` (padrão 0.28); fade de entrada e de saída. `quedas` abre respiros (ex.: antes da virada).

### Efeitos (pacote básico em `02_BIBLIOTECA/sfx`, gerado na instalação por `synth-sfx.mjs`)
| Efeito | Onde entra |
|---|---|
| `whoosh_soft`, `whoosh_fast`, `shimmer`, `glitch` | Automáticos nas transições (quando `sfxAuto` está ligado) |
| `pop_soft` | Automático em cada palavra-chave (quando `sfxAuto` está ligado) |
| `swish_air`, `click_soft`, `tick_micro`, `riser_short`, `impact_sub`, `reverse_swell` | Manuais (lista `sfx`), em momentos de storytelling |
- Regra: no máximo 1 efeito por evento visual; `impact_sub` no máximo 2–3 vezes por vídeo.
- **SFX variados (regra em vigor; nasceu de uma reclamação de "efeitos altos e repetitivos"):**
  - Os automáticos acima não tocam mais. O `scripts/lab/sfx-variado.mjs` (etapa 5b do `/editar`) grava `"sfxAuto": false` e uma lista `sfx` com som sorteado por tipo de transição, sem repetição seguida. Ele sorteia dos SFX curados de `05_LAB/sfx/` (não incluídos; ver `05_LAB/sfx/README.md`).
  - Volume: ~12 dB abaixo da voz, com o pico no corte.
  - Clique variado só na 1ª vez de cada palavra-chave, com ≥ 5 s entre eles.
  - Os manuais da tabela continuam valendo e são renivelados (~11 dB abaixo da voz).
  - A composição `Edicao` não mudou com isso (o formato segue congelado).

### Voz
- O tratamento da voz é opcional e perguntado ao usuário (regra comum do `CLAUDE.md`); `voz` no `edicao.json` aponta para o áudio tratado. Sem ele, vale o áudio do bruto.

## Checklist antes da prévia
1. `edicao.json` validado com 0 ERRO: `node scripts/validar-edicao.mjs <proj>` (de dentro de `00_SISTEMA/motor`; se o hook estiver configurado em `.claude/settings.json`, ele roda sozinho a cada gravação do `edicao.json`).
2. Se usou o `sfx-variado.mjs`, rode de novo depois de mexer em cenas ou destaques (`--conferir` avisa se ficou desatualizado).
3. Proporção de layouts perto da tabela (split ~55%, fala ~25%, card ~15%, texto ~5%); troca a cada 2–5 s.
4. Nenhum B-roll repetido; termos recorrentes com variações.
5. `flash` ≤ 2 e `glitch` ≤ 1 no vídeo; `impact_sub` ≤ 3.
6. Transições em respiros da fala, nunca no meio de palavra.
7. Abertura com o B-roll mais forte e palavra-chave grande; fechamento com card de CTA.
