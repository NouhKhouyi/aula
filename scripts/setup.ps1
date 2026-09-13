#Requires -Version 5.1
<#
.SYNOPSIS
    Sets up the aula study vault on Windows.

.DESCRIPTION
    Checks prerequisites, installs the upstream teaching system into .pi/, and
    prints what to do next. Safe to re-run: nothing is overwritten without
    asking.

.PARAMETER SkipTeachingSystem
    Do not clone the upstream teaching system. Use this if you only want the
    vault and the AGENTS.md instruction layer (enough for Claude Code, Codex
    and anything else that reads AGENTS.md).

.EXAMPLE
    .\scripts\setup.ps1

.EXAMPLE
    .\scripts\setup.ps1 -SkipTeachingSystem
#>
[CmdletBinding()]
param(
    [switch]$SkipTeachingSystem
)

$ErrorActionPreference = 'Stop'

$VaultRoot   = Split-Path -Parent $PSScriptRoot
$UpstreamUrl = 'https://github.com/amosblomqvist/learn'
$PiDir       = Join-Path $VaultRoot '.pi'

function Write-Step { param([string]$Text) Write-Host "`n==> $Text" -ForegroundColor Cyan }
function Write-Ok   { param([string]$Text) Write-Host "    [ok]   $Text" -ForegroundColor Green }
function Write-Warn { param([string]$Text) Write-Host "    [warn] $Text" -ForegroundColor Yellow }
function Write-Info { param([string]$Text) Write-Host "    $Text" -ForegroundColor DarkGray }

function Test-Command {
    param([string]$Name)
    $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

Write-Host ''
Write-Host '  aula - study vault setup' -ForegroundColor White
Write-Host "  $VaultRoot" -ForegroundColor DarkGray

# ---------------------------------------------------------------- prerequisites
Write-Step 'Checking prerequisites'

if (-not (Test-Command 'git')) {
    throw 'git is required and was not found on PATH. Install Git for Windows: https://git-scm.com/download/win'
}
Write-Ok "git   $((git --version) -replace '^git version ', '')"

if (Test-Command 'pdftotext') {
    Write-Ok 'pdftotext found - PDFs in Material/ can be converted to text'
} else {
    Write-Warn 'pdftotext not found. You will need it to feed PDFs to the tutor.'
    Write-Info 'It ships with Git for Windows; add its mingw64\bin to PATH, or'
    Write-Info 'install poppler: winget install --id oschwartz10612.Poppler'
}

if (Test-Command 'pi') {
    Write-Ok "pi    $((pi --version 2>$null) -join ' ')"
    $HasPi = $true
} else {
    Write-Info 'pi not found (optional - only needed for the reference path)'
    $HasPi = $false
}

# ------------------------------------------------------------ teaching system
if ($SkipTeachingSystem) {
    Write-Step 'Skipping the teaching system (-SkipTeachingSystem)'
    Write-Info 'AGENTS.md alone carries the full pedagogy. That is enough for'
    Write-Info 'Claude Code, Codex, Cursor and anything else reading AGENTS.md.'
} elseif (Test-Path $PiDir) {
    Write-Step 'Teaching system already installed at .pi/'
    Write-Info 'Update it with:  git -C .pi pull'
} else {
    Write-Step 'Installing the teaching system into .pi/'
    Write-Info "Source: $UpstreamUrl"
    Write-Warn 'That repository carries NO license: all rights reserved by its'
    Write-Warn 'author. aula clones it, never redistributes it. Do not commit it.'

    $answer = Read-Host '    Clone it now? [Y/n]'
    if ($answer -eq '' -or $answer -match '^[Yy]') {
        git clone --depth 1 $UpstreamUrl $PiDir
        if ($LASTEXITCODE -ne 0) { throw 'Clone failed.' }

        # Keep local settings out of the upstream clone's git status.
        $exclude = Join-Path $PiDir '.git\info\exclude'
        if (Test-Path $exclude) {
            Add-Content -Path $exclude -Value 'settings.json' -Encoding utf8
        }
        Write-Ok 'Cloned into .pi/ (settings.json excluded locally)'
    } else {
        Write-Info 'Skipped.'
    }
}

# ------------------------------------------------------------------ vault dirs
Write-Step 'Checking vault folders'
foreach ($dir in 'Lessons', 'Material', 'Templates', 'viz') {
    $path = Join-Path $VaultRoot $dir
    if (-not (Test-Path $path)) {
        New-Item -ItemType Directory -Path $path -Force | Out-Null
        Write-Ok "created $dir/"
    } else {
        Write-Ok "$dir/"
    }
}

# ----------------------------------------------------------------- next steps
Write-Step 'Next steps'
Write-Host ''
Write-Host '    1. Open Obsidian -> "Open folder as vault" -> pick this folder:' -ForegroundColor White
Write-Host "       $VaultRoot" -ForegroundColor DarkGray
Write-Host ''
Write-Host '    2. Drop your syllabus, notes or converted PDFs into Material/' -ForegroundColor White
Write-Host ''
Write-Host '    3. Create an EMPTY note at Lessons/<Topic>.md' -ForegroundColor White
Write-Host ''

if ($HasPi) {
    Write-Host '    4. Run "pi" in this folder, then FIRST of all:' -ForegroundColor White
    Write-Host '           /md-log Lessons/<Topic>.md' -ForegroundColor DarkGray
    Write-Host '       and only then say what you want to study.' -ForegroundColor White
} else {
    Write-Host '    4. Start your agent in this folder and say what you want to study.' -ForegroundColor White
    Write-Host '       It reads AGENTS.md automatically.' -ForegroundColor DarkGray
}

Write-Host ''
Write-Host '    Read docs\guide.md for the full walkthrough.' -ForegroundColor DarkGray
Write-Host ''
