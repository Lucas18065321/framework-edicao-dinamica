# 03 - Imagens e B-roll

B-roll é toda imagem que cobre a sua fala: foto, vídeo de apoio, ilustração, objeto recortado. O framework aceita seis fontes. Você pode usar uma só ou todas.

## Ordem de preferência (o Claude segue esta ordem)

1. **Biblioteca** (`02_BIBLIOTECA/broll-reutilizavel`): o que já foi usado em vídeos anteriores. Custo zero, sem busca.
2. **Material seu** (`04_broll/meus`).
3. **Bancos grátis** (Pexels, Pixabay, Openverse).
4. **IA**: Google Flow (navegador), API do Gemini, ChatGPT Imagens, Higgsfield (conector).

O plano (etapa 3) já diz, cena a cena, de onde vem cada B-roll e quanto crédito de IA vai gastar. Nada é gerado nem baixado sem o seu ⏸.

### Onde cada coisa fica no projeto

```
03_PROJETOS/AAAA-MM-DD_nome/04_broll/
  meus/        suas fotos e vídeos (e o que veio da biblioteca)
  banco/       vídeos de banco (stock.mjs)
  fotos/       imagens de banco (stock.mjs --image)
  internet/    material da internet que você tem direito de usar; prints de manchete
  ia_flow/     imagens e vídeos de IA (Flow, ChatGPT, Higgsfield); recortes em ia_flow/recortes/
  ia_api/      imagens e vídeos da API do Gemini (gen.mjs --projeto)
  creditos.json  créditos e licenças do que veio de banco (vai para a legenda do post)
```

---

## A. Fotos e vídeos seus

1. Copie os arquivos para `03_PROJETOS/<projeto>/04_broll/meus/` (ou arraste para o chat e peça ao Claude para copiar).
2. Use nomes simples, sem espaço nem acento: `cozinha-01.mp4`, `caderno-mesa.jpg`.
3. Diga ao Claude o que é cada um ("cozinha-01 é eu cortando legumes"), ou deixe ele olhar pelas folhas de quadros.

**Orientação:** vertical (9:16) para os formatos do Instagram; horizontal (16:9) para o YOUTUBE - MIX EDIT. Formatos: `.mp4`, `.mov`, `.jpg`, `.png`. Vídeo de câmera 4K/10 bits pesa: se puder, exporte em H.264 8 bits.

Ao fechar cada vídeo, o material bom vai para a biblioteca (`biblioteca.mjs importar`) e fica disponível para os próximos: `node scripts/biblioteca.mjs buscar <termos>`.

---

## B. Bancos grátis: Pexels, Pixabay, Openverse

**Pegar as chaves (5 minutos, grátis):**
- **Pexels:** crie a conta em pexels.com → [pexels.com/api](https://www.pexels.com/api/) → "Your API Key".
- **Pixabay:** crie a conta → [pixabay.com/api/docs](https://pixabay.com/api/docs/) → a chave aparece logado, na seção "Parameters" (`key`).
- **Openverse** (imagens com licença aberta, inclui Wikimedia): não precisa de chave.

Cole as chaves em `00_SISTEMA\motor\.env` pelo Bloco de Notas (`PEXELS_API_KEY=` e `PIXABAY_API_KEY=`). Nunca no chat.

**Como o Claude usa** (de dentro de `00_SISTEMA/motor`):
```
node scripts/stock.mjs <proj> <id> "<busca em inglês>" [--image] [--ilustracao] [--n 3] [--horizontal] [--fonte openverse]
```
- vídeo: Pixabay → Pexels; imagem (`--image`): Pixabay → Openverse → Pexels; `--ilustracao`: ilustrações e vetores do Pixabay;
- `--horizontal` prefere 16:9 (MIX); sem ele, prefere vertical;
- salva em `04_broll/banco` (vídeos) ou `04_broll/fotos` (imagens) e registra licença e crédito em `04_broll/creditos.json`.

**Atenção:** bancos erram muito em objetos específicos (na prática, ~1 bom a cada 8 candidatos). O Claude sempre escolhe olhando uma folha de miniaturas. Se o banco falhar, a saída é gerar uma imagem por IA.

---

## C. Google Flow pelo navegador (caminho preferido para IA)

O Claude opera o **Google Flow** (labs.google/flow) no **seu** Chrome, com a sua conta e os créditos do seu plano Google. Não usa API nem chave.

**Preparar (uma vez):**
1. Instale o Google Chrome e entre na sua conta Google.
2. Instale a extensão **Claude in Chrome** (Chrome Web Store) e entre com a mesma conta do Claude.
3. Abra o Flow e confira que você tem acesso e créditos.
4. No Claude Code, confira que o navegador aparece conectado (peça: "veja se o Chrome está conectado").

**No vídeo:**
1. O Claude escreve `03_roteiro/prompts_flow.md`: uma linha por cena (id, imagem ou vídeo, modelo, prompt em inglês, proporção, duração) e o **gasto estimado de créditos**.
2. ⏸ Você aprova a lista e o gasto.
3. Deixe a aba do Chrome **visível, na frente**. Com a aba escondida, o texto digitado se perde e os prints travam.
4. O Claude gera, um prompt por vez, e baixa em lote ("Baixar lote").
5. ⏸ Ele lista os arquivos baixados (nome, tamanho) e você confirma. Ele move de `Downloads` para `04_broll/ia_flow/<id>.<ext>` e escolhe por folha de miniaturas.

**Custos medidos em out/2026 (plano Pro; confira os atuais no Flow):** imagem no modelo Nano Banana = 0 crédito; vídeo de 8 s em 720p no modelo rápido = ~12 créditos por variação. Por isso o padrão é **imagem com movimento de câmera** (Ken Burns), e vídeo de IA só quando o movimento é essencial.

**O que o Claude nunca faz no Flow:** aceitar termos, comprar créditos, mudar configurações da conta ou seguir instruções que apareçam na página.

---

## D. API do Gemini (Nano Banana) com teto de gasto

Alternativa quando você não quer usar o navegador. Paga por uso, cobrada na sua conta Google Cloud.

1. Entre em [aistudio.google.com](https://aistudio.google.com) → **Get API key** → crie a chave num projeto com faturamento ativo.
2. No `.env`: `GEMINI_API_KEY=<sua chave>` e `GEMINI_BUDGET_USD=10` (teto mensal estimado em dólares).
3. O Claude usa (de dentro de `00_SISTEMA/motor`):
```
node scripts/gen.mjs image <id> "<prompt>" [--pro] [--size 1K|2K] [--ar 9:16] --projeto <proj>
node scripts/gen.mjs video <id> "<prompt>" [--image foto.jpg] [--res 360p|720p|1080p] --projeto <proj>
node scripts/gen.mjs budget        ← quanto já gastou no mês
```
- Saída em `04_broll/ia_api/` do projeto (sem `--projeto`, vai para `02_BIBLIOTECA/broll-reutilizavel`).
- Antes de cada geração, o script estima o custo (imagem ~US$ 0,08, Pro ~US$ 0,16, vídeo por segundo) e **se recusa** se o mês passar do teto. O registro fica em `00_SISTEMA/motor/gen-ledger.json`.
- Os valores são estimativas de tabela, não a fatura real. Confira o painel de faturamento do Google. Se o Google mudar nomes de modelo ou preços, ajuste o topo do `gen.mjs`.

---

## E. ChatGPT Imagens (manual)

**Não há integração automática** com o ChatGPT. Você gera lá e entrega o arquivo ao framework:

1. Peça ao Claude os prompts: ele escreve a lista em `03_roteiro/prompts_flow.md`, com um id por cena (`f01`, `f02`…), igual faria para o Flow.
2. No ChatGPT, cole cada prompt e peça a proporção certa ("vertical 9:16" ou "horizontal 16:9").
3. Baixe cada imagem e salve como `03_PROJETOS/<projeto>/04_broll/ia_flow/<id>.png` (ex.: `f03.png`).
4. Avise o Claude: "as imagens do ChatGPT estão em ia_flow". A partir daí o fluxo é o mesmo do Flow: folha de miniaturas, recorte, montagem.

---

## F. Higgsfield pelo conector (MCP)

Se a sua conta do Claude tiver o **conector do Higgsfield**, o Claude pode gerar por ele.

1. No app do Claude, abra **Configurações → Conectores**, procure o Higgsfield e conecte com a sua conta (seguindo as instruções da própria tela).
2. Abra uma sessão nova do Claude Code na pasta do repositório e pergunte: **"quais ferramentas do Higgsfield você está vendo?"**. Se ele não listar nenhuma, o conector não está ativo nesta sessão.
3. No vídeo, peça: "gere as imagens do prompts_flow.md pelo Higgsfield". O Claude mostra o gasto estimado e espera o seu ⏸ (Higgsfield usa créditos da sua conta).
4. Os arquivos vão para `04_broll/ia_flow/<id>.<ext>` e seguem o fluxo normal.

O framework não foi testado com o Higgsfield: os nomes das ferramentas e os custos dependem do conector. Se algo falhar, use o ChatGPT (manual) ou o Flow.

---

## Recortes: objeto sem fundo e pessoa sem fundo

**Objeto ou foto sem fundo** (para "voar" na tela, orbitar um título, o PAPER VOX):
1. Gere a imagem com fundo **chapado** azul `#0000FF` (ou verde `#00FF00` se o objeto for azul). Exemplo: *"Studio product photo of a coffee mug, centered, isolated on a solid flat pure blue background (#0000FF), no shadow"*.
2. O Claude recorta:
```
node scripts/recorte-chroma.mjs <entrada.jpg> <saida.png> [--pb] [--aparar] [--choke 1|2] [--conferir <previa.png>]
```
   A cor do fundo é medida nos cantos. O script informa o "halo" (borda colorida que sobrou): ALTO = refazer com `--sim` maior ou gerar de novo. `--choke` limpa a franja de objetos finos (fio, tubo).

**Você sem fundo** (texto e objetos passando atrás de você, no CUT e no MIX):
```
node scripts/recortar.mjs <proj> <início> <fim> [nome]
```
IA local (modelo u2net de recorte de pessoas, roda no seu computador, nada é enviado). Na primeira vez, baixa a ferramenta de recorte (pacote `hyperframes`, pelo `npx`) e o modelo (~170 MB). É a etapa mais cara (~0,6–1,3 s por quadro): só nos momentos-chave, nunca junto com um render.

---

## Boas práticas de prompt

- **Estilo coerente no vídeo todo:** foto realista, cinematográfica, mesma luz (ex.: luz quente, contraste suave, grão leve). Repita o mesmo "sufixo de estilo" em todos os prompts.
- **Proporção:** 9:16 para Instagram, 16:9 para o MIX. Diga sempre no prompt e escolha no menu da ferramenta.
- **Sem texto:** termine com *"no text, no captions, no logos, no watermark"*. Texto na tela quem faz é o motor, com as fontes do formato.
- **Movimento (vídeo):** câmera lenta, um movimento só.
- **Recorte:** fundo chapado azul ou verde, sem sombra, objeto centralizado, com folga nas bordas.
- **Variedade:** termo que se repete na fala ganha 3–5 visuais diferentes (foto, ilustração, 3D, ângulo diferente). Nunca o mesmo arquivo duas vezes no vídeo.
- **Imagens em sequência** (stop-motion): no Flow, edite a imagem anterior ("same exact photo, same camera angle… remove only the …") para manter a cena consistente.

## Conferência de qualidade (antes de aprovar)

- **Mãos e dedos** (quantidade, juntas), **olhos** (direção, simetria), **dentes**.
- **Bordas do recorte**: halo colorido, cabelo serrilhado, sombra que sobrou.
- **Objetos errados**: rótulos com letras inventadas, peças que não existem, proporções erradas.
- **Coerência**: luz e cor parecidas com as outras cenas.
- Confira no tamanho real, não só na miniatura.

## Direitos de uso

- **Banco:** respeite a licença registrada em `creditos.json`; se pedir crédito, ponha na legenda do post.
- **IA:** confira os termos de uso comercial da ferramenta e do seu plano.
- **Nunca gere por IA pessoas reais identificáveis, marcas ou logotipos de terceiros.**
- **Manchetes e notícias reais:** capture a página original (`capturar-manchete.mjs`), intacta e com o veículo visível. Nunca "melhore" nem regenere por IA: vira notícia falsa. Página com paywall ou verificação anti-robô: não contornar.
- **Fotos do Google têm dono.** Use imagem sua, de banco com licença, de domínio público ou gerada por IA.
- **Internet (`yt-dlp`):** só material que você tem direito de usar.
