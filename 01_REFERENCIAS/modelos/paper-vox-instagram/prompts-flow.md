# Prompts de imagem: INSTAGRAM - PAPER VOX ANIMATION (apoio do guia de estilo)

Etapa P3 do guia (`guia-de-estilo.md`): o agente `diretor-paper-vox` (modo "prompts") escreve `03_roteiro/prompts_flow.md` (leitura do usuário) e `03_roteiro/prompts_flow.json` (operação) a partir da shot list aprovada. **⏸ usuário antes de gerar.**
O nome "flow" ficou nos arquivos porque o caminho padrão é o Google Flow, mas os mesmos prompts servem para qualquer gerador de imagem (ver "Onde gerar"). Passo a passo de cada ferramenta: `docs/03-IMAGENS-E-BROLL.md`.

## O que vem do gerador de imagem e o que é código
- **Do gerador (só stills, nunca vídeo):**
  - fotos de estação (`Fnn`, bloco FOTO);
  - objetos e estátuas para recorte (`Fnn`, bloco RECORTE);
  - planos de montagem (`Mnn`, bloco MONT).
- **Em código (nunca vai para o gerador):** jornal, papel, mesa, interface, texto, silhuetas, cabeças, objetos de papel (bateria, balança, engrenagens…), traço, luz.
- **Sem vídeo gerado.** Vídeo de IA só como exceção, com ⏸ e custo informado.
- **Ids:** `F01…` na ordem das estações; `M01…` numerados em sequência pelas montagens (o gerador da shot list numera sozinho). **O id é o nome do arquivo em todo o resto do fluxo.**

## Blocos de estilo (vão no começo de cada prompt, sem mudar)
- **FOTO** (foto de estação ou do jornal; proporção 3:4 ou 4:3):
  `Black and white halftone press photograph, high contrast, crushed blacks, heavy film grain, full frame, no borders. No recognizable faces. No text, no letters, no numbers, no logo, no brand, no watermark.`
- **RECORTE** (objeto ou estátua que vira PNG com alfa; 1:1):
  `Studio product photo, centered, the whole object visible with margin, isolated on a solid flat pure blue background (#0000FF), even flat lighting, no shadow, no reflection, sharp edges. No text, no letters, no logo, no brand, no watermark.`
- **MONT** (plano de montagem; 9:16):
  `Cinematic black and white photograph, vertical 9:16, low-key lighting, one hard light source, deep blacks, shallow depth of field, subtle film grain, realistic, dramatic. No recognizable faces. No text, no letters, no numbers, no logos, no brand, no watermark.`
- **Prompt final = bloco + espaço + assunto** (em inglês, uma ou duas frases concretas).
- Luz de recorte, sombra, borda, halftone extra e P&B final são feitos em código: não pedir no RECORTE (luz de borda sobre o azul deixa halo).

## Modelo de assunto (troque o que está entre `< >`)
| Bloco | Modelo de assunto | Exemplo neutro |
|---|---|---|
| FOTO | `<lugar ou cena>, <hora/luz>, <enquadramento>.` | `An empty office desk with a closed laptop at night, single desk lamp, wide shot.` |
| RECORTE (objeto) | `A plain <objeto>, <ângulo>, no markings, no brand.` | `A plain black office swivel chair, three-quarter view.` |
| RECORTE (estátua) | `A classical white marble bust of an anonymous ancient <figura>, <pose>, head and shoulders only, weathered stone texture.` | `A classical white marble bust of an anonymous ancient Greek man in strict side profile, head and shoulders only, weathered stone texture.` |
| MONT | `<ação com mãos, objeto ou gente de costas>, <noite ou pouca luz>, <detalhe que tira a legibilidade>.` | `A crowded city bus at night, standing passengers seen from behind holding the overhead bar, blurred city lights through the windows.` |

## Como escrever o assunto (o que funcionou na validação do formato)
- Concreto e fotografável: lugar, objeto, luz, enquadramento.
- **Recorte:** um objeto só, inteiro, sem marca. Use `plain`, `no markings`, `no brand`.
- **Montagem:** ação com mãos, objeto ou gente de costas, sempre de noite ou com pouca luz. Telas e papéis com `screen not readable` / `nothing readable`; relógio com `plain dial without numbers`; sacola, crachá e tênis com `no brand` ou `blank`.
- **Rimas entre montagens** (escolha de propósito, nunca repetição): o mesmo objeto em dois estados (tênis na caixa → mãos amarrando o cadarço; bicicleta empoeirada → bicicleta saindo para a luz).
- **Ética das imagens:**
  - nunca rosto reconhecível, pessoa real, "no estilo de [artista]", marca ou logo;
  - em tema sensível sobre corpo (peso, aparência, doença), nenhum corpo: estátua só com cabeça e ombros; montagem só com mãos, objetos e gente de costas;
  - texto nunca dentro da imagem.
- **Filtro de segurança do gerador:** um prompt com figura humana descrita de forma específica e expressiva ("Roman woman… eyes looking down") foi barrado; a versão neutra ("anonymous ancient Roman figure, head bowed slightly forward") passou. Se barrar, troque o sujeito por uma figura anônima neutra.

## Quantidade e orçamento
- **Variações:** x2 por imagem; x4 nas de destaque. No vídeo de validação (142 s de áudio): 47 imagens, 102 variações.
- **Teto:** 25 imagens por minuto de vídeo (ERRO no `validar-shotlist.mjs`); ≥ 35% das estações sem imagem (AVISO).
- **Proporções:** FOTO 3:4 (vertical) ou 4:3 (horizontal), conforme o papel da estação; RECORTE 1:1; MONT 9:16.
- Foto da sua biblioteca (`02_BIBLIOTECA/broll-reutilizavel`) não vai para o gerador: entra como `biblioteca:<caminho>` na shot list e vira P&B no gerador do mural.

## `prompts_flow.md` (leitura do usuário)
Cabeçalho com o total (imagens, variações, onde vai gerar, custo estimado, "vídeo gerado = 0"), as regras acima em 3–4 linhas e a tabela:

| id | onde entra | estilo | proporção | x | assunto (inglês, vai depois do bloco) |
|---|---|---|---|---|---|
| F03 | E07 "sentado" | RECORTE | 1:1 | 2 | A plain black office swivel chair, three-quarter view. |
| M01 | M1 · ônibus lotado à noite, gente de pé de costas segurando a barra | MONT | 9:16 | 2 | A crowded city bus at night, standing passengers seen from behind holding the overhead bar, blurred city lights through the windows. |

Depois da geração, acrescente a linha "Gerado em AAAA-MM-DD em <ferramenta> (projeto "<nome>", se houver): N de N, custo <X>; brutos em `04_broll/ia_flow/_brutos/<id>/`".

## `prompts_flow.json` (operação)
```json
{
  "gerador": "Google Flow · Nano Banana 2.1",
  "creditos_por_imagem": 0,
  "creditos_total": 0,
  "estilos": {"FOTO": "…", "RECORTE": "…", "MONT": "…"},
  "itens": [
    {"id": "F04", "uso": "E14 \"polêmica\"", "estilo": "RECORTE", "aspecto": "1:1", "x": 4,
     "assunto": "A classical white marble bust of an anonymous ancient Greek man in strict side profile, head and shoulders only, weathered stone texture.",
     "prompt": "<bloco RECORTE> A classical white marble bust …"}
  ]
}
```
- `prompt` = o texto exato que vai no campo do gerador (bloco + assunto).
- Troque `gerador` e o custo pelo que você usar (ex.: `"gerador": "API Gemini (gen.mjs)"`, `"usd_por_imagem": 0.08`).

## Onde gerar (escolha um; detalhes em `docs/03-IMAGENS-E-BROLL.md`)
Seja qual for a ferramenta, o resultado final é sempre o mesmo: **variações em `04_broll/ia_flow/_brutos/<id>/<id>_vN.jpg`, a escolhida em `04_broll/ia_flow/<id>.jpg`** (é dali que o mural e o recorte leem).

| Caminho | Como | Custo | Observação |
|---|---|---|---|
| **A. Google Flow no navegador** (padrão) | O Claude opera o seu Chrome com a extensão Claude in Chrome (passo a passo abaixo) | No plano usado na validação, o Nano Banana 2.1 custava 0 crédito; confira no seu plano | O mais testado no formato |
| **B. API Gemini (`scripts/gen.mjs`)** | `node scripts/gen.mjs image <id>_v1 "<prompt>" --ar <proporção> --size 2K --projeto <proj>` (de dentro de `00_SISTEMA/motor`) | Pago por imagem (o script estima ~US$ 0,08; `--pro` ~US$ 0,16) e trava no teto `GEMINI_BUDGET_USD` (padrão 10) do `00_SISTEMA/motor/.env`; gasto anotado em `00_SISTEMA/motor/gen-ledger.json` | Sem navegador. Sai em `<proj>/04_broll/ia_api/<id>_v1.jpg`: mova para `04_broll/ia_flow/_brutos/<id>/`. Chave `GEMINI_API_KEY` no `.env` (nunca no chat). ⏸ antes, porque custa |
| **C. ChatGPT Imagens** | Você (ou o Claude no seu Chrome) cola o prompt completo, pede a proporção e baixa | O do seu plano | Renomeie para `<id>_vN.jpg`. No RECORTE, peça o fundo azul chapado: é o que o `recorte-chroma.mjs` sabe recortar |
| **D. Higgsfield via MCP** | Com o MCP do Higgsfield conectado no Claude Code, o Claude chama a geração de imagem dele com o mesmo prompt e salva com o id | O do seu plano | Confira a proporção e a resolução de saída; mesmo destino de arquivos |

- Qualquer caminho: **sem rosto reconhecível, sem marca, sem texto na imagem**, P&B no fim (feito em código), e a escolhida com **≥ 2K no lado maior** (os planos de montagem são ampliados 1,6–1,8× no final).
- Se nenhum caminho automático funcionar, o Claude entrega a tabela de prompts e você gera à mão e solta os arquivos na pasta com os nomes dos ids.

## Operação no Google Flow (caminho A: seu Chrome, ferramentas Claude in Chrome)
1. **Antes:** nenhum render rodando (com a máquina sem RAM, o Chrome dá timeout no mouse e o texto colado por JS não chega ao editor). A janela do Chrome precisa estar visível.
2. `flow.google.com` → Novo projeto com o nome do vídeo.
3. No chip do modelo: **Nano Banana 2.1** (ou o modelo de imagem do seu plano), Imagem, a proporção do item e o x. **Confira a linha "A geração vai usar N créditos"** antes de enviar; se passar de 0 (ou do que o usuário autorizou), pare e peça ⏸.
4. Prompt no campo "O que você quer criar?" → "Iniciar geração". Uma linha por prompt, na ordem da tabela. **Não clique "às cegas" em sequência:** na validação saíram 7 lotes repetidos assim.
5. **Baixar para escolher:** "Baixar lote" de cada linha (zip em 1K, com nomes descritivos que casam com o prompt). Por JS: `button[aria-label="Baixar lote"].click()`, rolando o `.cdk-virtual-scrollable`. Downloads só com autorização do usuário (peça uma vez para o lote das artes ou registre a liberação nas Preferências do usuário).
   - Salve as variações em `04_broll/ia_flow/_brutos/<id>/<id>_vN.jpg`.
6. **Baixar a escolhida em 2K:** abrir a imagem no Flow → Baixar → **2K Aprimorada**. O 1K do lote (896×1200; 768×1376 no 9:16) fica pequeno.
   - Salve como `04_broll/ia_flow/<id>.jpg`.

## Depois de gerar (vale para todos os caminhos)
1. **Escolher:** dê uma nota a cada variação (leitura do objeto, halo no azul, artefato, mãos/rostos estranhos) e grave em `04_broll/ia_flow/escolhas.json` (`{"F10": {"v": 1, "nota": "…"}}`, com alertas de halo ou artefato). Pode ser na conversa principal ou num agente general-purpose com este critério.
2. **Recortes** (bloco RECORTE), de dentro do motor, com os caminhos completos (o script não recebe `<proj>`: lê a entrada direto e resolve a saída a partir da pasta atual):
   `node scripts/recorte-chroma.mjs <proj>/04_broll/ia_flow/<id>.jpg <proj>/04_broll/ia_flow/recortes/<id>.png --pb --aparar [--choke 1|2] [--conferir <proj>/06_previas/<id>_conferir.png]`
   - A cor-chave é medida nos 4 cantos (o "azul" costuma vir ~`#0035FF`, não `#0000FF`). O script também aceita fundo verde `#00FF00`.
   - Halo > 3% (> 6% com `--pb`) = refazer com `--sim` maior ou gerar de novo. Objeto fino (tubo, fio, cabo) pede `--choke 1-2`.
   - Guarde a variante escolhida em `_brutos/` até a prévia ser aprovada: é a única fonte para recortar de novo.
3. **Folha de contato:** `06_previas/imagens-escolhidas_<n>.jpg` (as escolhidas lado a lado) → ⏸ usuário.
4. **Área clara:** plano que passe de ~15% de área clara (ex.: porta aberta ao sol) leva `escurecer` no gerador do mural.

## Blocos que ficaram de fora (e por quê)
Nada disso vai para o gerador, porque a cena é montada em código: fundo, mesa e jornal (são papel em código), camadas e poses, silhueta (é o objeto `silhuetas`) e ícone pixel-art (o formato usa só recorte realista). O `recorte-chroma.mjs` com despill e `--choke` resolveu todos os recortes da validação, sem precisar de remoção de fundo por IA.
