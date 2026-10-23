# 02 - Como funciona

Do vídeo bruto ao final: quem faz o quê, onde o Claude para e espera você (⏸) e o que você precisa fazer em cada etapa.

## A ideia em uma frase

Você é o **diretor**: escolhe o formato, aprova o plano, as imagens, a música, a prévia e o áudio. O **Claude** é o editor: transcreve, planeja, busca material, monta e confere. Os **scripts** fazem a parte mecânica e medem tudo. Os **validadores** travam o que quebra a regra do formato.

```
 vídeo bruto (ou áudio narrado)
        │
        ▼
 /editar ──► ⏸ Qual formato? (+ decupar / corrigir cor / ajustar áudio?)
        │
        ├─ TELA DIVIDIDA · CUT DINÂMICO · MIX EDIT (vídeo com você falando)
        │     projeto ─► (cor ⏸) ─► transcrição ─► (decupagem) ─► plano ⏸
        │     ─► material: biblioteca ─► banco ─► Flow ⏸ créditos ⏸ downloads ─► música ⏸
        │     ─► montagem (agente montador + validador: 0 ERRO)
        │     ─► ilha de edição ⏸ você assiste e aponta ajustes com o tempo ─► "aprovado"
        │     ─► ⏸ tratar a voz? ─► render final ─► checagens ─► 07_final
        │
        └─ PAPER VOX ANIMATION (só áudio)
              projeto ─► (⏸ ajustar áudio?) ─► transcrição + correções ⏸ dúvidas
              ─► cenas (shot list) ⏸ ─► prompts das imagens ⏸ ─► imagens e recortes ⏸
              ─► mural + trilhas ─► prévia com 2 trilhas ⏸ ─► refino dos SFX ⏸ ─► final ⏸
```

---

## Quem faz o quê

| Quem | Papel |
|---|---|
| **Você** | grava, envia o bruto, escolhe o formato, aprova cada ⏸, assiste à prévia, escolhe música e áudio **de ouvido**, aprova gastos de crédito e downloads. |
| **Claude (conversa principal)** | conduz o `/editar`, lê a transcrição e os quadros, escreve o plano, busca material, chama os agentes, abre a ilha, roda os renders. |
| **Agente `decupador`** | decide o que sai de um bruto cru (tentativas repetidas, frases abandonadas, conversa antes de começar). Só corta, nunca reescreve nem muda a ordem. |
| **Agente `montador`** | escreve o `03_roteiro/edicao.json` a partir do plano aprovado e roda o validador até zerar os ERROS. |
| **Agente `revisor-de-video`** | roda as checagens (`checar-mix`, regressões, quadros) e confere a prévia quadro a quadro; devolve só a lista de problemas com o tempo. |
| **Agente `diretor-paper-vox`** | no PAPER VOX: escreve a shot list, os prompts das imagens e o gerador do mural. |
| **Agente `analista-de-referencias`** | no `/novo-modelo`: analisa vídeos de referência e escreve o rascunho do guia de estilo. |
| **Scripts** (`00_SISTEMA/motor/scripts`) | transcrevem, medem, cortam, recortam, validam e renderizam. Rodam sempre de dentro de `00_SISTEMA/motor`. |

Os agentes rodam num contexto separado e devolvem só o resultado: a conversa principal fica leve.

---

## Etapa 0: a primeira pergunta

Assim que o bruto chega, o Claude lê `01_REFERENCIAS/modelos/MODELOS.md` e faz **uma pergunta só**: qual formato. Na mesma pergunta:

- **Chegou um vídeo:** "É para decupar, corrigir cor e ajustar o áudio?" (múltipla escolha: Decupar, Corrigir cor, Ajustar o áudio, Nenhum: já vem tratado). O Claude faz **só o que você marcar**.
- **Chegou um áudio sem vídeo:** só "Ajustar o áudio?". O formato natural é o PAPER VOX.

Depois ele lê o `guia-de-estilo.md` do formato escolhido e segue esse guia em todas as etapas.

---

## Formatos com rosto: TELA DIVIDIDA, CUT DINÂMICO, MIX EDIT

| # | Etapa | O que o Claude faz | ⏸ / sua ação |
|---|---|---|---|
| 1 | **Projeto** | `node scripts/novo-projeto.mjs "<nome>" "<bruto>"` cria `03_PROJETOS/AAAA-MM-DD_<nome>/` e copia o bruto para `01_bruto/bruto.<ext>`. | Dê um nome curto ao vídeo. |
| 1b | **Bruto de câmera** (4K, 10 bits, perfil log, girado) | `preparar.mjs --comparar` gera um comparativo de cor (nenhuma, neutra, viva, cinema); depois `--cor <escolhida>` grava um `bruto.mp4` que o motor lê. O original fica em `01_bruto/original.*`. | ⏸ Só se você marcou "Corrigir cor": escolha a cor olhando o comparativo. Sem resposta = nenhuma. |
| 2 | **Assistir** | `assistir.mjs`: transcrição palavra a palavra (Whisper local), folhas de quadros, segundo a segundo, pausas. Se marcou "Decupar", usa o `transcrever.mjs` (modelo grande). O Claude anota assunto, momentos fortes, posição do rosto e o diagnóstico da voz. | Nada. |
| 2b | **Decupagem** (só se marcou "Decupar") | `decupar-inteligente.mjs` numera as palavras e marca gaguejo, retomada e frase repetida → o agente `decupador` decide o que sai → `--aplicar` corta só em pausas medidas no áudio. Bruto que você já decupou: `juncoes.mjs` acha as suas emendas (jump cuts), que viram troca de cena. | Confira o resumo dos cortes no plano. A decupagem é **técnica**: frase forte ou opinião sua só sai se você pedir. |
| 3 | **Plano** | Escreve `03_roteiro/plano.md`: cena a cena (tempo, fala, layout, B-roll pretendido e de onde vem, transição, destaques), termos que se repetem (cada aparição com um visual diferente), mood da música e estimativa de créditos de IA. | ⏸ Aprove ou peça ajustes. |
| 4 | **Material** | Na ordem: (1) biblioteca `biblioteca.mjs buscar`; (2) bancos grátis `stock.mjs`; (3) imagens/vídeos de IA (Flow e outros). Escolhe por folha de miniaturas. Música: busca no Pixabay Music pelo arco do vídeo. | ⏸ Aprove a lista de prompts e o gasto de créditos. ⏸ Confirme os downloads. ⏸ Escolha 1 de 2–3 músicas ouvindo. No MIX o padrão é trilha só na intro, sem várias opções. Ver [03-IMAGENS-E-BROLL.md](03-IMAGENS-E-BROLL.md). |
| 5 | **Montagem** | Corrige a transcrição (`corrigir-palavras.mjs`: nomes e termos técnicos) e chama o agente `montador`, que escreve o `edicao.json` e roda `validar-edicao.mjs` até **0 ERRO**. No MIX roda também o `checar-mix.mjs`. No TELA DIVIDIDA, o `lab/sfx-variado.mjs` troca o efeito sonoro repetido por sons variados. | Nada. |
| 6 | **Ilha de edição** (prévia ao vivo, sem render) | `normalizar-broll.mjs` e `ilha.mjs`: abre o Remotion Studio em `http://127.0.0.1:3123/<composição>`. O Claude confere 3–5 pontos com print antes de chamar você. | ⏸ **Assista e aponte ajustes com o tempo:** "1:23 tira o zoom", "0:45 troca o B-roll". |
| 7 | **Ajustes** | Edita o `edicao.json`; a ilha se atualiza em segundos. Não renderiza a cada ajuste. Prévia em arquivo só se você pedir (ex.: para ver no celular). | Repita até dizer **"aprovado"**. |
| 7b | **Áudio da voz** | Resume o diagnóstico da voz em 1 linha e pergunta. Se sim: gera 2–3 versões e um comparativo em vídeo (seção "Tratamento de áudio" abaixo). | ⏸ "Quer tratar a voz?" Se sim, escolha **de ouvido** (o Claude não ouve áudio). |
| 7c | **Final** | `render.mjs` → `07_final/<nome>_final.mp4`. MIX: render por partes, retomável (`vez.mjs ... --partes auto`), depois `checar-mix --video` (piscadas) e `srt-saida.mjs` (legenda .srt e capítulos para a descrição). Informa caminho, duração e créditos de terceiros (`04_broll/creditos.json`) para a legenda do post. | ⏸ Autorize o render longo (o Claude informa o tempo estimado). Não feche a sessão durante o render. |
| 8 | **Biblioteca** | Importa o material usado e bons candidatos para `02_BIBLIOTECA` (`biblioteca.mjs importar`), registra a música no catálogo, transforma motions reaproveitáveis em peças do kit. | Nada. O próximo vídeo fica mais rápido e mais barato. |

---

## PAPER VOX ANIMATION (só áudio)

Você não aparece: só a sua voz. O vídeo é um mural de papel animado por código. Não usa `edicao.json`, ilha, montador nem `render.mjs`: tem fluxo, gerador e render próprios. A conferência é por prévia renderizada.

| # | Etapa | O que o Claude faz | ⏸ / sua ação |
|---|---|---|---|
| P0 | **Entrada** | Áudio `.oga` (WhatsApp) vira mp3 pelo FFmpeg; mp3, wav e m4a entram direto. `novo-projeto.mjs` cria o projeto. | ⏸ "Ajustar o áudio?" (na Etapa 0). |
| P1 | **Transcrição** | `transcrever.mjs` (modelo grande) → `correcoes.json` (escrito pelo Claude) → `corrigir-palavras.mjs` → `alinhar-palavras.mjs` (tempo de cada palavra medido no áudio; ~12 min para 2,5 min de áudio) → `transcricao_corrigida.md` com as dúvidas marcadas ⚠. | ⏸ Responda as dúvidas por texto. Palavra em dúvida fica **fora da tela** até você responder. |
| P2 | **Cenas** | Agente `diretor-paper-vox` (modo "cenas") escreve a shot list: estações, peças, montagens nos silêncios, SFX candidatos. `validar-shotlist.mjs` até 0 ERRO. Objeto fora do catálogo é proposto como "objeto novo". | ⏸ Aprove a shot list (e o objeto novo, se houver). Confira o texto de tela: a fala está gravada, então correção só com palavras da própria fala ou no visual. |
| P3 | **Prompts** | Modo "prompts": `03_roteiro/prompts_flow.md` com blocos FOTO, RECORTE (fundo azul `#0000FF`) e MONTAGEM (9:16, P&B). | ⏸ Aprove os prompts. |
| P4 | **Imagens** | Gera as imagens (Flow pelo navegador ou outra fonte), escolhe as melhores, recorta o fundo com `recorte-chroma.mjs` e mostra uma folha de contato. | ⏸ Aprove as imagens e os recortes. |
| P5 | **Mural** | Modo "mural": o gerador `03_roteiro/montar_quadro.mjs` (sobre `scripts/lib/mural.mjs`) grava o `quadro.json`: câmera, elementos, SFX ancorados no instante visual, cortes de trilha e 2 opções de trilha de `02_BIBLIOTECA/musicas/`. | ⏸ Se faltar trilha no catálogo: escolha 2–3 do Pixabay Music. |
| P6 | **Prévia** | `vez.mjs node scripts/render-paper-vox.mjs <proj> --previa --manter-base` (~4 s de render por segundo de vídeo): uma prévia por trilha + folha de quadros + `revisor-de-video`. | ⏸ Assista e escolha a trilha. |
| P7 | **Refino dos SFX** | `refinar-sfx.mjs` mede cada efeito contra o evento visual e gera um carretel (1 clipe de 1,5 s por SFX, numerado). Ajustes viram milissegundos no gerador; `mixar-audio.mjs` remixa em segundos, sem novo render. | ⏸ Peça por número: "o 7 entra 2 quadros antes". |
| P8 | **Final** | `render-paper-vox.mjs` (~12 s de render por segundo de vídeo) → `07_final/<proj>_final.mp4`, conferido em −14 LUFS e pico ≤ −1 dB. | ⏸ Autorize o render longo. |

---

## Tratamento de áudio

Regra geral: **sempre perguntar, nunca aplicar por padrão e nunca reaproveitar o tratamento de outro vídeo.** Cada gravação tem sala e microfone diferentes.

| Ferramenta | O que faz | Saída |
|---|---|---|
| `tratar-voz.mjs <proj> --comparar a,b,c` | Cadeias de EQ e compressão leve no FFmpeg. Presets como **ponto de partida**: `suave`, `forte` (tira o estouro, mas abafa), `projetada` (cortes estreitos + corpo, presença, clareza e ar) e `brilho` (projetada + excitador). O Claude ajusta frequências e ganhos ao diagnóstico do seu bruto. | `05_audio/voz_<nome>.wav` + `06_previas/comparativo_voz.mp4` |
| `estudio-audio.mjs <proj> [--referencia <arquivo>]` | Diagnóstico medido (estouro, ruído nas pausas, espectro por faixa contra uma voz de referência que você goste) e cadeia em etapas: passa-alta → desestouro → ruído (**DeepFilterNet**, com teto de atenuação, ou `afftdn` leve) → EQ casada com a referência (±6 dB) → de-esser dinâmico só se houver sibilância → "ar" só se abafado → compressão leve → limitador. **Voz de referência:** ponha em `02_BIBLIOTECA/voz-referencia/` uma gravação sua com o timbre de que você gosta (o 1º arquivo da pasta é usado), ou passe `--referencia <arquivo>`. Sem nenhuma das duas, a EQ casada fica neutra. | 3 intensidades (`voz_estudio_suave/equilibrado/intenso.wav`), relatório `06_previas/estudio_audio.md` e comparativo em vídeo |
| `arnndn` (FFmpeg) + modelos RNNoise | Redução de ruído por rede neural, disponível para uso manual. Os modelos `.rnnn` ficam em `00_SISTEMA/modelos/rnnoise/`. Nenhum script atual usa por padrão. | — |

Regras: nunca o filtro `deesser` do FFmpeg (abafa); o de-esser é o `adynamicequalizer` calibrado. Sem redução de ruído agressiva ("voz de lata"). Distorção grave demais para EQ: o Claude pode sugerir um serviço na nuvem, **só com a sua permissão** para enviar o áudio.

Como pedir ajuste depois de ouvir: "abafado" = faltou presença/ar; "áspero/estourado" = 2,5–4 kHz e sibilância; "lata" = redução de ruído demais.

**Volume da música:** no máximo 1/4 da voz (−12 dB), medido no seu bruto (LUFS da voz × pico da trilha), nunca cobrindo a voz.

---

## Revisão e qualidade (antes de chegar em você)

| Checagem | Quando | O que trava |
|---|---|---|
| `validar-edicao.mjs <proj>` | a cada versão do `edicao.json` | estrutura, corte no meio de palavra, plano mínimo, rodízio de zoom e música só na intro (MIX), rodapé de fonte a 26 px, B-roll repetido ou inexistente, 1080×1920 a 24 fps no Instagram. ERRO trava; AVISO vai para o relatório. |
| `checar-mix.mjs <proj> [--video final.mp4]` | MIX: antes da prévia e no final | B-roll repetido, flashes demais, piscadas de 1–2 quadros, rosto desfocado com corte, zoom exagerado. |
| `validar-shotlist.mjs <proj>` | PAPER VOX: antes de mostrar a shot list | regras da shot list. |
| `quadros.mjs <proj> <t1> <t2>…` | sempre que precisar ver um ponto | stills em resolução cheia sem renderizar o vídeo. |
| Agente `revisor-de-video` | antes de mostrar a prévia e antes de entregar | roda as checagens e devolve problemas com o tempo. |
| Sem repetição visual | no plano e antes da prévia | o mesmo arquivo (ou um quase igual) não aparece duas vezes no vídeo. |

**Validador automático:** o `.claude/settings.json` do repositório tem um *hook* do Claude Code: toda vez que o Claude grava ou edita um arquivo, o `validar-edicao.mjs --hook` roda sozinho e, se for um `03_roteiro/edicao.json`, devolve os ERROS na hora. Vale também para os ajustes feitos na ilha.

## Regressão: a prova de que os formatos não mudaram

Os 4 formatos são **fixos**. Se alguém (você ou o Claude) mexer no motor, as regressões renderizam trechos fixos de um vídeo piloto e comparam quadro a quadro com uma referência gravada:

- TELA DIVIDIDA: precisa sair **IDÊNTICO** (md5 de cada quadro);
- CUT e MIX: **EQUIVALENTE** (PSNR ≥ 42 dB em miniatura: o vídeo da pessoa varia um pouco entre renders);
- PAPER VOX: **IDÊNTICO** ou **EQUIVALENTE** (PSNR ≥ 40 dB).

O repositório não traz pilotos: os 4 formatos começam **sem piloto** e a regressão responde `SEM PILOTO`, sem erro. Depois do seu 1º vídeo aprovado em cada formato, grave a referência dele (`--gravar --projeto 03_PROJETOS/<pasta>`): o projeto fica registrado em `00_SISTEMA/regressao/pilotos.json`. Passo a passo em `00_SISTEMA/regressao/README.md`. Não apague nem mova o projeto piloto.

---

## Tempos de referência

Medidos numa máquina com 8 GB de RAM e GPU integrada. A sua pode ser mais rápida ou mais lenta.

| Etapa | Tempo |
|---|---|
| Prévia 9:16 | ~3 s de render por segundo de vídeo |
| Final 9:16 (CUT, TELA DIVIDIDA) | 5 a 9 s por segundo (bruto 4K e 3D custam mais) |
| Final do MIX (16:9) | ~5–6,5 s por segundo, por partes |
| PAPER VOX | prévia ~4 s/s; final ~12 s/s |
| Transcrição grande | ~3,6× o tempo real por processo |
| Texto atrás da pessoa (recorte) | ~0,6–1,3 s por quadro do bruto: só nos momentos-chave |
| Do bruto cru (3 min) ao final | ~1h30 de máquina, mais as suas aprovações |

O Claude avisa o tempo estimado antes de todo render longo. Renders rodam um por vez (fila `scripts/vez.mjs`).

**O primeiro vídeo de cada formato demora mais**, principalmente no MIX e no PAPER VOX, que montam o vídeo por um script gerador: o repositório não traz vídeos prontos, então o primeiro gerador é escrito do zero, seguindo o guia. Do segundo vídeo em diante, o Claude copia e adapta o gerador do vídeo aprovado (o "molde"). Por isso vale registrar o 1º vídeo aprovado como piloto (seção "Regressão").

---

## Suas ações, em resumo

- [ ] Gravar bem (ver [06-BOAS-PRATICAS.md](06-BOAS-PRATICAS.md)) e exportar em H.264, 8 bits, se possível.
- [ ] Escolher o formato e marcar decupar / cor / áudio.
- [ ] Aprovar o plano.
- [ ] Aprovar prompts, créditos e downloads.
- [ ] Escolher a música ouvindo.
- [ ] Assistir na ilha (ou na prévia) e apontar ajustes **com o tempo**.
- [ ] Dizer "aprovado".
- [ ] Decidir sobre o áudio e escolher de ouvido.
- [ ] Autorizar o render final e conferir o vídeo em `07_final/`.
- [ ] Pôr os créditos de terceiros na legenda do post, se houver.
