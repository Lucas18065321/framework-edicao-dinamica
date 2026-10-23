# Voz de referência (opcional)

Coloque aqui **um** trecho de 20 a 60 segundos da sua voz já tratada, do jeito que você gosta de ouvir (WAV, MP3, M4A ou um vídeo MP4). Pode ser a voz de um vídeo seu que ficou bom.

O estúdio de áudio (`00_SISTEMA/motor/scripts/estudio-audio.mjs`) usa esse trecho para a **EQ casada**: aproxima o timbre da gravação nova do timbre da referência. Ele pega o primeiro arquivo de áudio ou vídeo desta pasta, em ordem alfabética. Para usar outro arquivo numa edição, passe `--referencia <arquivo>`.

Sem nenhum arquivo aqui e sem `--referencia`, o estúdio usa a própria voz do projeto como referência: a EQ casada fica neutra e o resto da cadeia (limpeza de ruído, de-esser, compressão, limitador) funciona igual.

O áudio só é ajustado quando você pede (o `/editar` pergunta "Ajustar o áudio?"), e você escolhe ouvindo entre 3 intensidades.

**Não suba este arquivo para o GitHub** (é a sua voz).
