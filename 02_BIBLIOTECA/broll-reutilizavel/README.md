# B-roll reutilizável

Vídeos e imagens de apoio (B-roll) que já serviram num vídeo e podem voltar em outros: cenas geradas por IA, fotos suas, vídeos de banco gratuito. **A mídia não vem no repositório**: a pasta começa vazia, e cada usuário monta a sua.

Antes de gerar ou baixar B-roll novo, o Claude procura aqui primeiro (economiza crédito de IA e tempo).

## Organização

```
02_BIBLIOTECA/broll-reutilizavel/<tema>/<nome>.<ext>
02_BIBLIOTECA/catalogo.json      ← o índice (uma entrada por arquivo)
```

- `<tema>`: pasta por assunto, em minúsculas e sem acento (ex.: `cozinha`, `escritorio`, `cidade-noite`, `conceitos`).
- `<nome>`: slug curto que descreve a cena (ex.: `maos-picando-cebola`).

## Como entra um arquivo (sempre pelo script)

De dentro de `00_SISTEMA/motor`:

```
node scripts/biblioteca.mjs importar <lote.json>   copia os arquivos para cá e cataloga (mede a duração dos vídeos)
node scripts/biblioteca.mjs buscar <termos...>     procura por tags, tema, nome e descrição
node scripts/biblioteca.mjs listar                 tudo, agrupado por tema
```

Formato do lote (uma lista):

```json
[{"arquivo": "03_PROJETOS/2026-11-02_meu-video/04_broll/ia_flow/c03.mp4", "nome": "maos-picando-cebola", "tema": "cozinha",
  "tags": ["cozinha", "faca", "cebola", "preparo"], "descricao": "Close de mãos picando cebola na tábua, luz quente",
  "tipo": "video", "orientacao": "vertical", "origem": "flow", "licenca": "Gerado no Google Flow (conta do usuário)",
  "credito": "—", "projeto": "2026-11-02_meu-video"}]
```

| Campo | Valores |
|---|---|
| `tipo` | `video` ou `imagem` |
| `orientacao` | `vertical` (9:16) ou `horizontal` (16:9) |
| `origem` | `flow`, `pixabay`, `pexels`, `openverse`, `meu` (gravado por você) ou outra fonte |
| `licenca` / `credito` | a licença da fonte e o crédito exigido (ou `—`) |

O script acrescenta sozinho `arquivo` (caminho dentro desta pasta), `duracao_s` e `adicionado` (data).

## De onde vem o B-roll

| Origem | Como |
|---|---|
| Suas fotos e vídeos | Salve em `04_broll/meus/` ou `04_broll/fotos/` do projeto |
| IA no navegador (Google Flow, ChatGPT imagens etc.) | Gere com a sua conta e salve em `04_broll/ia_flow/` do projeto. Passo a passo em `docs/03-IMAGENS-E-BROLL.md` |
| IA por API (opcional) | `node scripts/gen.mjs image <id> "<prompt>" --projeto <pasta>` (precisa de `GEMINI_API_KEY` no `00_SISTEMA/motor/.env`). Sem `--projeto`, o arquivo cai direto nesta pasta, **sem catalogar**: rode o `importar` depois |
| Bancos grátis (Pixabay, Pexels, Openverse) | `node scripts/stock.mjs <pasta-do-projeto> <id> "<busca em inglês>" [--image] [--horizontal]`: salva em `04_broll/banco/` (vídeo) ou `04_broll/fotos/` (imagem) e anota licença e crédito em `04_broll/creditos.json`. Vídeo precisa de `PIXABAY_API_KEY` ou `PEXELS_API_KEY` no `.env`; imagem também tenta o Openverse, sem chave |

## Regras

- Respeite a licença de cada fonte e anote no catálogo.
- Não repita o mesmo B-roll no mesmo vídeo (o validador acusa erro).
- **Nunca suba a mídia para o GitHub.** Só o `README.md` desta pasta e o `catalogo.json` vazio vão no repositório.
