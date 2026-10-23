@echo off
rem Duplo clique: instala o Framework de Edicao Dinamica nesta maquina (passo a passo em docs\01-INSTALAR.md).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0instalar.ps1" %*
