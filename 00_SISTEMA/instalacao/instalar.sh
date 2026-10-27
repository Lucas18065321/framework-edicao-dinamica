#!/usr/bin/env bash
# Instalador do Framework de Edição Dinâmica para macOS (testado em Apple Silicon; Intel não testado). Equivalente do instalar.ps1.
# Pode rodar quantas vezes quiser: o que já está certo é pulado.
# Uso (na raiz do repositório):  bash 00_SISTEMA/instalacao/instalar.sh [--sem-opcionais] [--instalar-homebrew]
set -u
AQUI="$(cd -- "$(dirname "$0")" >/dev/null && pwd)"
RAIZ="$(cd -- "$AQUI/../.." >/dev/null && pwd)"
MOTOR="$RAIZ/00_SISTEMA/motor"
DEP="$AQUI/dependencias.json"; export DEP # caminhos vão por ambiente (process.env), nunca dentro do código do node -e
SEM_OPC=0; SIM_BREW=0
for a in "$@"; do
	case "$a" in
		--sem-opcionais) SEM_OPC=1;;
		--instalar-homebrew) SIM_BREW=1;;
		*) echo "Uso: bash instalar.sh [--sem-opcionais] [--instalar-homebrew]" >&2; exit 64;; # 64 = uso inválido (código 2 já é "2 itens FALTA")
	esac
done
RES=(); FALTAS=0

# Homebrew no PATH mesmo em shell sem profile (Apple Silicon e Intel)
for b in /usr/local/bin /opt/homebrew/bin; do [ -d "$b" ] && case ":$PATH:" in *":$b:"*) ;; *) PATH="$b:$PATH";; esac; done
export PATH

passo() { printf '\n\033[36m==> %s\033[0m\n' "$1"; }
nota() { # item status detalhe
	RES+=("$2|$1|$3")
	local cor=32; [ "$2" = AVISO ] && cor=33; [ "$2" = FALTA ] && { cor=31; FALTAS=$((FALTAS+1)); }
	printf '   \033[%sm[%s]\033[0m %s: %s\n' "$cor" "$2" "$1" "$3"
}
tem() { command -v "$1" >/dev/null 2>&1; }
sha() { # sem shasum nem sha256sum devolve vazio (o PASSO 4 confere isso antes de baixar)
	if tem shasum; then shasum -a 256 "$1" | cut -d' ' -f1; elif tem sha256sum; then sha256sum "$1" | cut -d' ' -f1; fi
}
num() { case "$1" in ''|*[!0-9]*) return 1;; esac; } # só dígitos (valores do JSON entram em aritmética)
indices() { [ "$1" -gt 0 ] && seq 0 $(($1-1)); } # 0..n-1 (nada se n=0)
tam() { wc -c < "$1" | tr -d ' '; }
dep() { node -e "const d=require(process.env.DEP);const v=($1);console.log(v===undefined||v===null?'':typeof v==='object'?JSON.stringify(v):v)"; }
baixar() { # url destino [sha256 esperado]. Baixa para destino.baixando e só move depois de conferir. Retorno: 1 falha de rede, 2 sha256 diferente (arquivo apagado)
	rm -f "$2.baixando"
	case "$1" in https://*) ;; *) return 1;; esac
	curl -L --proto '=https' --proto-redir '=https' --fail --silent --show-error --retry 3 --speed-limit 1024 --speed-time 60 -o "$2.baixando" --url "$1" || { rm -f "$2.baixando"; return 1; }
	if [ -n "${3:-}" ] && [ "$(sha "$2.baixando")" != "$3" ]; then rm -f "$2.baixando"; return 2; fi
	mv "$2.baixando" "$2"
}

BREW_CMD='/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
instalar_homebrew() { # só instala com consentimento: pergunta s/N num terminal, ou --instalar-homebrew. Retorno: 0 brew no PATH, 1 sem brew
	local r=""
	if [ $SIM_BREW = 0 ] && [ -t 0 ]; then
		read -r -p "Homebrew não encontrado. Instalar agora com o instalador oficial (https://brew.sh)? Ele pede a senha do Mac e as Xcode Command Line Tools [s/N] " r
		case "$r" in s|S|sim|SIM) SIM_BREW=2;; esac
	fi
	if [ $SIM_BREW = 0 ]; then
		nota brew FALTA "instale o Homebrew (https://brew.sh; ele pede as Xcode Command Line Tools) com o comando oficial: $BREW_CMD e rode este instalador de novo (ou use --instalar-homebrew)"
		return 1
	fi
	# com terminal o próprio instalador do Homebrew pede a senha; NONINTERACTIVE usa "sudo -n" e aborta sem NOPASSWD
	if [ -t 0 ]; then /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
	else NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"; fi
	eval "$(/opt/homebrew/bin/brew shellenv 2>/dev/null || /usr/local/bin/brew shellenv 2>/dev/null)"
	if ! tem brew; then nota brew FALTA "o instalador do Homebrew não terminou (sem internet, sem senha de administrador ou cancelado): rode este instalador de novo"; return 1; fi
	nota brew OK "Homebrew instalado"
	local bp=/opt/homebrew; [ "$(uname -m)" = arm64 ] || bp=/usr/local
	echo "   Para o brew valer em todo Terminal novo, rode estas 2 linhas (o instalador não faz isso por você):"
	echo "     echo 'eval \"\$($bp/bin/brew shellenv)\"' >> ~/.zprofile"
	echo "     eval \"\$($bp/bin/brew shellenv)\""
}

echo "Framework de Edição Dinâmica: $RAIZ"
[ "$(uname -s)" = Darwin ] || echo "   Atenção: este instalador foi feito para macOS; no Linux veja docs/07-LINUX.md."
case "$RAIZ" in *"/Library/Mobile Documents/"*|*"/Library/CloudStorage/"*|*"/Dropbox/"*|*"/Google Drive/"*|*"/OneDrive"*) echo "   Atenção: pasta sincronizada na nuvem; o render trava arquivos. Prefira ~/Projetos.";; esac

# 1. Programas (Homebrew) -------------------------------------------------------------------------------------------
passo "Programas (Homebrew): Node.js 24, FFmpeg, Git e yt-dlp"
if ! tem brew; then instalar_homebrew; fi
if tem brew; then
	# sem node não dá para ler o dependencias.json: instala o node primeiro (única fórmula fixa aqui)
	if ! tem node; then echo "   instalando node@24..."; brew install node@24
		brew link --force node@24 || echo "   brew link falhou para node@24"
		if ! tem node; then
			PATH="$(brew --prefix node@24)/bin:$PATH"; export PATH
			tem node && nota node AVISO "o node@24 do Homebrew não está no PATH do seu Terminal (usado só nesta execução); rode: brew link --force node@24"
		fi
	fi
fi
# sem dependencias.json legível não há o que conferir: para aqui
if tem node && ! node -e 'require(process.env.DEP)' >/dev/null 2>&1; then
	nota dependencias.json FALTA "ilegível ou inválido ($DEP): restaure o arquivo do repositório"
	printf '%s\n' "${RES[@]}" | awk -F'|' '{printf "%-6s %-34s %s\n",$1,$2,$3}'; exit $FALTAS
fi
NB=0; if tem node; then NB=$(dep "d.brew.length" 2>/dev/null); num "$NB" || NB=0; fi
if tem brew; then
	# se o comando já existe (ex.: node pelo fnm/nvm), não reinstala
	for i in $(indices $NB); do
		cmd=$(dep "d.brew[$i].comando"); [ -z "$cmd" ] && continue
		opc=$(dep "d.brew[$i].opcional"); [ "$opc" = true ] && [ $SEM_OPC = 1 ] && continue
		if ! tem "$cmd"; then
			f=$(dep "d.brew[$i].formula")
			case "$f" in ''|*/*|-*) nota "$cmd" FALTA "fórmula inválida no dependencias.json ('$f'; tap de terceiros não é aceito)"; continue;; esac
			echo "   instalando $f..."; brew install "$f"
		fi
	done
fi
if ! tem node; then nota node FALTA "Node.js não está instalado: sem ele o instalador não lê as versões e pula os passos 2 a 7"; fi
for i in $(indices $NB); do
	cmd=$(dep "d.brew[$i].comando"); [ -z "$cmd" ] && continue
	opc=$(dep "d.brew[$i].opcional"); [ "$opc" = true ] && [ $SEM_OPC = 1 ] && continue
	conf=$(dep "d.brew[$i].conferir"); nt=$(dep "d.brew[$i].nota")
	if tem "$cmd"; then
		if [ "$cmd" = ffmpeg ]; then v=$(ffmpeg -hide_banner -version 2>/dev/null | head -1); else v=$("$cmd" --version 2>/dev/null | head -1); fi
		if [ -z "$v" ]; then
			m="$cmd não funciona"; [ "$cmd" = git ] && m="git não funciona; instale as Xcode Command Line Tools: xcode-select --install"
			nota "$cmd" FALTA "$m"; continue
		fi
		case "$v" in *"$conf"*) nota "$cmd" OK "$v";; *) nota "$cmd" AVISO "versão diferente da testada: $v";; esac
	else
		[ "$opc" = true ] && nota "$cmd" AVISO "não instalado ($nt)" || nota "$cmd" FALTA "não instalado ($nt)"
	fi
done

# 2. Pastas vazias que o Git não guarda -----------------------------------------------------------------------------
if tem node; then while IFS= read -r d; do
	case "$d" in ''|/*|*..*) nota "pasta '$d'" FALTA "destino inválido no dependencias.json"; continue;; esac
	mkdir -p "$RAIZ/$d"
done < <(node -e "console.log(require(process.env.DEP).pastas_vazias.join('\n'))" 2>/dev/null); fi

# 3. Pacotes do motor e navegador do Remotion -----------------------------------------------------------------------
passo "Pacotes do motor (npm ci, versões travadas no package-lock.json) e navegador do Remotion"
if tem node && tem npm; then
	cd "$MOTOR" || exit 1
	npm ls --depth=0 >/dev/null 2>&1 || npm ci --no-audit --no-fund # refaz npm ci interrompido
	rv=""
	if [ -f node_modules/remotion/package.json ]; then
		node node_modules/@remotion/cli/remotion-cli.js browser ensure || nota "navegador do Remotion" FALTA "não baixou (internet?): rode de novo"
		rv=$(node -e "console.log(require('remotion/package.json').version)" 2>/dev/null)
	fi
	esperada=$(dep "d.remotion")
	[ "$rv" = "$esperada" ] && nota remotion OK "versão $rv" || nota remotion FALTA "versão '$rv' (esperada $esperada): apague 00_SISTEMA/motor/node_modules e rode de novo"
	arq=$(uname -m); [ "$arq" = arm64 ] && pk=compositor-darwin-arm64 || pk=compositor-darwin-x64
	# as .dylib do compositor são achadas pela pasta atual: o binário só abre com cwd = pasta dele (o Remotion faz o mesmo)
	if [ -x "node_modules/@remotion/$pk/ffmpeg" ] && (cd "node_modules/@remotion/$pk" && ./ffmpeg -version >/dev/null 2>&1); then nota "compositor Remotion" OK "$pk roda"
	else nota "compositor Remotion" FALTA "$pk não roda (npm ci incompleto?)"; fi
else
	nota "pacotes do motor" FALTA "Node.js não está instalado (passo 1)"
fi

# 4. Modelos e ferramentas baixados ---------------------------------------------------------------------------------
passo "Modelos do Whisper, DeepFilterNet e modelos de ruído"
if ! tem node; then nota "modelos e DeepFilterNet" FALTA "sem Node.js não leio a lista de downloads (passo 1)"
elif [ -z "$(sha "$DEP")" ]; then nota "modelos e DeepFilterNet" FALTA "sem shasum/sha256sum: não consigo conferir downloads; nada foi baixado"
else
n=$(node -e "console.log(require(process.env.DEP).downloads.length)" 2>/dev/null); num "$n" || n=0
for i in $(indices $n); do
	dest=$(dep "d.downloads[$i].destino")
	case "$dest" in ''|/*|*..*) nota "download $i" FALTA "destino inválido no dependencias.json ('$dest')"; continue;; esac
	case "$dest" in *deep-filter.exe) continue;; esac # binário do Windows: o do macOS vem abaixo
	opc=$(dep "d.downloads[$i].opcional"); [ "$opc" = true ] && [ $SEM_OPC = 1 ] && continue
	url=$(dep "d.downloads[$i].url"); bytes=$(dep "d.downloads[$i].bytes"); esp=$(dep "d.downloads[$i].sha256")
	nome0=$(basename "$dest")
	case "$url" in https://*) ;; *) nota "$nome0" FALTA "url inválida no dependencias.json (só https://)"; continue;; esac
	num "$bytes" || { nota "$nome0" FALTA "bytes inválido no dependencias.json"; continue; }
	alvo="$RAIZ/$dest"; nome=$(basename "$alvo"); mkdir -p "$(dirname "$alvo")"
	certo() { [ -f "$alvo" ] || return 1; if [ -n "$esp" ]; then [ "$(sha "$alvo")" = "$esp" ]; else [ "$(tam "$alvo")" = "$bytes" ]; fi; }
	rc=0
	certo || { echo "   baixando $nome ($((bytes/1048576)) MB)"; baixar "$url" "$alvo" "$esp"; rc=$?; }
	if [ $rc = 2 ]; then nota "$nome" FALTA "sha256 DIFERENTE do esperado: arquivo baixado foi apagado; rode de novo"; continue; fi
	if [ $rc = 1 ]; then [ "$opc" = true ] && s=AVISO || s=FALTA; nota "$nome" $s "não baixou (sem internet?): rode de novo"; continue; fi
	if [ ! -f "$alvo" ]; then [ "$opc" = true ] && s=AVISO || s=FALTA; nota "$nome" $s "não baixou (sem internet?): rode de novo"; continue; fi
	if [ -n "$esp" ]; then
		[ "$(sha "$alvo")" = "$esp" ] && nota "$nome" OK "sha256 confere" || nota "$nome" FALTA "sha256 DIFERENTE: apague o arquivo e rode de novo"
	else
		[ "$(tam "$alvo")" = "$bytes" ] && nota "$nome" AVISO "tamanho confere; sha256 não publicado (não conferido)" || nota "$nome" AVISO "tamanho diferente do esperado: apague e rode de novo"
	fi
done
# DeepFilterNet para o Mac
plat="$(uname -s | tr A-Z a-z)-$(uname -m | sed 's/aarch64/arm64/;s/x86_64/x64/')"
durl=$(dep "d.deepfilternet_unix?.['$plat']?.url")
DFN="$RAIZ/00_SISTEMA/ferramentas/deepfilternet/deep-filter"
if [ -z "$durl" ]; then nota deep-filter AVISO "sem binário para $plat (o estúdio de áudio usa o afftdn do FFmpeg)"
elif [ -z "$(dep "d.deepfilternet_unix?.['$plat']?.sha256")" ]; then nota deep-filter AVISO "sem sha256 publicado para $plat: binário não executado (o estúdio de áudio usa o afftdn do FFmpeg)"
else
	dbytes=$(dep "d.deepfilternet_unix['$plat'].bytes"); desp=$(dep "d.deepfilternet_unix['$plat'].sha256")
	case "$durl" in https://*) ;; *) dbytes=x;; esac
	if ! num "$dbytes"; then nota deep-filter FALTA "url ou bytes inválidos no dependencias.json"; else
	mkdir -p "$(dirname "$DFN")"; rc=0
	if [ ! -f "$DFN" ] || [ "$(sha "$DFN")" != "$desp" ]; then
		rm -f "$DFN"; echo "   baixando deep-filter ($((dbytes/1048576)) MB)"; baixar "$durl" "$DFN" "$desp"; rc=$?
	fi
	if [ $rc = 1 ]; then nota deep-filter FALTA "não baixou (sem internet?): rode de novo"
	elif [ $rc = 2 ]; then nota deep-filter FALTA "sha256 DIFERENTE do esperado: binário baixado foi apagado e não executado; rode de novo"
	elif [ -f "$DFN" ]; then
		# aqui o sha256 já foi conferido: só agora torna executável e tira a quarentena
		chmod +x "$DFN"; xattr -d com.apple.quarantine "$DFN" 2>/dev/null
		if "$DFN" --version 2>/dev/null | grep -q '0\.5\.6'; then nota "deep-filter roda" OK "sha256 confere; $("$DFN" --version 2>/dev/null | head -1)"
		else nota "deep-filter roda" FALTA "não abriu (veja docs/01-INSTALAR-MAC.md)"; fi
	else nota deep-filter FALTA "não baixou: rode de novo"; fi
	fi
fi
fi

# 5. Efeitos sonoros ------------------------------------------------------------------------------------------------
passo "Efeitos sonoros básicos (gerados por código)"
SFX="$RAIZ/02_BIBLIOTECA/sfx"
lista=""; tem node && lista=$(node -e "console.log(require(process.env.DEP).sfx_sintetizados.join(' '))")
faltam() { local f=""; for s in $lista; do [ -f "$SFX/$s.wav" ] || f="$f $s"; done; echo "$f"; }
if [ -n "$(faltam)" ] && tem node; then (cd "$MOTOR" && node scripts/synth-sfx.mjs "$SFX" >/dev/null); fi
fs="$(faltam)"
if ! tem node; then nota "SFX básicos" FALTA "sem Node.js não gero os efeitos (passo 1)"
elif [ -z "$fs" ]; then
	nota "SFX básicos" OK "$(echo $lista | wc -w | tr -d ' ') efeitos em 02_BIBLIOTECA/sfx"
	if tem ffmpeg; then
		saida=$(cd "$MOTOR" && node scripts/sfx-substitutos.mjs 2>&1); cod=$?
		if [ $cod -ne 0 ]; then nota "SFX de terceiros" FALTA "substitutos não criados: $saida"
		elif echo "$saida" | grep -q 'nada a fazer'; then nota "SFX de terceiros" OK "todos os sons chamados pelo nome existem"
		else nota "SFX de terceiros" AVISO "criados substitutos sintetizados (motionix e 05_LAB/sfx); para sons melhores veja 02_BIBLIOTECA/sfx/README.md"; fi
	fi
else nota "SFX básicos" FALTA "faltam:$fs"; fi

# 6. Chaves de API (.env) -------------------------------------------------------------------------------------------
passo "Chaves de API (.env, todas opcionais)"
[ -f "$MOTOR/.env" ] || (umask 077; cp "$MOTOR/.env.example" "$MOTOR/.env") # chaves de API: só o dono lê
chaves=$(grep -cE '^[[:space:]]*(GEMINI|PEXELS|PIXABAY)_API_KEY[[:space:]]*=[[:space:]]*("[^"[:space:]]|'"'"'[^'"'"'[:space:]]|[^[:space:]"'"'"'])' "$MOTOR/.env")
[ "$chaves" -ge 1 ] && nota .env OK "$chaves de 3 chaves preenchidas" || nota .env AVISO "nenhuma chave (opcional). Abrir: open -e 00_SISTEMA/motor/.env"

# 7. Marca ----------------------------------------------------------------------------------------------------------
passo "Sua marca (02_BIBLIOTECA/kit/marca/marca.json)"
M="$RAIZ/02_BIBLIOTECA/kit/marca/marca.json"
if ! tem node; then nota marca.json FALTA "sem Node.js não valido o arquivo (passo 1)"
elif [ -f "$M" ]; then
	if ! M="$M" node -e "JSON.parse(require('fs').readFileSync(process.env.M,'utf8'))" 2>/dev/null; then nota marca.json FALTA "arquivo inválido (aspas ou vírgula faltando)"
	elif grep -q seu_perfil "$M"; then nota marca.json AVISO "ainda com o @ de exemplo: preencha antes do primeiro vídeo"
	else nota marca.json OK preenchido; fi
else nota marca.json FALTA "arquivo não encontrado"; fi

# 8. Conferência final ----------------------------------------------------------------------------------------------
passo "Conferência final"
if tem ffmpeg; then
	f=$(ffmpeg -hide_banner -filters 2>/dev/null)
	for fl in whisper arnndn ebur128 drawtext adynamicequalizer firequalizer; do
		echo "$f" | grep -qE " $fl " && nota "ffmpeg: filtro $fl" OK presente || nota "ffmpeg: filtro $fl" FALTA "este FFmpeg não tem o filtro (brew reinstall ffmpeg)"
	done
fi
# mesma lista de candidatas do scripts/lib/fonte.mjs (darwin)
if [ -f /System/Library/Fonts/Supplemental/Arial.ttf ] || [ -f /Library/Fonts/Arial.ttf ]; then nota "Arial do sistema" OK "usada nas folhas de quadros"
elif [ -f /System/Library/Fonts/Helvetica.ttc ]; then nota "Arial do sistema" AVISO "sem Arial; as folhas de quadros usam a Helvetica"
else nota "Arial do sistema" FALTA "nem Arial nem Helvetica (/System/Library/Fonts/Supplemental/Arial.ttf)"; fi

echo; printf '%s\n' "${RES[@]}" | awk -F'|' '{printf "%-6s %-34s %s\n",$1,$2,$3}'
if [ $FALTAS -eq 0 ]; then printf '\n\033[32mTUDO PRONTO. Próximo passo: abra o Claude Code na pasta do repositório.\033[0m\n'
else printf '\n\033[33m%s item(ns) FALTA acima. Corrija e rode de novo (docs/01-INSTALAR-MAC.md).\033[0m\n' "$FALTAS"; fi
exit $FALTAS
