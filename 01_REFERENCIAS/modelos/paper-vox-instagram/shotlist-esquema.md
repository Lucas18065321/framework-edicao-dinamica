# Esquema da shot list: INSTAGRAM - PAPER VOX ANIMATION (apoio do guia de estilo)

A shot list é a proposta de cenas da etapa P2 (`guia-de-estilo.md`): um mural só, com estações em blocos, montagens nos silêncios e o card. O esquema abaixo é o **real**, lido do vídeo de validação do formato, do `00_SISTEMA/motor/scripts/validar-shotlist.mjs` e do `00_SISTEMA/motor/scripts/lib/mural.mjs`.
- **Nunca se digita tempo à mão.** Um gerador por vídeo, `03_roteiro/montar_shotlist.mjs`, gera `shotlist.json` (máquina) e `shotlist.md` (leitura do usuário) a partir do `02_analise/palavras.json` travado e alinhado. Mudou a transcrição ou o alinhamento? Rode o gerador de novo.
- **O repositório não traz um gerador pronto** (o do vídeo de validação tinha conteúdo pessoal). O `diretor-paper-vox` (modo "cenas") copia o do molde do formato (o piloto em `00_SISTEMA/regressao/pilotos.json`, senão o último vídeo PAPER VOX aprovado) e troca só o criativo; no 1º vídeo do formato, escreve do zero seguindo a seção "Como o `montar_shotlist.mjs` monta". Depois de aprovado, registre esse vídeo como piloto (`00_SISTEMA/regressao/README.md`).
- **Quem lê a `shotlist.json`:** o `validar-shotlist.mjs` (regras) e o `lib/mural.mjs` (faixa de palavras de cada estação, chegada, punch-in, SFX candidatos, montagens).

## Chaves do topo
| Chave | Exemplo | Para que serve |
|---|---|---|
| `formato` | `"paper-vox-animation"` | rótulo (o id do modelo, `paper-vox-instagram`, vai no `quadro.json`) |
| `versao` | `"quadro-continuo"` | rótulo |
| `fps`, `w`, `h` | `24`, `1080`, `1920` | rótulo |
| `voz` | `"01_bruto/bruto.mp3"` | o áudio (o mural acha sozinho `bruto.mp3`, `.wav` ou `.m4a`) |
| `palavras` | `"02_analise/palavras.json"` | o validador lê as palavras daqui |
| `musica` | `null` | a trilha não se decide aqui: fica no gerador do mural (`M.trilha`) |
| `duvidas` | `[{"palavra": "planilha", "seg": 63.11}, {"palavra": "era", "seg": 14.53, "nota": "\"já era tarde\" × \"já é tarde\""}]` | palavra em dúvida na tela = ERRO, até o usuário responder |
| `termos_recorrentes` | `{"rotina": 3, "tempo": 4, …}` | termo que volta na fala ganha variação visual (sem repetição) |
| `estacoes` | 36 no vídeo de validação | ver abaixo |
| `montagens` | 5 no vídeo de validação | ver abaixo |
| `card` | 1 | registro do card (o card real é o fixo do `M.card()`) |

## Estação (`estacoes[]`)
| Chave | Tipo | O que é | Quem usa |
|---|---|---|---|
| `id` | `"E01"`… | nome da estação (o mesmo no gerador do mural) | todos |
| `bloco` | número | coluna do mural (um look por bloco) | leitura |
| `ini`, `fim` | s (gerados) | faixa da estação: a palavra pertence a ela se o meio da palavra cai em `[ini, fim)` | validador, mural |
| `fala` | texto | as palavras da faixa, exatas (o validador compara sem acento e sem pontuação) | validador |
| `look` | `editorial` · `colagem` · `marmore` | o papel de base | leitura; quem escreve o gerador do mural repete no `base(c, look)` |
| `receita` | nome | `jornal-vivo`, `tipo-escala`, `objeto-papel`, `estatua-sanduiche`, `mesa-escura`, `interface-palco`, `colagem-vox`, `cena-em-camadas`, `capitulo-vox`, `silhueta-gradiente`, `colagem-monta`, `icone-orbital` | validador (nunca 3 iguais seguidas) |
| `chegada` | `{"tipo": "…"}` | como a câmera chega (ver "Chegada") | mural, validador |
| `camera` | texto ou `null` | movimento próprio, descrito (ex.: "na pausa depois de \"e-mail\", chicote ↘ para o celular") | leitura; quem escreve o gerador do mural traduz em `extraCam` |
| `acento` | `"carmim"` ou `null` | 1 acento na cor da marca por estação, no máximo | leitura |
| `respiro` | bool | frase delicada, câmera quase parada | validador (não acusa buraco sem evento) |
| `rajada` | bool (opcional) | estação curta de propósito | validador (não acusa estação < 1 s) |
| `camadas` | `[{fonte, o}]` | `fonte`: `"codigo"`, `"flow:Fnn"` ou `"biblioteca:02_BIBLIOTECA/broll-reutilizavel/<arquivo>"`; `o`: o que se vê | validador (conta imagens) |
| `texto` | `[{t, escala, ancora, truque?}]` | texto de tela: `t` da fala, `escala` `apoio` ou `chave`, `ancora` = 1ª palavra | validador; mural (a âncora da `chave` = instante do punch-in) |
| `eventos` | `[{ancora \| seg, o}]` | o que acontece a cada palavra | validador (conta eventos) |
| `sfx` | `[{ancora \| seg, cat}]` | SFX candidatos (o plano curado fica no gerador do mural) | validador; mural (`M.S(id, cat, n)` devolve o instante da âncora) |

**Âncora:** `"palavra@segundo"`, com a palavra como está no `palavras.json` (inclusive pontuação: `"e-mail.@22.45"`) e o `ini` dela com 2 casas. O validador acha a palavra com esse texto mais perto do segundo (até 1,0 s), dentro da faixa da estação (±0,05 s; eventos ±0,5 s). `seg` = instante direto, para evento na pausa.

**Chegada:** o `tipo` é texto livre, mas o mural só entende o nome de código que encontrar nele, nesta ordem: `chicote`, `deslize`, `snap-zoom`, `snap`, `giro`, `queda`, `recuo`, `recursão`, `emerge`, `abre` (sem nenhum = `deslize`). Escreva o nome exato primeiro: "giro 8° + deslize ←" vira `deslize`. A 1ª estação é sempre `abre`, e a que vem depois de uma montagem é sempre `emerge`.

**Exemplo** (estação neutra, num vídeo sobre produtividade):
```json
{
 "id": "E10", "bloco": 2, "ini": 20.66, "fim": 24.3,
 "fala": "sem energia nem pra abrir o e-mail.",
 "look": "colagem", "receita": "objeto-papel",
 "chegada": {"tipo": "deslize ←"},
 "camera": "na pausa depois de \"e-mail\", chicote ↘ para o celular",
 "acento": "carmim", "respiro": false,
 "camadas": [
  {"fonte": "codigo", "o": "bateria de papel recortado"},
  {"fonte": "biblioteca:02_BIBLIOTECA/broll-reutilizavel/conceitos/caixa-de-entrada-pb.jpg", "o": "foto: notebook com a caixa de entrada lotada (tela ilegível)"}
 ],
 "texto": [
  {"t": "sem energia", "escala": "apoio", "ancora": "sem@20.70"},
  {"t": "e-mail", "escala": "chave", "ancora": "e-mail.@22.45"}
 ],
 "eventos": [
  {"ancora": "energia@20.93", "o": "bateria esvazia barra por barra (12 fps), a última na cor de acento"},
  {"ancora": "nem@21.48", "o": "bateria pisca vazia"},
  {"ancora": "e-mail.@22.45", "o": "foto do notebook pousa ao lado"},
  {"seg": 23.6, "o": "chicote ↘ até o celular (na pausa)"}
 ],
 "sfx": [{"ancora": "energia@20.93", "cat": "ui"}, {"ancora": "e-mail.@22.45", "cat": "papel"}]
}
```
A shot list propõe, o gerador do mural decide: numa estação assim, a foto entra com `voa` (padrão de foto) e só o `ui` fica no plano curado de SFX (entrada de imagem não tem som).

## Montagem (`montagens[]`)
| Chave | Tipo | O que é | Quem usa |
|---|---|---|---|
| `id` | `"M1"`… | nome da montagem (o mesmo no `mergulho` do gerador do mural) | todos |
| `tema` | texto | o assunto dos planos | leitura |
| `pausa` | `[a, b]` s | o silêncio: `a` = `fim` da estação de antes, `b` = `ini` da seguinte | validador; mural (casa com as estações por esses tempos, ±0,02 s) |
| `entrada` | `{dur, o}` | o mergulho (0,25–0,4 s) e onde a câmera some | validador, mural |
| `saida` | `{dur, o}` | a emergência (0,1–0,3 s) e onde a câmera reaparece | validador, mural |
| `planos` | `[{dur, fonte, o}]` | `dur` 0,12–0,4 s; `fonte` `"flow:Mnn"` → `04_broll/ia_flow/Mnn.jpg` | validador, mural |
| `sfx` | `[{seg, cat}]` | candidatos (no plano curado, o plano de montagem não tem som) | validador |

- **Onde a câmera mergulha** não fica na shot list: é o `mergulho: {M1: ['E06', 40, 170]}` do gerador do mural.

**Exemplo:**
```json
{
 "id": "M1", "tema": "a correria de hoje", "pausa": [15.13, 16.21],
 "entrada": {"dur": 0.25, "o": "mergulho na tinta do carimbo"},
 "saida": {"dur": 0.1, "o": "emerge na mesa de papelão (E07)"},
 "planos": [
  {"dur": 0.2, "fonte": "flow:M01", "o": "ônibus lotado à noite, gente de pé de costas segurando a barra"},
  {"dur": 0.2, "fonte": "flow:M02", "o": "engarrafamento à noite visto de dentro do carro, luzes de freio"},
  {"dur": 0.2, "fonte": "flow:M03", "o": "copo de café de papel ao lado do laptop, mão pegando às pressas"},
  {"dur": 0.2, "fonte": "flow:M04", "o": "mãos com o celular andando rápido na rua à noite (tela ilegível)"}
 ],
 "sfx": [{"seg": 15.13, "cat": "whoosh"}]
}
```
Não proponha um `clique` por plano de montagem: na validação ele foi reprovado na prévia, e o plano de montagem ficou sem som.

## Card (`card`)
```json
{"id": "CARD", "ini": 141.19, "fim": 144.19, "receita": "colagem-monta",
 "texto_fixo": ["<Seu Nome>", "<sua profissão ou título>", "<credencial, se houver>", "@seu_perfil"],
 "icones": ["Instagram", "YouTube"], "o": "peças de papel escuro montam e travam; único lugar com o @",
 "sfx": [{"seg": 141.29, "cat": "papel"}]}
```
É só registro: o card real (tempos, tamanhos, degradê) sai fixo do `M.card()` em `lib/mural.mjs`, que lê os textos de `02_BIBLIOTECA/kit/marca/marca.json` (`nome`, `profissao`, `credencial`, `handle`; credencial vazia = sem a linha).

## Como o `montar_shotlist.mjs` monta (o que se escreve a cada vídeo)
- **Onde mora:** em `<proj>/03_roteiro/`. Roda de dentro do projeto (`node 03_roteiro/montar_shotlist.mjs`). É um script Node sozinho (não importa nada do motor): lê `../02_analise/palavras.json` relativo ao próprio arquivo e grava `shotlist.json` e `shotlist.md` ao lado dele.
- **Ajudantes que ele precisa ter:** `norm(s)` (minúsculas, sem acento, sem pontuação, mantendo `%`); `acha(frase, de, ate)` = índice da frase (1+ palavras, comparadas com `norm`) dentro de uma faixa de índices, com `"frase#n"` para a n-ésima ocorrência, e erro claro se não achar; `ancIdx(i)` = `` `${pal[i].w}@${pal[i].ini.toFixed(2)}` ``; `seg(frase)` = o `ini` da palavra achada.
- **`EST`** (uma linha por estação): `{id, bloco, de, look, receita, chegada, camera?, acento?, respiro?, camadas: [{fonte, o}], texto: [{t, escala, a?, truque?}], eventos: [{a | s, o}], sfx: [{a, cat}]}`.
  - `de` = as primeiras palavras da estação (procuradas depois da estação anterior).
  - `a` = frase-âncora dentro da estação; `"frase#n"` = n-ésima ocorrência. Sem `a`, a âncora do texto é o próprio `t`. `s` = segundo direto.
- **Tempos** (gerados): `ini` = 1ª palavra − 0,04 s (0 na 1ª estação); `fim` = 1ª palavra da seguinte − 0,04 s; com montagem depois, `fim` = fim da fala + 0,03 s; a última, fim da fala + 0,1 s.
- **`MONT`**: `{id, depois, antes, entrada: {dur, o}, saida: {dur, o}, tema, planos: [{dur, o}]}`. A `pausa` sai de `depois.fim` e `antes.ini`; as fontes são numeradas `M01…` em sequência.
- **À mão:** `duvidas` (com o segundo da palavra; as mesmas ⚠ da `02_analise/transcricao_corrigida.md`), `termos_recorrentes` e o texto do `shotlist.md`.
- **`shotlist.md`:** cabeçalho com o resumo (acento e degradês da marca; trilha a 1/4 da voz com cortes só voz; SFX 12–17 dB abaixo da voz), uma tabela por bloco (`tempo | fala | o que se vê | a cada palavra | imagem | SFX`), uma linha por montagem logo depois da estação de antes, o card, a seção Imagens (gerador + biblioteca, "vídeo gerado: 0") e a seção Som.

## O que o `validar-shotlist.mjs` confere
Uso (de dentro do motor): `node scripts/validar-shotlist.mjs <proj> [--shotlist 03_roteiro/shotlist.json]`. Precisa de **0 ERRO** antes de mostrar ao usuário.

**ERRO (código 1)**
1. Palavra da fala fora de qualquer estação, ou em duas.
2. `fala` diferente da transcrição do intervalo.
3. Montagem por cima da fala (palavra cujo meio cai dentro da pausa, a mais de 0,05 s das bordas).
4. Planos + entrada + saída maiores que a pausa + 0,3 s; plano fora de 0,12–0,4 s.
5. Texto de tela que não está na fala da estação; âncora de texto ou de evento que não acha a palavra.
6. Palavra vetada na tela (promessa absoluta): promessa, cura, curar, garantia, garantido, garantida, 100%, milagre, definitivo, definitiva. A lista é a constante `VETADAS` do `validar-shotlist.mjs`; ajuste ao seu nicho se precisar.
7. Palavra em dúvida (`duvidas`) na tela.
8. Menos de 4 eventos nos 3 primeiros segundos.
9. 3 receitas iguais seguidas.
10. O mesmo arquivo de SFX duas vezes seguidas (campo `som`, quando houver).
11. Imagens acima do teto: 25 por minuto de fala (conta `flow:` e `biblioteca:` das camadas + os planos de montagem).

**Não confere (à mão, antes de mostrar ao usuário)**
- **Repetição visual:** o validador junta as fontes num conjunto e só conta o teto. Confira que nenhuma `fonte` (`flow:Fnn`, `flow:Mnn`, `biblioteca:<arquivo>`) aparece em duas estações ou planos de montagem (rima entre montagens só de propósito).
- **Objeto que não existe no motor:** só o gerador do mural acusa (ver "Campos livres").

**AVISO**
- Buraco > 1,5 s sem evento (fora de `respiro`).
- Estação < 1 s (fora de `rajada`).
- A mesma chegada 3× seguidas.
- A mesma categoria de SFX 3× seguidas (o gerador do mural é mais duro: para com 2× seguidas).
- Menos de 35% das estações sem imagem.

**Evento** (para o gancho e para os buracos) = a chegada de cada estação (`ini`), cada palavra de cada texto de tela, cada evento e o início de cada plano de montagem. No vídeo de validação: 328 eventos, 1 a cada 0,43 s.

## Campos livres: o que o motor faz com eles
- `camera`, `camadas[].o`, `eventos[].o`, `truque`, `tema`, `o`: descrição para o usuário aprovar e guia para quem escreve o gerador do mural. O motor não lê.
- **`truque`:** nunca proponha texto atrás de uma peça. O texto fica sempre por cima (regra do formato; o motor também força isso na ordem de camadas).
- `sfx`: só candidatos. O plano curado, com o instante visual de cada som (`M.ev.*`), mora no gerador do mural.
- **Objeto fora do catálogo** (o `MAPA` do `00_SISTEMA/motor/src/modelos/paper-vox/objetos.tsx`; lista em "Objetos de papel" do guia): marque "objeto novo" na `o` da camada e peça o ⏸ do usuário junto com a shot list. É peça nova num modelo fixo: a conversa principal implementa antes do mural, e o gerador do mural para com erro se o nome não existir.

## Campos que não existem mais (não use)
`cenas` (virou `estacoes` + `montagens` + `card`), `palavra_idx` (virou a âncora `"palavra@segundo"`), `"truque": "atras"` (reprovado), `variacao_de`, `luz`, `fundo`, `entrada` da cena, `flow` dentro da cena e `render` (luz, fundo e entrada são do código e do gerador do mural; prompts ficam em `prompts_flow.json`; a trilha fica no gerador do mural).
