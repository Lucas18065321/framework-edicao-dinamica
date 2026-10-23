# Biblioteca de efeitos sonoros (SFX)

Esta pasta guarda os efeitos sonoros que o motor toca nas edições: whoosh nas transições, pop nas palavras, clique nos cards.

**Os arquivos de som não vêm no repositório.** Os 11 básicos são gerados no seu computador pelo próprio motor. O pacote de terceiros (pasta `motionix/`) não pode ser redistribuído: você coloca o seu ou gera substitutos.

O render copia esta pasta inteira (com subpastas) para `05_audio/sfx/` de cada projeto antes de renderizar. **A pasta precisa existir, mesmo vazia.**

## 1. Os 11 básicos (obrigatórios para todos os formatos)

Gerados por código, sem licença de terceiros (sem risco de Content ID). O instalador cria. Para criar à mão, de dentro de `00_SISTEMA/motor`:

```
node scripts/synth-sfx.mjs ../../02_BIBLIOTECA/sfx
```

| Arquivo | Uso principal |
|---|---|
| `whoosh_soft.wav` | transição `blur` (TELA DIVIDIDA) |
| `whoosh_fast.wav` | transição `whip` |
| `swish_air.wav` | caneta da `ficha-papel`, passadas leves |
| `click_soft.wav` | cliques suaves |
| `pop_soft.wav` | palavra destacada (TELA DIVIDIDA) |
| `tick_micro.wav` | tiques curtos |
| `riser_short.wav` | subida antes de um momento forte |
| `impact_sub.wav` | impacto grave (também entra no banco `impacto` do PAPER VOX) |
| `shimmer.wav` | transição `flash` |
| `glitch.wav` | transição `glitch` |
| `reverse_swell.wav` | crescendo invertido (banco `swell` do PAPER VOX) |

No `edicao.json`, o som vai pelo nome, sem `.wav`: `{"t": 3.2, "som": "whoosh_soft"}`.

## 2. Pacote de terceiros: `motionix/` (CUT DINÂMICO, MIX EDIT e PAPER VOX)

O CUT DINÂMICO e o MIX EDIT tocam sons deste pacote **pelo nome do arquivo** (transições automáticas, cards, ícones, títulos). Sem o arquivo, o render falha. O sorteio de SFX da TELA DIVIDIDA (`scripts/lab/sfx-variado.mjs`) e o PAPER VOX (`scripts/lib/mural.mjs`) também escolhem sons daqui.

Estrutura esperada (77 arquivos, WAV 48 kHz):

```
motionix/<categoria>/<categoria>_NN_<nome>.wav
```

| Categoria | Quantos | Exemplo de nome |
|---|---|---|
| `camera-shutters` | 3 | `camera-shutters_01_camera-shutter.wav` |
| `clicks` | 6 | `clicks_01_cinematic-click.wav` |
| `data-collect` | 5 | `data-collect_04_data-collect.wav` |
| `gear` | 7 | `gear_03_smooth-and-premium-gear.wav` |
| `money` | 4 | `money_01_cinematic-money-1.wav` |
| `pop` | 6 | `pop_05_smooth-pop.wav` |
| `risers` | 5 | `risers_01_premium-riser.wav` |
| `ui-sound-effects` | 21 | `ui-sound-effects_03_ui-premium-open.wav` |
| `whooshes` | 20 | `whooshes_14_simple-whoosh.wav` |

A lista completa com os nomes exatos fica em `00_SISTEMA/motor/scripts/sfx-substitutos.mjs` (constante `MOTIONIX`).

### Você tem três caminhos

1. **Substitutos sintetizados (o padrão: o instalador já cria).** Gera os 77 nomes a partir dos 11 básicos, com tom e volume levemente diferentes em cada um. O `instalar.ps1` roda isso sozinho depois dos básicos. Para conferir ou refazer à mão, de dentro de `00_SISTEMA/motor`:
   ```
   node scripts/sfx-substitutos.mjs --listar   (só mostra o que falta)
   node scripts/sfx-substitutos.mjs            (cria o que falta)
   ```
   Soam mais simples que um pacote profissional, mas o vídeo renderiza e a sincronia fica certa.
2. **Seus próprios sons com os mesmos nomes.** Baixe efeitos com licença que permita uso comercial (veja a tabela abaixo), converta para WAV 48 kHz e salve com o nome exato do arquivo que quer substituir. O script de substitutos nunca sobrescreve um arquivo que já existe.
3. **O pacote Motionix original**, se você já tiver a licença dele: copie os WAV para `motionix/<categoria>/` com os nomes acima.

## Onde conseguir SFX grátis (o próprio usuário baixa)

| Fonte | Licença (confira na página no dia do download) | Observação |
|---|---|---|
| Mixkit (mixkit.co/free-sound-effects) | Mixkit Sound Effects Free License: uso comercial, YouTube, redes sociais e anúncios, sem crédito. Proíbe redistribuir o som avulso ou dentro de ferramenta/template | Download um a um. Os termos proíbem baixar em massa por script ou robô: quem clica é você. Depois, `scripts/lab/sfx-importar-mixkit.mjs` organiza no lab (ver `05_LAB/sfx/README.md`) |
| Pixabay (pixabay.com/sound-effects) | Pixabay Content License | Parte dos arquivos tem Content ID registrado: pode gerar reivindicação no YouTube |

Regras:
- Guarde um print da página da licença no dia do download.
- **Nunca suba os sons para o GitHub** nem distribua o motor com eles dentro (as licenças proíbem).
- Nenhuma fonte grátis protege contra outra pessoa registrar o mesmo som no Content ID.

## Formato

- WAV, 48 kHz, 16 bits, estéreo, sem metadados.
- Na TELA DIVIDIDA, o motor corta todo SFX em 2,5 s. Som mais longo que 2,4 s precisa de uma cópia aparada com fade (o `sfx-variado.mjs` faz isso sozinho para os sons que ele sorteia).
- Volume: no PAPER VOX e no sorteio da TELA DIVIDIDA, o motor mede cada som e nivela pela voz (transições ~12 dB abaixo, pops ~17 dB abaixo). No CUT e no MIX, cada peça usa um volume fixo, calibrado para o pacote original: com substitutos ou sons seus, confira na prévia se algum efeito ficou alto ou baixo demais.
