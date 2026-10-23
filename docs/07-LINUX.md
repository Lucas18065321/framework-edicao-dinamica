# 07 - Linux (ainda não suportado)

O framework foi feito e testado no **Windows 10/11**. Esta é a lista do que falta para rodar no Linux (máquina local ou servidor na nuvem). **Nada disso foi convertido ainda**: é um mapa para quem quiser contribuir.

Referência: máquina Linux com 4 núcleos e 16 GB de RAM, provavelmente sem GPU.
Tamanho: P = até 30 min · M = 1–2 h · G = meio dia ou mais (inclui medir e recalibrar).

| # | O que é Windows hoje | Onde | Caminho no Linux | Tam. |
|---|---|---|---|---|
| 1 | **Render com `--gl=angle`** (WebGL pela GPU via Direct3D). CUT, MIX e PAPER VOX usam; o TELA DIVIDIDA não. | `src/modelos.json` (`"gl": "angle"`), `render.mjs`, `render-paper-vox.mjs` | Sem GPU: `--gl=swangle` (CPU). Testar se 3D, motion blur e halftone saem iguais e medir o tempo (bem mais lento). **Os limiares de PSNR das regressões (42 e 40 dB) foram medidos com o ruído da GPU no Windows: recalibrar.** | G |
| 2 | **FFmpeg com o filtro `whisper`**: o build "full" do gyan.dev traz o whisper.cpp embutido. O FFmpeg dos repositórios do Linux normalmente não traz. | Transcrição: `assistir.mjs`, `transcrever.mjs`, `alinhar-palavras.mjs` | Usar um build estático do FFmpeg 8 ou mais novo com `--enable-whisper`, ou compilar. Conferir também `arnndn`, `ebur128` e `drawtext` com fonte. | M |
| 3 | **`scripts/lib/binarios.mjs`**: no Windows, quando o sistema bloqueia o FFmpeg do Remotion, o motor usa o FFmpeg do sistema e ajusta o `node_modules` (`-/filter_complex`, AAC nativo, priming de 1024 amostras). | `scripts/lib/binarios.mjs` (usa `where`, `ffmpeg.exe`, `compositor-win32-x64-msvc`) | No Linux o compositor do Remotion roda e os ajustes **não** são aplicados: o áudio sai com `libfdk_aac` (priming de 2048) e o vídeo com o FFmpeg do pacote. Decidir: forçar o FFmpeg do sistema (igual ao Windows) ou aceitar a diferença e medir. As regressões comparam só o vídeo: conferir o áudio à parte. | M |
| 4 | **Fonte Arial fixa** (`C:/Windows/Fonts/arial.ttf` e `arialbd.ttf`), só no texto das folhas de quadros e dos comparativos, nunca no vídeo final. | `assistir.mjs`, `preparar.mjs`, `quadros.mjs`, `refinar-sfx.mjs`, `tratar-voz.mjs` | Instalar `ttf-mscorefonts-installer` ou trocar por um auxiliar que escolhe a fonte por sistema (DejaVu/Liberation no Linux). | P |
| 5 | **`deep-filter.exe`** (DeepFilterNet 0.5.6) | `estudio-audio.mjs` | Existe o binário oficial para Linux na mesma versão (`deep-filter-0.5.6-x86_64-unknown-linux-musl`). Escolher o nome por sistema. | P |
| 6 | **Caminho fixo do Chrome** (`C:/Program Files/.../chrome.exe`) | `capturar-manchete.mjs` | Usar o `chrome-headless-shell` do próprio Remotion (`npx remotion browser ensure`) ou o `chromium`. | P |
| 7 | **Ferramentas do laboratório** (`scripts/lab/`): caminhos de pastas do Windows e PowerShell para mandar arquivo para a Lixeira. | `scripts/lab/manifesto.mjs`, `scripts/lab/sfx-importar-mixkit.mjs` | Variável de ambiente ou caminho relativo; `gio trash` ou uma pasta `_lixeira`. Só importa para quem usa o laboratório. | P |
| 8 | **Instalador** em PowerShell + winget | `00_SISTEMA/instalacao/instalar.ps1` | Um `instalar.sh` equivalente: apt, Node 24 (nvm), `npm ci`, `npx remotion browser ensure`, os mesmos downloads do `dependencias.json` (mesmo sha256), o FFmpeg do item 2 e o DeepFilterNet do item 5. | M |
| 9 | **Recorte da pessoa** (`recortar.mjs`) chama `npx -y hyperframes remove-background` com `shell: true`. | `scripts/recortar.mjs` | Conferir se o pacote e o modelo rodam no Linux sem GPU e quanto tempo levam por quadro. | P |

**O que já funciona igual:**
- os scripts usam `path.join`, não `\`;
- a fila de render (`vez.mjs`) só usa `process.kill(pid, 0)`, que existe no Linux;
- as fontes do vídeo vêm do `@remotion/google-fonts` (precisa de internet);
- o `package-lock.json` já traz o compositor do Remotion para Linux como dependência opcional;
- o Claude Code roda no Linux, e as skills e os agentes usam caminhos relativos à raiz do repositório.

**Ordem sugerida:** itens 2 e 3 (FFmpeg), depois 1 (GL e regressões recalibradas), depois o resto. Estimativa: 1,5 a 2 dias de trabalho, a maior parte esperando render e medindo.

Quer contribuir? Abra uma *issue* no repositório antes, dizendo qual item vai atacar.
