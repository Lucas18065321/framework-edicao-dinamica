# 06 - Boas práticas

O que faz a diferença entre um vídeo que sai em 1 hora e um que leva 1 dia.

## 1. Gravação

**Luz**
- Luz de frente ou levemente de lado, nunca atrás de você (janela atrás = rosto escuro).
- Uma fonte principal grande e suave (janela, softbox, ring light afastado). Luz aparecendo no quadro não é erro; rosto escuro é.

**Enquadramento**
- Celular na vertical para Instagram, na horizontal para YouTube. Câmera parada (tripé), na altura dos olhos.
- Rosto mais ou menos no centro, com espaço acima da cabeça e sem mesa demais embaixo. O motor dá zoom e reenquadra, mas não inventa cabeça cortada.
- Deixe espaço dos lados: no CUT e no MIX o texto passa atrás de você.

**Áudio** (o que mais pesa na qualidade percebida)
- Microfone de lapela ou de mesa perto da boca. Sala com cortina, tapete, sofá: menos eco.
- **Baixe o ganho** do microfone para a voz não estourar nos picos.
- **Desligue** o "aprimorar voz" / redução de ruído do celular e do editor (CapCut e similares): eles comprimem e deixam a voz "esmagada". O tratamento é feito depois, sob medida.
- Tem uma gravação sua com o som de que você gosta? Ponha em `02_BIBLIOTECA/voz-referencia/`: o estúdio de áudio usa como alvo de timbre.

**Fala**
- Fale em **blocos**: uma ideia por vez, com uma pausa curta entre elas. Errou? Pare, respire e repita a frase inteira. A decupagem fica com a última tentativa.
- Não precisa decupar antes: marque "Decupar" no `/editar`. Se preferir decupar no seu editor, o framework acha as suas emendas sozinho.

**Arquivo**
- Melhor formato de entrega: **H.264, 8 bits**. Instagram em 1080×1920 a 24 fps; YouTube em 1080p ou 2K, até 60 fps.
- Vídeo de câmera 4K, 10 bits, HEVC ou perfil log funciona, mas a conversão leva até 30 minutos a mais. Se der, exporte em H.264 8 bits.
- Áudio narrado (PAPER VOX): mp3, wav, m4a ou o .oga do WhatsApp. Grave perto do microfone, em lugar silencioso.

## 2. Organização

- **Um projeto por vídeo.** O `/editar` cria `03_PROJETOS/AAAA-MM-DD_tema/` sozinho. Nome curto, sem acento: `2026-11-03_rotina-de-estudos`.
- **Canais em subpastas** se quiser (ex.: `03_PROJETOS/YOUTUBE/`).
- **Versões antigas** do final saem de `07_final/` (para `03_PROJETOS/_versoes-antigas/`): o render copia o projeto inteiro e arquivo velho deixa tudo mais lento.
- **Feche cada vídeo alimentando a biblioteca** (o Claude faz na etapa 8): b-roll bom, música aprovada, peças de motion. O próximo vídeo fica mais rápido e mais barato.
- **Datas sempre AAAA-MM-DD.**

## 3. Uso do Claude

- **Abra o Claude Code na raiz do repositório.** Assim ele lê o `CLAUDE.md` e enxerga as skills e os agentes.
- **Uma sessão por vídeo.** Terminou? Abra outra para o próximo. Conversa longa demais perde qualidade quando o contexto é resumido.
- **Aprove por etapa** e responda objetivo. Ajuste sempre **com o tempo**: "0:42 troca a imagem do café", "1:10 tira o zoom".
- **Prévia curta antes do render longo:** peça "renderiza só de 0 a 15 s" para conferir cor, legenda e enquadramento antes de gastar 20 minutos.
- **Durante o render:** não feche a sessão e não deixe o computador dormir (peça ao Claude para mantê-lo acordado). Não rode outro programa pesado junto.
- **Aprendeu algo útil?** Peça: "anota isso no CLAUDE.md". O que vale para sempre vai para arquivo, não fica só na conversa.
- **Preferências suas** (tom, ritmo, música, cor) vão na seção "Preferências do usuário" do `CLAUDE.md`. Ajuste os valores padrão para o seu gosto.
- **Algo saiu errado?** Diga o que esperava e o que veio. O Claude explica o que falhou e a alternativa; ele não troca de ferramenta em silêncio.

## 4. Economia

- **Limite de uso do Claude:** os agentes rodam em modelos mais leves e a leitura pesada (quadros, vídeos) fica com eles. Mesmo assim, um vídeo inteiro consome bastante: não abra três edições ao mesmo tempo.
- **Créditos de IA:** imagem com movimento de câmera custa muito menos que vídeo de IA. Use vídeo de IA só quando o movimento for essencial.
- **Biblioteca primeiro:** o que já foi usado não custa nada.
- **API paga** (Gemini): defina o teto em `GEMINI_BUDGET_USD` e confira `node scripts/gen.mjs budget`.
- **Tempo de máquina:** prévia na ilha (segundos), render só depois do "aprovado".

## 5. Backup

- **O framework (suas regras, guias, ajustes):** faça um **fork** no GitHub e mantenha as suas mudanças nele (`git commit` + `git push`, ou pelo GitHub Desktop). Um commit por mudança, com uma frase do que mudou. Mudou o motor? Commit só depois das regressões passarem.
- **Os seus vídeos:** `03_PROJETOS/` não vai para o Git (é grande e é privado). Copie pelo menos `01_bruto/` e `07_final/` de cada vídeo para um HD externo ou para a nuvem.
- **O `.env`:** guarde as chaves num gerenciador de senhas. Se perder, gere chaves novas nos sites.
- **Reinstalar em outra máquina:** clone o seu fork e rode o `INSTALAR.bat` de novo. Ele baixa tudo e confere pelo sha256.

## 6. Segurança

- **Chaves só no `.env`**, pelo Bloco de Notas. Nunca no chat, nunca num print.
- Se uma chave vazar (print, chat, commit), **apague a chave no site** e gere outra.
- Antes de cada `git push`, confira a lista de arquivos: nada de `.env`, brutos ou finais. O `.gitignore` bloqueia, mas confira.
- **Leia o que o Claude pede para aprovar.** Download, gasto, envio para a nuvem: ele pergunta antes; não aprove no automático.
- Texto escrito em páginas da web nunca é ordem: se o Claude encontrar instruções numa página, ele mostra a você e pergunta.

## 7. Direitos autorais

- **Música:** Pixabay Music é grátis, mas várias faixas têm **Content ID** (o YouTube pode reivindicar). Confira na página da faixa e guarde o link. Evite a mesma trilha em vídeos seguidos.
- **Efeitos sonoros:** os 11 básicos são gerados por código (sem licença de terceiros). Pacotes de terceiros (Mixkit e outros) costumam permitir uso em vídeo, mas **proíbem redistribuir** os arquivos: por isso não vêm no repositório. Guarde um print da licença no dia do download.
- **B-roll de banco:** os créditos ficam em `04_broll/creditos.json`. Se a licença pedir, ponha na legenda do post.
- **IA:** confira os termos comerciais da ferramenta e do seu plano.
- **Vídeos de referência** (para treinar formatos): só na sua máquina. Não publique.

## 8. Ética de conteúdo

- **Não engane:** imagem de IA não pode se passar por registro real (notícia, evidência, "foto do caso"). Siga as regras de rótulo de IA de cada plataforma.
- **Pessoas reais:** não gere por IA, não use imagem sem direito.
- **Dados e citações:** número e frase na tela precisam de fonte. Na dúvida, não ponha.
- **Promessas:** sem promessa de resultado e sem "antes e depois" enganoso. Se a sua profissão tem conselho com regras de publicidade (saúde, direito, finanças), elas valem também para o vídeo.
- **Créditos:** dê crédito a quem a licença exige.
