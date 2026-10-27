# 01 - Instalar no macOS

Equivalente do [01-INSTALAR.md](01-INSTALAR.md) (Windows) para **macOS** (testado em Apple Silicon; Intel não testado). Tudo o mais (fluxo, formatos, regras) é igual.

## Antes de começar

- macOS (testado só no 27, Apple Silicon; versões anteriores e Mac Intel não testados), ~10 GB livres, 8 GB de RAM ou mais.
- Homebrew não é pré-requisito: se faltar, o instalador oferece instalar (veja abaixo).
- Pasta do repositório **fora** de iCloud Drive, Dropbox e Google Drive (ex.: `~/Projetos/...`).

**O que foi testado.** Apple Silicon (arm64) com macOS 27. **Mac Intel e versões do macOS anteriores à 27 não foram testados**: o instalador tem o caminho para Intel (`compositor-darwin-x64`, DeepFilterNet `x86_64-apple-darwin`), mas ninguém confirmou que funciona. Se algo falhar, a tabela final do instalador diz o que e onde.

### Homebrew e Xcode Command Line Tools

Sem o Homebrew, o instalador pergunta "Homebrew não encontrado. Instalar agora com o instalador oficial (https://brew.sh)? Ele pede a senha do Mac e as Xcode Command Line Tools [s/N]" e só instala se você responder `s`. Sem terminal interativo, `--instalar-homebrew` autoriza a instalação (nesse modo o instalador do Homebrew usa `sudo` sem senha, então só funciona se o seu `sudo` não pedir senha; com terminal, a senha do Mac é pedida pelo próprio instalador do Homebrew); sem pergunta e sem a flag, ele não instala nada: marca a linha `brew` com FALTA (os passos seguintes também dão FALTA, por falta do Node) e mostra o comando oficial (do [brew.sh](https://brew.sh)), que você também pode colar no Terminal:

```
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Ele pede as **Xcode Command Line Tools** (se faltarem) e a senha do Mac, e leva alguns minutos. Quando o instalador do framework o executa, o `brew` já vale no resto da instalação, e ele imprime 2 linhas para você deixá-lo permanente no `~/.zprofile` (em Apple Silicon fica em `/opt/homebrew/bin`). Se instalar à mão, siga as instruções que o Homebrew imprime e rode o instalador do framework de novo.

### Confira a pasta do repositório

O `instalar.sh` avisa quando o caminho contém `Library/Mobile Documents` (iCloud Drive), `Library/CloudStorage` (Google Drive e outros provedores do macOS atual), `Dropbox`, `Google Drive` ou `OneDrive`. Só esses padrões são verificados; pasta sincronizada em outro lugar não é detectada. Na sincronização, o render trava arquivos no meio. Se aparecer o aviso, mova a pasta para `~/Projetos` antes de continuar.

## Instalar

Na raiz do repositório:

```
bash 00_SISTEMA/instalacao/instalar.sh
```

(ou duplo clique em `00_SISTEMA/instalacao/INSTALAR.command`). Com `git clone` não há quarentena e o aviso do macOS nem aparece; se o macOS bloquear o `INSTALAR.command` (ZIP baixado pelo navegador), use Ajustes do Sistema → Privacidade e Segurança → "Abrir Mesmo Assim", ou rode `bash 00_SISTEMA/instalacao/instalar.sh` no Terminal. Pode rodar quantas vezes quiser: o que já está certo é pulado. `--sem-opcionais` pula yt-dlp e os modelos RNNoise/Silero; `--instalar-homebrew` autoriza instalar o Homebrew sem perguntar (as duas flags combinam em qualquer ordem).

O que ele faz: confere/instala Node.js 24, FFmpeg 9 (o do Homebrew já tem os filtros `whisper` e `arnndn`), Git e yt-dlp; cria as pastas vazias; `npm ci` no motor (Remotion 4.0.532 travado); baixa o navegador do Remotion; baixa os modelos do Whisper (~1 GB, sha256 conferido) e o DeepFilterNet 0.5.6 para Mac; gera os efeitos sonoros e os substitutos; baixa os modelos opcionais RNNoise e Silero (a menos que use `--sem-opcionais`); cria o `.env`; confere tudo (inclusive o `02_BIBLIOTECA/kit/marca/marca.json`: AVISO enquanto tiver `@seu_perfil`, FALTA se o JSON for inválido) e mostra a tabela **OK / AVISO / FALTA**.

O instalador termina com código de saída igual ao número de itens FALTA (0 = tudo pronto; 64 = opção inválida).

## Chaves de API (`.env`)

Arquivo: `00_SISTEMA/motor/.env` (oculto no Finder, não vai para o Git). Abrir:

```
open -e 00_SISTEMA/motor/.env
```

Preencha `GEMINI_API_KEY`, `PEXELS_API_KEY`, `PIXABAY_API_KEY` (todas opcionais), sem espaço nem aspas. Nunca cole chave no chat.

## Marca

```
open -e 02_BIBLIOTECA/kit/marca/marca.json
```

No TextEdit, desligue Editar → Substituições → Aspas inteligentes antes de editar o `marca.json` (e os travessões inteligentes também), senão o JSON quebra.

## O que mudou para o Mac

| Item | Windows | macOS |
|---|---|---|
| Instalador | `INSTALAR.bat` + `instalar.ps1` (winget) | `instalar.sh` / `INSTALAR.command` (Homebrew) |
| Binários do Remotion | contorno do Controle Inteligente de Aplicativos (`lib/binarios.mjs`) | não precisa: o compositor `darwin-arm64`/`darwin-x64` roda direto, com `<OffthreadVideo>` disponível |
| Fonte dos rótulos (folhas de quadros) | `C:/Windows/Fonts/arial.ttf` | `Arial.ttf` em `/System/Library/Fonts/Supplemental/` ou `/Library/Fonts/`, ou a Helvetica do sistema como último recurso (`scripts/lib/fonte.mjs`); o instalador marca OK com Arial, AVISO só com Helvetica e FALTA sem nenhuma das duas |
| DeepFilterNet | `deep-filter.exe` | `deep-filter` (binário `apple-darwin`) |
| Chrome da `capturar-manchete.mjs` | `Program Files` | `/Applications/Google Chrome.app` (ou Edge/Chromium) |
| Lixeira do `sfx-importar-mixkit.mjs` | PowerShell | Finder (`osascript`) |
| GPU (`--gl=angle`) | Direct3D | Metal, via ANGLE (conferido num Mac Apple Silicon com macOS 27, em 2026-10-26: um still e um mp4 de 2 s com o `Video` do `@remotion/media` e `--gl=angle` renderizaram sem erro) |

## Contorno de binários do Remotion (`lib/binarios.mjs`)

No Windows, o Controle Inteligente de Aplicativos pode bloquear o `ffmpeg` que vem no pacote do Remotion (`@remotion/compositor-win32-x64-msvc`). Só nesse caso o `scripts/lib/binarios.mjs` troca para o FFmpeg do sistema.

No Mac isso **não é preciso**: o compositor `@remotion/compositor-darwin-arm64` (ou `-darwin-x64` no Intel) roda direto, então o `<OffthreadVideo>` fica disponível. Detalhe técnico: o `ffmpeg` desse pacote só abre com a pasta dele como pasta atual, porque as bibliotecas `.dylib` são achadas pela pasta atual. Rodar `ffmpeg` do pacote de outra pasta dá erro de biblioteca; o Remotion já cuida disso ao renderizar, e o instalador confere o compositor entrando na pasta antes. Você não precisa fazer nada.

## Atenção: regressões

Os limiares de PSNR das regressões (42 e 40 dB) foram medidos no Windows. No Mac, grave o piloto de cada formato **neste computador** (`--gravar`) antes de usar a regressão como trava, e nunca compare com referência gravada em outro sistema.

## Redução de ruído (DeepFilterNet)

O `deep-filter` do Mac só é executado depois de o `sha256` do arquivo baixado conferir (se não bater, o instalador apaga o arquivo e não o executa). O instalador em si só confere o `sha256` e roda `--version`. Em 2026-10-26 o binário foi testado num áudio sintético com ruído, com as mesmas flags do `estudio-audio.mjs` (`--atten-lim-db 12 -D -o`), e reduziu o RMS de -26,6 para -38,6 dB; a qualidade em voz real não foi medida. Se não abrir, ou se a plataforma não tiver binário, o estúdio de áudio usa o filtro `afftdn` do FFmpeg no lugar: a limpeza fica mais simples, mas funciona. O motor roda o filtro `whisper` na CPU (`use_gpu=false`), como no Windows.

## Problemas comuns

| Sintoma | O que fazer |
|---|---|
| FFmpeg sem filtro `whisper` | `brew reinstall ffmpeg` e confira com `ffmpeg -hide_banner -filters \| grep whisper` |
| `npm ci` falha | apague `00_SISTEMA/motor/node_modules` e rode o instalador de novo. Nunca `npm update` |
| Mac dorme no meio do render | `cd 00_SISTEMA/motor && caffeinate -dimsu node scripts/vez.mjs node scripts/render.mjs <proj>` ou peça ao Claude para manter acordado |
| Durante o `npm ci` aparece `install scripts blocked ... esbuild` (npm 12) | é esperado: o esbuild usa o binário do pacote opcional da plataforma e o render funciona; não precisa aprovar nada |
| Transcrição muito lenta | não rode duas transcrições ao mesmo tempo (ex.: `assistir.mjs` com um `transcrever.mjs` rodando). Num Apple Silicon de 10 núcleos, 12 s de áudio levaram 50 s sozinhos e ~18 min com outra transcrição em paralelo; se o `transcrever.mjs` ficar lento, use `--paralelo 1` |

O `yt-dlp` do Homebrew traz o Python como dependência dele; o motor não usa.
