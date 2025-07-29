const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('./config');
const BackupManager = require('./backup-manager');
require('dotenv').config();

const app = express();
const PORT = config.port;
const DATA_FILE = path.join(__dirname, config.dataPath, 'tournaments.json');
const REGISTRATIONS_FILE = path.join(__dirname, config.dataPath, 'registrations.json');

// Initialize Backup Manager
const backupManager = new BackupManager();
const PLAYERS_FILE = path.join(__dirname, config.dataPath, 'players.json');
const USERS_FILE = path.join(__dirname, config.configPath, 'users.json');

// Load user configuration
let userConfig = {};
try {
    userConfig = JSON.parse(fsSync.readFileSync(USERS_FILE, 'utf8'));
    console.log('✅ Configuração de usuários carregada com sucesso');
    console.log('👥 Usuários cadastrados:', Object.keys(userConfig).length);
    console.log('📋 Usuários:', Object.keys(userConfig).join(', '));
} catch (error) {
    console.error('❌ Erro ao carregar configuração de usuários:', error.message);
    console.log('💡 Execute: npm run init para criar o arquivo de usuários');
    console.log('📁 Caminho do arquivo:', USERS_FILE);
}

// Authentication configuration from environment variables
const AUTH_CONFIG = {
    jwtSecret: config.jwtSecret,
    sessionTimeout: process.env.SESSION_TIMEOUT || '24h',
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5
};

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Health check endpoint (deve vir antes dos middlewares de auth)
app.get('/api/health', (req, res) => {
    const checks = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.environment,
        version: require('./package.json').version,
        files: {
            users: fsSync.existsSync(USERS_FILE),
            tournaments: fsSync.existsSync(DATA_FILE),
            registrations: fsSync.existsSync(REGISTRATIONS_FILE),
            players: fsSync.existsSync(PLAYERS_FILE)
        },
        userCount: Object.keys(userConfig).length
    };
    
    // Verificar se todos os arquivos essenciais existem
    const allFilesExist = Object.values(checks.files).every(exists => exists);
    if (!allFilesExist) {
        checks.status = 'warning';
    }
    
    res.status(200).json(checks);
});

// Authentication middleware
function requireAuth(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    console.log('🔍 Middleware requireAuth chamado para:', req.path);
    console.log('📋 Headers authorization:', req.headers.authorization ? 'Presente' : 'Ausente');
    
    if (!token) {
        console.log('❌ Token não fornecido');
        return res.status(401).json({ error: 'Token de acesso requerido' });
    }

    try {
        // JWT token validation
        console.log('🔐 Verificando token JWT...');
        const decoded = jwt.verify(token, AUTH_CONFIG.jwtSecret);
        console.log('✅ Token decodificado para usuário:', decoded.username);
        
        // Check if user exists and is active
        const user = userConfig[decoded.username];
        if (!user) {
            console.log('❌ Usuário não encontrado na configuração:', decoded.username);
            console.log('📋 Usuários disponíveis:', Object.keys(userConfig));
            return res.status(401).json({ error: 'Usuário inválido ou inativo' });
        }
        
        if (!user.active) {
            console.log('❌ Usuário inativo:', decoded.username);
            return res.status(401).json({ error: 'Usuário inválido ou inativo' });
        }
        
        console.log('✅ Usuário autenticado com sucesso:', decoded.username, 'Role:', user.role);
        
        req.user = { 
            username: decoded.username, 
            role: user.role 
        };
        next();
    } catch (error) {
        console.log('❌ Erro na verificação do token:', error.name, error.message);
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expirado. Faça login novamente.' });
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Token inválido' });
        } else {
            return res.status(401).json({ error: 'Erro de autenticação' });
        }
    }
}

// Ensure data directory exists
async function ensureDataDirectory() {
    try {
        await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
        
        // Initialize files if they don't exist
        try {
            await fs.access(DATA_FILE);
        } catch {
            await fs.writeFile(DATA_FILE, JSON.stringify([]));
        }
        
        try {
            await fs.access(REGISTRATIONS_FILE);
        } catch {
            await fs.writeFile(REGISTRATIONS_FILE, JSON.stringify([]));
        }
    } catch (error) {
        console.error('Error creating data directory:', error);
    }
}

// Helper functions
async function readTournaments() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading tournaments:', error);
        return [];
    }
}

async function writeTournaments(tournaments) {
    try {
        await fs.writeFile(DATA_FILE, JSON.stringify(tournaments, null, 2));
    } catch (error) {
        console.error('Error writing tournaments:', error);
    }
}

async function readRegistrations() {
    try {
        const data = await fs.readFile(REGISTRATIONS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading registrations:', error);
        return [];
    }
}

async function writeRegistrations(registrations) {
    try {
        await fs.writeFile(REGISTRATIONS_FILE, JSON.stringify(registrations, null, 2));
    } catch (error) {
        console.error('Error writing registrations:', error);
    }
}

// Players database functions
async function readPlayers() {
    try {
        const data = await fs.readFile(PLAYERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading players:', error);
        return [];
    }
}

// Global player registration calculation functions
async function getPlayerTotalRegistrations(cpf) {
    /**
     * Calcula o total de categorias/inscrições de um jogador em TODOS os campeonatos
     * @param {string} cpf - CPF do jogador (sem formatação)
     * @returns {number} Total de inscrições do jogador
     */
    const normalizedCpf = cpf.replace(/\D/g, '');
    const allRegistrations = await readRegistrations();
    
    // Busca todas as inscrições onde o CPF aparece como player1 ou partner
    const playerRegistrations = allRegistrations.filter(reg => 
        reg.player1.cpf === normalizedCpf || 
        (reg.partner && reg.partner.cpf === normalizedCpf)
    );
    
    return playerRegistrations.length;
}

async function calculatePlayerPrice(cpf, basePrice, additionalPrice, newCategoriesCount = 1) {
    /**
     * Calcula o preço total para um jogador baseado em suas inscrições globais
     * @param {string} cpf - CPF do jogador
     * @param {number} basePrice - Preço base para a primeira categoria
     * @param {number} additionalPrice - Preço para categorias adicionais
     * @param {number} newCategoriesCount - Número de novas categorias sendo inscritas
     * @returns {Object} { totalExistingRegistrations, newRegistrationsPrice, totalPrice }
     */
    const existingRegistrations = await getPlayerTotalRegistrations(cpf);
    
    let newRegistrationsPrice = 0;
    
    for (let i = 0; i < newCategoriesCount; i++) {
        const currentRegistrationIndex = existingRegistrations + i;
        
        if (currentRegistrationIndex === 0) {
            // Primeira inscrição do jogador em qualquer campeonato
            newRegistrationsPrice += basePrice;
        } else {
            // Inscrições adicionais
            newRegistrationsPrice += additionalPrice;
        }
    }
    
    return {
        totalExistingRegistrations: existingRegistrations,
        newRegistrationsPrice: newRegistrationsPrice,
        totalPrice: newRegistrationsPrice
    };
}

async function writePlayers(players) {
    try {
        await fs.writeFile(PLAYERS_FILE, JSON.stringify(players, null, 2));
    } catch (error) {
        console.error('Error writing players:', error);
    }
}

async function updatePlayerDatabase(tournamentId, registration) {
    const players = await readPlayers();
    
    // Update main player
    const mainPlayerIndex = players.findIndex(p => p.cpf === registration.player1.cpf);
    if (mainPlayerIndex >= 0) {
        // Update existing player
        const existingPlayer = players[mainPlayerIndex];
        existingPlayer.name = registration.player1.name;
        existingPlayer.email = registration.player1.email;
        existingPlayer.phone = registration.player1.phone;
        existingPlayer.lastUpdate = new Date().toISOString();
        
        // Find existing tournament entry
        const tournamentIndex = existingPlayer.tournaments.findIndex(t => t.tournamentId === tournamentId);
        if (tournamentIndex >= 0) {
            // Add this category to existing tournament entry
            const existingCategories = existingPlayer.tournaments[tournamentIndex].categories || [];
            if (!existingCategories.includes(registration.category)) {
                existingCategories.push(registration.category);
                existingPlayer.tournaments[tournamentIndex].categories = existingCategories;
            }
            existingPlayer.tournaments[tournamentIndex].registrationDate = registration.registeredAt;
        } else {
            // Add new tournament entry
            existingPlayer.tournaments.push({
                tournamentId,
                categories: [registration.category],
                registrationDate: registration.registeredAt
            });
        }
    } else {
        // Add new player
        players.push({
            cpf: registration.player1.cpf,
            name: registration.player1.name,
            email: registration.player1.email,
            phone: registration.player1.phone,
            createdAt: new Date().toISOString(),
            lastUpdate: new Date().toISOString(),
            tournaments: [{
                tournamentId,
                categories: [registration.category],
                registrationDate: registration.registeredAt
            }]
        });
    }
    
    // Update partner if exists
    if (registration.partner) {
        const partnerIndex = players.findIndex(p => p.cpf === registration.partner.cpf);
        if (partnerIndex >= 0) {
            // Update existing partner
            const existingPartner = players[partnerIndex];
            existingPartner.name = registration.partner.name;
            existingPartner.email = registration.partner.email;
            existingPartner.phone = registration.partner.phone;
            existingPartner.lastUpdate = new Date().toISOString();
            
            // Find existing tournament entry
            const tournamentIndex = existingPartner.tournaments.findIndex(t => t.tournamentId === tournamentId);
            if (tournamentIndex >= 0) {
                // Add this category to existing tournament entry
                const existingCategories = existingPartner.tournaments[tournamentIndex].categories || [];
                if (!existingCategories.includes(registration.category)) {
                    existingCategories.push(registration.category);
                    existingPartner.tournaments[tournamentIndex].categories = existingCategories;
                }
                existingPartner.tournaments[tournamentIndex].registrationDate = registration.registeredAt;
            } else {
                // Add new tournament entry
                existingPartner.tournaments.push({
                    tournamentId,
                    categories: [registration.category],
                    registrationDate: registration.registeredAt
                });
            }
        } else {
            // Add new partner
            players.push({
                cpf: registration.partner.cpf,
                name: registration.partner.name,
                email: registration.partner.email,
                phone: registration.partner.phone,
                createdAt: new Date().toISOString(),
                lastUpdate: new Date().toISOString(),
                tournaments: [{
                    tournamentId,
                    categories: [registration.category],
                    registrationDate: registration.registeredAt
                }]
            });
        }
    }
    
    await writePlayers(players);
}

// Webhook notification
async function sendWebhookNotification(tournament, registrations) {
    if (!tournament.webhook) return;
    
    try {
        // If it's a single registration (for backwards compatibility), convert to array
        const registrationArray = Array.isArray(registrations) ? registrations : [registrations];
        
        for (const registration of registrationArray) {
            const payload = {
                event: 'registration_completed',
                tournament: {
                    id: tournament.id,
                    name: tournament.name,
                    startDate: tournament.startDate,
                    endDate: tournament.endDate,
                    location: tournament.location
                },
                registration: {
                    id: registration.id,
                    player1: registration.player1,
                    partner: registration.partner,
                    category: registration.category,
                    price: registration.price,
                    registeredAt: registration.registeredAt
                }
            };

            await axios.post(tournament.webhook, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Tournament-Registration-System/1.0'
                },
                timeout: 5000
            });
            
            console.log(`Webhook notification sent for registration ${registration.id} - category ${registration.category}`);
        }
    } catch (error) {
        console.error(`Failed to send webhook notification:`, error.message);
    }
}

// Routes

// User management functions
async function reloadUserConfig() {
    try {
        userConfig = JSON.parse(fsSync.readFileSync(USERS_FILE, 'utf8'));
        console.log('✅ Configuração de usuários recarregada');
    } catch (error) {
        console.error('❌ Erro ao recarregar configuração de usuários:', error.message);
    }
}

async function saveUserConfig(users) {
    try {
        console.log('💾 Salvando configuração de usuários...');
        console.log('📋 Usuários a serem salvos:', Object.keys(users));
        
        await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
        userConfig = users; // Update in-memory config
        
        console.log('✅ Configuração de usuários salva com sucesso');
        console.log('📂 Arquivo salvo em:', USERS_FILE);
        
        // Verify file was written
        const fileContent = await fs.readFile(USERS_FILE, 'utf8');
        const parsedContent = JSON.parse(fileContent);
        console.log('✅ Verificação: arquivo contém', Object.keys(parsedContent).length, 'usuários');
        
    } catch (error) {
        console.error('❌ Erro ao salvar configuração de usuários:', error);
        throw error;
    }
}

// Admin-only middleware
function requireAdmin(req, res, next) {
    console.log('🔍 requireAdmin middleware - usuário:', req.user.username, 'role:', req.user.role);
    if (req.user.role !== 'admin') {
        console.log('❌ Acesso negado - usuário não é admin');
        return res.status(403).json({ error: 'Acesso negado. Requer privilégios de administrador.' });
    }
    console.log('✅ Usuário é admin, prosseguindo...');
    next();
}

// Authentication routes
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
        }
        
        // Find user in configuration
        const user = userConfig[username];
        if (!user || !user.active) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }
        
        // Verify password using bcrypt
        const passwordMatch = await bcrypt.compare(password, user.passwordHash);
        
        if (passwordMatch) {
            // Generate JWT token
            const token = jwt.sign(
                { 
                    username: user.username,
                    role: user.role 
                },
                AUTH_CONFIG.jwtSecret,
                { 
                    expiresIn: AUTH_CONFIG.sessionTimeout,
                    issuer: 'tournament-system',
                    audience: 'admin-panel'
                }
            );
            
            console.log(`✅ Login bem-sucedido: ${username} em ${new Date().toISOString()}`);
            
            res.json({
                success: true,
                token: token,
                user: { 
                    username: user.username,
                    role: user.role 
                }
            });
        } else {
            console.log(`❌ Tentativa de login falhada: ${username} em ${new Date().toISOString()}`);
            res.status(401).json({ error: 'Credenciais inválidas' });
        }
    } catch (error) {
        console.error('❌ Erro no login:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
    // Log logout event
    console.log(`🚪 Logout: ${req.user.username} em ${new Date().toISOString()}`);
    res.json({ success: true, message: 'Logout realizado com sucesso' });
});

// Token verification route
app.get('/api/auth/verify', requireAuth, (req, res) => {
    res.json({ 
        success: true, 
        user: req.user,
        timestamp: new Date().toISOString()
    });
});

// User profile route
app.get('/api/auth/profile', requireAuth, (req, res) => {
    const user = userConfig[req.user.username];
    if (user) {
        res.json({
            success: true,
            profile: {
                username: user.username,
                role: user.role,
                createdAt: user.createdAt,
                active: user.active
            }
        });
    } else {
        res.status(404).json({ error: 'Perfil do usuário não encontrado' });
    }
});

// Admin User Management Routes

// Get all users (admin only)
app.get('/api/admin/users', requireAuth, requireAdmin, (req, res) => {
    try {
        const users = Object.values(userConfig).map(user => ({
            username: user.username,
            role: user.role,
            active: user.active,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        }));
        
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Create new user (admin only)
app.post('/api/admin/users', requireAuth, requireAdmin, async (req, res) => {
    try {
        console.log('🔍 POST /api/admin/users - Recebido por:', req.user.username);
        console.log('📋 Body recebido:', JSON.stringify(req.body, null, 2));
        
        const { username, password, role = 'admin' } = req.body;
        
        // Validation
        if (!username || !password) {
            console.log('❌ Validação falhou: campos obrigatórios');
            return res.status(400).json({ error: 'Nome de usuário e senha são obrigatórios' });
        }
        
        if (username.length < 3) {
            console.log('❌ Validação falhou: username muito curto');
            return res.status(400).json({ error: 'Nome de usuário deve ter pelo menos 3 caracteres' });
        }
        
        if (password.length < 6) {
            console.log('❌ Validação falhou: senha muito curta');
            return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });
        }
        
        if (!['admin', 'organizer'].includes(role)) {
            console.log('❌ Validação falhou: role inválida:', role);
            return res.status(400).json({ error: 'Função inválida. Use "admin" ou "organizer"' });
        }
        
        // Check if user already exists
        if (userConfig[username]) {
            console.log('❌ Usuário já existe:', username);
            return res.status(409).json({ error: 'Usuário já existe' });
        }
        
        console.log('✅ Validações passaram, criando usuário...');
        
        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);
        console.log('✅ Senha hasheada');
        
        // Create new user
        const newUser = {
            username,
            passwordHash,
            role,
            createdAt: new Date().toISOString(),
            active: true
        };
        
        console.log('✅ Objeto do usuário criado');
        
        // Update user config
        const updatedConfig = { ...userConfig };
        updatedConfig[username] = newUser;
        
        console.log('✅ Config atualizada, salvando...');
        
        await saveUserConfig(updatedConfig);
        
        console.log(`✅ Usuário criado: ${username} por ${req.user.username}`);
        
        res.status(201).json({
            message: 'Usuário criado com sucesso',
            user: {
                username: newUser.username,
                role: newUser.role,
                active: newUser.active,
                createdAt: newUser.createdAt
            }
        });
    } catch (error) {
        console.error('❌ Error creating user:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Update user password (admin only)
app.put('/api/admin/users/:username/password', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { username } = req.params;
        const { newPassword } = req.body;
        
        // Validation
        if (!newPassword) {
            return res.status(400).json({ error: 'Nova senha é obrigatória' });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });
        }
        
        // Check if user exists
        if (!userConfig[username]) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        // Hash new password
        const passwordHash = await bcrypt.hash(newPassword, 10);
        
        // Update user config
        const updatedConfig = { ...userConfig };
        updatedConfig[username] = {
            ...updatedConfig[username],
            passwordHash,
            updatedAt: new Date().toISOString()
        };
        
        await saveUserConfig(updatedConfig);
        
        console.log(`✅ Senha alterada para usuário: ${username} por ${req.user.username}`);
        
        res.json({ message: 'Senha alterada com sucesso' });
    } catch (error) {
        console.error('Error updating password:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Update user status (admin only)
app.put('/api/admin/users/:username/status', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { username } = req.params;
        const { active } = req.body;
        
        // Validation
        if (typeof active !== 'boolean') {
            return res.status(400).json({ error: 'Status deve ser true ou false' });
        }
        
        // Check if user exists
        if (!userConfig[username]) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        // Prevent admin from deactivating themselves
        if (username === req.user.username && !active) {
            return res.status(400).json({ error: 'Você não pode desativar sua própria conta' });
        }
        
        // Update user config
        const updatedConfig = { ...userConfig };
        updatedConfig[username] = {
            ...updatedConfig[username],
            active,
            updatedAt: new Date().toISOString()
        };
        
        if (!active) {
            updatedConfig[username].deactivatedAt = new Date().toISOString();
        } else {
            delete updatedConfig[username].deactivatedAt;
            updatedConfig[username].reactivatedAt = new Date().toISOString();
        }
        
        await saveUserConfig(updatedConfig);
        
        console.log(`✅ Status do usuário ${username} alterado para ${active ? 'ativo' : 'inativo'} por ${req.user.username}`);
        
        res.json({ 
            message: `Usuário ${active ? 'ativado' : 'desativado'} com sucesso`,
            active 
        });
    } catch (error) {
        console.error('Error updating user status:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Root route - redirect to login or admin
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Admin page - protected
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

// Admin players page - protected
app.get('/admin/players.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'players.html'));
});

// Admin users page - protected (admin only)
app.get('/admin/users.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'users.html'));
});

// Login page
app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Registration page - public
app.get('/register/:tournamentId', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// Validate CPF and check existing registrations
app.post('/api/validate-cpf', async (req, res) => {
    try {
        const { cpf } = req.body;
        
        if (!cpf) {
            return res.status(400).json({ error: 'CPF é obrigatório' });
        }
        
        const normalizedCpf = cpf.replace(/\D/g, '');
        
        // Basic CPF validation (11 digits)
        if (normalizedCpf.length !== 11) {
            return res.status(400).json({ 
                error: 'CPF deve conter 11 dígitos',
                isValid: false
            });
        }
        
        // Check if all digits are the same (invalid CPF)
        if (/^(\d)\1{10}$/.test(normalizedCpf)) {
            return res.status(400).json({ 
                error: 'CPF inválido',
                isValid: false
            });
        }
        
        // CPF checksum validation
        const isValidCpf = validateCpfChecksum(normalizedCpf);
        
        if (!isValidCpf) {
            return res.status(400).json({ 
                error: 'CPF inválido',
                isValid: false
            });
        }
        
        // Get player registration history
        const totalRegistrations = await getPlayerTotalRegistrations(normalizedCpf);
        const allRegistrations = await readRegistrations();
        const tournaments = await readTournaments();
        
        const playerRegistrations = allRegistrations.filter(reg => 
            reg.player1.cpf === normalizedCpf || 
            (reg.partner && reg.partner.cpf === normalizedCpf)
        );
        
        const registrationHistory = playerRegistrations.map(reg => {
            const tournament = tournaments.find(t => t.id === reg.tournamentId);
            return {
                tournamentName: tournament?.name || 'Campeonato não encontrado',
                category: reg.category,
                registeredAt: reg.registeredAt,
                playerType: reg.player1.cpf === normalizedCpf ? 'main' : 'partner'
            };
        });
        
        res.json({
            isValid: true,
            cpf: normalizedCpf,
            totalRegistrations: totalRegistrations,
            registrationHistory: registrationHistory,
            message: totalRegistrations === 0 ? 
                'CPF válido - Primeira inscrição' : 
                `CPF válido - ${totalRegistrations} inscrição(ões) anterior(es)`
        });
    } catch (error) {
        console.error('Error validating CPF:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Helper function to validate CPF checksum
function validateCpfChecksum(cpf) {
    // Calculate first check digit
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let remainder = sum % 11;
    let firstCheckDigit = remainder < 2 ? 0 : 11 - remainder;
    
    if (firstCheckDigit !== parseInt(cpf.charAt(9))) {
        return false;
    }
    
    // Calculate second check digit
    sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    remainder = sum % 11;
    let secondCheckDigit = remainder < 2 ? 0 : 11 - remainder;
    
    return secondCheckDigit === parseInt(cpf.charAt(10));
}

// Calculate price for registration (before confirming)
app.post('/api/tournaments/:id/calculate-price', async (req, res) => {
    try {
        const tournamentId = req.params.id;
        const { player1, partners, categories } = req.body;

        // Get tournament
        const tournaments = await readTournaments();
        const tournament = tournaments.find(t => t.id === tournamentId);
        
        if (!tournament) {
            return res.status(404).json({ error: 'Campeonato não encontrado' });
        }

        // Validation
        if (!player1 || !player1.cpf) {
            return res.status(400).json({ error: 'CPF do jogador principal é obrigatório' });
        }

        if (!categories || categories.length === 0) {
            return res.status(400).json({ error: 'Selecione pelo menos uma categoria' });
        }

        // Check if categories are valid for this tournament
        if (!categories.every(cat => tournament.categories.includes(cat))) {
            return res.status(400).json({ error: 'Categoria selecionada não está disponível neste campeonato' });
        }

        const categoriesNeedingPartner = categories.filter(cat => cat === 'X2' || cat === 'Misto');
        
        // Calculate prices for all players involved
        const calculations = [];
        
        // Calculate for main player
        const mainPlayerCalculation = await calculatePlayerPrice(
            player1.cpf,
            tournament.baseCategoryPrice,
            tournament.additionalCategoryPrice,
            categories.length
        );
        
        calculations.push({
            playerType: 'main',
            cpf: player1.cpf.replace(/\D/g, ''),
            name: player1.name || 'Jogador Principal',
            categories: categories,
            existingRegistrations: mainPlayerCalculation.totalExistingRegistrations,
            newRegistrationsPrice: mainPlayerCalculation.newRegistrationsPrice,
            totalPrice: mainPlayerCalculation.totalPrice
        });

        // Calculate for partners (if needed)
        const partnerCalculations = {};
        
        for (const category of categoriesNeedingPartner) {
            if (partners && partners[category] && partners[category].cpf) {
                const partnerCpf = partners[category].cpf.replace(/\D/g, '');
                
                // Skip if partner is the same as main player
                if (partnerCpf === player1.cpf.replace(/\D/g, '')) {
                    continue;
                }
                
                // Check if we already calculated for this partner
                if (!partnerCalculations[partnerCpf]) {
                    const partnerCategoriesCount = categoriesNeedingPartner.filter(cat => 
                        partners[cat] && partners[cat].cpf.replace(/\D/g, '') === partnerCpf
                    ).length;
                    
                    const partnerCalculation = await calculatePlayerPrice(
                        partnerCpf,
                        tournament.baseCategoryPrice,
                        tournament.additionalCategoryPrice,
                        partnerCategoriesCount
                    );
                    
                    partnerCalculations[partnerCpf] = {
                        playerType: 'partner',
                        cpf: partnerCpf,
                        name: partners[category].name || 'Parceiro',
                        categories: categoriesNeedingPartner.filter(cat => 
                            partners[cat] && partners[cat].cpf.replace(/\D/g, '') === partnerCpf
                        ),
                        existingRegistrations: partnerCalculation.totalExistingRegistrations,
                        newRegistrationsPrice: partnerCalculation.newRegistrationsPrice,
                        totalPrice: partnerCalculation.totalPrice
                    };
                    
                    calculations.push(partnerCalculations[partnerCpf]);
                }
            }
        }

        // Calculate total price (sum of all players)
        const totalPrice = calculations.reduce((sum, calc) => sum + calc.totalPrice, 0);

        res.json({
            tournament: {
                id: tournament.id,
                name: tournament.name,
                baseCategoryPrice: tournament.baseCategoryPrice,
                additionalCategoryPrice: tournament.additionalCategoryPrice
            },
            calculations: calculations,
            totalPrice: totalPrice,
            breakdown: {
                mainPlayer: calculations.find(c => c.playerType === 'main'),
                partners: calculations.filter(c => c.playerType === 'partner')
            }
        });
    } catch (error) {
        console.error('Error calculating price:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Registrations view page
app.get('/registrations/:tournamentId', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'registrations.html'));
});

// API Routes

// Get all tournaments (filtered by user)
app.get('/api/tournaments', requireAuth, async (req, res) => {
    try {
        console.log('🔍 Listando campeonatos para usuário:', req.user.username, 'Role:', req.user.role);
        
        const tournaments = await readTournaments();
        const registrations = await readRegistrations();
        
        let filteredTournaments;
        if (req.user.role === 'admin') {
            // Admin vê todos os campeonatos
            filteredTournaments = tournaments;
            console.log('✅ Admin: mostrando todos os', tournaments.length, 'campeonatos');
        } else {
            // Organizadores veem apenas seus próprios campeonatos
            filteredTournaments = tournaments.filter(t => t.createdBy === req.user.username);
            console.log('👤 Organizador:', req.user.username, '- mostrando', filteredTournaments.length, 'de', tournaments.length, 'campeonatos');
        }
        
        // Add registrations count to each tournament
        const tournamentsWithCounts = filteredTournaments.map(tournament => {
            const tournamentRegistrations = registrations.filter(r => r.tournamentId === tournament.id);
            return {
                ...tournament,
                registrationsCount: tournamentRegistrations.length
            };
        });
        
        res.json(tournamentsWithCounts);
    } catch (error) {
        console.error('Error fetching tournaments:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Get specific tournament
app.get('/api/tournaments/:id', async (req, res) => {
    try {
        const tournaments = await readTournaments();
        const tournament = tournaments.find(t => t.id === req.params.id);
        
        if (!tournament) {
            return res.status(404).json({ error: 'Campeonato não encontrado' });
        }
        
        res.json(tournament);
    } catch (error) {
        console.error('Error fetching tournament:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Create new tournament
app.post('/api/tournaments', requireAuth, async (req, res) => {
    try {
        const {
            name,
            categories,
            maxRegistrations,
            startDate,
            endDate,
            location,
            baseCategoryPrice,
            additionalCategoryPrice,
            webhook
        } = req.body;

        // Debug log
        console.log('🔍 DEBUG - Received categories:', JSON.stringify(categories, null, 2));

        // Validation
        if (!name || !categories || categories.length === 0 || !startDate || !endDate || !location) {
            return res.status(400).json({ error: 'Campos obrigatórios não preenchidos' });
        }

        if (new Date(startDate) >= new Date(endDate)) {
            return res.status(400).json({ error: 'Data de início deve ser anterior à data de término' });
        }

        // Validate categories - now supporting custom categories
        if (!Array.isArray(categories)) {
            return res.status(400).json({ error: 'Categorias devem ser um array' });
        }

        // Validate each category (can be string for old format or object for new format)
        for (const category of categories) {
            console.log('🔍 DEBUG - Validating category:', category, 'Type:', typeof category);
            
            if (typeof category === 'string') {
                // Old format - keep for backward compatibility
                const validCategories = ['X1', 'X2', 'Misto'];
                if (!validCategories.includes(category)) {
                    console.log('❌ DEBUG - Invalid string category:', category);
                    return res.status(400).json({ error: `Categoria inválida: ${category}` });
                }
            } else if (typeof category === 'object' && category !== null) {
                // New format - custom categories
                if (!category.name || typeof category.name !== 'string' || category.name.trim().length === 0) {
                    console.log('❌ DEBUG - Invalid category name:', category.name);
                    return res.status(400).json({ error: 'Nome da categoria é obrigatório' });
                }
                if (!category.playersPerTeam || category.playersPerTeam < 1 || category.playersPerTeam > 10) {
                    console.log('❌ DEBUG - Invalid players per team:', category.playersPerTeam);
                    return res.status(400).json({ error: 'Número de jogadores por time deve ser entre 1 e 10' });
                }
            } else {
                console.log('❌ DEBUG - Invalid category format:', category, 'Type:', typeof category);
                return res.status(400).json({ error: 'Formato de categoria inválido' });
            }
        }

        const tournament = {
            id: uuidv4(),
            name: name.trim(),
            categories,
            maxRegistrations: maxRegistrations ? parseInt(maxRegistrations) : null,
            startDate,
            endDate,
            location: location.trim(),
            baseCategoryPrice: parseFloat(baseCategoryPrice) || 0,
            additionalCategoryPrice: parseFloat(additionalCategoryPrice) || 0,
            webhook: webhook ? webhook.trim() : null,
            createdBy: req.user.username, // Adiciona o criador do campeonato
            createdAt: new Date().toISOString()
        };

        const tournaments = await readTournaments();
        tournaments.push(tournament);
        await writeTournaments(tournaments);

        const registrationLink = `${req.protocol}://${req.get('host')}/register/${tournament.id}`;
        
        res.status(201).json({
            message: 'Campeonato criado com sucesso',
            tournament,
            registrationLink
        });
    } catch (error) {
        console.error('Error creating tournament:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Delete tournament
app.delete('/api/tournaments/:id', requireAuth, async (req, res) => {
    try {
        const tournamentId = req.params.id;
        const user = req.user;

        console.log(`🗑️ Tentativa de exclusão do torneio ${tournamentId} por ${user.username}`);

        // Read tournaments
        const tournaments = await readTournaments();
        const tournamentIndex = tournaments.findIndex(t => t.id === tournamentId);

        if (tournamentIndex === -1) {
            return res.status(404).json({ error: 'Torneio não encontrado' });
        }

        const tournament = tournaments[tournamentIndex];

        // Check permissions: admin can delete any tournament, organizer can only delete their own
        if (user.role !== 'admin' && tournament.createdBy !== user.username) {
            console.log(`❌ Usuário ${user.username} tentou excluir torneio de ${tournament.createdBy}`);
            return res.status(403).json({ error: 'Você só pode excluir torneios criados por você' });
        }

        // Check if tournament has registrations
        const registrations = await readRegistrations();
        const tournamentRegistrations = registrations.filter(r => r.tournamentId === tournamentId);
        
        if (tournamentRegistrations.length > 0) {
            return res.status(400).json({ 
                error: `Não é possível excluir o torneio. Existem ${tournamentRegistrations.length} inscrição(ões) registrada(s).`,
                registrationsCount: tournamentRegistrations.length
            });
        }

        // Remove tournament from array
        tournaments.splice(tournamentIndex, 1);

        // Save updated tournaments
        await writeTournaments(tournaments);

        console.log(`✅ Torneio ${tournamentId} excluído com sucesso por ${user.username}`);
        
        res.json({ 
            success: true, 
            message: 'Torneio excluído com sucesso',
            deletedTournament: {
                id: tournament.id,
                name: tournament.name
            }
        });

    } catch (error) {
        console.error('Error deleting tournament:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Register for tournament
app.post('/api/tournaments/:id/register', async (req, res) => {
    try {
        const tournamentId = req.params.id;
        const { player1, partners, categories } = req.body;

        // Get tournament
        const tournaments = await readTournaments();
        const tournament = tournaments.find(t => t.id === tournamentId);
        
        if (!tournament) {
            return res.status(404).json({ error: 'Campeonato não encontrado' });
        }

        // Validation
        if (!player1 || !player1.name || !player1.cpf || !player1.email || !player1.phone) {
            return res.status(400).json({ error: 'Dados completos do jogador principal são obrigatórios' });
        }

        if (!categories || categories.length === 0) {
            return res.status(400).json({ error: 'Selecione pelo menos uma categoria' });
        }

        // Check if categories are valid for this tournament
        const availableCategories = tournament.categories.map(cat => typeof cat === 'string' ? cat : cat.name);
        if (!categories.every(cat => availableCategories.includes(cat))) {
            return res.status(400).json({ error: 'Categoria selecionada não está disponível neste campeonato' });
        }

        // Helper function to determine if a category needs a partner
        function categoryNeedsPartner(categoryName, tournamentCategories) {
            // Find the category object in tournament data
            const categoryObj = tournamentCategories.find(cat => {
                const catName = typeof cat === 'string' ? cat : cat.name;
                return catName === categoryName;
            });
            
            // If it's an object with playersPerTeam > 1, it needs a partner
            if (typeof categoryObj === 'object' && categoryObj.playersPerTeam > 1) {
                return true;
            }
            
            // Fallback for old string-based categories
            return categoryName === 'X2' || categoryName === 'Misto';
        }

        // Check if partners are required and provided
        const categoriesNeedingPartner = categories.filter(cat => categoryNeedsPartner(cat, tournament.categories));
        for (const category of categoriesNeedingPartner) {
            if (!partners || !partners[category] || 
                !partners[category].name || !partners[category].cpf || 
                !partners[category].email || !partners[category].phone) {
                return res.status(400).json({ 
                    error: `Dados completos do parceiro são obrigatórios para a categoria ${category}` 
                });
            }
        }

        // Normalize CPFs
        const mainPlayerCpf = player1.cpf.replace(/\D/g, '');

        // Check for duplicate CPF registrations in this tournament per category
        const existingRegistrations = await readRegistrations();
        const tournamentRegistrations = existingRegistrations.filter(r => r.tournamentId === tournamentId);
        
        // Check each category separately for duplicates
        for (const category of categories) {
            // Check main player CPF for this specific category
            const existingMainPlayerInCategory = tournamentRegistrations.find(r => 
                r.player1.cpf === mainPlayerCpf && r.category === category
            );
            if (existingMainPlayerInCategory) {
                return res.status(400).json({ 
                    error: `CPF ${mainPlayerCpf} já está registrado na categoria ${category} neste campeonato` 
                });
            }
            
            // Check partner CPF for this specific category (if category needs partner)
            if (categoriesNeedingPartner.includes(category)) {
                const partnerCPF = partners[category].cpf.replace(/\D/g, '');
                
                // Check if partner CPF is already registered as main player in this category
                const existingAsMainInCategory = tournamentRegistrations.find(r => 
                    r.player1.cpf === partnerCPF && r.category === category
                );
                if (existingAsMainInCategory) {
                    return res.status(400).json({ 
                        error: `CPF ${partnerCPF} já está registrado como jogador principal na categoria ${category}` 
                    });
                }
                
                // Check if partner CPF is already registered as partner in this category
                const existingAsPartnerInCategory = tournamentRegistrations.find(r => 
                    r.partner && r.partner.cpf === partnerCPF && r.category === category
                );
                if (existingAsPartnerInCategory) {
                    return res.status(400).json({ 
                        error: `CPF ${partnerCPF} já está registrado como parceiro na categoria ${category}` 
                    });
                }
            }
        }

        // Check max registrations per category
        if (tournament.maxRegistrations) {
            for (const category of categories) {
                const categoryCount = tournamentRegistrations.filter(r => r.category === category).length;
                
                if (categoryCount >= tournament.maxRegistrations) {
                    return res.status(400).json({ 
                        error: `Limite de inscrições atingido para a categoria ${category}` 
                    });
                }
            }
        }

        // Calculate individual prices using the new global system
        const mainPlayerCalculation = await calculatePlayerPrice(
            mainPlayerCpf,
            tournament.baseCategoryPrice,
            tournament.additionalCategoryPrice,
            categories.length
        );

        // Calculate partner prices
        const partnerCalculations = {};
        let totalPartnerPrice = 0;
        
        for (const category of categoriesNeedingPartner) {
            if (partners && partners[category]) {
                const partnerCpf = partners[category].cpf.replace(/\D/g, '');
                
                // Skip if partner is the same as main player
                if (partnerCpf === mainPlayerCpf) {
                    continue;
                }
                
                // Calculate only once per unique partner
                if (!partnerCalculations[partnerCpf]) {
                    const partnerCategoriesCount = categoriesNeedingPartner.filter(cat => 
                        partners[cat] && partners[cat].cpf.replace(/\D/g, '') === partnerCpf
                    ).length;
                    
                    const partnerCalculation = await calculatePlayerPrice(
                        partnerCpf,
                        tournament.baseCategoryPrice,
                        tournament.additionalCategoryPrice,
                        partnerCategoriesCount
                    );
                    
                    partnerCalculations[partnerCpf] = partnerCalculation;
                    totalPartnerPrice += partnerCalculation.totalPrice;
                }
            }
        }

        const totalCalculatedPrice = mainPlayerCalculation.totalPrice + totalPartnerPrice;

        // Create separate registration for each category
        const registrations = await readRegistrations();
        const createdRegistrations = [];
        
        // Track individual prices for each registration record
        let mainPlayerRemainingPrice = mainPlayerCalculation.totalPrice;
        const partnerRemainingPrices = {};
        
        // Initialize partner remaining prices
        for (const [cpf, calc] of Object.entries(partnerCalculations)) {
            partnerRemainingPrices[cpf] = calc.totalPrice;
        }
        
        for (let i = 0; i < categories.length; i++) {
            const category = categories[i];
            const isFirstCategoryInThisRegistration = i === 0;
            
            // Calculate price distribution for main player
            let mainPlayerPrice = 0;
            if (mainPlayerRemainingPrice > 0) {
                if (isFirstCategoryInThisRegistration) {
                    // For the first category, assign the entire remaining price or the calculated price for this category
                    const existingRegs = await getPlayerTotalRegistrations(mainPlayerCpf);
                    mainPlayerPrice = existingRegs === 0 ? tournament.baseCategoryPrice : tournament.additionalCategoryPrice;
                } else {
                    mainPlayerPrice = tournament.additionalCategoryPrice;
                }
                mainPlayerRemainingPrice -= mainPlayerPrice;
            }
            
            // Create the registration with partner info if needed
            const registration = {
                id: uuidv4(),
                tournamentId,
                player1: {
                    name: player1.name.trim(),
                    cpf: mainPlayerCpf,
                    email: player1.email.trim().toLowerCase(),
                    phone: player1.phone.trim()
                },
                partner: categoriesNeedingPartner.includes(category) ? {
                    name: partners[category].name.trim(),
                    cpf: partners[category].cpf.replace(/\D/g, ''),
                    email: partners[category].email.trim().toLowerCase(),
                    phone: partners[category].phone.trim()
                } : null,
                category: category,
                price: mainPlayerPrice, // Price paid by the main player for this category
                partnerPrice: 0, // We'll calculate partner price separately
                registeredAt: new Date().toISOString()
            };

            // Calculate partner price for this specific registration if applicable
            if (categoriesNeedingPartner.includes(category) && partners[category]) {
                const partnerCpf = partners[category].cpf.replace(/\D/g, '');
                if (partnerCpf !== mainPlayerCpf && partnerRemainingPrices[partnerCpf] > 0) {
                    const partnerExistingRegs = await getPlayerTotalRegistrations(partnerCpf);
                    const partnerCategoriesForThisPartner = categoriesNeedingPartner.filter(cat => 
                        partners[cat] && partners[cat].cpf.replace(/\D/g, '') === partnerCpf
                    );
                    const isFirstCategoryForPartner = partnerCategoriesForThisPartner.indexOf(category) === 0;
                    
                    registration.partnerPrice = (partnerExistingRegs === 0 && isFirstCategoryForPartner) ? 
                        tournament.baseCategoryPrice : tournament.additionalCategoryPrice;
                    
                    partnerRemainingPrices[partnerCpf] -= registration.partnerPrice;
                }
            }

            registrations.push(registration);
            createdRegistrations.push(registration);
        }

        await writeRegistrations(registrations);

        // Update players database for each registration
        for (const registration of createdRegistrations) {
            await updatePlayerDatabase(tournamentId, registration);
        }

        // Send webhook notification for all registrations
        await sendWebhookNotification(tournament, createdRegistrations);

        res.status(201).json({
            message: 'Inscrição realizada com sucesso',
            registrations: createdRegistrations.map(reg => ({
                id: reg.id,
                category: reg.category,
                mainPlayerPrice: reg.price,
                partnerPrice: reg.partnerPrice || 0,
                playerName: reg.player1.name,
                partnerName: reg.partner ? reg.partner.name : null
            })),
            mainPlayerTotalPrice: mainPlayerCalculation.totalPrice,
            totalPartnerPrice: totalPartnerPrice,
            totalPrice: totalCalculatedPrice,
            categories: categories,
            priceBreakdown: {
                mainPlayer: {
                    cpf: mainPlayerCpf,
                    name: player1.name,
                    existingRegistrations: mainPlayerCalculation.totalExistingRegistrations,
                    newPrice: mainPlayerCalculation.totalPrice
                },
                partners: Object.entries(partnerCalculations).map(([cpf, calc]) => ({
                    cpf: cpf,
                    existingRegistrations: calc.totalExistingRegistrations,
                    newPrice: calc.totalPrice
                }))
            }
        });
    } catch (error) {
        console.error('Error registering:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Get tournament registrations (filtered by user)
app.get('/api/tournaments/:id/registrations', requireAuth, async (req, res) => {
    try {
        const tournamentId = req.params.id;
        
        // Verificar se o usuário tem permissão para ver este campeonato
        const tournaments = await readTournaments();
        const tournament = tournaments.find(t => t.id === tournamentId);
        
        if (!tournament) {
            return res.status(404).json({ error: 'Campeonato não encontrado' });
        }
        
        // Admin pode ver qualquer campeonato, organizadores apenas os seus
        if (req.user.role !== 'admin' && tournament.createdBy !== req.user.username) {
            console.log('❌ Acesso negado: usuário', req.user.username, 'tentou acessar campeonato de', tournament.createdBy);
            return res.status(403).json({ error: 'Acesso negado: você só pode ver registrações dos seus próprios campeonatos' });
        }
        
        const registrations = await readRegistrations();
        const tournamentRegistrations = registrations.filter(r => r.tournamentId === tournamentId);
        
        console.log('✅ Usuário', req.user.username, 'acessou', tournamentRegistrations.length, 'registrações do campeonato', tournament.name);
        res.json(tournamentRegistrations);
    } catch (error) {
        console.error('Error fetching registrations:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Get all registrations (filtered by user permissions)
app.get('/api/registrations', requireAuth, async (req, res) => {
    try {
        const registrations = await readRegistrations();
        
        if (req.user.role === 'admin') {
            // Admin vê todas as registrações
            console.log('✅ Admin acessou todas as', registrations.length, 'registrações');
            res.json(registrations);
        } else {
            // Organizadores veem apenas registrações dos seus campeonatos
            const tournaments = await readTournaments();
            const userTournaments = tournaments.filter(t => t.createdBy === req.user.username);
            const userTournamentIds = userTournaments.map(t => t.id);
            
            const filteredRegistrations = registrations.filter(r => userTournamentIds.includes(r.tournamentId));
            
            console.log('👤 Organizador', req.user.username, 'acessou', filteredRegistrations.length, 'de', registrations.length, 'registrações');
            res.json(filteredRegistrations);
        }
    } catch (error) {
        console.error('Error fetching all registrations:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Delete registration (with permission check)
app.delete('/api/registrations/:id', requireAuth, async (req, res) => {
    try {
        const registrationId = req.params.id;
        const registrations = await readRegistrations();
        
        const registrationIndex = registrations.findIndex(r => r.id === registrationId);
        if (registrationIndex === -1) {
            return res.status(404).json({ error: 'Inscrição não encontrada' });
        }
        
        const registration = registrations[registrationIndex];
        
        // Verificar permissão do usuário
        if (req.user.role !== 'admin') {
            const tournaments = await readTournaments();
            const tournament = tournaments.find(t => t.id === registration.tournamentId);
            
            if (!tournament || tournament.createdBy !== req.user.username) {
                console.log('❌ Acesso negado: usuário', req.user.username, 'tentou deletar inscrição de campeonato não próprio');
                return res.status(403).json({ error: 'Acesso negado: você só pode deletar inscrições dos seus próprios campeonatos' });
            }
        }
        
        const deletedRegistration = registrations[registrationIndex];
        registrations.splice(registrationIndex, 1);
        await writeRegistrations(registrations);

        // Remove from players database
        await removeFromPlayerDatabase(deletedRegistration);

        console.log('✅ Usuário', req.user.username, 'deletou inscrição', registrationId);
        res.json({ message: 'Inscrição excluída com sucesso' });
    } catch (error) {
        console.error('Error deleting registration:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Get unique players for a specific tournament with consolidated data
app.get('/api/tournaments/:tournamentId/unique-players', requireAuth, async (req, res) => {
    try {
        const { tournamentId } = req.params;
        const tournaments = await readTournaments();
        const registrations = await readRegistrations();

        // Find the tournament
        const tournament = tournaments.find(t => t.id === tournamentId);
        if (!tournament) {
            return res.status(404).json({ error: 'Torneio não encontrado' });
        }
        
        // Verificar permissão do usuário
        if (req.user.role !== 'admin' && tournament.createdBy !== req.user.username) {
            console.log('❌ Acesso negado: usuário', req.user.username, 'tentou acessar jogadores de campeonato de', tournament.createdBy);
            return res.status(403).json({ error: 'Acesso negado: você só pode ver jogadores dos seus próprios campeonatos' });
        }

        // Get all registrations for this tournament
        const tournamentRegistrations = registrations.filter(reg => reg.tournamentId === tournamentId);

        // Read players payment data
        let playersData = {};
        try {
            const data = fsSync.readFileSync(path.join(__dirname, 'data', 'payment-status.json'), 'utf8');
            playersData = JSON.parse(data);
        } catch (error) {
            // File doesn't exist yet, start with empty object
            playersData = {};
        }
        
        const tournamentPlayersData = playersData[tournamentId] || {};

        // Build a map of unique players with their consolidated data
        const playersMap = new Map();
        
        // Process all registrations to collect all unique players and their categories
        tournamentRegistrations.forEach(reg => {
            // Process main player (player1)
            const mainPlayerKey = reg.player1.cpf || reg.player1.email;
            if (!playersMap.has(mainPlayerKey)) {
                playersMap.set(mainPlayerKey, {
                    cpf: reg.player1.cpf,
                    name: reg.player1.name,
                    email: reg.player1.email,
                    phone: reg.player1.phone,
                    categories: new Set(),
                    totalPrice: 0,
                    registrations: [],
                    isPaid: tournamentPlayersData[mainPlayerKey]?.isPaid || false
                });
            }
            
            const mainPlayer = playersMap.get(mainPlayerKey);
            if (reg.category && !mainPlayer.categories.has(reg.category)) {
                mainPlayer.categories.add(reg.category);
            }
            
            // Process partner if exists
            if (reg.partner) {
                const partnerKey = reg.partner.cpf || reg.partner.email;
                
                // Skip if this is the same person as player1
                if (partnerKey === mainPlayerKey) {
                    return;
                }
                
                if (!playersMap.has(partnerKey)) {
                    playersMap.set(partnerKey, {
                        cpf: reg.partner.cpf,
                        name: reg.partner.name,
                        email: reg.partner.email,
                        phone: reg.partner.phone,
                        categories: new Set(),
                        totalPrice: 0,
                        registrations: [],
                        isPaid: tournamentPlayersData[partnerKey]?.isPaid || false
                    });
                }
                
                const partner = playersMap.get(partnerKey);
                if (reg.category && !partner.categories.has(reg.category)) {
                    partner.categories.add(reg.category);
                }
            }
        });
        
        // Calculate prices correctly based on each player's unique categories
        Array.from(playersMap.values()).forEach(player => {
            const categoriesArray = Array.from(player.categories).sort();
            
            // Calculate price correctly: first category = base price, others = additional price
            categoriesArray.forEach((category, index) => {
                const isFirstCategory = index === 0;
                const price = isFirstCategory ? tournament.baseCategoryPrice : tournament.additionalCategoryPrice;
                
                player.totalPrice += price;
                player.registrations.push({
                    category: category,
                    price: price,
                    registeredAt: tournamentRegistrations.find(reg => 
                        (reg.player1.cpf === player.cpf && reg.category === category) ||
                        (reg.partner && reg.partner.cpf === player.cpf && reg.category === category)
                    )?.registeredAt || new Date().toISOString()
                });
            });
        });
        
        // Convert map to array and format data
        const uniquePlayers = Array.from(playersMap.values()).map(player => ({
            ...player,
            categories: Array.from(player.categories).sort(),
            categoriesCount: player.categories.size,
            registrationsCount: player.registrations.length
        }));

        // Sort by total price descending
        uniquePlayers.sort((a, b) => b.totalPrice - a.totalPrice);

        // Calculate tournament statistics
        const stats = {
            totalPlayers: uniquePlayers.length,
            totalRevenue: uniquePlayers.reduce((sum, player) => sum + player.totalPrice, 0),
            categoriesBreakdown: {}
        };

        // Categories breakdown
        const tournamentCategories = tournament.categories || [];
        tournamentCategories.forEach(category => {
            // Handle both old format (string) and new format (object)
            const categoryName = typeof category === 'string' ? category : category.name;
            
            const playersInCategory = uniquePlayers.filter(player => 
                player.categories.includes(categoryName)
            );
            stats.categoriesBreakdown[categoryName] = {
                players: playersInCategory.length,
                revenue: playersInCategory.reduce((sum, player) => {
                    const categoryRegistration = player.registrations.find(reg => reg.category === categoryName);
                    return sum + (categoryRegistration ? categoryRegistration.price : 0);
                }, 0)
            };
        });

        res.json({
            tournament: {
                id: tournament.id,
                name: tournament.name,
                startDate: tournament.startDate,
                endDate: tournament.endDate,
                location: tournament.location
            },
            players: uniquePlayers,
            statistics: stats
        });
    } catch (error) {
        console.error('Error fetching unique players:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Update payment status for a player in a tournament
app.put('/api/tournaments/:tournamentId/players/:playerKey/payment', requireAuth, async (req, res) => {
    try {
        const { tournamentId, playerKey } = req.params;
        const { isPaid } = req.body;
        
        // Read current players data (we'll store payment status separately)
        let playersData = {};
        try {
            const data = fsSync.readFileSync(path.join(__dirname, 'data', 'payment-status.json'), 'utf8');
            playersData = JSON.parse(data);
        } catch (error) {
            // File doesn't exist yet, start with empty object
            playersData = {};
        }
        
        // Ensure tournament object exists
        if (!playersData[tournamentId]) {
            playersData[tournamentId] = {};
        }
        
        // Update payment status
        playersData[tournamentId][playerKey] = {
            ...playersData[tournamentId][playerKey],
            isPaid: isPaid === true
        };
        
        // Save updated data
        fsSync.writeFileSync(
            path.join(__dirname, 'data', 'payment-status.json'), 
            JSON.stringify(playersData, null, 2)
        );
        
        res.json({ success: true, isPaid: playersData[tournamentId][playerKey].isPaid });
    } catch (error) {
        console.error('Error updating payment status:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Backup API endpoints
app.post('/api/admin/backup', requireAuth, requireAdmin, async (req, res) => {
    try {
        const backupFile = await backupManager.createBackup();
        res.json({ 
            success: true, 
            message: 'Backup criado com sucesso',
            file: backupFile 
        });
    } catch (error) {
        console.error('Erro ao criar backup:', error);
        res.status(500).json({ error: 'Erro ao criar backup' });
    }
});

app.post('/api/admin/restore', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { filename } = req.body;
        if (!filename) {
            return res.status(400).json({ error: 'Nome do arquivo é obrigatório' });
        }
        
        await backupManager.restoreFromBackup(filename);
        res.json({ 
            success: true, 
            message: 'Dados restaurados com sucesso' 
        });
    } catch (error) {
        console.error('Erro ao restaurar backup:', error);
        res.status(500).json({ error: 'Erro ao restaurar backup' });
    }
});

app.get('/api/admin/backups', requireAuth, requireAdmin, async (req, res) => {
    try {
        const backups = await backupManager.listBackups();
        res.json({ success: true, backups });
    } catch (error) {
        console.error('Erro ao listar backups:', error);
        res.status(500).json({ error: 'Erro ao listar backups' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Rota não encontrada' });
});

// Function to remove from players database
async function removeFromPlayerDatabase(registration) {
    const players = await readPlayers();
    
    // Update main player - remove only this specific category
    const mainPlayerIndex = players.findIndex(p => p.cpf === registration.player1.cpf);
    if (mainPlayerIndex >= 0) {
        const player = players[mainPlayerIndex];
        
        // Find the tournament entry
        const tournamentIndex = player.tournaments.findIndex(t => t.tournamentId === registration.tournamentId);
        if (tournamentIndex >= 0) {
            // Remove only this category from the tournament
            const categories = player.tournaments[tournamentIndex].categories || [];
            const updatedCategories = categories.filter(cat => cat !== registration.category);
            
            if (updatedCategories.length === 0) {
                // Remove entire tournament entry if no categories left
                player.tournaments.splice(tournamentIndex, 1);
            } else {
                // Update with remaining categories
                player.tournaments[tournamentIndex].categories = updatedCategories;
            }
        }
        
        // Remove player if no tournaments left
        if (player.tournaments.length === 0) {
            players.splice(mainPlayerIndex, 1);
        }
    }
    
    // Update partner if exists
    if (registration.partner) {
        const partnerIndex = players.findIndex(p => p.cpf === registration.partner.cpf);
        if (partnerIndex >= 0) {
            const partnerPlayer = players[partnerIndex];
            
            // Find the tournament entry
            const tournamentIndex = partnerPlayer.tournaments.findIndex(t => t.tournamentId === registration.tournamentId);
            if (tournamentIndex >= 0) {
                // Remove only this category from the tournament
                const categories = partnerPlayer.tournaments[tournamentIndex].categories || [];
                const updatedCategories = categories.filter(cat => cat !== registration.category);
                
                if (updatedCategories.length === 0) {
                    // Remove entire tournament entry if no categories left
                    partnerPlayer.tournaments.splice(tournamentIndex, 1);
                } else {
                    // Update with remaining categories
                    partnerPlayer.tournaments[tournamentIndex].categories = updatedCategories;
                }
            }
            
            // Remove partner if no tournaments left
            if (partnerPlayer.tournaments.length === 0) {
                players.splice(partnerIndex, 1);
            }
        }
    }
    
    await writePlayers(players);
}

// Get player statistics
app.get('/api/players/:cpf/stats', async (req, res) => {
    try {
        const cpf = req.params.cpf.replace(/\D/g, '');
        const players = await readPlayers();
        
        const player = players.find(p => p.cpf === cpf);
        if (!player) {
            return res.status(404).json({ error: 'Jogador não encontrado' });
        }

        // Get tournament details
        const tournaments = await readTournaments();
        const playerStats = {
            ...player,
            tournamentDetails: player.tournaments.map(t => {
                const tournament = tournaments.find(tour => tour.id === t.tournamentId);
                return {
                    ...t,
                    tournamentName: tournament ? tournament.name : 'Campeonato não encontrado',
                    tournamentDates: tournament ? `${tournament.startDate} - ${tournament.endDate}` : 'N/A'
                };
            }),
            totalTournaments: player.tournaments.length,
            totalCategories: [...new Set(player.tournaments.flatMap(t => t.categories))].length
        };

        res.json(playerStats);
    } catch (error) {
        console.error('Error fetching player stats:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Get all players stats
app.get('/api/players', async (req, res) => {
    try {
        const players = await readPlayers();
        const tournaments = await readTournaments();
        
        const playersWithStats = players.map(player => {
            const tournamentDetails = player.tournaments.map(t => {
                const tournament = tournaments.find(tour => tour.id === t.tournamentId);
                return {
                    ...t,
                    tournamentName: tournament ? tournament.name : 'Campeonato não encontrado'
                };
            });
            
            return {
                cpf: player.cpf,
                name: player.name,
                email: player.email,
                phone: player.phone,
                totalTournaments: player.tournaments.length,
                totalCategories: [...new Set(player.tournaments.flatMap(t => t.categories))].length,
                lastTournament: tournamentDetails.length > 0 ? 
                    tournamentDetails.sort((a, b) => new Date(b.registrationDate) - new Date(a.registrationDate))[0] : 
                    null
            };
        });

        res.json(playersWithStats);
    } catch (error) {
        console.error('Error fetching players:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Get detailed pricing report for all players
app.get('/api/reports/pricing', async (req, res) => {
    try {
        const allRegistrations = await readRegistrations();
        const tournaments = await readTournaments();
        
        // Group registrations by player CPF
        const playerGroups = {};
        
        allRegistrations.forEach(reg => {
            // Add main player
            if (!playerGroups[reg.player1.cpf]) {
                playerGroups[reg.player1.cpf] = {
                    cpf: reg.player1.cpf,
                    name: reg.player1.name,
                    email: reg.player1.email,
                    phone: reg.player1.phone,
                    registrations: []
                };
            }
            playerGroups[reg.player1.cpf].registrations.push({
                ...reg,
                playerType: 'main'
            });
            
            // Add partner if exists
            if (reg.partner) {
                if (!playerGroups[reg.partner.cpf]) {
                    playerGroups[reg.partner.cpf] = {
                        cpf: reg.partner.cpf,
                        name: reg.partner.name,
                        email: reg.partner.email,
                        phone: reg.partner.phone,
                        registrations: []
                    };
                }
                playerGroups[reg.partner.cpf].registrations.push({
                    ...reg,
                    playerType: 'partner'
                });
            }
        });
        
        // Calculate pricing for each player
        const pricingReport = Object.values(playerGroups).map(player => {
            // Sort registrations by date to calculate progressive pricing
            const sortedRegistrations = player.registrations.sort((a, b) => 
                new Date(a.registeredAt) - new Date(b.registeredAt)
            );
            
            let totalPrice = 0;
            const registrationDetails = sortedRegistrations.map((reg, index) => {
                const tournament = tournaments.find(t => t.id === reg.tournamentId);
                const isFirstRegistration = index === 0;
                
                // Calculate price based on global registration order
                const price = isFirstRegistration ? 
                    (tournament?.baseCategoryPrice || 30) : 
                    (tournament?.additionalCategoryPrice || 10);
                
                totalPrice += price;
                
                return {
                    registrationId: reg.id,
                    tournamentId: reg.tournamentId,
                    tournamentName: tournament?.name || 'Campeonato não encontrado',
                    category: reg.category,
                    playerType: reg.playerType,
                    registrationOrder: index + 1,
                    price: price,
                    registeredAt: reg.registeredAt,
                    isFirstRegistration: isFirstRegistration
                };
            });
            
            return {
                cpf: player.cpf,
                name: player.name,
                email: player.email,
                phone: player.phone,
                totalRegistrations: sortedRegistrations.length,
                totalPrice: totalPrice,
                registrations: registrationDetails,
                averagePricePerRegistration: sortedRegistrations.length > 0 ? 
                    (totalPrice / sortedRegistrations.length).toFixed(2) : 0
            };
        });
        
        // Sort by total price descending
        pricingReport.sort((a, b) => b.totalPrice - a.totalPrice);
        
        // Calculate summary statistics
        const summary = {
            totalPlayers: pricingReport.length,
            totalRegistrations: pricingReport.reduce((sum, p) => sum + p.totalRegistrations, 0),
            totalRevenue: pricingReport.reduce((sum, p) => sum + p.totalPrice, 0),
            averageRevenuePerPlayer: pricingReport.length > 0 ? 
                (pricingReport.reduce((sum, p) => sum + p.totalPrice, 0) / pricingReport.length).toFixed(2) : 0,
            playersWithMultipleRegistrations: pricingReport.filter(p => p.totalRegistrations > 1).length
        };
        
        res.json({
            summary: summary,
            players: pricingReport
        });
    } catch (error) {
        console.error('Error generating pricing report:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    const healthCheck = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.environment,
        version: require('./package.json').version,
        checks: {
            users: fsSync.existsSync(USERS_FILE),
            dataDir: fsSync.existsSync(path.dirname(DATA_FILE)),
            configDir: fsSync.existsSync(path.dirname(USERS_FILE))
        }
    };
    
    const allChecksPass = Object.values(healthCheck.checks).every(check => check === true);
    
    if (allChecksPass) {
        res.status(200).json(healthCheck);
    } else {
        res.status(503).json({
            ...healthCheck,
            status: 'ERROR',
            message: 'Some health checks failed'
        });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Rota não encontrada' });
});

// Migration function to add createdBy field to existing tournaments
async function migrateTournaments() {
    try {
        const tournaments = await readTournaments();
        let updated = false;
        
        tournaments.forEach(tournament => {
            if (!tournament.createdBy) {
                // Assign existing tournaments to admin user for backward compatibility
                tournament.createdBy = 'admin';
                updated = true;
                console.log('🔄 Migração: campeonato', tournament.name, 'atribuído ao admin');
            }
        });
        
        if (updated) {
            await writeTournaments(tournaments);
            console.log('✅ Migração de campeonatos concluída');
        }
    } catch (error) {
        console.error('❌ Erro na migração de campeonatos:', error);
    }
}

// Backup automático dos dados críticos
async function createAutomaticBackup() {
    try {
        const backupDir = path.join(__dirname, 'backups', new Date().toISOString().split('T')[0]);
        await fs.mkdir(backupDir, { recursive: true });
        
        // Backup de dados
        const dataFiles = ['tournaments.json', 'registrations.json', 'players.json', 'payment-status.json'];
        for (const file of dataFiles) {
            const sourcePath = path.join(__dirname, 'data', file);
            const backupPath = path.join(backupDir, file);
            try {
                await fs.copyFile(sourcePath, backupPath);
                console.log(`📦 Backup criado: ${file}`);
            } catch (error) {
                if (error.code !== 'ENOENT') {
                    console.error(`❌ Erro ao fazer backup de ${file}:`, error.message);
                }
            }
        }
        
        // Backup de configurações
        const configPath = path.join(__dirname, 'config', 'users.json');
        const configBackupPath = path.join(backupDir, 'users.json');
        try {
            await fs.copyFile(configPath, configBackupPath);
            console.log('📦 Backup criado: users.json');
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error('❌ Erro ao fazer backup de users.json:', error.message);
            }
        }
        
        console.log(`✅ Backup automático concluído em: ${backupDir}`);
    } catch (error) {
        console.error('❌ Erro no backup automático:', error);
    }
}

async function startServer() {
    await ensureDataDirectory();
    
    // Execute migration for existing tournaments
    await migrateTournaments();
    
    // Create automatic backup on server start
    await createAutomaticBackup();
    
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Servidor rodando na porta ${PORT}`);
        console.log(`📊 Dashboard admin: http://localhost:${PORT}/admin`);
        console.log(`� Página de inscrições: http://localhost:${PORT}/register.html`);
        console.log(`💚 Health check: http://localhost:${PORT}/api/health`);
        console.log(`🌍 Ambiente: ${config.environment}`);
    });
}

startServer().catch(console.error);
