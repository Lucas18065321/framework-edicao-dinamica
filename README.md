# Framework de Edição Dinâmica

Edição de vídeo para redes sociais feita pelo **Claude Code** no seu computador. Você joga o vídeo bruto (ou um áudio narrado) no chat, escolhe o formato e aprova cada etapa. O Claude transcreve, planeja as cenas, busca ou gera o B-roll, monta, confere e renderiza.

Por baixo há um motor em [Remotion](https://www.remotion.dev) (vídeo feito por código), FFmpeg, Whisper local para transcrever e um conjunto de regras, validadores e agentes. Tudo isso faz o resultado sair igual vídeo após vídeo.

> Funciona no **Windows 10/11**. Linux ainda não: veja [docs/07-LINUX.md](docs/07-LINUX.md).

> **Versão beta (2026-10-23).** Os 4 formatos vêm de um motor em produção, mas esta edição pública (instalador, efeitos sonoros substitutos e regressões a partir do `pilotos.json`) ainda não foi testada numa máquina limpa. Encontrou um problema? Abra uma *issue*.

---

## Os 4 formatos treinados

| Formato | Proporção | Entrada | Para quê |
|---|---|---|---|
| **INSTAGRAM - TELA DIVIDIDA** | 9:16 (1080×1920, 24 fps) | vídeo de você falando, já decupado | Reels didático: B-roll em cima e seu rosto embaixo, cards de texto e gráficos animados. Formato **congelado**. |
| **INSTAGRAM - EDIÇÃO CUT DINÂMICO** | 9:16 (1080×1920, 24 fps) | vídeo de você falando (cru ou decupado) | Reels de ritmo alto: camadas de motion a cada 0,5–1,5 s, texto atrás da pessoa, palavras em 3D, legenda cinética. |
| **YOUTUBE - MIX EDIT** | 16:9 (1920×1080, 30 fps) | vídeo de você falando (cru ou decupado) | Vídeo longo de YouTube: intro cinematográfica com manchetes em "text match cut", zoom a cada corte, capítulos, gráficos, 3D. |
| **INSTAGRAM - PAPER VOX ANIMATION** | 9:16 (1080×1920, 24 fps) | **só um áudio** narrado (mp3, wav, m4a, .oga do WhatsApp) | Reels sem rosto: mural de papel animado por código, 100% escuro, câmera que desliza entre "estações", palavras-chave em destaque. |

E um quinto recurso: **`/novo-modelo`**, que treina um formato novo a partir de vídeos de referência seus (ex.: cortes para TikTok, podcast). Veja [docs/04-TREINAR-NOVO-FORMATO.md](docs/04-TREINAR-NOVO-FORMATO.md).

---

## Requisitos

**Computador**
- Windows 10 ou 11 (64 bits).
- ~10 GB livres (programas, modelos de transcrição e pacotes). Cada projeto de vídeo ocupa mais 1 a 5 GB.
- 8 GB de RAM no mínimo. Com 8 GB, renderize um vídeo por vez.
- Internet (instalação, fontes do vídeo, bancos de imagem).

**Contas**
- **Obrigatória:** Claude, num plano que inclua o **Claude Code** (app do Claude, aba Code, ou o terminal).
- **Opcionais**, para B-roll e imagens:
  - Pexels e Pixabay (grátis): bancos de vídeo e foto;
  - Google Flow (pelo navegador, com o seu plano Google): imagens e vídeos de IA;
  - Google AI Studio / Gemini (chave de API): imagens por API, com teto de gasto;
  - ChatGPT (imagens) ou Higgsfield (pelo conector do Claude): outras fontes de imagem.

Detalhes em [docs/03-IMAGENS-E-BROLL.md](docs/03-IMAGENS-E-BROLL.md).

---

## Instalação rápida (3 passos)

1. **Clone o repositório** numa pasta fora do OneDrive, por exemplo `C:\Users\<você>\Videos\framework-edicao-dinamica`:
   ```
   git clone https://github.com/Lucas18065321/framework-edicao-dinamica.git
   ```
   (Sem terminal? Use o GitHub Desktop ou peça ao Claude Code. Passo a passo em [docs/01-INSTALAR.md](docs/01-INSTALAR.md).)
2. **Dê duplo clique em `00_SISTEMA\instalacao\INSTALAR.bat`.** Ele instala Node.js, FFmpeg e os pacotes, baixa os modelos e confere tudo. Leva de 15 a 40 minutos, conforme a internet.
3. **Preencha o que o instalador abrir no Bloco de Notas:** as chaves de API (opcionais, `.env`) e a sua marca (`marca.json`). No fim aparece uma tabela OK/FALTA.

## Como usar (3 passos)

1. **Abra o Claude Code na pasta do repositório** e, na primeira vez, digite `/primeiros-passos`. O Claude confere a instalação e explica o fluxo.
2. **Arraste o vídeo bruto (ou o áudio) para o chat** e digite `/editar`. A primeira pergunta é sempre: qual formato?
3. **Aprove as etapas** (plano, imagens, música, prévia, áudio, final). O vídeo pronto sai em `03_PROJETOS/<data>_<nome>/07_final/`.

O fluxo completo, etapa por etapa, está em [docs/02-COMO-FUNCIONA.md](docs/02-COMO-FUNCIONA.md).

---

## Mapa das pastas

```
CLAUDE.md                   manual do motor (o Claude lê sozinho ao abrir a pasta)
.claude/skills/             comandos: /editar, /novo-modelo, /primeiros-passos
.claude/agents/             agentes: decupador, montador, revisor-de-video, diretor-paper-vox, analista-de-referencias
docs/                       documentação para você (instalar, como funciona, imagens, regras, boas práticas)
00_SISTEMA/motor/           o motor: Remotion (src/) + scripts Node (scripts/)
00_SISTEMA/instalacao/      INSTALAR.bat, instalar.ps1, dependencias.json
00_SISTEMA/ferramentas/     dicionário pt-BR, glossário, DeepFilterNet (baixado)
00_SISTEMA/modelos/         modelos do Whisper e de ruído (baixados pelo instalador)
00_SISTEMA/regressao/       testes que provam que os formatos não mudaram
01_REFERENCIAS/modelos/     um guia de estilo por formato + registro (MODELOS.md)
02_BIBLIOTECA/              kit de marca e peças fixas, b-roll reutilizável, músicas, efeitos sonoros, voz de referência
03_PROJETOS/                um projeto por vídeo (copiado de _MODELO_PROJETO); fica fora do Git
05_LAB/                     efeitos sonoros extras lidos pelo PAPER VOX
```

Dentro de cada projeto: `01_bruto` · `02_analise` · `03_roteiro` · `04_broll/{meus,banco,fotos,internet,ia_flow}` · `05_audio` · `06_previas` · `07_final`.

---

## Documentação

| Documento | O que tem |
|---|---|
| [01 - Instalar](docs/01-INSTALAR.md) | passo a passo para leigo e resolução de problemas |
| [02 - Como funciona](docs/02-COMO-FUNCIONA.md) | do bruto ao final: etapas, aprovações, agentes |
| [03 - Imagens e B-roll](docs/03-IMAGENS-E-BROLL.md) | fotos suas, bancos grátis, Google Flow, Gemini, ChatGPT, Higgsfield |
| [04 - Treinar novo formato](docs/04-TREINAR-NOVO-FORMATO.md) | como o `/novo-modelo` cria um formato a partir de referências |
| [05 - Regras imutáveis](docs/05-REGRAS-IMUTAVEIS.md) | o que não mexer, e por quê |
| [06 - Boas práticas](docs/06-BOAS-PRATICAS.md) | gravação, organização, uso do Claude, custos, backup, segurança |
| [07 - Linux](docs/07-LINUX.md) | o que falta para rodar fora do Windows |

---

## Licenças

O framework depende de software de terceiros com licença própria, e **o Remotion é gratuito só para pessoas físicas e empresas pequenas** (empresas maiores pagam). Leia [LICENCAS.md](LICENCAS.md) antes de usar comercialmente; lá também está a licença do código deste repositório.

Mídia de terceiros (b-roll, músicas, efeitos sonoros, vídeos de referência) **não vem no repositório**: cada pasta tem um README dizendo o que colocar e de onde tirar.
