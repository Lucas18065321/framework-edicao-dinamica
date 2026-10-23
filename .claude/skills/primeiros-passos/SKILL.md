---
name: primeiros-passos
description: "Boas-vindas ao Framework de Edição Dinâmica: confere a instalação (Node, FFmpeg com o filtro whisper, modelos de transcrição, pacotes do motor, chaves no .env, SFX, marca), explica em linguagem simples como o Claude edita com este framework, o passo a passo do vídeo bruto (ou áudio narrado) até o vídeo final, o que o usuário faz em cada aprovação, como escolher o estilo, preencher a marca e treinar um formato novo, e as regras que não mudam. Termina oferecendo um vídeo-teste. Use logo depois de instalar, quando o usuário chamar /primeiros-passos ou perguntar 'como você funciona?', 'por onde começo?' ou 'o que você faz?'."
argument-hint: "(sem argumentos)"
---

# /primeiros-passos

Você vai receber quem acabou de instalar o framework. Fale em português, curto e simples, para um criador de conteúdo (não um programador). Todo caminho é relativo à raiz do repositório (a sessão abre nela). Não despeje este arquivo inteiro de uma vez: faça a conferência, explique em blocos curtos e, no fim, pergunte se ele quer o vídeo-teste.

## 1. Conferir a instalação (só leitura)
Rode as checagens abaixo **sem instalar nada** e mostre uma tabela curta `item · OK / FALTA / AVISO · o que fazer`:

| Item | Como conferir | Esperado |
|---|---|---|
| Node.js | `node -v` | `v24.…` (a versão do instalador) |
| FFmpeg | `ffmpeg -hide_banner -version` (1ª linha) | build "full" (no Windows, o do gyan.dev) |
| Transcrição local | `ffmpeg -hide_banner -filters` contém `whisper` | presente |
| Redução de ruído | o mesmo comando contém `arnndn` | presente |
| Modelos do Whisper | `00_SISTEMA/modelos/ggml-small.bin` (~488 MB) e `ggml-large-v3-turbo-q5_0.bin` (~574 MB) | os dois existem |
| DeepFilterNet (limpeza de voz) | `00_SISTEMA/ferramentas/deepfilternet/deep-filter.exe --version` (no Linux, ver `docs/07-LINUX.md`) | `0.5.6` |
| Pacotes do motor | existe `00_SISTEMA/motor/node_modules/remotion` | existe |
| Chaves (.env) | existe `00_SISTEMA/motor/.env`; conte as chaves preenchidas com `grep -cE '^\s*(GEMINI|PEXELS|PIXABAY)_API_KEY\s*=\s*\S+' 00_SISTEMA/motor/.env` | 0 a 3 (todas opcionais) |
| SFX básicos | `02_BIBLIOTECA/sfx/*.wav` (11 sintetizados pelo instalador) | 11 arquivos |
| SFX chamados pelo nome (terceiros ou substitutos) | de dentro de `00_SISTEMA/motor`: `node scripts/sfx-substitutos.mjs --listar` (só lista, não cria) | "nada a fazer". Se faltar algo: FALTA para CUT, MIX, PAPER VOX e o sorteio da TELA DIVIDIDA; ofereça rodar `node scripts/sfx-substitutos.mjs` (cria só o que falta) ou ver `02_BIBLIOTECA/sfx/README.md` |
| Sua marca | `02_BIBLIOTECA/kit/marca/marca.json` é JSON válido e não tem mais `seu_perfil` | preenchido |
| Opcionais | `yt-dlp --version` (baixar referências por link); Chrome com a extensão Claude in Chrome (gerar imagens no Google Flow) | AVISO se faltar |

Regras desta etapa:
- **Nunca mostre o conteúdo do `.env`** nem peça chave no chat. Para preencher, abra o arquivo no Bloco de Notas para o usuário (`notepad 00_SISTEMA/motor/.env`) e peça que ele cole, salve e feche. O mesmo vale para o `marca.json`.
- Faltou algo obrigatório (Node, FFmpeg com whisper, modelos, pacotes do motor)? Explique em 1 linha e ofereça rodar o instalador de novo: `00_SISTEMA/instalacao/INSTALAR.bat` (duplo clique) ou, para você rodar, `powershell -NoProfile -ExecutionPolicy Bypass -File 00_SISTEMA/instalacao/instalar.ps1 -SemPerguntas`. ⏸ Peça autorização antes: ele baixa e instala programas e modelos (mais de 1 GB). Passo a passo e problemas comuns: `docs/01-INSTALAR.md`. Linux: `docs/07-LINUX.md`.
- Chaves: sem Pexels/Pixabay, o banco de vídeos gratuito não funciona (imagens ainda podem vir do Openverse). A chave do Gemini é só para gerar imagem ou vídeo pela API (`scripts/gen.mjs`, com teto de gasto). Detalhes: `docs/03-IMAGENS-E-BROLL.md`.

## 2. Como eu trabalho (explique assim, com analogia)
- **Pense numa ilha de edição com um editor e um assistente.** O "motor" (`00_SISTEMA/motor`) é a mesa de edição: um projeto Remotion (vídeo feito por código) com scripts que transcrevem, cortam, tratam o áudio e renderizam. Eu sou o editor que opera a mesa: leio a sua fala, monto o plano, escrevo a edição e confiro. Você é o diretor: aprova cada etapa.
- **Cada formato tem um "manual de estilo"** (`01_REFERENCIAS/modelos/<formato>/guia-de-estilo.md`) com as regras visuais. Eu sigo o manual; não invento estilo.
- **Validadores conferem o meu trabalho.** Um script (`validar-edicao.mjs`) checa as regras duras do formato (corte no meio de palavra, B-roll repetido, tamanho e fps, etc.). Um gancho do Claude Code roda o validador sozinho toda vez que eu salvo a edição. Se der ERRO, eu corrijo antes de mostrar a você.
- **Tudo fica numa pasta por vídeo:** `03_PROJETOS/<AAAA-MM-DD>_<nome>/`, com `01_bruto` (o original), `02_analise` (transcrição e quadros), `03_roteiro` (plano e edição), `04_broll` (imagens e vídeos de apoio), `05_audio`, `06_previas` e `07_final`.
- **Ajudantes (agentes):** `decupador` (tira erros de gravação), `montador` (escreve a edição), `revisor-de-video` (confere quadro a quadro), `diretor-paper-vox` (o formato só de áudio) e `analista-de-referencias` (estuda vídeos de referência para formatos novos).
- **Pedido por áudio:** você pode mandar o pedido como um áudio do WhatsApp (.oga ou .mp3) e dizer "escuta e faz". Eu transcrevo no seu computador (FFmpeg + Whisper) e executo.

## 3. Do bruto ao vídeo final (o passo a passo)
Explique cada passo em 1 linha, marcando onde ele aprova (⏸) e o que ele precisa fazer:
1. **Você joga o bruto no chat** (arraste o vídeo, ou um áudio narrado) e diz "edita esse vídeo" ou `/editar`.
2. **⏸ Você escolhe o formato** (uma pergunta só). Num vídeo, na mesma pergunta, marca o que precisa: **decupar** (tirar erros e tentativas), **corrigir cor** (só para vídeo de câmera em perfil log) e **ajustar o áudio**. Se não marcar, eu não faço. Se não responder, eu pergunto de novo: nunca escolho por você.
3. **Transcrição e decupagem:** eu transcrevo palavra a palavra e, se você pediu, tiro conversa fora do roteiro, tentativas e gaguejos. A decupagem é técnica: o seu tom e as suas opiniões ficam. Conteúdo só sai se você pedir.
4. **Tratamento de áudio** (se você pediu): eu meço a sua voz e gero 2–3 versões para você escolher **de ouvido** (eu não ouço áudio). ⏸ Você diz qual soa melhor ("abafado", "estourado", "lata" me ajudam a ajustar).
5. **⏸ Plano de direção:** eu escrevo cena a cena (o que aparece em cada fala, B-roll, cards, transições, música) e mostro um resumo. Você aprova ou pede ajustes.
6. **B-roll e imagens** (ações suas):
   - suas fotos e vídeos: mande ou coloque em `04_broll/meus/`;
   - banco gratuito (Pexels/Pixabay): precisa das chaves no `.env`;
   - imagens por IA: ⏸ você aprova a lista de prompts e o custo. Caminhos: o **Google Flow** no seu Chrome (com a extensão Claude in Chrome, logado na sua conta), a **API do Gemini**, ou o gerador que você já usa (ChatGPT, Higgsfield por MCP…): se ele não estiver conectado aqui, eu te passo os prompts e você me devolve os arquivos. Passo a passo: `docs/03-IMAGENS-E-BROLL.md`;
   - ⏸ você aprova os downloads e a música (2–3 opções com link).
7. **Montagem:** o `montador` escreve a edição e o validador confere até zerar os erros.
8. **⏸ Prévia na "ilha":** eu abro a prévia no painel do navegador. Você assiste e pede ajustes **com o tempo** ("1:23 tira o zoom", "0:45 troca a imagem"). A prévia se atualiza em segundos, sem render.
9. **⏸ Final:** eu aviso quanto tempo o render vai levar e renderizo. Você recebe o caminho do arquivo em `07_final/` e os créditos de terceiros para pôr na legenda do post.
10. **Biblioteca e segurança:** o material bom vai para a biblioteca (próximos vídeos ficam mais rápidos). O primeiro vídeo aprovado de cada formato pode virar "piloto de regressão": um teste que prova, depois de qualquer mudança no motor, que o formato continua igual (`00_SISTEMA/regressao/README.md`).
No INSTAGRAM - PAPER VOX ANIMATION (só áudio), o caminho tem passos próprios: transcrição corrigida com as suas dúvidas ⏸, proposta de cenas ⏸, prompts ⏸, imagens e recortes ⏸, prévia com 2 trilhas ⏸, ajuste fino dos efeitos sonoros ⏸ e final ⏸.
Mais detalhes: `docs/02-COMO-FUNCIONA.md`.

## 4. Como escolher o estilo
Leia `01_REFERENCIAS/modelos/MODELOS.md` e resuma os formatos em 1 linha cada, com a dica de quando usar:
- **INSTAGRAM - TELA DIVIDIDA** (9:16): B-roll em cima e você embaixo. Bom para explicar com muitos exemplos visuais. Estilo congelado.
- **INSTAGRAM - EDIÇÃO CUT DINÂMICO** (9:16): ritmo alto, texto atrás de você, recortes e motion. Bom para gancho forte e retenção.
- **YOUTUBE - MIX EDIT** (16:9): vídeo longo, intro cinematográfica com manchetes, capítulos e zoom a cada corte.
- **INSTAGRAM - PAPER VOX ANIMATION** (9:16): você não aparece; só a sua voz narrando, sobre um mural de papel animado, 100% escuro.
- e os formatos que ele mesmo treinar.
Na dúvida: onde vai postar? Você aparece no vídeo? É curto ou longo?

## 5. Sua marca
- Abra `02_BIBLIOTECA/kit/marca/marca.json` no Bloco de Notas para ele (`notepad 02_BIBLIOTECA/kit/marca/marca.json`) e explique os campos: `nome` (como aparece no card), `profissao` (descrição curta), `credencial` (opcional: registro, título ou selo; vazio = sem), `handle` (o seu @ principal) e `redes` (cada rede com o @ dela). Troque só os textos de exemplo, mantendo aspas e vírgulas, e confira depois que o arquivo continua válido (ex.: `node -e "JSON.parse(require('fs').readFileSync('02_BIBLIOTECA/kit/marca/marca.json','utf8'))"`).
- Onde isso aparece: no card final do PAPER VOX (lido direto do arquivo) e nas peças de apresentação e encerramento dos outros formatos (eu copio os valores para cada peça). O `@seu_perfil` que existe no código (`estilos.ts`) é só o padrão de reserva.
- A paleta padrão do framework (carmim `#B90015`, degradês salmão, vermelho e laranja, fundos `#0E0C10` e `#F2EFEA`) e as fontes (Instrument Serif itálica + Inter Tight) vêm prontas. Trocar cores ou fontes dos formatos é mudança de motor: peça e eu faço com as regressões.
- Preferências pessoais (tom, volume da música, o que nunca fazer, regras da sua profissão) vão na seção "Preferências do usuário" do `CLAUDE.md`. Os valores que estão lá são o padrão sugerido: ajuste ao seu gosto.

## 6. Treinar um formato novo
`/novo-modelo`: ele manda 1–3 vídeos de referência (arquivo ou link) e diz o nome e a plataforma. O `analista-de-referencias` estuda ritmo, cortes, tipografia, cor e motion. Eu escrevo o manual de estilo ⏸, adapto o motor sem mexer nos formatos existentes, faço um vídeo de teste ⏸ e registro o formato. A partir daí o `/editar` passa a oferecê-lo. Passo a passo: `docs/04-TREINAR-NOVO-FORMATO.md`.

## 7. Regras que não mudam (resuma em até 8 linhas)
Lista completa em `docs/05-REGRAS-IMUTAVEIS.md`; boas práticas em `docs/06-BOAS-PRATICAS.md`.
- Os formatos são fixos: estilo e manual só mudam se você pedir. O TELA DIVIDIDA é congelado.
- Ninguém edita o validador, os manuais ou o `tipos.ts` para "passar" um vídeo. Mexeu no motor = rodar as regressões.
- Nada se gasta, se baixa, se publica ou se envia sem o seu ok (⏸), e render longo é avisado antes.
- A cor do seu vídeo não é mexida se ele já vem tratado. O seu tom não é cortado. Pergunta sem resposta = pergunto de novo.
- O áudio só é tratado se você pedir, e cada vídeo é tratado do zero.
- Instagram sai sempre em 1080×1920 a 24 fps.
- Nunca inventar fato, número ou estudo na tela; nunca gerar pessoa real por IA; print de notícia é o original, intacto.
- Mídia de terceiros (músicas, efeitos, B-roll, referências) fica só na sua máquina e respeita a licença de cada uma (`LICENCAS.md`). O Remotion tem licença própria: grátis para pessoas físicas e empresas pequenas, paga para empresas maiores (remotion.dev/license).

## 8. Vídeo-teste
Termine com uma pergunta (ferramenta de perguntas, se disponível): "Quer fazer um vídeo-teste agora?", com as opções:
- **Sim, com um vídeo**: peça um vídeo curto (20–60 s) dele falando para a câmera e siga o `/editar`;
- **Sim, com um áudio**: peça um áudio de 30–60 s narrando um assunto e siga o `/editar` no INSTAGRAM - PAPER VOX ANIMATION;
- **Agora não**: diga que é só arrastar um vídeo ou áudio no chat quando quiser, ou chamar `/editar`.
Sugira um tema neutro, se ele não tiver um (ex.: "3 dicas de produtividade" ou "como fazer um café coado").
