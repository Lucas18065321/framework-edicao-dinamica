---
name: novo-modelo
description: "Cria (treina) um novo modelo de edição a partir de vídeos de referência do usuário (por exemplo cortes para TikTok, podcast, tutorial 16:9, um estilo de outro criador) e o registra para que o /editar passe a oferecê-lo. Use quando o usuário quiser 'criar/treinar um novo modelo/formato de edição', mandar referências de outro estilo ou chamar /novo-modelo."
argument-hint: "[nome do modelo] [links ou caminhos das referências]"
---

# /novo-modelo

> **Onde fica o motor:** na raiz deste repositório (a sessão do Claude Code abre nela). Neste arquivo, **todo caminho é relativo à raiz**, e `CLAUDE.md` é o manual do motor (na raiz, carregado sozinho). Scripts: `cd 00_SISTEMA/motor && node scripts/...`.
> Para o usuário: `docs/04-TREINAR-NOVO-FORMATO.md`.

Você vai SOMAR um modelo de edição à editora, sem quebrar os existentes. Leia antes:
- o `CLAUDE.md` (regras comuns, restrições da máquina, "Preferências do usuário");
- `01_REFERENCIAS/modelos/MODELOS.md`;
- o guia do modelo pronto `01_REFERENCIAS/modelos/tela-dividida-instagram/guia-de-estilo.md` (use como molde de estrutura; os guias do CUT e do MIX servem de exemplo de guia completo).

Fale em português, curto. Pare nos ⏸.

**Direitos das referências:** vídeos de referência são de terceiros. Ficam só na máquina do usuário, para estudo; nunca entram no vídeo final nem num repositório público (se você versiona o seu, deixe `videos/` e `analises/` fora do Git). Baixar por link só com o ⏸ do usuário (nome, origem, tamanho).

## Etapas
1. **Briefing** ⏸:
   - nome mostrado ao usuário (ex.: "TIKTOK - CORTES PODCAST") e id em kebab-case (ex.: `cortes-podcast-tiktok`);
   - plataforma e formato (ex.: 1080×1920 9:16 a 24 fps; 1920×1080 16:9 a 30 fps). Instagram sai sempre em 1080p e 24 fps;
   - duração típica e objetivo (retenção, autoridade, humor…);
   - o que herdar dos modelos atuais (fonte, legendas, biblioteca, marca…).
   Peça as referências (arquivos ou links).
2. **Referências**: crie `01_REFERENCIAS/modelos/<id>/{videos,analises,previas}`.
   - Arquivos locais → `videos/`.
   - Links → `/watch` (modo local, se instalado) ou `node 00_SISTEMA/motor/scripts/assistir.mjs <url> <saida>` (baixa com yt-dlp).
   - Para cada referência: folhas de quadros (ffmpeg tile, 1–4 fps nos trechos densos), detecção de cortes (`select='gt(scene,0.25)'`) e transcrição.
   - Se for "antes/depois", use só o lado indicado pelo usuário.
3. **Análise** → `analises/analise.md`:
   - ritmo (cortes/min, duração média de plano);
   - layouts e enquadramentos;
   - tipografia (pesos, tamanhos, posições) e legendas;
   - motion graphics (lower thirds, títulos, gráficos, zooms, sobreposições);
   - transições (tipo e duração);
   - cor e acabamento;
   - uso de B-roll, música e SFX;
   - abertura (gancho) e CTA.
   A análise é pesada: delegue ao agente `analista-de-referencias` (`.claude/agents/analista-de-referencias.md`), que devolve o rascunho do guia. Se ele não estiver na lista, rode um general-purpose com as instruções desse arquivo.
4. **Guia** → `01_REFERENCIAS/modelos/<id>/guia-de-estilo.md`, com as mesmas seções do guia do modelo pronto: formato, layouts com nomes do motor, legenda, fontes, transições, movimento, cor, abertura e fechamento, B-roll, áudio. Inclua uma seção "Preferências do usuário" para o que for gosto dele, e "Checagens antes da prévia" para o que dá para medir. ⏸ Mostre um resumo da análise + guia e peça aprovação.
5. **Ferramentas novas** (só se o guia pedir algo que o motor não faz):
   - pesquise skills e repositórios atuais (Remotion, HyperFrames registry, motion graphics etc.);
   - ⏸ apresente o que instalar e por quê;
   - respeite as restrições do `CLAUDE.md`: nada de Python nativo (numpy, torch); prefira Node, Remotion e FFmpeg;
   - HyperFrames ou similares podem ser usados para peças isoladas, renderizadas como clipe.
6. **Motor** (`00_SISTEMA/motor`):
   - cada modelo tem uma linha em `src/modelos.json` (nome, composição, largura, altura, fps, gl), e o `render.mjs` escolhe a composição pelo `"modelo"` do `edicao.json`;
   - a composição `Edicao` (INSTAGRAM - TELA DIVIDIDA) está **congelada**: nunca a altere;
   - modelos novos usam o motor de camadas (`src/modelos/MotorCamadas.tsx`, estilo em `src/modelos/estilos.ts`, peças em `src/modelos/camadas.tsx`) ou uma composição nova registrada no `Root.tsx`;
   - tipos novos entram em `src/tipos.ts` sem mudar os existentes. **Exceção:** um modelo com composição e tipos próprios mantém os tipos no módulo dele (ex.: `src/modelos/paper-vox/tipos.ts`), não no `src/tipos.ts`: o `validar-edicao.mjs` lê todo export de lá e não aceita `Record<…>`;
   - regras duras do formato novo (que dá para medir) entram no `validar-edicao.mjs` junto com o guia, sem mudar as regras dos formatos existentes;
   - depois de mexer, rode as regressões dos modelos fixos, uma de cada vez pela fila (`00_SISTEMA/regressao/README.md`):
     - `node scripts/vez.mjs node scripts/regressao.mjs` (TELA DIVIDIDA: precisa sair "IDÊNTICO");
     - `node scripts/vez.mjs node scripts/regressao.mjs --cut` (EQUIVALENTE);
     - `node scripts/vez.mjs node scripts/regressao.mjs --mix` (EQUIVALENTE);
     - `node scripts/vez.mjs node scripts/regressao-paper-vox.mjs` (INSTAGRAM - PAPER VOX ANIMATION: IDÊNTICO, ou EQUIVALENTE com PSNR ≥ 40 dB a 135×240).
     `SEM PILOTO`: diga ao usuário que a regressão daquele formato não conferiu nada. `ATENÇÃO`: o modelo novo mudou um formato fixo; desfaça a mudança.
7. **Teste**: crie um projeto de teste com um bruto do usuário (ou um trecho de 20–30 s), monte um `edicao.json` com `"modelo": "<id>"` e renderize uma prévia (avise o tempo antes). Confira por folha de quadros. ⏸ Entregue e ajuste até a aprovação.
8. **Registro**:
   - acrescente a linha do modelo em `01_REFERENCIAS/modelos/MODELOS.md` (nome, id, formato, status ✅, resumo). A partir daí o `/editar` passa a oferecê-lo na primeira pergunta;
   - se surgiram regras comuns novas, atualize o `CLAUDE.md`;
   - ⏸ ofereça gravar o vídeo de teste aprovado como piloto de regressão do formato: acrescente a entrada do `<id>` no `00_SISTEMA/regressao/pilotos.json`, no mesmo formato das outras (`projeto`, `base`, `trechos`, `escala`, `limiar`), e rode `node scripts/vez.mjs node scripts/regressao.mjs --modelo <id> --gravar --projeto 03_PROJETOS/<pasta>` (vale para formato que renderiza pelo `render.mjs`; um render próprio precisa de um script de regressão próprio, como o `regressao-paper-vox.mjs`). Detalhes em `00_SISTEMA/regressao/README.md`;
   - peça nova que puder voltar em outro vídeo entra no `02_BIBLIOTECA/kit/KIT.md`.

## Regras
- Os formatos existentes são fixos: o modelo novo nunca muda o estilo, o guia ou o código deles.
- Não copie marca, textos ou mídia das referências: o modelo aprende o estilo, não o conteúdo.
- Status 🚧 no `MODELOS.md` enquanto o teste não for aprovado.
