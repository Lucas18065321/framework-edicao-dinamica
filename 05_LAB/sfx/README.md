# SFX do lab (`05_LAB/sfx`)

Apesar do nome "lab", **esta pasta é de produção**: o código lê sons daqui. Não mova nem renomeie as categorias.

- `scripts/lib/mural.mjs` (INSTAGRAM - PAPER VOX ANIMATION) sorteia sons das categorias `impacto`, `clique`, `glitch`, `scroll-ui`, `ding` e `papel`. Categoria vazia que o gerador pedir = erro "banco vazio".
- `scripts/lab/sfx-variado.mjs` (SFX variado da TELA DIVIDIDA, etapa 5b do `/editar`) usa `whoosh`, `ding`, `glitch` e `clique` quando existem, somados aos básicos e ao pacote de `02_BIBLIOTECA/sfx`.

**Os arquivos de som não vêm no repositório** (licença de terceiros). A pasta começa só com este README.

## Categorias esperadas

| Categoria | Quem usa | Que som é |
|---|---|---|
| `impacto` | PAPER VOX | batida grave, boom curto (o `impact_sub.wav` da biblioteca também entra) |
| `clique` | PAPER VOX, TELA DIVIDIDA | clique seco de interface |
| `glitch` | PAPER VOX, TELA DIVIDIDA | ruído digital curto |
| `scroll-ui` | PAPER VOX | rolagem de tela, tique de interface |
| `ding` | PAPER VOX, TELA DIVIDIDA | sino curto, notificação |
| `whoosh` | TELA DIVIDIDA | passada rápida |
| `papel` | PAPER VOX | virar e assentar folha de papel (a "pestana" do formato) |

Outras categorias (ex.: `futurista`, `caneta`, `teclas`, `riser`) podem existir para consulta, mas o código atual não lê.

## Formato

- Caminho: `05_LAB/sfx/<categoria>/<categoria>_NN_<nome>.wav` (o `sfx-catalogar.mjs` numera e nomeia sozinho)
- WAV, 48 kHz, 16 bits, sem metadados.
- `catalogo.tsv` (gerado pelo script): categoria, arquivo, duração, pico verdadeiro, loudness momentâneo máximo, instante do pico, origem, nome original, licença e descrição.
- `medidas.tsv` é um cache de medição do `sfx-variado.mjs` (pode apagar; ele refaz).

## Como encher as categorias

### Caminho rápido: substitutos sintetizados

O instalador já faz isso. Para refazer à mão, de dentro de `00_SISTEMA/motor`, depois dos SFX básicos (`node scripts/synth-sfx.mjs ../../02_BIBLIOTECA/sfx`):

```
node scripts/sfx-substitutos.mjs
```

Cria 4 sons `<categoria>_9N_sintetizado.wav` em cada categoria **vazia**. Quando colocar os seus, apague os `*_sintetizado.wav` daquela categoria.

### Seus sons, organizados por script

1. Baixe os sons (WAV) de uma fonte com licença de uso comercial. Fontes grátis: Mixkit (mixkit.co/free-sound-effects, licença Mixkit Sound Effects Free, download um a um, sem robô) e Glitch Noises (vladislavzh.itch.io/glitch-noises, CC0). Pixabay também serve, com risco de Content ID em parte dos arquivos.
2. Monte um lote em JSON e rode o catalogador (ele converte para 48 kHz/16 bits, nomeia, mede e registra no `catalogo.tsv`; é idempotente):
   ```
   node scripts/lab/sfx-catalogar.mjs <lote.json>
   ```
   Formato do lote:
   ```json
   {"origem": "Mixkit", "licenca": "Mixkit Sound Effects Free License", "url": "https://mixkit.co/license/#sfxFree",
    "itens": [{"arquivo": "C:/caminho/do/som.wav", "categoria": "papel", "nome": "folha-virando", "descricao": "folha de papel virando"}]}
   ```

### Atalho para o Mixkit

`node scripts/lab/sfx-importar-mixkit.mjs [--pasta <Downloads>] [--manter]` acha em Downloads os arquivos `mixkit-<nome>-<id>.wav` que estão na sua seleção, cataloga com o `sfx-catalogar.mjs` e manda os originais para a Lixeira (com `--manter`, deixa em Downloads).

Ele precisa da lista `05_LAB/sfx/selecao-mixkit.json` (não vem no repositório). Formato: um item por som escolhido, com o id do Mixkit (o número no fim do nome do arquivo baixado):

```json
[{"id": "1234", "categoria": "papel", "essencial": true, "titulo": "Paper page turn", "dur": 1}]
```

## Regras

- Guarde um print da página da licença no dia do download (pasta sugerida: `05_LAB/sfx/licencas/`).
- **Nunca suba os sons para o GitHub** nem distribua o motor com eles dentro.
- Som com mais de 2,4 s usado na TELA DIVIDIDA ganha uma cópia aparada com fade automaticamente (`sfx-variado.mjs`).
