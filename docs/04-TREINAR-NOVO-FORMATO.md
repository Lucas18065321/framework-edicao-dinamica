# 04 - Treinar um novo formato

Os 4 formatos que vêm prontos são um ponto de partida. Com o **`/novo-modelo`** você ensina ao framework um estilo novo a partir de vídeos de referência (ex.: "cortes para TikTok", "podcast com dois rostos", "tutorial de tela"). Depois de aprovado, o `/editar` passa a oferecer o formato novo na primeira pergunta.

**Regra de ouro:** um formato novo **soma**, nunca altera os existentes. O TELA DIVIDIDA é congelado e os outros 3 são fixos: o formato novo nasce numa pasta e numa composição próprias, e as regressões provam que nada mais mudou.

---

## Antes de começar

- **Referências:** 2 a 5 vídeos do estilo que você quer (arquivos ou links). Quanto mais parecidos entre si, melhor o guia. Se for um "antes/depois", diga qual lado é a referência.
- **Um bruto seu de teste** (20–30 s bastam) para o piloto.
- **Tempo:** uma sessão inteira só para isso. É a tarefa mais pesada do framework: análise de vídeo, código novo, prévias.
- **Licença das referências:** elas ficam só na sua máquina (`01_REFERENCIAS/modelos/<id>/videos/` está no `.gitignore`). Não publique vídeos de terceiros.

## Como pedir

Abra o Claude Code na raiz do repositório e digite:
```
/novo-modelo TIKTOK - CORTES RÁPIDOS  <links ou caminhos das referências>
```

---

## As 8 etapas

| # | Etapa | O que acontece | ⏸ / sua ação |
|---|---|---|---|
| 1 | **Briefing** | O Claude pergunta: nome mostrado (ex.: "TIKTOK - CORTES RÁPIDOS"), id em kebab-case (ex.: `cortes-tiktok`), plataforma, tamanho e fps (ex.: 1080×1920, 24 fps), duração típica, objetivo (retenção, autoridade, humor), o que herdar dos formatos atuais (fontes, legenda, biblioteca). | ⏸ Responda e envie as referências. |
| 2 | **Referências** | Cria `01_REFERENCIAS/modelos/<id>/{videos,analises,previas}`. Arquivos locais vão para `videos/`; links são baixados com `assistir.mjs <url>` (usa o yt-dlp) ou abertos pela skill `/watch` em modo local (skill externa, opcional: só se você a tiver instalada; não vem neste repositório). | Nada. |
| 3 | **Análise** | O agente **`analista-de-referencias`** faz a parte pesada: folhas de quadros (1–4 quadros por segundo nos trechos densos), detecção de cortes, transcrição. Mede ritmo (cortes por minuto, duração média de plano), layouts e enquadramentos, tipografia (peso, tamanho, posição), legendas, motion graphics, transições, cor, uso de B-roll, música e SFX, gancho e chamada final. Grava `analises/analise.md`. | Nada. |
| 4 | **Guia de estilo** | Escreve `01_REFERENCIAS/modelos/<id>/guia-de-estilo.md` com as mesmas seções dos guias prontos (formato, layouts com os nomes do motor, legenda, fontes, transições, movimento, cor, abertura e fechamento, B-roll, áudio). | ⏸ Leia o resumo da análise e do guia. Aprove ou corrija. **O guia é a lei do formato:** tudo o que o Claude fizer depois sai dele. |
| 5 | **Ferramentas novas** (só se o guia pedir algo que o motor não faz) | Pesquisa pacotes e skills (Remotion, motion graphics). Restrições: nada de Python nativo; prefira Node, Remotion e FFmpeg. Uma peça isolada pode ser feita com outras ferramentas e entrar como clipe de B-roll. | ⏸ Aprove o que instalar e por quê. |
| 6 | **Motor** | Registra o formato numa linha de `00_SISTEMA/motor/src/modelos.json` (nome, composição, largura, altura, fps, `gl`). Usa o **motor de camadas** (`src/modelos/MotorCamadas.tsx`, estilos em `src/modelos/estilos.ts`, peças em `src/modelos/camadas.tsx`) ou cria uma **composição nova** registrada no `src/Root.tsx`. Tipos novos entram em `src/tipos.ts` sem mudar os existentes (um formato com composição própria guarda os tipos no próprio módulo, como o PAPER VOX). Depois roda as regressões dos formatos fixos. | Nada. Se alguma regressão falhar, o Claude conserta antes de seguir. |
| 7 | **Piloto** | Cria um projeto de teste com o seu bruto, monta um `edicao.json` com `"modelo": "<id>"` e renderiza uma prévia. Confere por folha de quadros. | ⏸ Assista, aponte ajustes com o tempo, repita até aprovar. |
| 8 | **Registro** | Acrescenta a linha do formato em `01_REFERENCIAS/modelos/MODELOS.md` (nome, id, formato, status ✅, resumo). Regras comuns novas vão para o `CLAUDE.md`. | A partir daqui o `/editar` oferece o formato novo. |

---

## Depois do piloto aprovado: torne o formato "fixo"

1. **Grave a referência de regressão** do formato novo a partir do piloto aprovado (trechos curtos e representativos: abertura, uma peça típica, o fechamento). Acrescente uma entrada com o `id` do formato em `00_SISTEMA/regressao/pilotos.json` (no mesmo molde das outras) e, se ele renderiza pelo `render.mjs`, rode de dentro de `00_SISTEMA/motor`: `node scripts/vez.mjs node scripts/regressao.mjs --modelo <id> --gravar --projeto 03_PROJETOS/<pasta>`. Detalhes em `00_SISTEMA/regressao/README.md`.
2. **Ponha uma linha no validador** (`scripts/validar-edicao.mjs`) para cada regra dura do guia (ex.: plano mínimo, tamanho da legenda). Regra nova entra **no guia e no validador juntos**.
3. **Peças reaproveitáveis** (intro, apresentação, encerramento, ícones) viram peças do kit, com uma linha no `02_BIBLIOTECA/kit/KIT.md`.

## Dicas

- **Comece pequeno:** 1 formato, poucas peças. Um guia enxuto que o validador confere vale mais que um guia longo que ninguém mede.
- **Herde o que funciona:** fontes, legenda cinética, biblioteca, regras de áudio e de não repetir visual valem para todos os formatos (estão no `CLAUDE.md`).
- **Instagram:** 1080×1920 a 24 fps. Acima disso o Instagram recomprime e perde qualidade.
- **3D e efeitos WebGL** pedem `"gl": "angle"` no `modelos.json` (usa a GPU).
- **Formato em construção** fica marcado 🚧 no `MODELOS.md`. Se você escolher um formato 🚧 no `/editar`, o Claude avisa e oferece terminar o treino usando o seu vídeo como piloto.
- **Uma sessão por formato.** Conversa longa demais perde qualidade.
