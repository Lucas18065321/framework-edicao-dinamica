# 01 - Instalar

Passo a passo para quem nunca usou terminal. Tempo total: 30 a 60 minutos, a maior parte esperando downloads.

## Antes de começar

- **Windows 10 ou 11**, 64 bits, com ~10 GB livres e 8 GB de RAM ou mais.
- **App do Claude** instalado e conta com acesso ao **Claude Code** (aba **Code** do app).
- **Instalador de Aplicativo (winget)** atualizado: abra a Microsoft Store, procure "Instalador de Aplicativo" e clique em Atualizar. O instalador do framework usa ele para baixar Node.js, FFmpeg e Git.
- **Escolha a pasta:** fora do OneDrive, Google Drive ou Dropbox. Sugestão: `C:\Users\<você>\Videos\`. O framework passa de 10 GB e a sincronização trava arquivos no meio do render.

---

## Passo 1: baixar o repositório

Escolha **uma** das três formas.

**A. Pedir ao Claude Code (mais fácil)**
Abra o app do Claude, aba **Code**, escolha a pasta `Videos` e cole:
> Instale o Git pelo winget e clone https://github.com/Lucas18065321/framework-edicao-dinamica.git nesta pasta. Depois rode `powershell -NoProfile -ExecutionPolicy Bypass -File framework-edicao-dinamica\00_SISTEMA\instalacao\instalar.ps1 -SemPerguntas` e me mostre a tabela final.

Com `-SemPerguntas` o Bloco de Notas não abre: preencha o `.env` e o `marca.json` depois (passos 3 e 4).

**B. GitHub Desktop (sem terminal)**
1. Instale o [GitHub Desktop](https://desktop.github.com).
2. Menu **File → Clone repository → URL** e cole `https://github.com/Lucas18065321/framework-edicao-dinamica`.
3. Em **Local path**, escolha `C:\Users\<você>\Videos\framework-edicao-dinamica` e clique em **Clone**.

**C. Terminal**
```
cd %USERPROFILE%\Videos
git clone https://github.com/Lucas18065321/framework-edicao-dinamica.git
```

> **Dica:** se você quer guardar as suas mudanças no seu próprio GitHub, faça antes um **fork** (botão "Fork" na página do repositório) e clone o seu fork. Veja "Backup" em [06-BOAS-PRATICAS.md](06-BOAS-PRATICAS.md).

---

## Passo 2: rodar o instalador

Abra a pasta do repositório no Explorador de Arquivos e dê **duplo clique em `00_SISTEMA\instalacao\INSTALAR.bat`**.

Se o Windows mostrar "O Windows protegeu o computador", clique em **Mais informações → Executar assim mesmo** (o arquivo só chama o `instalar.ps1` da mesma pasta, que você pode abrir no Bloco de Notas e ler antes).

### O que o instalador faz (`instalar.ps1`)

Pode rodar quantas vezes quiser: o que já está certo é pulado.

| # | Etapa | Detalhe |
|---|---|---|
| 1 | Programas pelo **winget** | Git, **Node.js 24 LTS** (tenta a 24.19.0, a testada), **FFmpeg 9 "full" do gyan.dev** (traz o filtro `whisper`, de transcrição, e o `arnndn`, de ruído) e **yt-dlp** (opcional, só para assistir referências por link). |
| 2 | Pastas vazias | Cria as pastas que o Git não guarda (`00_SISTEMA/modelos`, `02_BIBLIOTECA/...`, `05_LAB/...`, `03_PROJETOS/_MODELO_PROJETO/...`). |
| 3 | Pacotes do motor | `npm ci` em `00_SISTEMA/motor`: instala as versões **travadas** do `package-lock.json` (Remotion 4.0.532). Depois `npx remotion browser ensure` baixa o navegador que o Remotion usa para renderizar. |
| 4 | Modelos e ferramentas | Baixa e confere pelo **sha256**: Whisper `ggml-small.bin` (~465 MB) e `ggml-large-v3-turbo-q5_0.bin` (~550 MB), do Hugging Face; **DeepFilterNet 0.5.6** (`deep-filter.exe`, ~26 MB), do GitHub. Opcionais: detector de voz Silero e 5 modelos RNNoise (`bd`, `cb`, `lq`, `mp`, `sh`.rnnn), que ficam de reserva para uso manual. |
| 5 | Efeitos sonoros | Gera 11 efeitos por código (`node scripts/synth-sfx.mjs`) em `02_BIBLIOTECA/sfx`: whooshes, cliques, pop, riser, impacto. Sem licença de terceiros. Depois roda `node scripts/sfx-substitutos.mjs`, que cria **substitutos sintetizados** com os nomes dos sons de terceiros que o motor chama (pasta `02_BIBLIOTECA/sfx/motionix` e categorias vazias de `05_LAB/sfx`), para tudo renderizar desde o 1º dia. Nunca sobrescreve um som que já existe. Para trocar pelos seus: `02_BIBLIOTECA/sfx/README.md`. |
| 6 | Chaves de API | Cria `00_SISTEMA/motor/.env` a partir do `.env.example` e abre no Bloco de Notas. |
| 7 | Sua marca | Abre `02_BIBLIOTECA/kit/marca/marca.json` no Bloco de Notas, se ainda tiver o `@seu_perfil` de exemplo. |
| 8 | Conferência final | FFmpeg com os filtros `whisper` e `arnndn`, `deep-filter` abrindo, fonte Arial do sistema. Mostra a tabela **OK / AVISO / FALTA**. |

**AVISO** não impede o uso (ex.: chave de API em branco, modelo opcional). **FALTA** precisa ser resolvido: veja "Resolução de problemas" abaixo e rode o instalador de novo.

---

## Passo 3: chaves de API (`.env`, todas opcionais)

O instalador abre `00_SISTEMA\motor\.env` no Bloco de Notas. Para abrir de novo depois: clique com o botão direito no arquivo → **Abrir com → Bloco de Notas**.

```
GEMINI_API_KEY=        ← Google AI Studio (imagens por API, com teto de gasto)
GEMINI_BUDGET_USD=10   ← teto de gasto estimado; o script se recusa a passar disso
PEXELS_API_KEY=        ← pexels.com/api (grátis)
PIXABAY_API_KEY=       ← pixabay.com/api/docs (grátis, aparece logado)
```

Cole cada chave depois do `=`, sem espaço e sem aspas. Salve e feche.

- **Sem nenhuma chave** o framework funciona: o B-roll vem das suas fotos e vídeos, do Google Flow pelo navegador e de imagens do Openverse (sem chave). Só a busca de **vídeos** em banco precisa de Pexels ou Pixabay.
- **Nunca cole uma chave no chat do Claude.** O `.env` fica só no seu computador e não vai para o Git (está no `.gitignore`).

Como pegar cada chave: [03-IMAGENS-E-BROLL.md](03-IMAGENS-E-BROLL.md).

## Passo 4: sua marca (`marca.json`)

`02_BIBLIOTECA\kit\marca\marca.json` guarda o seu nome, profissão, credencial (opcional) e o seu @ em cada rede: dados que aparecem nos cards de apresentação e encerramento. Troque os textos de exemplo (`Seu Nome`, `@seu_perfil`…), mantendo as aspas e as vírgulas. Se o arquivo ficar inválido, o instalador avisa na próxima rodada. O @ padrão das peças de marca também aparece em `00_SISTEMA/motor/src/modelos/estilos.ts` (campo `arroba`): peça ao Claude para trocar junto.

A paleta que vem é a **padrão do framework** (carmim `#B90015`, degradês salmão/vermelho/laranja, fundos `#0E0C10` e `#F2EFEA`) e está no código do motor (principalmente `00_SISTEMA/motor/src/modelos/estilos.ts` e nas peças de `src/kit/`), não no `marca.json`. Trocar pela sua é possível: peça ao Claude, aprove a prévia e regrave as referências das regressões. Mexer no visual é mexer no formato (veja [05-REGRAS-IMUTAVEIS.md](05-REGRAS-IMUTAVEIS.md)). O catálogo das peças prontas está em `02_BIBLIOTECA/kit/KIT.md`.

## Passo 5: conferir com o Claude

1. Abra o app do Claude, aba **Code**, e escolha **a pasta do repositório** (a raiz, onde está o `README.md`). O Claude lê o `CLAUDE.md` sozinho.
2. Digite `/primeiros-passos`. O Claude confere a instalação e explica como o fluxo funciona.
3. Pronto: arraste um vídeo para o chat e digite `/editar`.

---

## Resolução de problemas

| Sintoma | Causa | O que fazer |
|---|---|---|
| `winget` não é reconhecido / FALTA winget | Instalador de Aplicativo ausente ou velho | Microsoft Store → "Instalador de Aplicativo" → Atualizar. Feche e rode o `INSTALAR.bat` de novo. Em Windows corporativo, o winget pode estar bloqueado: instale Git, Node.js 24 LTS e o FFmpeg full do gyan.dev à mão e rode o instalador de novo (ele pula o que já existe). |
| "a execução de scripts foi desabilitada neste sistema" | Política do PowerShell | Use sempre o `INSTALAR.bat`: ele chama o PowerShell com `-ExecutionPolicy Bypass` só para este script, sem mudar a configuração do Windows. |
| FALTA "ffmpeg: filtro whisper" | O FFmpeg do PATH não é o build "full" (ex.: veio de outro programa ou é o "essentials") | Rode `winget install --id Gyan.FFmpeg -e` e confira com `where ffmpeg` qual vem primeiro no PATH. O build full do gyan.dev precisa vir antes dos outros. |
| Render falha com código `0xC0E90002`, ou o Windows diz que bloqueou `ffmpeg.exe`/`remotion.exe` dentro de `node_modules` | O **Controle Inteligente de Aplicativos** do Windows recusa os binários que vêm no pacote do Remotion | Nada a fazer: o motor detecta e passa a usar o FFmpeg do sistema sozinho (`scripts/lib/binarios.mjs`). **Não desligue a segurança do Windows.** Sem esses binários, o componente `<OffthreadVideo>` não funciona; os formatos já usam alternativas. |
| FALTA "deep-filter roda" | Download incompleto, antivírus ou falta do runtime do Visual C++ | Apague `00_SISTEMA\ferramentas\deepfilternet\deep-filter.exe` e rode o instalador de novo. Se continuar, instale o runtime: `winget install --id Microsoft.VCRedist.2015+.x64 -e`. Só o tratamento de áudio avançado (`estudio-audio.mjs`) depende dele. |
| `npm ci` falha | Internet caiu ou `node_modules` meio instalado | Apague a pasta `00_SISTEMA\motor\node_modules` e rode o instalador de novo. **Nunca rode `npm update` nem `npm install <pacote>`** (veja as regras imutáveis). |
| Computador trava, Chrome fecha, render cai com falta de memória | Pouca RAM (8 GB) | Um render por vez (o motor já usa uma fila: `scripts/vez.mjs`). Feche o navegador e outros programas. Peça ao Claude para renderizar com `--concurrency 1`. Não rode o recorte da pessoa junto com um render. |
| Render longo para no meio | Computador entrou em suspensão | Peça ao Claude para manter o computador acordado durante o render, ou mude o plano de energia. O render do MIX é por partes e retoma de onde parou. |
| sha256 DIFERENTE | Download corrompido | Apague o arquivo indicado e rode o instalador de novo. |
| Pasta dentro do OneDrive | Sincronização trava arquivos | Mova o repositório para `C:\Users\<você>\Videos\` e rode o instalador de novo. |

Ainda com problema? Abra o Claude Code na pasta do repositório, cole a tabela final do instalador e peça: "me ajude a resolver os itens FALTA".
