/**
 * Admin Header Component
 * Componente reutilizável para header das páginas administrativas
 */

class AdminHeader {
    constructor() {
        this.currentPage = this.getCurrentPage();
        this.initializeAuth();
    }

    getCurrentPage() {
        const path = window.location.pathname;
        const page = path.split('/').pop().replace('.html', '');
        
        // Map file names to page identifiers
        const pageMap = {
            'index': 'dashboard',
            'create-tournament': 'create',
            'tournaments': 'tournaments',
            'players': 'players',
            'users': 'users',
            'backup': 'backup'
        };
        
        return pageMap[page] || 'dashboard';
    }

    initializeAuth() {
        // Initialize user info
        this.updateUserInfo();
    }

    updateUserInfo() {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const userInfoElement = document.getElementById('userInfo');
        if (userInfoElement) {
            userInfoElement.textContent = user.username || 'Admin';
        }
    }

    getNavigationItems() {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const isAdmin = user.role === 'admin';
        
        const items = [
            {
                id: 'dashboard',
                href: 'index.html',
                icon: '📊',
                label: 'Dashboard',
                description: 'Visão geral do sistema'
            },
            {
                id: 'create',
                href: 'create-tournament.html',
                icon: '➕',
                label: 'Criar Torneio',
                description: 'Novo campeonato'
            },
            {
                id: 'tournaments',
                href: 'tournaments.html',
                icon: '🏆',
                label: 'Torneios',
                description: 'Gerenciar campeonatos'
            },
            {
                id: 'players',
                href: 'players.html',
                icon: '👥',
                label: 'Jogadores',
                description: 'Controle de participantes'
            }
        ];
        
        // Add users management only for admins
        if (isAdmin) {
            items.push({
                id: 'users',
                href: 'users.html',
                icon: '🔐',
                label: 'Usuários',
                description: 'Gerenciar usuários do sistema'
            });
            
            items.push({
                id: 'backup',
                href: 'backup.html',
                icon: '💾',
                label: 'Backup',
                description: 'Sistema de backup e restauração'
            });
        }
        
        return items;
    }

    renderNavigation() {
        const navItems = this.getNavigationItems();
        
        return navItems.map(item => {
            const isActive = item.id === this.currentPage;
            const activeClass = isActive 
                ? 'bg-accent-100 text-accent-700 font-medium' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100';
            
            return `
                <a href="${item.href}" 
                   class="text-sm ${activeClass} px-3 py-2 rounded-md transition-colors" 
                   title="${item.description}">
                    ${item.icon} ${item.label}
                </a>
            `;
        }).join('');
    }

    getPageInfo() {
        const pageInfoMap = {
            'dashboard': {
                title: 'Painel Administrativo',
                subtitle: 'Gerencie campeonatos e inscrições',
                showBackButton: false
            },
            'create': {
                title: 'Criar Campeonato',
                subtitle: 'Configure as informações do torneio',
                showBackButton: true
            },
            'tournaments': {
                title: 'Campeonatos Criados',
                subtitle: 'Gerencie todos os seus torneios',
                showBackButton: true
            },
            'players': {
                title: 'Jogadores Únicos',
                subtitle: 'Visualize jogadores consolidados com totais por campeonato',
                showBackButton: true
            },
            'users': {
                title: 'Gerenciamento de Usuários',
                subtitle: 'Adicione e gerencie usuários do sistema',
                showBackButton: true
            },
            'backup': {
                title: 'Sistema de Backup',
                subtitle: 'Gerencie backups e restauração de dados',
                showBackButton: true
            }
        };

        return pageInfoMap[this.currentPage] || pageInfoMap['dashboard'];
    }

    renderBackButton() {
        const pageInfo = this.getPageInfo();
        
        if (!pageInfo.showBackButton) return '';
        
        return `
            <button onclick="AdminHeader.goToAdmin()" 
                    class="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-md hover:bg-gray-100" 
                    title="Voltar ao Dashboard">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                </svg>
            </button>
        `;
    }

    renderMobileMenu() {
        const navItems = this.getNavigationItems();
        
        return `
            <div id="mobileMenu" class="hidden md:hidden absolute top-full left-0 right-0 bg-white border-t border-gray-200 shadow-lg rounded-b-lg">
                <div class="px-4 py-3 space-y-1">
                    ${navItems.map(item => {
                        const isActive = item.id === this.currentPage;
                        const activeClass = isActive 
                            ? 'bg-accent-100 text-accent-700 font-medium' 
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100';
                        
                        return `
                            <a href="${item.href}" 
                               class="block ${activeClass} px-3 py-2 rounded-md transition-colors">
                                ${item.icon} ${item.label}
                            </a>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    render() {
        const pageInfo = this.getPageInfo();
        const isMainPage = this.currentPage === 'dashboard';
        
        return `
            <header class="bg-white shadow-sm border-b border-gray-200 ${isMainPage ? '' : 'rounded-lg mx-4 sm:mx-6 lg:mx-8 mt-6'} mb-6 relative">
                <div class="px-6 py-4">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-4">
                            ${this.renderBackButton()}
                            <div>
                                <h1 class="text-xl font-semibold text-gray-900">${pageInfo.title}</h1>
                                <p class="text-sm text-gray-600 hidden sm:block">${pageInfo.subtitle}</p>
                            </div>
                        </div>
                        
                        <!-- Desktop Navigation -->
                        <nav class="hidden md:flex items-center gap-4">
                            ${this.renderNavigation()}
                        </nav>
                        
                        <!-- Mobile Menu Button -->
                        <button id="mobileMenuBtn" class="md:hidden p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-md hover:bg-gray-100">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                            </svg>
                        </button>
                        
                        <!-- User Actions -->
                        <div class="flex items-center gap-3">
                            <span id="userInfo" class="text-sm text-gray-600 hidden md:block">Admin</span>
                            <button onclick="AdminHeader.logout()" 
                                    class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
                                Sair
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Mobile Menu -->
                ${this.renderMobileMenu()}
            </header>
        `;
    }

    setupEventListeners() {
        // Mobile menu toggle
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const mobileMenu = document.getElementById('mobileMenu');
        
        if (mobileMenuBtn && mobileMenu) {
            mobileMenuBtn.addEventListener('click', () => {
                mobileMenu.classList.toggle('hidden');
            });

            // Close mobile menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!mobileMenuBtn.contains(e.target) && !mobileMenu.contains(e.target)) {
                    mobileMenu.classList.add('hidden');
                }
            });
        }

        // Update user info
        this.updateUserInfo();
    }

    // Static methods for global access
    static logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = '/login.html';
    }

    static goToAdmin() {
        window.location.href = 'index.html';
    }

    static checkAuth() {
        const token = localStorage.getItem('authToken');
        if (!token) {
            window.location.href = '/login.html';
            return false;
        }
        return true;
    }

    static getAuthToken() {
        return localStorage.getItem('authToken');
    }

    static getAuthHeaders() {
        const token = AdminHeader.getAuthToken();
        console.log('🔍 getAuthHeaders - token:', token ? 'Presente' : 'Ausente');
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }

    // Static initialization method
    static init(currentPage = null) {
        // Check authentication first
        if (!AdminHeader.checkAuth()) {
            return false;
        }

        // Find header container and render
        const headerContainer = document.getElementById('adminHeader');
        if (headerContainer) {
            const adminHeader = new AdminHeader();
            if (currentPage) {
                adminHeader.currentPage = currentPage;
            }
            headerContainer.innerHTML = adminHeader.render();
            
            // Setup event listeners after DOM is updated
            setTimeout(() => {
                adminHeader.setupEventListeners();
            }, 0);
            
            console.log('✅ AdminHeader inicializado para página:', adminHeader.currentPage);
            return true;
        } else {
            console.log('❌ Container adminHeader não encontrado');
            return false;
        }
    }
}

// Initialize header when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication first
    if (!AdminHeader.checkAuth()) {
        return;
    }

    // Find header container and render
    const headerContainer = document.getElementById('adminHeader');
    if (headerContainer) {
        const adminHeader = new AdminHeader();
        headerContainer.innerHTML = adminHeader.render();
        
        // Setup event listeners after DOM is updated
        setTimeout(() => {
            adminHeader.setupEventListeners();
        }, 0);
    }
});

// Export for use in other scripts
window.AdminHeader = AdminHeader;
