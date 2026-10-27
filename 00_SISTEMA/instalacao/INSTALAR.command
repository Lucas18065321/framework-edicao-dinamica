#!/bin/bash
# Duplo clique no Finder: instala o Framework de Edição Dinâmica no macOS (docs/01-INSTALAR-MAC.md).
cd "$(dirname "$0")" && bash ./instalar.sh "$@"
echo; read -n 1 -s -r -p "Pressione uma tecla para fechar..."
