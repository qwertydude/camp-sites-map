import { settings } from './stores/settings';

function applyTheme(theme) {
    if (typeof window === 'undefined') return;
    
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = theme === 'dark' || (theme === 'system' && prefersDark);
    
    if (isDark) {
        document.body.classList.add('dark');
    } else {
        document.body.classList.remove('dark');
    }
}

let currentTheme = 'system';

// Watch for theme changes
settings.subscribe(state => {
    currentTheme = state.user.theme;
    applyTheme(currentTheme);
});

// Watch for system theme changes
if (typeof window !== 'undefined') {
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    darkModeMediaQuery.addEventListener('change', (e) => {
        applyTheme(currentTheme);
    });
}
