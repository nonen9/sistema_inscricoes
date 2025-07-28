// Authentication utility functions for protected pages
(function() {
    'use strict';
    
    // Check if this is a protected page (admin pages)
    const currentPath = window.location.pathname;
    const isProtectedPage = currentPath.includes('/admin') || 
                           currentPath.includes('/registrations/') || 
                           currentPath.includes('/players.html');
    
    // Authentication helper functions
    window.getAuthToken = function() {
        return localStorage.getItem('authToken');
    };

    window.getAuthHeaders = function() {
        const token = window.getAuthToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    };

    window.logout = function() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = '/login.html';
    };

    window.checkAuth = function() {
        const token = window.getAuthToken();
        if (!token) {
            if (isProtectedPage) {
                window.location.href = '/login.html';
            }
            return false;
        }
        return true;
    };

    // Auto-check authentication on protected pages
    if (isProtectedPage) {
        window.checkAuth();
    }

    // Handle unauthorized responses globally
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        return originalFetch.apply(this, args)
            .then(response => {
                if (response.status === 401 && isProtectedPage) {
                    window.logout();
                }
                return response;
            });
    };
})();
