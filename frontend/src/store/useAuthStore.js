import { create } from 'zustand';
import { persist } from 'zustand/middleware'; // Middleware for persistent storage

// The persist function automatically synchronizes the store with localStorage
export const useAuthStore = create(
    persist(
        (set) => ({
            // Default states
            user: null,
            token: null,

            // Update state on login; the persist middleware handles localStorage automatically
            loginSuccess: (userData, authToken) => {
                set({ user: userData, token: authToken });
            },

            // Clear state on logout
            logout: () => {
                set({ user: null, token: null });
            }
        }),
        {
            name: 'nexus-auth-storage', // The key name used to store data in the browser's localStorage
        }
    )
);