import { writable } from 'svelte/store';
import { supabase } from '$lib/supabase';

function createCampSitesStore() {
    const { subscribe, set, update } = writable([]);
    
    return {
        subscribe,
        initialize() {
            console.log('Initializing camp sites store');
            
            // Set up realtime subscription
            const subscription = supabase
                .channel('public:camp_sites')
                .on('postgres_changes', 
                    { 
                        event: '*', 
                        schema: 'public', 
                        table: 'camp_sites' 
                    },
                    (payload) => {
                        console.log('Realtime update:', payload);
                        this.loadSites(); // Reload all sites on any change
                    }
                )
                .subscribe();

            // Initial load
            this.loadSites();

            return () => {
                subscription.unsubscribe();
            };
        },

        async loadSites() {
            console.log('Loading sites');
            const { data, error } = await supabase
                .from('camp_sites')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error loading camp sites:', error);
                return [];
            }

            set(data || []);
            return data;
        },

        async addSite({ name, description, latitude, longitude }) {
            console.log('Adding site:', { name, latitude, longitude });
            const { data, error } = await supabase
                .from('camp_sites')
                .insert([
                    { name, description, latitude, longitude }
                ])
                .select()
                .single();

            if (error) {
                console.error('Error adding camp site:', error);
                return null;
            }

            // Update local store immediately
            update(sites => [data, ...sites]);
            return data;
        },

        async updateSite(id, updates) {
            console.log('Updating site:', id, updates);
            const { data, error } = await supabase
                .from('camp_sites')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                console.error('Error updating camp site:', error);
                return null;
            }

            // Update local store immediately
            update(sites => 
                sites.map(site => site.id === id ? data : site)
            );
            return data;
        },

        async deleteSite(id) {
            console.log('Deleting site:', id);
            const { error } = await supabase
                .from('camp_sites')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Error deleting camp site:', error);
                return false;
            }

            // Update local store immediately
            update(sites => sites.filter(site => site.id !== id));
            return true;
        }
    };
}

export const campSitesStore = createCampSitesStore();