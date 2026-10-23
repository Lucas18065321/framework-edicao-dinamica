# Regressão: a prova de que o formato não mudou

Regressão é um teste automático. Ele renderiza de novo alguns segundos de um vídeo que você já aprovou (o **piloto**) e compara, quadro a quadro, com a gravação de referência. Se nada mudou, o formato continua igual ao que você aprovou.

Rode depois de qualquer mudança no motor: código em `00_SISTEMA/motor/src` ou `scripts`, pacotes (`npm`), fontes, `render.mjs`, `Root.tsx`, peças do kit.

## O que tem nesta pasta

| Arquivo | Para que serve |
|---|---|
| `pilotos.json` | Um piloto por modelo: projeto, prefixo da referência, trechos, escala e limiar |
| `<base>.mp4`, `<base>_2.mp4`... | Referências gravadas (uma por trecho). Não vêm no repositório: você grava as suas |

Os 4 modelos começam **sem piloto** (`"projeto": null`). Sem piloto, a regressão avisa `SEM PILOTO`, explica como gravar e termina sem erro.

## Como gravar o seu piloto (uma vez por modelo)

1. Edite e aprove o 1º vídeo do formato normalmente (`/editar`).
2. Escolha os trechos no `pilotos.json` (segundos do vídeo final). Prefira trechos com muita coisa acontecendo: abertura, transição, cards, legenda.
3. De dentro de `00_SISTEMA/motor`, rode o comando do modelo com `--gravar --projeto <pasta do projeto>`:

| Modelo | Comando |
|---|---|
| INSTAGRAM - TELA DIVIDIDA | `node scripts/vez.mjs node scripts/regressao.mjs --gravar --projeto 03_PROJETOS/<pasta>` |
| INSTAGRAM - EDIÇÃO CUT DINÂMICO | `node scripts/vez.mjs node scripts/regressao.mjs --cut --gravar --projeto 03_PROJETOS/<pasta>` |
| YOUTUBE - MIX EDIT | `node scripts/vez.mjs node scripts/regressao.mjs --mix --gravar --projeto 03_PROJETOS/<pasta>` |
| INSTAGRAM - PAPER VOX ANIMATION | `node scripts/vez.mjs node scripts/regressao-paper-vox.mjs --gravar --projeto 03_PROJETOS/<pasta>` |
| Formato novo (treinado com `/novo-modelo`) que renderiza pelo `render.mjs` | `node scripts/vez.mjs node scripts/regressao.mjs --modelo <id> --gravar --projeto 03_PROJETOS/<pasta>` |

O `--projeto` aceita o caminho relativo à raiz do repositório (`03_PROJETOS/<pasta>`), o caminho relativo à pasta atual (`../../03_PROJETOS/<pasta>`, como os outros scripts) ou só o nome da pasta (procurado em `03_PROJETOS/` e em `03_PROJETOS/<canal>/`). Com `--gravar`, o projeto fica salvo no `pilotos.json` e as referências são gravadas aqui.

Um formato novo precisa de uma entrada no `pilotos.json` com o `id` dele, no mesmo formato das outras. Sem ela, a regressão para e mostra a linha que falta.

**Não apague nem mova o projeto piloto.** Sem ele, a regressão não roda. Guarde uma cópia dele fora do computador (HD externo ou nuvem).

## Como conferir (depois de mudar o motor)

De dentro de `00_SISTEMA/motor`, rode os quatro, um de cada vez (a fila `vez.mjs` garante isso):

```
node scripts/vez.mjs node scripts/regressao.mjs
node scripts/vez.mjs node scripts/regressao.mjs --cut
node scripts/vez.mjs node scripts/regressao.mjs --mix
node scripts/vez.mjs node scripts/regressao-paper-vox.mjs
```

## Como ler o resultado

| Resultado | O que quer dizer | O que fazer |
|---|---|---|
| `IDÊNTICO` | Todos os quadros iguais à referência (md5 por quadro) | Nada. Pode seguir |
| `EQUIVALENTE` | Quadros diferentes só por ruído de decodificação da GPU: PSNR mínimo na miniatura ≥ limiar | Nada. Pode seguir |
| `ATENÇÃO` | Mudança visual de verdade. O caminho do render novo aparece na mensagem | Assista ao render novo. Se a mudança foi pedida e aprovada pelo usuário, grave de novo com `--gravar`. Se não, desfaça a mudança |
| `SEM PILOTO` | O modelo ainda não tem vídeo aprovado gravado | Grave quando tiver o 1º vídeo aprovado |

## Regras de comparação (não mudar sem motivo medido)

- **TELA DIVIDIDA** (`escala: null`): exige quadros idênticos (md5). Qualquer diferença é `ATENÇÃO`. O formato é congelado.
- **CUT DINÂMICO e MIX EDIT** (`limiar: 42`): o motor de camadas decodifica o vídeo da pessoa no navegador, e dois renders do mesmo código já diferem por ruído. Por isso a comparação é por PSNR numa miniatura (135×240 no 9:16, 240×135 no 16:9). Medido: contraste +1% dá 42,5 dB; deslocar 4 px dá 26 dB.
- **PAPER VOX ANIMATION** (`limiar: 40`): o ruído da GPU e da trama do papel dá PSNR mínimo ≥ 42 dB. Uma palavra pequena trocada de cor dá 38,6 dB; deslocar 2 px dá 25 dB.

O limiar vale para o seu computador. Se a sua máquina der ruído maior (EQUIVALENTE falhando sem mudança nenhuma), meça dois renders do mesmo código antes de baixar o limiar.
