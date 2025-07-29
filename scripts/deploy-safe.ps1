# Deploy Seguro para Produção - Windows PowerShell
# Este script garante que dados não sejam perdidos durante o deploy

param(
    [switch]$Force = $false
)

Write-Host "🚀 Iniciando deploy seguro para produção..." -ForegroundColor Green

# Verificar se estamos em produção
$env:NODE_ENV = if ($env:NODE_ENV) { $env:NODE_ENV } else { "development" }

if ($env:NODE_ENV -ne "production" -and -not $Force) {
    Write-Host "❌ Este script deve ser executado apenas em produção (NODE_ENV=production)" -ForegroundColor Red
    Write-Host "   Use -Force para ignorar esta verificação em desenvolvimento" -ForegroundColor Yellow
    exit 1
}

# Definir caminhos
$dataDir = if ($env:DATA_PATH) { $env:DATA_PATH } else { ".\data" }
$configDir = if ($env:CONFIG_PATH) { $env:CONFIG_PATH } else { ".\config" }
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = ".\backup-$timestamp"

Write-Host "📁 Criando backup pré-deploy..." -ForegroundColor Yellow

# Criar diretório de backup
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

# Fazer backup dos dados críticos
if (Test-Path $dataDir) {
    Write-Host "💾 Fazendo backup de dados..." -ForegroundColor Cyan
    Copy-Item -Path $dataDir -Destination "$backupDir\data" -Recurse -Force
}

if (Test-Path $configDir) {
    Write-Host "💾 Fazendo backup de configurações..." -ForegroundColor Cyan
    Copy-Item -Path $configDir -Destination "$backupDir\config" -Recurse -Force
}

# Criar arquivo de informações do backup
$backupInfo = @{
    timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    type = "pre-deploy-backup"
    environment = $env:NODE_ENV
    warning = "NÃO EXCLUIR - Backup automático pré-deploy"
} | ConvertTo-Json -Depth 2

$backupInfo | Out-File -FilePath "$backupDir\backup-info.json" -Encoding UTF8

Write-Host "✅ Backup pré-deploy criado em: $backupDir" -ForegroundColor Green

# Verificar se os diretórios de dados existem
Write-Host "🔍 Verificando estrutura de dados..." -ForegroundColor Yellow

New-Item -ItemType Directory -Force -Path $dataDir | Out-Null
New-Item -ItemType Directory -Force -Path $configDir | Out-Null

# Inicializar arquivos vazios se não existirem
$filesToCreate = @{
    "$dataDir\tournaments.json" = "[]"
    "$dataDir\registrations.json" = "[]"
    "$dataDir\players.json" = "[]"
    "$dataDir\payment-status.json" = "{}"
}

foreach ($file in $filesToCreate.Keys) {
    if (-not (Test-Path $file)) {
        $filesToCreate[$file] | Out-File -FilePath $file -Encoding UTF8
        Write-Host "📝 Arquivo $(Split-Path $file -Leaf) criado" -ForegroundColor Cyan
    }
}

# Verificar configuração de usuários
if (-not (Test-Path "$configDir\users.json")) {
    Write-Host "⚠️  Arquivo users.json não existe. Será criado na primeira execução." -ForegroundColor Yellow
}

Write-Host "🔒 Estrutura de arquivos verificada" -ForegroundColor Green

# Limpar backups antigos (manter últimos 10)
Write-Host "🧹 Limpando backups antigos..." -ForegroundColor Yellow

$backupFolders = Get-ChildItem -Path "." -Directory -Name "backup-*" | Sort-Object Name
if ($backupFolders.Count -gt 10) {
    $toRemove = $backupFolders[0..($backupFolders.Count - 11)]
    foreach ($folder in $toRemove) {
        Remove-Item -Path ".\$folder" -Recurse -Force -ErrorAction SilentlyContinue
    }
    Write-Host "   Removidos $($toRemove.Count) backups antigos" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "✅ Deploy seguro concluído!" -ForegroundColor Green
Write-Host "📊 Estrutura preparada para inicialização da aplicação" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Resumo:" -ForegroundColor White
Write-Host "   • Backup criado em: $backupDir" -ForegroundColor Cyan
Write-Host "   • Dados preservados: $(if (Test-Path $dataDir) { '✅' } else { '❌' })" -ForegroundColor Cyan
Write-Host "   • Configurações preservadas: $(if (Test-Path $configDir) { '✅' } else { '❌' })" -ForegroundColor Cyan
Write-Host "   • Estrutura verificada: ✅" -ForegroundColor Cyan
Write-Host ""
Write-Host "🚀 A aplicação pode ser iniciada com segurança!" -ForegroundColor Green
