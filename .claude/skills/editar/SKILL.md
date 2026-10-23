---
name: editar
description: "Edita do início ao fim um vídeo bruto (de celular ou de câmera, decupado ou não) ou um áudio narrado num dos formatos treinados: INSTAGRAM - TELA DIVIDIDA, INSTAGRAM - EDIÇÃO CUT DINÂMICO, YOUTUBE - MIX EDIT, INSTAGRAM - PAPER VOX ANIMATION e os que o usuário treinar com /novo-modelo. Pergunta primeiro qual formato usar e para nos pontos de aprovação do usuário. Um áudio narrado sem vídeo (.oga do WhatsApp, mp3, wav, m4a) vai para o INSTAGRAM - PAPER VOX ANIMATION. Um áudio que é um PEDIDO falado não é bruto: transcreva e execute. Use quando o usuário enviar ou arrastar um vídeo bruto ou um áudio narrado, disser 'edita esse vídeo', 'novo vídeo', 'começa a edição' ou chamar /editar."
argument-hint: "<caminho do vídeo bruto ou do áudio> [nome do vídeo]"
---

# /editar

> **Onde fica o motor:** na raiz deste repositório (a sessão do Claude Code abre nela). Neste arquivo, **todo caminho é relativo à raiz**, e `CLAUDE.md` é o manual do motor (na raiz, carregado sozinho).
> - **Scripts:** rode de dentro do motor: `cd 00_SISTEMA/motor && node scripts/...`.
> - **`<proj>`:** o caminho da pasta do projeto. De dentro do motor, é `../../03_PROJETOS/<AAAA-MM-DD>_<nome>`; o `novo-projeto.mjs` imprime o caminho completo, e você pode usar esse.
> - **Para o usuário:** o passo a passo está em `docs/02-COMO-FUNCIONA.md`, as imagens e o B-roll em `docs/03-IMAGENS-E-BROLL.md`, e o que não muda em `docs/05-REGRAS-IMUTAVEIS.md`.

Você é o editor. As regras comuns estão no `CLAUDE.md` (fluxo, restrições, seção "Preferências do usuário"). Fale com o usuário em português, de forma curta. Em trabalho longo, peça para ele manter o computador acordado.

## Regras de ouro (valem em todas as etapas e em todos os formatos)
1. **Cor do bruto é intocável quando ele já vem tratado.** Não aplique preset do `preparar.mjs` (neutra, viva, cinema) nem deixe o filtro padrão do formato somar por cima. No `edicao.json`, use cor neutra: `"cor": {"contraste": 1, "saturacao": 1, "calor": 0}`. No Tela Dividida, sem esse campo, o `Edicao` aplica contraste 1,08, saturação 0,95 e sépia 0,06. O comparativo de cor (1b) só vale para bruto de câmera log ou lavado, e só aplica o que o usuário escolher.
2. **Pergunta visual sem resposta = perguntar de novo.** Cor, corte, estilo ou enquadramento que o usuário deixou sem resposta: pergunte outra vez ou mantenha o original. Nunca escolha "a recomendada" por ele.
3. **O tom é do criador.** Frase forte, ataque, opinião polêmica: é decisão de quem grava. A decupagem é **técnica** (tentativas, erros, gaguejos, conversa fora do roteiro), nunca editorial. Não corte nem proponha cortar fala por tom ou conteúdo. Risco factual ou ético vira no máximo 1 linha de aviso, ou um card de tela com o dado certo, sem tirar a fala. Conteúdo só sai se o usuário pedir com as palavras dele; um botão escolhido rápido não conta como pedido de corte de conteúdo: confirme.
4. **Enquadramento (formatos com pessoa):**
   - rosto centralizado;
   - nunca cortar a cabeça (topo da cabeça com folga);
   - nada de encher o quadro de mesa;
   - zoom a partir de um plano base moderado (≈ 1,15, o mínimo para centralizar), com closes a partir dele. Nunca um zoom forte para esconder equipamento: luminária ou softbox aparecendo incomoda menos que cabeça cortada;
   - confira 3–5 quadros (`quadros.mjs`) antes de abrir a ilha;
   - não invente regra visual nova sem mostrar um quadro ao usuário antes.
   A fórmula do foco está no agente `montador`.
5. **Decupar, corrigir cor e ajustar o áudio só se o usuário marcar** (Etapa 0). Nunca por conta própria.

## Pedido falado (áudio que é instrução, não bruto)
O usuário às vezes manda o PEDIDO em áudio (.oga do WhatsApp, .mp3) e diz "escuta e faz". Isso não é bruto: transcreva e execute.
- Use o filtro `whisper` do FFmpeg (instalado pelo instalador, sem Python). Rode **da raiz do repositório**, com o modelo e o destino por **caminho relativo** (o `:` de `C:` quebra a opção do filtro; a entrada `-i` pode ser absoluta):
  `ffmpeg -hide_banner -loglevel error -y -i "<áudio>" -vn -af "aresample=16000,whisper=model=00_SISTEMA/modelos/ggml-small.bin:language=pt:queue=20:use_gpu=false:destination=pedido_transcrito.txt:format=text" -f null -`
- Leia o `pedido_transcrito.txt`, apague-o e siga o pedido.
- Não instale whisper, faster-whisper ou torch.
- O Whisper costuma trocar "agente" por "a gente": leia com isso em mente.
- Outro idioma? Troque `language=pt`.

> **Bruto 100% cru (sem decupar, sem tratar áudio e cor).** As etapas abaixo continuam iguais. **Só faça o que o usuário marcar na pergunta da Etapa 0**; o que ele não marcar, pule:
> - **Corrigir cor** → 1b: comparativo e escolha dele (só faz sentido em bruto log ou RAW).
> - **Decupar** →
>   - 2: `transcrever.mjs` (modelo grande) no lugar da transcrição do `assistir.mjs`;
>   - 2b: `decupar-inteligente.mjs` → agente `decupador` → `--aplicar`. Use `palavras_montagem.json` como `palavras.json` e `montagem.json` como `montagem`. No Tela Dividida, que não tem `montagem`, use `--render`, que gera o `bruto_decupado.mp4`.
> - **Ajustar o áudio** → 7b: `estudio-audio.mjs` (3 intensidades + comparativo) além do `tratar-voz.mjs`.
> - **Áudio narrado (INSTAGRAM - PAPER VOX ANIMATION):** só existe a pergunta "Ajustar o áudio?"; sem cor e sem decupar. Fluxo próprio (P0–P9) em "Por formato".
>
> Sem nada marcado: vá direto para a edição no estilo de sempre, com o `assistir.mjs` normal. Ele manda em 1080 (o 4K deixa o arquivo pesado). Detalhes no `CLAUDE.md`, seção "Bruto 100% cru".

**Etapa 0 — Formato (SEMPRE a primeira pergunta, logo que o bruto ou o áudio chegar):** leia `01_REFERENCIAS/modelos/MODELOS.md` e faça **uma pergunta só** (ferramenta de perguntas, se disponível): "Qual formato?", com uma opção por linha da tabela, cada uma com o formato e o resumo curto na descrição:
   - **INSTAGRAM - TELA DIVIDIDA**: vertical 9:16; B-roll em cima + rosto embaixo, cards e gráficos animados.
   - **INSTAGRAM - EDIÇÃO CUT DINÂMICO**: vertical 9:16; ritmo alto, camadas de motion, texto atrás da pessoa, 3D.
   - **YOUTUBE - MIX EDIT**: horizontal 16:9; Apple edit + 3D flash edit, intro cinematográfica com manchetes em Text Match Cut.
   - **INSTAGRAM - PAPER VOX ANIMATION**: vertical 9:16; só a partir de um áudio, 100% dark, mural de papel animado por código, a pessoa não aparece.
   - e os modelos novos que o usuário treinou (linhas a mais na tabela).
   **Chegou um áudio (sem vídeo)?** O PAPER VOX é o óbvio, mas pergunte o formato do mesmo jeito e, na mesma chamada, só **"Ajustar o áudio?"** (opções **Sim** e **Não, já vem tratado**). Corrigir cor e decupar não entram: não há imagem, e as pausas são o lugar das montagens. Siga "Por formato" → INSTAGRAM - PAPER VOX ANIMATION.
   **Chegou um vídeo?** Na mesma chamada da ferramenta de perguntas, faça a 2ª pergunta: **"É para decupar, corrigir cor e ajustar o áudio?"**, com `multiSelect` e as opções:
   - **Decupar**;
   - **Corrigir cor**;
   - **Ajustar o áudio**;
   - **Nenhum: já vem tratado**.
   Faça só o que ele marcar (ver o quadro "Bruto 100% cru" acima). "Nenhum" = pular direto para a edição. Nunca faça um desses três por conta própria. Sem resposta = pergunte de novo (regra de ouro 2).
   Com até 4 modelos, cabe numa pergunta só. Se a tabela passar de 4, pergunte antes a plataforma (Instagram, YouTube…) e depois o formato. Se o escolhido estiver 🚧 (em construção), avise e ofereça terminar o modelo com `/novo-modelo` usando este vídeo como piloto. Depois leia o `guia-de-estilo.md` do modelo e siga-o em todas as etapas; registre `"modelo": "<id>"` no `edicao.json` (o render escolhe tamanho e composição por esse id). No PAPER VOX não há `edicao.json`: o gerador grava `"modelo": "paper-vox-instagram"` no `03_roteiro/quadro.json`.

**Motor principal = o Remotion deste repositório (`00_SISTEMA/motor`).** Skills de vídeo de terceiros (HyperFrames, video-use, embedded-captions e parecidas), se estiverem instaladas, não substituem este fluxo. Use-as só para uma peça isolada (ex.: um motion graphic) que vira um clipe em `04_broll/` e entra no `edicao.json` como B-roll. Para qualquer transcrição, use `assistir.mjs` (que também gera `transcript.json` no formato HyperFrames). Nunca instale WhisperX, faster-whisper, torch ou similares. **Exceção: INSTAGRAM - PAPER VOX ANIMATION.** Lá a ilustração entra na palavra, então a transcrição é `transcrever.mjs` → `corrigir-palavras.mjs` → `alinhar-palavras.mjs`, nesta ordem (P1 em "Por formato").

**Molde do formato** (usado no MIX e no PAPER VOX, que montam por gerador, e como exemplo nos outros). O repositório não traz vídeos prontos. O molde é, nesta ordem:
1. o projeto piloto do formato: o campo `projeto` do id dele em `00_SISTEMA/regressao/pilotos.json` (`null` = sem piloto; como gravar: `00_SISTEMA/regressao/README.md`);
2. senão, o último projeto aprovado do mesmo formato em `03_PROJETOS/`;
3. senão (primeiro vídeo do formato), o gerador é escrito do zero, seguindo o guia do formato. No PAPER VOX há apoio: a seção "Como o `montar_shotlist.mjs` monta" do `shotlist-esquema.md` e a seção "Gerador do mural (`montar_quadro.mjs`): esqueleto" do guia, conferidas contra o cabeçalho de `scripts/lib/mural.mjs`. Avise o usuário que o primeiro vídeo do formato leva mais tempo e ofereça registrá-lo como piloto depois de aprovado.

Nunca altere arquivos do molde: copie para o projeto novo.

## Etapas (pare nos ⏸ e espere o usuário)

1. **Projeto**: se `$ARGUMENTS` traz um caminho, rode `node scripts/novo-projeto.mjs "<nome>" "<caminho>"` (sem nome, pergunte um curto). Se o vídeo já está num projeto, use-o.
1b. **Bruto de câmera** (4K, 10 bits, 4:2:2, perfil log ou lavado, ou com rotação; confira com `ffprobe`): o Chrome do Remotion não lê esse vídeo. Só se o usuário marcou "Corrigir cor":
   - `node scripts/preparar.mjs <proj> --modelo <id> --foco x,y --comparar` → mostre `06_previas/comparativo_cor.jpg` e ⏸ pergunte a cor (nenhuma, neutra, viva, cinema), como no áudio: cada gravação é diferente.
   - Depois `node scripts/preparar.mjs <proj> --modelo <id> --foco x,y --cor <escolhida>`. O original fica em `01_bruto/original.*`; o trabalho segue em `bruto.mp4`, já recortado no formato e a 24 fps nos formatos do Instagram.
   - Sem resposta = `--cor nenhuma` (regra de ouro 2).
   - Bruto de câmera que NÃO é para corrigir cor ainda precisa do `preparar.mjs --cor nenhuma` para o Chrome conseguir ler. HEVC 10 bits decodifica só na CPU e pode levar dezenas de minutos: avise antes. Para gravar sem esse passo: H.264 8 bits, 24 fps, 1080×1920.
2. **Assistir**: `node scripts/assistir.mjs <proj>/01_bruto/bruto.<ext> <proj>/02_analise`. Leia `transcricao.md`, `segundo_a_segundo.md` e TODAS as `folha_*.jpg`. Descubra:
   - assunto, arco da história e momentos fortes;
   - onde está o rosto (`rostoY`, e x/y do rosto para o enquadramento);
   - problemas técnicos (som, luz, enquadramento).
   Anote também (sem agir ainda) o diagnóstico da voz para a etapa 7b: pico − RMS (< ~14 dB = muito comprimida), sibilância, aspereza em 2,5–4 kHz, embolado em ~300 Hz, ruído nas pausas.
2b. **Decupagem** (formatos do motor de camadas; o Tela Dividida recebe o bruto já decupado). Só se o usuário marcou "Decupar":
   - `node scripts/decupar.mjs <proj>` → leia `03_roteiro/decupagem.md` inteiro e confira cada fala;
   - tomadas repetidas já saem marcadas (fica a última);
   - frases erradas que não se repetem → `--tirar N`; falsos positivos → `--manter N`;
   - bruto cru com muitas tentativas: `decupar-inteligente.mjs` + agente `decupador` (quadro "Bruto 100% cru");
   - a `montagem.json` vira o campo `montagem` do `edicao.json` (cenas e camadas passam a usar o tempo da saída);
   - se cortou mais de ~10% ou alguma frase inteira, mostre o resumo no plano;
   - a decupagem é técnica, nunca editorial (regra de ouro 3).
3. **Plano** → escreva `<proj>/03_roteiro/plano.md`:
   - tabela cena a cena: tempo, fala, layout, B-roll pretendido + fonte (meus, biblioteca, banco, internet, IA), transição, destaques;
   - lista de destaques, mood da música e estimativa de créditos de IA (Flow ou outro);
   - proporções e ritmo do guia do modelo escolhido (ex.: Tela Dividida ≈ 55% split, com troca a cada 2–5 s; MIX sem respiro entre frases, zoom a cada corte e capítulos);
   - enquadramento de cada cena com pessoa (regra de ouro 4);
   - no CUT DINÂMICO, os obrigatórios do formato ("Por formato");
   - termos recorrentes e as variações visuais ("Sem repetição visual").
   ⏸ Mostre um resumo do plano e peça aprovação ou ajustes.
4. **Material**:
   - **Primeiro a biblioteca**: `node scripts/biblioteca.mjs buscar <termos>` para cada cena. O que servir, copie para `04_broll/meus/` e marque no plano como "biblioteca". As peças fixas (intro, apresentação com o @, encerramento, ícones, motions prontos) vêm do kit: `02_BIBLIOTECA/kit/KIT.md`. Os dados de marca (nome, cargo, credencial, redes, @) vêm de `02_BIBLIOTECA/kit/marca/marca.json`.
   - **Material do usuário**: fotos e vídeos dele vão para `04_broll/meus/` ou `04_broll/fotos/`. Se a fala cita pessoa, marca ou produto real, peça a imagem a ele.
   - **Banco**: `node scripts/stock.mjs <proj> <id> "<query em inglês>" [--image] [--n 3] [--horizontal]` (precisa das chaves do Pexels e do Pixabay no `00_SISTEMA/motor/.env`). Veja as opções (folha de quadros ou imagem) e escolha a melhor. Bancos erram muito em objetos específicos: sempre revise numa folha de miniaturas.
   - **IA**: escreva `<proj>/03_roteiro/prompts_flow.md` (uma entrada por cena: `id`, imagem ou vídeo, modelo, prompt em inglês, proporção, duração). ⏸ Peça aprovação da lista e do gasto estimado. Caminhos possíveis (detalhes em `docs/03-IMAGENS-E-BROLL.md`):
     - **Google Flow pelo Claude in Chrome** (o Chrome do usuário, logado na conta dele), o caminho padrão. Siga a seção "Imagens e vídeos de IA" do `CLAUDE.md`. Confira o custo na tela antes de gerar: imagem Nano Banana saiu a 0 crédito no plano Google AI Pro (out/2026); vídeo custa créditos. Nunca aceite termos, compre créditos ou mude configurações da conta;
     - **API do Gemini** (`node scripts/gen.mjs image|video …`, chave e teto de gasto no `.env`): alternativa;
     - **outro gerador do usuário** (ChatGPT imagens, Higgsfield por MCP etc.): se a ferramenta estiver conectada nesta sessão, use-a com o ⏸ do gasto; se não estiver, entregue os prompts ao usuário e peça os arquivos.
     ⏸ Confirme a lista de downloads (nome, origem, tamanho). Mova para `04_broll/ia_flow/<id>.<ext>`: a pasta se chama `ia_flow` para qualquer gerador. Renomeie para ids simples, porque nome com vírgula ou apóstrofo quebra o FFmpeg.
   - **Música**: busque no Pixabay Music conforme o arco. ⏸ Apresente 2–3 opções (nome, link, duração, por que combina). Baixe só a aprovada → `05_audio/musica`. **No MIX o padrão do formato é outro:** trilha só na intro, com parada brusca no título, e corpo sem música; não ofereça várias trilhas (a da biblioteca, feita por código, serve).
5. **Montagem (agente `montador` + validador)**: a IA escreve o `edicao.json`, o script confere as regras e o hook roda o script sozinho.
   - Antes, corrija erros de transcrição em `02_analise/palavras.json` (nomes próprios, termos técnicos) com `corrigir-palavras.mjs`. Termos recorrentes do seu nicho podem ir em `00_SISTEMA/ferramentas/glossario.txt`.
   - Chame o agente `montador` (`.claude/agents/montador.md`). Se ele não estiver na lista, rode um general-purpose com as instruções desse arquivo. Passe o projeto, o `modelo` e o `plano.md` aprovado.
   - Ele escreve `<proj>/03_roteiro/edicao.json` (no MIX, adaptando o gerador do molde) e roda `node scripts/validar-edicao.mjs <proj>` até dar `0 ERRO`.
   - **O que o validador confere (regras duras do formato):**
     - estrutura do `tipos.ts`;
     - corte da montagem fora de palavra: só vale em fronteira de palavra, pausa medida ou ponto da decupagem;
     - plano mínimo;
     - rodízio de zoom e música só na intro (MIX);
     - rodapé de fonte a 26 px;
     - B-roll sem repetir e arquivos que existem;
     - Instagram em 1080×1920 a 24 fps.
     No MIX ele também roda o `checar-mix.mjs`. ERRO trava; AVISO vai para o relatório.
   - **Hook:** o `.claude/settings.json` deste repositório roda o validador a cada Write/Edit em `03_roteiro/edicao.json` e devolve os ERROS ao modelo. Vale também para os ajustes da etapa 7.
   - Nunca edite o validador, os guias ou o `tipos.ts` para "passar". Regra nova de formato só entra a pedido do usuário, no guia e no validador juntos.
   - Leia o relatório do montador (avisos e decisões pendentes) antes de abrir a ilha.
5b. **SFX variado (só INSTAGRAM - TELA DIVIDIDA, padrão do formato):** com o `edicao.json` em 0 ERRO e antes de abrir a ilha, rode `node scripts/lab/sfx-variado.mjs <proj>`.
   - **O que ele faz:** troca o SFX automático do `Edicao.tsx` (o mesmo whoosh em toda transição e um pop em toda palavra destacada) por:
     - sons sorteados por tipo de transição, sem repetir em seguida;
     - volume medido, ~12 dB abaixo da voz (pop ~17 dB), com o pico no ponto do corte;
     - pop só na 1ª vez de cada palavra destacada, com ≥ 5 s entre eles.
   - **O que ele grava:** `"sfxAuto": false` + a lista `sfx`; o backup `03_roteiro/edicao.antes-sfx.json`; os manuais e os gerados em `03_roteiro/sfx-variado.edicao.json`.
   - **Depois:** leia o relatório (antes × depois) e confira com `validar-edicao.mjs`.
   - **Som manual** (riser, impacto) continua indo na lista `sfx` do json; na rodada seguinte ele vira manual sozinho.
   - **Mexeu em cenas, transições ou destaques na ilha?** Rode de novo. Antes do final, `--conferir` dá código 2 se estiver desatualizado.
   - **Volume:** se o usuário pedir os efeitos mais altos ou mais baixos, use `--trans <dB>` / `--pop <dB>` (padrão −12 / −17).
   - **Sons:** os sintetizados (`02_BIBLIOTECA/sfx`, gerados pelo instalador), os pacotes que o usuário baixou (`02_BIBLIOTECA/sfx/README.md`) e a biblioteca do lab (`05_LAB/sfx`). Regras e testes: `05_LAB/sfx/README.md`.
6. **Prévia na ILHA (sem render)**:
   - Nos formatos do motor de camadas, rode antes `node scripts/normalizar-broll.mjs <proj>`; no MIX, também o `checar-mix.mjs`.
   - Grave o nome da pasta do projeto em `03_PROJETOS/.projeto-ativo` e abra a ilha: `preview_start` com o nome `ilha` (configurado em `.claude/launch.json`) ou, sem o painel de prévia, `node scripts/ilha.mjs <proj>` em segundo plano.
   - Navegue para `http://127.0.0.1:3123/<composição do modelo>` (a composição de cada id está em `00_SISTEMA/motor/src/modelos.json`: `Edicao`, `CutDinamico`, `MixEdit`).
   - Confira você mesmo 3–5 pontos (início, cards, gráficos, enquadramento, fim) com print do navegador antes de chamar o usuário. Para muitos quadros, use o agente `revisor-de-video`.
   ⏸ Diga ao usuário que a ilha está aberta (painel do navegador) e peça que ele assista e aponte ajustes **com o tempo** ("1:23 tira o zoom", "0:45 troca o B-roll").
7. **Ajustes na ilha** até o "aprovado":
   - edite o `edicao.json` → a ilha se atualiza sozinha em segundos (o `ilha.mjs` refaz as props a cada mudança). Confira o ponto alterado com print;
   - **não renderize prévia a cada ajuste.** Prévia em arquivo (`render.mjs --previa`) só se o usuário pedir para ver no celular;
   - na ilha, trechos pesados (3D, recortes) podem engasgar ao tocar: o render final é a versão fiel;
   - ao aprovar, encerre a ilha (`preview_stop`) para liberar memória antes do render.
7b. **Tratamento de voz — SEMPRE PERGUNTAR, nesta etapa, antes do render final.** Nunca aplique por padrão e nunca reaproveite automaticamente o tratamento de outro vídeo: cada gravação tem ambiente e microfone diferentes. Se o usuário já marcou "Ajustar o áudio" na Etapa 0, a resposta é sim; se marcou "Nenhum", não pergunte de novo.
   ⏸ Pergunte: "Quer que eu trate o áudio da voz antes do render final?" e resuma em 1 linha o diagnóstico da etapa 2.
   - Se **não**: siga sem o campo `voz`.
   - Se **sim**:
     - os presets de `scripts/tratar-voz.mjs` (e as 3 intensidades do `estudio-audio.mjs`) são só **ponto de partida**: ajuste a cadeia ao diagnóstico deste bruto (frequências e ganhos);
     - gere 2–3 variações com `--comparar <a>,<b>,<c>` (incluindo `original`, se ajudar) e envie o comparativo para o usuário escolher de ouvido (você não ouve áudio);
     - itere a partir do que ele descrever: "abafado" → faltou presença ou ar; "estourado" ou "áspero" → 2,5–4 kHz e sibilância; "lata" → redução de ruído demais;
     - confirme cada mudança com medição por faixas a volume igual;
     - use a escolhida com `"voz": "05_audio/voz_<nome>.wav"` no `edicao.json`.
   - Regras:
     - nunca o filtro `deesser` (abafa); de-esser = `adynamicequalizer` calibrado;
     - sem redução de ruído agressiva;
     - distorção grave demais para EQ: ofereça um serviço de limpeza de voz na nuvem (ex.: Adobe Podcast Enhance Speech, a 30–50%), só com permissão explícita do usuário para enviar o áudio.
7c. **Final**:
   - no TELA DIVIDIDA, rode antes `node scripts/lab/sfx-variado.mjs <proj> --conferir` (código 2 → rode de novo sem `--conferir`);
   - avise o tempo estimado ("Regras") e rode `node scripts/vez.mjs node scripts/render.mjs <proj>` → `07_final/` (vídeo longo do MIX: por partes, ver "Por formato");
   - informe o caminho, a duração e os créditos de terceiros (`04_broll/creditos.json`) que precisam aparecer na legenda do post, se houver.
8. **Biblioteca e fechamento**:
   - importe o material usado + os bons candidatos que sobraram (`lote_biblioteca.json` → `biblioteca.mjs importar`);
   - copie a trilha para `02_BIBLIOTECA/musicas/` e atualize `02_BIBLIOTECA/musicas/catalogo.md`;
   - todo motion novo que puder voltar em outro vídeo vira peça do kit (componente em `motor/src/kit/` ou clipe em `02_BIBLIOTECA/kit/clipes/`), com uma linha no `KIT.md`;
   - anote no `CLAUDE.md` qualquer aprendizado novo (custos, problemas, tempos de render na sua máquina);
   - primeiro vídeo aprovado do formato (`"projeto": null` no `00_SISTEMA/regressao/pilotos.json`)? ⏸ Ofereça gravá-lo como piloto de regressão: escolha com o usuário os trechos (os mais cheios: abertura, transição, cards) e rode `node scripts/vez.mjs node scripts/regressao.mjs [--cut|--mix] --gravar --projeto 03_PROJETOS/<pasta>` (PAPER VOX: `regressao-paper-vox.mjs`; formato novo: `--modelo <id>`). Detalhes em `00_SISTEMA/regressao/README.md`. Avise que o projeto piloto não pode ser apagado nem movido.

## Por formato (o guia do modelo manda; aqui só o que muda nos comandos)
- **INSTAGRAM - TELA DIVIDIDA** (congelado):
  - composição `Edicao`, bruto já decupado, `render.mjs` de sempre;
  - não mexer no estilo; ferramenta nova só se o usuário pedir;
  - SFX: `sfx-variado.mjs` na etapa 5b (o `Edicao.tsx` não muda);
  - cor: zere o filtro do formato quando o bruto já vem tratado (regra de ouro 1).
- **INSTAGRAM - EDIÇÃO CUT DINÂMICO** (motor de camadas, 9:16 a 24 fps):
  - decupagem (etapa 2b) e legenda cinética automática;
  - texto atrás da pessoa com `recortar.mjs`: é caro, então só nos momentos-chave e nunca junto com um render;
  - **obrigatórios em todo CUT** (assinaturas visuais do formato; liste no plano):
    - **a 1ª palavra (texto de abertura) vai atrás da cabeça**, seja qual for a posição da cabeça no vídeo: posição medida no quadro da cena, com a cabeça cobrindo 10–30% da palavra. Se o enquadramento mudar, reposicione a palavra;
    - **vários recortes de objeto** (PNG sem fundo, do Flow em fundo azul `#0000FF` com 0 crédito, ou do banco) como elemento gráfico em motion complementando as cenas, não um só. Liste os recortes por cena no plano e inclua os PNG nos prompts;
    - **rodízio de peças de informação** no mesmo vídeo, quando houver ensejo: vidro (`card-vidro`, régua `escala-ph` adaptada a outros índices e gráficos) alternando com a `ficha-papel`, mais `contador` e gráficos, e B-roll com objeto recortado em motion. É preferência de gosto, sem trava: você escolhe a hora;
  - a `ficha-papel` não tem rodapé: a peça `fonte` por baixo fica escondida atrás do papel, então ponha o ano ou a fonte no texto dos itens;
  - legenda alta (`legendaY` ≈ 0,44) bate no rosto centralizado: com ficha embaixo, use o rosto em y 0,35, zoom ≤ 1,4 e `legendaY` 0,48;
  - referência de qualidade: o piloto do CUT, se houver ("Molde do formato").
- **YOUTUBE - MIX EDIT** (motor de camadas, 16:9 a 30 fps):
  - **Montagem por gerador:** copie e adapte o `03_roteiro/montar_edicao.mjs` do molde do MIX. O gerador faz o aperto sem respiro, a análise de coerência (`REMOVER`), o rodízio de zoom com plano ≥ 1 s, o rosto desfocado em bloco sem corte, os capítulos e o rodapé de fonte a 26 px. No primeiro vídeo do formato, o `montador` escreve o gerador seguindo o guia (seções de ritmo, zoom e estrutura) e o validador.
  - **Antes da prévia:** `node scripts/checar-mix.mjs <proj>` (ERRO trava). Para conferir pontos sem renderizar: `node scripts/quadros.mjs <proj> <t1> <t2> …`.
  - **Final:** `node scripts/vez.mjs node scripts/render.mjs <proj> --partes auto --manter-partes --concurrency 3` (retomável: se cair, rode o mesmo comando; em máquina com pouca RAM, `--concurrency 2`).
  - **Antes de entregar:** `node scripts/checar-mix.mjs <proj> --video <final.mp4>` (nenhuma piscada) e `node scripts/srt-saida.mjs <proj>` (legenda .srt + capítulos para a descrição do YouTube).
  - Versões antigas do final vão para fora de `07_final/`, em `03_PROJETOS/_versoes-antigas/<proj>/` (o render copia a pasta do projeto inteira).
- **INSTAGRAM - PAPER VOX ANIMATION** (`paper-vox-instagram`, composição `PaperVox`, 9:16 a 24 fps; fixo). Só a partir de um **áudio** narrado; a pessoa não aparece. Fluxo próprio, P0–P9, no lugar das etapas 1–7c:
  - **Molde:** o do formato ("Molde do formato"). Copie os geradores dele (`03_roteiro/montar_shotlist.mjs` e `03_roteiro/montar_quadro.mjs`) para o projeto novo e adapte. O genérico mora em `scripts/lib/mural.mjs`; o esquema da shot list, em `01_REFERENCIAS/modelos/paper-vox-instagram/shotlist-esquema.md`.
  - **Agente do formato:** `diretor-paper-vox` (`.claude/agents/diretor-paper-vox.md`), nos modos "cenas", "prompts" e "mural". Se ele não estiver na lista, rode um general-purpose com as instruções desse arquivo.
  - **Não se aplica:** `edicao.json`, agente `montador`, `validar-edicao.mjs` (nem o hook), ilha (`preview_start ilha` e `ilha.mjs` pedem `edicao.json`), `render.mjs`, `assistir.mjs`, decupagem, cor (1b), `sfx-variado.mjs`, `normalizar-broll.mjs`. O arquivo do vídeo é o `03_roteiro/quadro.json` (escrito pelo gerador) e a conferência é por prévia renderizada.
  - **P0 Entrada:**
    - áudio do WhatsApp (.oga) → mp3 com FFmpeg (`ffmpeg -i "<áudio>.oga" "<áudio>.mp3"`); mp3, wav ou m4a entram direto;
    - `node scripts/novo-projeto.mjs "<nome>" "<áudio>"` → `01_bruto/bruto.mp3` (ou `.wav`/`.m4a`: o gerador aceita os três; troque a extensão no P1);
    - na Etapa 0, "Ajustar o áudio?" no lugar da 7b (o volume da trilha e dos SFX é medido sobre a voz). Se **sim**: `tratar-voz.mjs` / `estudio-audio.mjs` como na 7b, e a voz escolhida entra no gerador (`criarMural(PROJ, {celulas: CELULA, voz: '05_audio/<voz escolhida>.wav'})`), não num campo `voz`. Sem o `voz`, o mural volta para o `01_bruto/bruto.*` sem avisar. Passe o arquivo ao `diretor-paper-vox` no modo "mural".
  - **P1 Transcrição** (nesta ordem; os dois arquivos marcados "à mão" não têm script: quem escreve é a conversa principal):
    1. `node scripts/transcrever.mjs <proj>/01_bruto/bruto.mp3 <proj>/02_analise --principal` → `palavras.json`, `transcricao_turbo.md` e `suspeitos_turbo.json`;
    2. **à mão:** `02_analise/correcoes.json`, a partir da `transcricao_turbo.md` + `suspeitos_turbo.json` (se o áudio veio de um roteiro, veja "Pontos de extensão"). Uma lista com dois tipos de regra (formato completo no cabeçalho do `corrigir-palavras.mjs`):
       - troca: `{"t": 62.85, "de": "palavra ouvida errada", "para": "palavra certa"}` (`t` ±2 s; `de` como está no `palavras.json`; `"para": ""` apaga);
       - inserção num vão sem palavras: `{"t": 44.9, "inserir": "social.", "ini": 44.90, "fim": 45.52}`;
    3. `node scripts/corrigir-palavras.mjs <proj> <proj>/02_analise/correcoes.json`;
    4. `node scripts/vez.mjs node scripts/alinhar-palavras.mjs <proj>` (~12 min para 142 s na máquina de referência). Corrigiu de novo? Alinhe de novo;
    5. **à mão:** `02_analise/transcricao_corrigida.md`: cabeçalho curto (áudio, passadas, nº de correções) e uma linha `- [m:ss.d] frase` por frase, com os tempos do `palavras.json` já alinhado; embaixo de cada dúvida, `⚠ "o que se ouviu"; "alternativa"?`. O `diretor-paper-vox` para sem esse arquivo. Palavra em dúvida fica FORA da tela até o usuário responder (por texto). ⏸ dúvidas.
  - **P2 Proposta de cenas:**
    - `diretor-paper-vox` modo "cenas" → `node <proj>/03_roteiro/montar_shotlist.mjs` → `shotlist.json`/`shotlist.md` (estações em blocos, chegadas de câmera, peças, montagens nos silêncios, SFX candidatos);
    - `node scripts/validar-shotlist.mjs <proj>` até 0 ERRO;
    - **objeto novo:** cena que pede objeto fora do catálogo do `objetos.tsx` é peça nova num modelo fixo. O `diretor-paper-vox` a propõe na shot list marcada "objeto novo", e você pede o ⏸ do usuário junto com a shot list. Aprovado, quem implementa é você (conversa principal), antes do P5: componente + linha no `MAPA` de `src/modelos/paper-vox/objetos.tsx`, depois a regressão do PAPER VOX (se houver piloto registrado). O gerador do mural PARA com erro se usar objeto que não está no `MAPA`;
    - o texto de tela e a fala de cada estação vão para o ⏸ do usuário. Se você tiver uma checagem de fatos própria, encaixe aqui ("Pontos de extensão"), lembrando que a fala está gravada: correção só com palavras da própria fala ou no visual. ⏸ usuário.
  - **P3 Prompts de imagem:** modo "prompts" → `03_roteiro/prompts_flow.md`/`.json` (blocos FOTO, RECORTE em fundo azul #0000FF, MONT 9:16 P&B). ⏸ usuário (lista e custo).
  - **P4 Imagens:**
    - geração no Flow pelo Claude in Chrome (0 crédito com Nano Banana no plano Google AI Pro; confira na tela; download por "Baixar lote"; a escolhida em 2K) ou por outro gerador do usuário (etapa 4, "IA") → `04_broll/ia_flow/`;
    - escolha você as melhores de cada id por folha de miniaturas e mostre ao usuário;
    - recortes: `node scripts/recorte-chroma.mjs <entrada> <saida.png> --pb --aparar [--choke 1|2]` → folha de contato. ⏸ usuário.
  - **P5 Mural:** modo "mural" → `node <proj>/03_roteiro/montar_quadro.mjs` → `03_roteiro/quadro.json`:
    - cada SFX ancorado no instante visual com `M.ev.*` e `M.sfx(plano, {naMixagem: true})`;
    - cortes de trilha (só voz nos momentos tensos ou de ênfase);
    - 2 opções de trilha da biblioteca (`02_BIBLIOTECA/musicas/`) em `M.trilha({cortes, opcoes, escolhida})`;
    - sem 2 opções adequadas no `02_BIBLIOTECA/musicas/catalogo.md` (evite as do vídeo anterior)? Busque no Pixabay Music pelo arco do vídeo, ⏸ apresente 2–3 com link, duração e Content ID, baixe só as aprovadas direto em `02_BIBLIOTECA/musicas/` (o `lib/mural.mjs` recusa trilha fora de lá; não use `05_audio/musica`) e acrescente a linha no `catalogo.md`. Depois, rode o modo "mural" de novo;
    - card final: o `lib/mural.mjs` lê nome, profissão, credencial e @ do `02_BIBLIOTECA/kit/marca/marca.json`. "Seu Nome" ou "@seu_perfil" na prévia = o usuário ainda não preencheu o `marca.json`.
  - **P6 Prévia:** avise o tempo (≈ 4,2 s por segundo de vídeo: ~10 min para 144 s na máquina de referência) → `node scripts/vez.mjs node scripts/render-paper-vox.mjs <proj> --previa --manter-base`:
    - sai uma versão por trilha (`06_previas/previa_<AAAAMMDDHHMM>_paper_trilha-A.mp4` e `_trilha-B.mp4`) + a base sem trilha `06_previas/previa_<AAAAMMDDHHMM>_paper.base.mp4` (com `--manter-base`);
    - folha de quadros + `revisor-de-video`. ⏸ usuário (a trilha que ele escolher vai em `escolhida`);
    - ajuste pontual: corrija o gerador, rode-o e confira com `--trecho a b`.
  - **P7 Refino milimétrico dos SFX** (todo vídeo novo):
    - `node scripts/refinar-sfx.mjs <proj> --video 06_previas/previa_<AAAAMMDDHHMM>_paper_trilha-<X>.mp4` (a prévia COM trilha e SFX, nunca a base) → `03_roteiro/sfx_refino.md` (cada SFX: evento visual, ponto do som, desvio em ms, quadro) + o carretel `06_previas/sfx-refino_<data>.mp4` (1 clipe de 1,5 s por SFX, com número e evento escritos e uma barra no quadro exato). ⏸ usuário;
    - ele pede por número ("o 7 entra 2 quadros antes") → `{ajuste: -83}` (ms) na linha do plano do gerador → `node <proj>/03_roteiro/montar_quadro.mjs`;
    - `node scripts/mixar-audio.mjs <proj> --video 06_previas/previa_<AAAAMMDDHHMM>_paper.base.mp4 --props 03_roteiro/quadro.json --trilha <X> --saida 06_previas/<nome>.mp4` (segundos, sem render) → `refinar-sfx.mjs` de novo com `--video 06_previas/<nome>.mp4` (já com trilha e SFX) → novo carretel. ⏸ usuário.
  - **P8 Final:** ⏸ render longo (≈ 12,4 s por segundo: ~30 min para 144 s na máquina de referência) → `node scripts/vez.mjs node scripts/render-paper-vox.mjs <proj>` → `07_final/<proj>_final.mp4` com a trilha escolhida → folha de quadros + loudness (−14 LUFS, pico ≤ −1 dB). Informe o caminho, a duração e os créditos de terceiros, se houver.
  - **P9 Fechamento:** etapa 8 (biblioteca). Legenda do post e registro de publicados: "Pontos de extensão".
- **Modelos novos** (treinados com `/novo-modelo`): siga o guia do modelo e o que o `MODELOS.md` disser sobre a composição; o fluxo é o das etapas 1–8.
- **Os formatos são FIXOS:** formato, estilo e guia só mudam a pedido do usuário. **Mexeu no motor?** Antes de entregar, rode as regressões, um de cada vez pela fila (`00_SISTEMA/regressao/README.md`):
  - `node scripts/vez.mjs node scripts/regressao.mjs` (TELA DIVIDIDA: precisa sair IDÊNTICO);
  - `node scripts/vez.mjs node scripts/regressao.mjs --cut` (precisa sair EQUIVALENTE);
  - MIX: `node scripts/vez.mjs node scripts/regressao.mjs --mix` (precisa sair EQUIVALENTE);
  - `node scripts/vez.mjs node scripts/regressao-paper-vox.mjs` (IDÊNTICO, ou EQUIVALENTE com PSNR ≥ 40 dB a 135×240). É um script próprio, porque o render e o áudio do Paper Vox são outros. Obrigatória depois de qualquer mudança em `src/modelos/paper-vox/`, `src/kit/`, `Root.tsx`, `scripts/render-paper-vox.mjs`, `scripts/lib/mural.mjs` ou pacotes;
  - mudou `scripts/lib/mural.mjs`? Confira também que o gerador do piloto gera o mesmo `quadro.json`, sem sobrescrever a referência: de dentro do piloto, `node 03_roteiro/montar_quadro.mjs --saida <arquivo temporário>` e compare (md5) com o `03_roteiro/quadro.json`. Nunca rode o gerador do piloto sem `--saida`;
  - formatos novos que renderizam pelo `render.mjs`: `node scripts/vez.mjs node scripts/regressao.mjs --modelo <id>`;
  - `ATENÇÃO` = mudança visual de verdade: mostre o render novo ao usuário; só grave a referência de novo (`--gravar`) se ele aprovar a mudança. `SEM PILOTO` = a regressão daquele formato não conferiu nada: diga isso ao usuário, em vez de dar a mudança como conferida.

## Sem repetição visual (diretriz do framework)
- No plano (etapa 3), liste os **termos recorrentes** e o número de aparições. Cada aparição ganha uma visual diferente (3–5 variações por termo: foto, vídeo, ilustração, 3D, gráfico, ângulos diferentes). Nunca o mesmo arquivo, nem variações quase idênticas, duas vezes no mesmo vídeo.
- Antes da prévia, confira no `edicao.json` se algum `broll` se repete.
- No PAPER VOX (sem `edicao.json`), confira na `shotlist.json` se alguma `fonte` (`flow:Fnn`, `biblioteca:<arquivo>`) aparece em duas estações ou planos de montagem: o `validar-shotlist.mjs` só conta o teto.

## Revisão antes de entregar
- Clipes de animação (ícones, UI, 3D) costumam começar vazios: confira o quadro inicial e ajuste `brollIni` para que o momento-chave coincida com a palavra.
- Bancos erram objetos específicos: sempre revise os candidatos numa folha de miniaturas. Se falhar, gere uma **imagem** por IA.
- Confira a folha de quadros da prévia completa (1 quadro/s) antes de mostrar ao usuário.
- Enquadramento: nenhuma cabeça cortada e o rosto centralizado (regra de ouro 4).

## Regras
- Nunca invente fatos no B-roll ou na tela: todo texto na tela sai da fala, do plano aprovado ou de um roteiro do usuário. Se a fala cita uma pessoa ou marca real, peça a imagem ao usuário ou use material com licença; não gere pessoas reais por IA.
- **Prints de notícias reais** (`capturar-manchete.mjs`): capture o original, intacto e com o veículo visível. Nunca "melhore" nem regenere por IA: a IA reescreve letras e vira notícia falsa. Site com verificação anti-robô: não contorne; peça ao usuário ou capture pelo Chrome dele.
- Sempre informe o tempo estimado de render antes de renders longos. Medidos na máquina de referência (8 GB de RAM, GPU integrada; a sua pode variar, e os tempos novos vão para o `CLAUDE.md`):
  - prévia ≈ 3,2 s de render por segundo de vídeo;
  - final 9:16 ≈ 7,1 s por segundo;
  - final do MIX ≈ 5–6,5 s por segundo;
  - PAPER VOX: prévia ≈ 4,2 s por segundo e final ≈ 12,4 s por segundo;
  - cenas com 3D ou efeitos custam mais.
- Um render pesado por vez (`scripts/vez.mjs`); no máximo 3–4 agentes em paralelo.
- Se algo falhar, diga o que falhou e a alternativa; não troque silenciosamente de ferramenta.
- Vídeo aprovado é intocável: ajuste pedido depois da aprovação muda SÓ aquilo.

## Agentes deste repositório (`.claude/agents/`)
- `decupador`: decupagem de bruto cru (etapa 2b).
- `montador`: escreve o `edicao.json` e valida (etapa 5).
- `revisor-de-video`: roda as checagens (`checar-mix.mjs`, regressões) e confere as prévias quadro a quadro, devolvendo só a lista de problemas. Use-o em vez de abrir dezenas de quadros na conversa principal.
- `diretor-paper-vox`: cenas, prompts e mural do PAPER VOX.
- `analista-de-referencias`: análise de referências no `/novo-modelo`.

## Pontos de extensão (opcionais)
O framework funciona sozinho. Se você tiver estas peças na sua central de conteúdo, encaixe-as aqui sem mudar o resto:
- **Roteiro próprio:** se o vídeo tiver um roteiro escrito (um .md ou .txt que o usuário indicar), use-o no plano: cards, gráficos, fontes e B-roll saem dele, e as fontes citadas na tela vêm da seção de fontes do roteiro. No PAPER VOX (sem `plano.md`), o texto aprovado é a referência das correções do P1 (`correcoes.json`), e as dúvidas ⚠ ficam só para o que diverge dele.
- **Checagem de afirmações:** se houver um agente ou skill de checagem, rode-o no plano (etapa 3) ou no P2 com o texto de tela. Risco vira aviso ou card, nunca corte da fala (regra de ouro 3).
- **Legenda do post e registro do que foi publicado:** se houver um agente de legenda ou uma planilha ou arquivo de publicados, chame-os depois do final aprovado (fonte: transcrição + plano ou shot list + créditos de terceiros).
- **Regras da sua profissão** (ética de conselho profissional, publicidade regulada): escreva-as em "Preferências do usuário" no `CLAUDE.md`; elas passam a valer no plano e na tela.
