# Instalador do Framework de Edição Dinâmica (Windows 10/11, Windows PowerShell 5.1 ou mais novo).
# Rode depois de clonar o repositório (passo a passo em docs/01-INSTALAR.md).
# Pode rodar quantas vezes quiser: o que já está certo é pulado.
#
# Uso: duplo clique em 00_SISTEMA\instalacao\INSTALAR.bat, ou, na raiz do repositório:
#   powershell -NoProfile -ExecutionPolicy Bypass -File 00_SISTEMA\instalacao\instalar.ps1 [-SemPerguntas] [-SemOpcionais]
#   -SemPerguntas  não abre o Bloco de Notas nem espera Enter no fim (para o Claude rodar)
#   -SemOpcionais  pula o que é opcional (yt-dlp, modelos RNNoise e Silero)
param([switch]$SemPerguntas, [switch]$SemOpcionais)

$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'
$AQUI = Split-Path -Parent $MyInvocation.MyCommand.Path
$RAIZ = (Resolve-Path (Join-Path $AQUI '..\..')).Path
$MOTOR = Join-Path $RAIZ '00_SISTEMA\motor'
$DEP = Get-Content (Join-Path $AQUI 'dependencias.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$resultado = New-Object System.Collections.ArrayList

function Passo($t) { Write-Host ''; Write-Host "==> $t" -ForegroundColor Cyan }
function Nota($item, $status, $detalhe) {
	[void]$resultado.Add([pscustomobject]@{Item = $item; Status = $status; Detalhe = $detalhe})
	$cor = 'Green'
	if ($status -eq 'AVISO') { $cor = 'Yellow' }
	if ($status -eq 'FALTA') { $cor = 'Red' }
	Write-Host ("   [{0}] {1}: {2}" -f $status, $item, $detalhe) -ForegroundColor $cor
}
function FaltaOuAviso($opcional) { if ($opcional) { return 'AVISO' } else { return 'FALTA' } }
function AtualizarPath {
	$env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
}
function Tem($cmd) { return [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }
function Sha($arq) { return (Get-FileHash $arq -Algorithm SHA256).Hash.ToLower() }
function Versao($cmd) {
	$saida = $null
	if ($cmd -eq 'ffmpeg') { $saida = & ffmpeg -hide_banner -version 2>$null | Select-Object -First 1 }
	else { $saida = & $cmd --version 2>$null | Select-Object -First 1 }
	if ($saida) { return ([string]$saida).Trim() } else { return '' }
}
function ArquivoCerto($d, $dest) {
	if (-not (Test-Path $dest)) { return $false }
	if ($d.sha256) { return ((Sha $dest) -eq ([string]$d.sha256).ToLower()) }
	if ($d.bytes) { return ((Get-Item $dest).Length -eq [int64]$d.bytes) }
	return $true
}
function Baixar($url, $dest) {
	$tmp = "$dest.baixando"
	if (Test-Path $tmp) { Remove-Item -Force $tmp }
	$ok = $false
	$curl = Join-Path $env:WINDIR 'System32\curl.exe'
	if (Test-Path $curl) {
		& $curl -L --fail --silent --show-error --retry 3 -o $tmp $url
		$ok = ($LASTEXITCODE -eq 0)
	} else {
		try { Invoke-WebRequest -Uri $url -OutFile $tmp -UseBasicParsing -ErrorAction Stop; $ok = $true }
		catch { Write-Host "   erro no download: $($_.Exception.Message)" -ForegroundColor Yellow }
	}
	if ($ok -and (Test-Path $tmp)) { Move-Item -Force $tmp $dest; return $true }
	if (Test-Path $tmp) { Remove-Item -Force $tmp }
	return $false
}

Write-Host "Framework de Edição Dinâmica: $RAIZ" -ForegroundColor White
if ($RAIZ -match 'OneDrive') {
	Write-Host '   Atenção: a pasta está dentro do OneDrive. Ela vai passar de 10 GB e o OneDrive pode travar arquivos durante o render.' -ForegroundColor Yellow
	Write-Host '   Recomendado: clonar em C:\Users\<você>\Videos\ (fora do OneDrive).' -ForegroundColor Yellow
}

# 1. Programas (winget) -------------------------------------------------------------------------------------------
Passo 'Programas (winget): Git, Node.js, FFmpeg e yt-dlp'
$temWinget = Tem 'winget'
if (-not $temWinget) {
	Nota 'winget' 'FALTA' 'abra a Microsoft Store, instale/atualize o "Instalador de Aplicativo" e rode de novo'
}
foreach ($p in $DEP.winget) {
	if ($p.opcional -and $SemOpcionais) { continue }
	if ((-not (Tem $p.comando)) -and $temWinget) {
		Write-Host "   instalando $($p.id)..."
		$wa = @('install', '--id', $p.id, '-e', '--silent', '--accept-package-agreements', '--accept-source-agreements')
		if ($p.versao) {
			& winget @wa --version $p.versao | Out-Host
			if ($LASTEXITCODE -ne 0) { Write-Host "   a versão $($p.versao) não está disponível; instalando a mais nova" -ForegroundColor Yellow; & winget @wa | Out-Host }
		} else {
			& winget @wa | Out-Host
		}
		AtualizarPath
	}
	if (Tem $p.comando) {
		$v = Versao $p.comando
		if ((-not $p.conferir) -or $v.Contains([string]$p.conferir)) { Nota $p.comando 'OK' $v }
		else { Nota $p.comando 'AVISO' "versão diferente da testada ($($p.versao)): $v" }
	} else {
		Nota $p.comando (FaltaOuAviso $p.opcional) "não instalado ($($p.nota))"
	}
}

# 2. Pastas vazias que o Git não guarda ----------------------------------------------------------------------------
foreach ($d in $DEP.pastas_vazias) { New-Item -ItemType Directory -Force -Path (Join-Path $RAIZ ($d -replace '/', '\')) | Out-Null }

# 3. Pacotes do motor (node_modules) e navegador do Remotion -------------------------------------------------------
Passo 'Pacotes do motor (npm ci, versões travadas no package-lock.json) e navegador do Remotion'
if ((Tem 'node') -and (Tem 'npm')) {
	Push-Location $MOTOR
	if (-not (Test-Path 'node_modules\remotion\package.json')) { & npm ci --no-audit --no-fund | Out-Host }
	$rv = ''
	if (Test-Path 'node_modules\remotion\package.json') {
		& node node_modules/@remotion/cli/remotion-cli.js browser ensure | Out-Host
		$rv = [string](& node -e "console.log(require('remotion/package.json').version)" 2>$null)
	}
	Pop-Location
	$rv = $rv.Trim()
	if ($rv -eq [string]$DEP.remotion) { Nota 'remotion' 'OK' "versão $rv" }
	else { Nota 'remotion' 'FALTA' "versão '$rv' (esperada $($DEP.remotion)): rode de novo; se continuar, apague 00_SISTEMA\motor\node_modules e rode de novo" }
} else {
	Nota 'pacotes do motor' 'FALTA' 'Node.js não está instalado (passo 1)'
}

# 4. Modelos e ferramentas baixados (conferidos pelo sha256) --------------------------------------------------------
Passo 'Modelos do Whisper, DeepFilterNet e modelos de ruído'
foreach ($d in $DEP.downloads) {
	if ($d.opcional -and $SemOpcionais) { continue }
	$dest = Join-Path $RAIZ ($d.destino -replace '/', '\')
	$nome = Split-Path $dest -Leaf
	New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
	if (-not (ArquivoCerto $d $dest)) {
		$mb = [math]::Round([double]$d.bytes / 1MB, 1)
		Write-Host "   baixando $nome ($mb MB) de $($d.url)"
		[void](Baixar $d.url $dest)
	}
	if (-not (Test-Path $dest)) { Nota $nome (FaltaOuAviso $d.opcional) 'não baixou (sem internet?): rode o instalador de novo'; continue }
	if ($d.sha256) {
		if ((Sha $dest) -eq ([string]$d.sha256).ToLower()) { Nota $nome 'OK' 'sha256 confere' }
		else { Nota $nome (FaltaOuAviso $d.opcional) 'sha256 DIFERENTE do esperado: apague o arquivo e rode de novo' }
	} else {
		$tam = (Get-Item $dest).Length
		if ((-not $d.bytes) -or ($tam -eq [int64]$d.bytes)) { Nota $nome 'AVISO' 'tamanho confere; sha256 não publicado pela origem (não conferido)' }
		else { Nota $nome 'AVISO' "tamanho diferente do esperado ($tam bytes): apague o arquivo e rode de novo" }
	}
}

# 5. Efeitos sonoros básicos (gerados por código, sem licença de terceiros) -----------------------------------------
Passo 'Efeitos sonoros básicos (gerados por código)'
$SFX = Join-Path $RAIZ '02_BIBLIOTECA\sfx'
$faltamSfx = @($DEP.sfx_sintetizados | Where-Object { -not (Test-Path (Join-Path $SFX "$_.wav")) })
if (($faltamSfx.Count -gt 0) -and (Tem 'node')) {
	Push-Location $MOTOR
	& node scripts/synth-sfx.mjs $SFX | Out-Null
	Pop-Location
}
$faltamSfx = @($DEP.sfx_sintetizados | Where-Object { -not (Test-Path (Join-Path $SFX "$_.wav")) })
if ($faltamSfx.Count -eq 0) { Nota 'SFX básicos' 'OK' "$($DEP.sfx_sintetizados.Count) efeitos em 02_BIBLIOTECA\sfx" }
else { Nota 'SFX básicos' 'FALTA' "faltam: $($faltamSfx -join ', ')" }
# Os formatos tocam sons de terceiros pelo nome (02_BIBLIOTECA\sfx\motionix e 05_LAB\sfx\<categoria>), que não vêm no
# repositório. Sem eles o render falha: o sfx-substitutos.mjs cria só o que falta, a partir dos 11 básicos (nunca sobrescreve).
if (($faltamSfx.Count -eq 0) -and (Tem 'node') -and (Tem 'ffmpeg')) {
	Push-Location $MOTOR
	$saidaSub = [string]((& node scripts/sfx-substitutos.mjs) -join ' ')
	$codSub = $LASTEXITCODE
	Pop-Location
	if ($codSub -ne 0) { Nota 'SFX de terceiros' 'FALTA' 'os substitutos não foram criados (veja o erro acima e 02_BIBLIOTECA\sfx\README.md); sem eles CUT, MIX, PAPER VOX e o sorteio da TELA DIVIDIDA não renderizam' }
	elseif ($saidaSub -match 'nada a fazer') { Nota 'SFX de terceiros' 'OK' 'todos os sons que o código chama pelo nome existem' }
	else { Nota 'SFX de terceiros' 'AVISO' 'criados substitutos sintetizados (motionix e 05_LAB\sfx): tudo renderiza; para sons melhores, leia 02_BIBLIOTECA\sfx\README.md' }
} else {
	Nota 'SFX de terceiros' 'FALTA' 'precisa dos 11 básicos, do Node e do FFmpeg: corrija e rode de novo (02_BIBLIOTECA\sfx\README.md)'
}

# 6. Chaves de API (.env) -------------------------------------------------------------------------------------------
Passo 'Chaves de API (.env, todas opcionais)'
$envArq = Join-Path $MOTOR '.env'
$envNovo = $false
if (-not (Test-Path $envArq)) {
	Copy-Item (Join-Path $MOTOR '.env.example') $envArq
	$envNovo = $true
}
if ($envNovo -and (-not $SemPerguntas)) {
	Write-Host '   Abrindo o .env no Bloco de Notas: cole as chaves que tiver (pode deixar em branco), salve e feche.' -ForegroundColor Yellow
	Start-Process notepad.exe $envArq -Wait
}
$chaves = @(Get-Content $envArq | Where-Object { $_ -match '^\s*(GEMINI|PEXELS|PIXABAY)_API_KEY\s*=\s*\S+' }).Count
if ($chaves -ge 1) { Nota '.env' 'OK' "$chaves de 3 chaves preenchidas (Gemini, Pexels, Pixabay)" }
else { Nota '.env' 'AVISO' 'nenhuma chave: sem Pexels/Pixabay o banco de vídeos não funciona (imagens ainda vêm do Openverse). Veja docs\03-IMAGENS-E-BROLL.md' }

# 7. Sua marca (marca.json) -----------------------------------------------------------------------------------------
Passo 'Sua marca (02_BIBLIOTECA\kit\marca\marca.json)'
$marca = Join-Path $RAIZ '02_BIBLIOTECA\kit\marca\marca.json'
if (Test-Path $marca) {
	$txt = Get-Content $marca -Raw -Encoding UTF8
	if (($txt -match 'seu_perfil') -and (-not $SemPerguntas)) {
		Write-Host '   Abrindo o marca.json no Bloco de Notas: troque os textos de exemplo pelo seu @ e seus dados, mantendo as aspas e vírgulas. Salve e feche.' -ForegroundColor Yellow
		Start-Process notepad.exe $marca -Wait
		$txt = Get-Content $marca -Raw -Encoding UTF8
	}
	$jsonOk = $true
	try { $null = $txt | ConvertFrom-Json -ErrorAction Stop } catch { $jsonOk = $false }
	if (-not $jsonOk) { Nota 'marca.json' 'FALTA' 'o arquivo ficou inválido (aspas ou vírgula faltando): abra de novo e confira' }
	elseif ($txt -match 'seu_perfil') { Nota 'marca.json' 'AVISO' 'ainda com o @ de exemplo: preencha antes do primeiro vídeo' }
	else { Nota 'marca.json' 'OK' 'preenchido' }
} else {
	Nota 'marca.json' 'FALTA' 'arquivo não encontrado (repositório incompleto?)'
}

# 8. Conferência final ----------------------------------------------------------------------------------------------
Passo 'Conferência final'
if (Tem 'ffmpeg') {
	$filtros = (& ffmpeg -hide_banner -filters 2>$null) -join "`n"
	if ($filtros -match ' whisper ') { Nota 'ffmpeg: filtro whisper' 'OK' 'transcrição local' } else { Nota 'ffmpeg: filtro whisper' 'FALTA' 'este FFmpeg não é o build full do gyan.dev (veja docs\01-INSTALAR.md)' }
	if ($filtros -match ' arnndn ') { Nota 'ffmpeg: filtro arnndn' 'OK' 'redução de ruído' } else { Nota 'ffmpeg: filtro arnndn' 'FALTA' 'este FFmpeg não tem o arnndn' }
} else {
	Nota 'ffmpeg' 'FALTA' 'não instalado'
}
$dfn = Join-Path $RAIZ '00_SISTEMA\ferramentas\deepfilternet\deep-filter.exe'
$dv = ''
if (Test-Path $dfn) { $dv = [string](& $dfn --version 2>$null | Select-Object -First 1) }
if ($dv -match '0\.5\.6') { Nota 'deep-filter roda' 'OK' $dv.Trim() }
else { Nota 'deep-filter roda' 'FALTA' 'não abriu: veja "DeepFilterNet não roda" em docs\01-INSTALAR.md' }
if (Test-Path (Join-Path $env:WINDIR 'Fonts\arial.ttf')) { Nota 'Arial do sistema' 'OK' 'usada nas folhas de quadros' }
else { Nota 'Arial do sistema' 'FALTA' 'C:\Windows\Fonts\arial.ttf não existe' }

Write-Host ''
$resultado | Format-Table -AutoSize | Out-Host
$falhas = @($resultado | Where-Object { $_.Status -eq 'FALTA' }).Count
$avisos = @($resultado | Where-Object { $_.Status -eq 'AVISO' }).Count
if ($falhas -eq 0) {
	Write-Host "TUDO PRONTO ($avisos aviso(s) acima, nenhum impede o uso)." -ForegroundColor Green
	Write-Host 'Próximo passo: abra o Claude Code na pasta do repositório e digite /primeiros-passos' -ForegroundColor Green
} else {
	Write-Host "$falhas item(ns) FALTA acima. Corrija e rode o instalador de novo (docs\01-INSTALAR.md, Resolução de problemas)." -ForegroundColor Yellow
}
if (-not $SemPerguntas) { Read-Host 'Enter para fechar' | Out-Null }
exit $falhas
