# Licenças

Este framework junta código próprio com software, modelos e serviços de terceiros. Cada um tem a sua licença. **Leia antes de usar comercialmente.** Resumo informativo, não é aconselhamento jurídico: o texto que vale é sempre o da página oficial de cada projeto, na versão que você usa.

## Licença deste repositório

A licença do código próprio deste repositório (scripts, skills, agentes, guias e documentação) está no arquivo `LICENSE` na raiz. Se esse arquivo não existir, o autor ainda não escolheu uma licença: pergunte antes de redistribuir.

---

## ⚠ Remotion (o motor de render)

O motor usa o **Remotion 4.0.532**, que **não é software livre comum**: tem licença própria.

- **Gratuito** para pessoas físicas, organizações sem fins lucrativos e empresas pequenas.
- **Pago** (licença de empresa) para empresas acima do limite de funcionários definido pela Remotion.
- Os termos e o limite atual estão em **[remotion.dev/license](https://www.remotion.dev/license)**. Confira antes de usar o framework numa empresa ou para clientes.

Pacotes `@remotion/*` usados: `cli`, `media`, `media-utils`, `google-fonts`, `three`, `motion-blur`, `paths`, `noise`, `shapes`, `layout-utils`, `lottie`, `light-leaks`, `animation-utils`, `transitions`, `effects`. Todos seguem a mesma licença do Remotion.

---

## Programas instalados pelo instalador (não vêm no repositório)

| Programa | Licença | Observação |
|---|---|---|
| **FFmpeg** (build "full" do gyan.dev, via winget) | GPL v3 (o build full inclui componentes GPL) | Usado como programa externo. Fonte e licenças: ffmpeg.org e gyan.dev. |
| **whisper.cpp** (embutido no FFmpeg, filtro `whisper`) | MIT | — |
| **Node.js** | MIT | — |
| **Git** | GPL v2 | — |
| **yt-dlp** (opcional) | Unlicense | Use só para baixar material que você tem direito de usar. |
| **Chrome Headless Shell** (baixado pelo `npx remotion browser ensure`) | licenças do Chromium (BSD e outras) | — |

## Modelos e ferramentas baixados pelo instalador

| Arquivo | Origem | Licença |
|---|---|---|
| `ggml-small.bin`, `ggml-large-v3-turbo-q5_0.bin` | Hugging Face `ggerganov/whisper.cpp` (pesos do Whisper, da OpenAI, convertidos) | MIT |
| `ggml-silero-v5.1.2.bin` (opcional) | Hugging Face `ggml-org/whisper-vad` (Silero VAD) | MIT |
| `deep-filter.exe` 0.5.6 | GitHub `Rikorose/DeepFilterNet` | MIT ou Apache-2.0 (à sua escolha) |
| `bd/cb/lq/mp/sh.rnnn` (opcional) | GitHub `GregorR/rnnoise-models` | conforme o repositório de origem: confira lá |

## Ferramenta baixada no primeiro uso

| Ferramenta | Quando | Licença |
|---|---|---|
| Pacote `hyperframes` + modelo de recorte de pessoas (u2net) | na primeira vez que o `recortar.mjs` roda (`npx -y hyperframes remove-background`) | conforme o pacote no npm e o modelo de origem (U²-Net: Apache-2.0): confira |

## Incluído no repositório

| Item | Licença |
|---|---|
| Dicionário pt-BR (`00_SISTEMA/ferramentas/dicionario-ptbr/`, Projeto VERO, Raimundo Santos Moura e colaboradores) | LGPL v3 e MPL (texto em `README_pt_BR.txt`, na mesma pasta) |
| Efeitos sonoros básicos (gerados localmente por `scripts/synth-sfx.mjs`) | gerados por código, sem material de terceiros |
| Substitutos sintetizados (gerados localmente por `scripts/sfx-substitutos.mjs` a partir dos básicos, com os nomes dos pacotes de terceiros que o motor chama) | gerados por código, sem material de terceiros (só o nome do arquivo segue o pacote original) |

## Pacotes npm (instalados pelo `npm ci`)

React e React DOM (MIT), three.js (MIT), @react-three/fiber (MIT), lottie-web (MIT), lucide-react (ISC), TypeScript (Apache-2.0), **simple-icons** (CC0 para os desenhos; **as marcas** representadas, como Instagram e YouTube, **pertencem aos donos**: use só para indicar o seu perfil, conforme as regras de marca de cada rede). A lista completa e exata está no `00_SISTEMA/motor/package-lock.json`.

## Fontes

As fontes do vídeo (ex.: Instrument Serif, Inter Tight) vêm do Google Fonts pelo `@remotion/google-fonts`, em geral sob a **SIL Open Font License**. Confira a licença de cada fonte em fonts.google.com antes de trocar. SF Pro e SF Symbols (Apple) têm licença restrita: não use.

---

## Mídia de terceiros: não vem no repositório

Estas licenças permitem usar em vídeos, mas **não permitem redistribuir os arquivos** (ou exigem crédito). Por isso as pastas vêm vazias, com um README dizendo o que colocar:

| Mídia | Onde colocar | Cuidados |
|---|---|---|
| B-roll de banco (Pexels, Pixabay, Openverse) | `04_broll/` do projeto; reutilizáveis em `02_BIBLIOTECA/broll-reutilizavel/` | Crédito e licença registrados em `04_broll/creditos.json`. Openverse traz licenças Creative Commons variadas: respeite cada uma. |
| Músicas (ex.: Pixabay Music) | `02_BIBLIOTECA/musicas/` | Várias faixas têm **Content ID** no YouTube. Guarde o link da faixa. |
| Efeitos sonoros (ex.: Mixkit e outros pacotes) | `02_BIBLIOTECA/sfx/` e `05_LAB/sfx/` | A licença do Mixkit permite uso em vídeo e **proíbe redistribuir** os sons ou incluí-los em ferramentas e templates. Guarde um print da licença no dia do download. |
| Vídeos de referência (para treinar formatos) e as análises deles | `01_REFERENCIAS/modelos/<id>/videos/` | Só para estudo na sua máquina. Não publique. |
| Imagens e vídeos de IA (Flow, Gemini, ChatGPT, Higgsfield) | `04_broll/ia_flow/` ou `04_broll/ia_api/` | Siga os termos de uso comercial da ferramenta e do seu plano. |

## Serviços usados pelo navegador ou por API

Google Flow, Google AI Studio (Gemini), Pexels, Pixabay, Openverse, ChatGPT e Higgsfield têm termos de uso próprios. O framework só os acessa com a sua conta, a sua chave e a sua aprovação.
