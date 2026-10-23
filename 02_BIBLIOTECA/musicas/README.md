# Biblioteca de músicas (trilhas aprovadas)

Aqui ficam as trilhas que você aprovou e pode reutilizar. **Os arquivos de música não vêm no repositório** (licença de terceiros): a pasta começa vazia, só com este README e o `catalogo.md`.

## Como uma trilha entra aqui

1. Na edição, o Claude propõe 2 ou 3 opções (⏸ você escolhe ouvindo), com link, duração e se tem Content ID.
2. Só as aprovadas são baixadas, direto para esta pasta.
3. Cada trilha ganha uma linha no `catalogo.md`: arquivo, clima, energia, duração, licença e onde foi usada.

O INSTAGRAM - PAPER VOX ANIMATION só aceita trilha desta pasta: o gerador (`scripts/lib/mural.mjs`) recusa arquivo de outro lugar. Nos outros formatos, a trilha do vídeo vai para `05_audio/musica/` do projeto e, se aprovada, ganha uma cópia aqui.

## Nome do arquivo

`<clima>_<titulo>_<autor>_<fonte>.mp3`, em minúsculas, sem acento e sem espaço. Exemplo: `lofi_manha-tranquila_autor-exemplo_pixabay.mp3`.

## Onde conseguir trilhas grátis

| Fonte | Licença (confira na página no dia do download) | Cuidado |
|---|---|---|
| Pixabay Music (pixabay.com/music) | Pixabay Content License | Muitas faixas têm o selo "Content ID Registered": no YouTube podem gerar reivindicação. Para o YOUTUBE - MIX EDIT, prefira faixas sem o selo e guarde o comprovante da licença. No Instagram, o selo pesa menos |
| Trilha feita por código (FFmpeg) | Sua | Sem risco de Content ID. Não há script pronto: o Claude monta uma trilha simples com FFmpeg, se você pedir |

## Regras de uso (valem para todos os formatos)

- Música no máximo a **1/4 da voz** (o motor mede e calcula o volume).
- Evite a mesma trilha em vídeos seguidos.
- No YOUTUBE - MIX EDIT, a música fica só na intro (preferência padrão; ajuste na seção de preferências do manual).
- Dica para o final natural da trilha coincidir com o fim do vídeo: `musica.ini = duração da trilha − duração do vídeo − ~4 s`.
- **Nunca suba as músicas para o GitHub.**
