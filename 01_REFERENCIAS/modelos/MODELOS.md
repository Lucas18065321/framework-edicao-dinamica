# Modelos de edição

**Instagram: sempre 1080×1920 e 24 fps** (acima disso o Instagram recomprime e perde qualidade). **YouTube: 1920×1080 a 30 fps.** O motor sabe o tamanho, o fps e a composição de cada formato por `00_SISTEMA/motor/src/modelos.json`.

O `/editar` lê esta tabela e, logo depois de receber o bruto (ou o áudio, no INSTAGRAM - PAPER VOX ANIMATION), faz **uma pergunta só**: qual dos formatos (nome + formato + resumo de cada linha). Cada formato tem a sua pasta `01_REFERENCIAS/modelos/<id>/` com `guia-de-estilo.md` (regras visuais), `videos/` (referências), `analises/` e `previas/`. Vídeos de referência e as análises deles são do usuário e não vão para o repositório.

Para criar ou terminar um formato: `/novo-modelo`. Histórico de desenvolvimento: `ROTEIRO.md`.

| Nome mostrado ao usuário | id (pasta) | Formato | Status | Resumo |
|---|---|---|---|---|
| INSTAGRAM - TELA DIVIDIDA | `tela-dividida-instagram` | vertical 9:16 (1080×1920), 24 fps | ✅ **fixo e congelado** | B-roll em cima + rosto embaixo, legenda na emenda, cards de texto animados, gráficos, stop-motion, transições blur/whip/flash, fonte A. Só ganha ferramentas novas (SFX, motions) se o usuário pedir; formato e estilo não mudam. |
| INSTAGRAM - EDIÇÃO CUT DINÂMICO | `cut-dinamico-instagram` | vertical 9:16 (1080×1920), 24 fps | ✅ **fixo** | Ritmo alto com poucos cortes, camada nova de motion a cada 0,5–1,5 s, legenda cinética (a fala vira tipografia), texto atrás da pessoa, tipografia mista e curva, palavras 3D, papel rasgado, flash P&B, zoom contínuo, objetos recortados como elemento gráfico. |
| YOUTUBE - MIX EDIT | `mix-edit-youtube` | horizontal 16:9 (1920×1080), 30 fps | ✅ **fixo** | Mistura de Apple edit + 3D flash edit, cinematográfico, principalmente nos primeiros minutos: fala sem respiro, zoom in/out a cada corte, Text Match Cut com manchetes e artigos, colagem em papel e título em stop-motion na intro, música só na intro (parada brusca no título), apresentação com redes e @, capítulos, rosto desfocado com infos técnicas, gráficos, 3D na frente e atrás da pessoa. |
| INSTAGRAM - PAPER VOX ANIMATION | `paper-vox-instagram` | vertical 9:16 (1080×1920), 24 fps | ✅ **fixo** | Só a partir de um áudio narrado; 100% dark, a pessoa não aparece. Mural contínuo de papel animado por código: câmera que desliza de estação em estação sem corte (parallax em 3 planos, motion blur nos chicotes), palavras-chave gigantes nos degradês da marca, recortes/fotos/objetos que voam de fora em arco e ficam "boiando", objetos de papel desenhados em código, montagens de ~0,2 s nos silêncios (stills de IA), recuo final com o mural inteiro e card da marca. SFX curados e baixos; trilha a 1/4 da voz que para seco nos momentos tensos. Render próprio (`render-paper-vox.mjs`), sem `edicao.json`. |

## Formatos fixos
Os 4 formatos acima são **fixos**: formato, estilo e guia só mudam quando o usuário pedir; ferramentas novas (SFX, motions, peças) também só a pedido. O INSTAGRAM - TELA DIVIDIDA é, além disso, **congelado** (a composição `00_SISTEMA/motor/src/Edicao.tsx` não se mexe).

Qualquer mudança no motor precisa passar nas 4 regressões antes de entregar (de dentro de `00_SISTEMA/motor`; os pilotos ficam em `00_SISTEMA/regressao/pilotos.json` e começam vazios: cada usuário grava os seus com o 1º vídeo aprovado de cada formato, ver `00_SISTEMA/regressao/README.md`):
- `node scripts/vez.mjs node scripts/regressao.mjs` (TELA DIVIDIDA): IDÊNTICO;
- `node scripts/vez.mjs node scripts/regressao.mjs --cut` (CUT DINÂMICO): EQUIVALENTE (PSNR ≥ 42 dB);
- `node scripts/vez.mjs node scripts/regressao.mjs --mix` (MIX EDIT): EQUIVALENTE (PSNR ≥ 42 dB);
- `node scripts/vez.mjs node scripts/regressao-paper-vox.mjs` (PAPER VOX): IDÊNTICO ou EQUIVALENTE (PSNR ≥ 40 dB, limiar calibrado no script).

Um formato novo entra pelo `/novo-modelo`, sem mexer nos fixos.

## Como um formato novo entra nesta tabela
1. `/novo-modelo` cria a pasta `<id>/`, analisa as referências e escreve o `guia-de-estilo.md` (⏸ aprovação).
2. Enquanto o motor não estiver pronto, a linha entra com status 🚧 (em construção): o `/editar` avisa e oferece terminar o formato usando o vídeo do usuário como piloto.
3. Com o piloto aprovado, o formato ganha a linha em `src/modelos.json`, status ✅ aqui e, se o usuário quiser protegê-lo, uma regressão própria.
4. Mais de 4 formatos não cabem numa pergunta só: o `/editar` pergunta antes a plataforma.

## Regras comuns a todos os modelos
Ficam no `CLAUDE.md` da raiz (fluxo, imagens de IA, biblioteca, kit, sem repetição visual, pergunta do áudio no fim, preferências do usuário). O guia de cada modelo só define o que é **específico** dele (formato, layouts, ritmo, tipografia, transições, motion graphics, música).
