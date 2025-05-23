import {create} from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid'; // For generating unique tab IDs

const createNewTab = (nameSuffix = 0, content = '') => ({
  id: uuidv4(),
  name: `Query ${nameSuffix}`,
  sql: content,
  connectionId: null, // Specific connection for this tab, null uses global
  // lastSavedSql: content, // For checking if there are unsaved changes
});

const useQueryTabStore = create(
  persist(
    (set, get) => ({
      tabs: [], // Array of tab objects { id, name, sql, connectionId }
      activeTabId: null,

      addTab: (content = '') => {
        const newTab = createNewTab(get().tabs.length + 1, content);
        set((state) => ({
          tabs: [...state.tabs, newTab],
          activeTabId: newTab.id, // Make the new tab active
        }));
        return newTab;
      },

      removeTab: (tabId) => {
        set((state) => {
          const newTabs = state.tabs.filter((tab) => tab.id !== tabId);
          let newActiveTabId = state.activeTabId;
          if (state.activeTabId === tabId) {
            // If the active tab is being removed, set the new active tab
            // to the previous one, or the first one if no previous.
            const removedTabIndex = state.tabs.findIndex(t => t.id === tabId);
            if (newTabs.length > 0) {
              newActiveTabId = newTabs[Math.max(0, removedTabIndex -1)]?.id || newTabs[0]?.id;
            } else {
              newActiveTabId = null; // No tabs left
            }
          }
          // If no tabs are left after removal, create a new default one
          if (newTabs.length === 0) {
            const defaultTab = createNewTab(1);
            return { tabs: [defaultTab], activeTabId: defaultTab.id };
          }
          return { tabs: newTabs, activeTabId: newActiveTabId };
        });
      },

      setActiveTab: (tabId) => {
        set({ activeTabId: tabId });
      },

      updateTabContent: (tabId, sqlContent) => {
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === tabId ? { ...tab, sql: sqlContent } : tab
          ),
        }));
      },

      updateTabName: (tabId, newName) => {
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === tabId ? { ...tab, name: newName } : tab
          ),
        }));
      },
      
      updateTabConnection: (tabId, connectionId) => {
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === tabId ? { ...tab, connectionId: connectionId } : tab
          ),
        }));
      },

      // Initialize with one tab if none exist (e.g., on first load)
      initializeTabs: () => {
        if (get().tabs.length === 0) {
          const firstTab = createNewTab(1);
          set({ tabs: [firstTab], activeTabId: firstTab.id });
        } else if (!get().activeTabId && get().tabs.length > 0) {
          // Ensure an active tab is set if tabs exist but no activeId (e.g. after clearing storage partially)
          set({ activeTabId: get().tabs[0].id });
        }
      },
    }),
    {
      name: 'query-tab-storage',
      storage: createJSONStorage(() => localStorage),
      // Persist all tab data. Users expect their queries to be there.
      // onRehydrateStorage: (state) => {
      //   console.log("Rehydrated queryTabStore:", state);
      //   // Can perform actions after rehydration, e.g. ensure at least one tab
      //   if (state && state.tabs && state.tabs.length === 0) {
      //       const firstTab = createNewTab(1);
      //       state.tabs = [firstTab];
      //       state.activeTabId = firstTab.id;
      //   }
      // }
    }
  )
);

// Call initializeTabs when the store is created/loaded for the first time
// This ensures there's always at least one tab.
useQueryTabStore.getState().initializeTabs();


export default useQueryTabStore;
