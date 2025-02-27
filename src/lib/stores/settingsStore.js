import { writable } from 'svelte/store';
import { supabase } from '$lib/supabase';
import { browser } from '$app/environment';

export const defaults = {
  id: 1, // Assuming the unique identifier for the settings record is 1
  app: {
      focusZoomLevel: 16,
      defaultZoomLevel: 13,
      theme: 'system'
  },
  user: {}  // Changed from user to user_data
};

function createSettingsStore() {
    const { subscribe, set, update } = writable(defaults);
    
    // Function to get the current OS theme
    function getOSTheme() {
      if (!browser) return 'light'; // Default to light for SSR
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    // Function to apply theme
    function applyTheme(theme) {
      if (!browser) return;
      
      if (theme === 'system') {
        theme = getOSTheme();
      }
      
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(theme);
    }
    
    // Define loadSettings as a standalone function inside store
    async function loadSettings() {
        console.log('Loading settings');
        try {
          const { data, error } = await supabase
            .from('settings')
            .select('*')
            .eq('id', defaults.id)  // Filter by the unique identifier
            .single();  // Use .single() to enforce a single row
      
          if (error) {
            // If no rows are found, create default settings
            if (error.code === 'PGRST116') {
              console.log('No settings found, creating defaults');
              const { data: newData, error: insertError } = await supabase
                .from('settings')
                .insert([defaults])  // Insert the defaults with the unique identifier
                .select()
                .single();
      
              if (insertError) {
                console.error('Error creating default settings:', insertError);
                set(defaults);
                return;
              }
      
              console.log('Default settings created:', newData);
              set(newData);
              applyTheme(newData.app.theme);
              return;
            }
            set(defaults);
            applyTheme(defaults.app.theme);
            return;
          }
      
          // If data is successfully loaded
          set(data);
          applyTheme(data.app.theme);
        } catch (err) {
          console.error('Unexpected error in loadSettings:', err);
          set(defaults);
          applyTheme(defaults.app.theme);
        }
    }

    // Add a method to change theme
    function changeTheme(newTheme) {
      update(settings => {
        const updatedSettings = {
          ...settings,
          app: {
            ...settings.app,
            theme: newTheme
          }
        };
        
        // Save theme to localStorage
        if (browser) {
          localStorage.setItem('app-theme', newTheme);
        }
        
        // Persist theme change to Supabase
        supabase
          .from('settings')
          .update({ app: updatedSettings.app })
          .eq('id', updatedSettings.id)
          .then(({ error }) => {
            if (error) console.error('Error updating theme:', error);
          });
        
        applyTheme(newTheme);
        return updatedSettings;
      });
    }

    // Listen for OS theme changes when 'system' theme is active
    if (browser) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleThemeChange = () => {
        subscribe(settings => {
          if (settings.app.theme === 'system') {
            applyTheme('system');
          }
        });
      };

      mediaQuery.addEventListener('change', handleThemeChange);
    }

    return {
        subscribe,
        initialize: async () => {
            console.log('Initializing settings store');
            
            // Set up realtime subscription
            const subscription = supabase
                .channel('public:settings')
                .on('postgres_changes', 
                    { 
                        event: '*', 
                        schema: 'public', 
                        table: 'settings' 
                    },
                    (payload) => {
                        console.log('Settings updated:', payload);
                        loadSettings();
                    }
                )
                .subscribe();

            await loadSettings();
            return () => subscription.unsubscribe();
        },

        updateAppOption: async (key, value) => {
            update(store => {
                const newStore = {
                    ...store,
                    app: { ...store.app, [key]: value }
                };

                // Update Supabase
                supabase
                    .from('settings')
                    .upsert({
                        id: defaults.id,  // Include the unique identifier
                        app: newStore.app,
                        user: newStore.user
                    })
                    .then(({ error }) => {
                        if (error) {
                            console.error('Error updating settings:', error);
                        }
                    });

                return newStore;
            });
        },

        updateUserOption: async (key, value) => {
            update(store => {
                const newStore = {
                    ...store,
                    user: { ...store.user, [key]: value }
                };

                // Update Supabase
                supabase
                    .from('settings')
                    .upsert({
                        id: defaults.id,  // Include the unique identifier
                        app: newStore.app,
                        user: newStore.user
                    })
                    .then(({ error }) => {
                        if (error) {
                            console.error('Error updating settings:', error);
                        }
                    });

                return newStore;
            });
        },

        reset: async () => {
            const { error } = await supabase
                .from('settings')
                .upsert({
                    id: defaults.id,  // Include the unique identifier
                    app: defaults.app,
                    user: defaults.user
                });

            if (error) {
                console.error('Error resetting settings:', error);
            } else {
                console.log('Updated supabase',defaults)
            }

            set(defaults);
        },
        changeTheme
    };
}

export const settings = createSettingsStore();