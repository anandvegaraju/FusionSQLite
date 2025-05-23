import useQueryTabStore from '../queryTabStore';
import { act } from '@testing-library/react';

// Helper to reset store state
const resetQueryTabStore = () => {
  act(() => {
    // Forcing reset to initial state as defined in the store, including the initializeTabs logic
    useQueryTabStore.setState(useQueryTabStore.getInitialState ? useQueryTabStore.getInitialState() : {
        tabs: [],
        activeTabId: null,
    }, true); // 'true' replaces the entire state

    // Call initializeTabs again because replacing state might bypass the initial auto-call
    useQueryTabStore.getState().initializeTabs();
    localStorage.removeItem('query-tab-storage'); // Clear persisted state
    // Rehydrate if persist middleware is active to simulate fresh load
    act(() => {
      useQueryTabStore.persist.rehydrate();
    });
    // Call initializeTabs again AFTER rehydrate to ensure it runs on potentially empty persisted state
     act(() => {
       useQueryTabStore.getState().initializeTabs();
    });
  });
};


describe('Query Tab Store', () => {
  beforeEach(() => {
    resetQueryTabStore();
  });
  
  afterEach(() => {
    localStorage.removeItem('query-tab-storage');
  });

  it('should initialize with one default tab', () => {
    const { tabs, activeTabId } = useQueryTabStore.getState();
    expect(tabs.length).toBe(1);
    expect(tabs[0].name).toBe('Query 1');
    expect(tabs[0].sql).toBe('');
    expect(activeTabId).toBe(tabs[0].id);
  });

  describe('addTab Action', () => {
    it('should add a new tab and make it active', () => {
      act(() => {
        useQueryTabStore.getState().addTab('SELECT * FROM DUAL;');
      });
      
      const { tabs, activeTabId } = useQueryTabStore.getState();
      expect(tabs.length).toBe(2); // Initial + new one
      const newTab = tabs[1];
      expect(newTab.name).toBe('Query 2'); // Default naming convention
      expect(newTab.sql).toBe('SELECT * FROM DUAL;');
      expect(activeTabId).toBe(newTab.id);
    });
  });

  describe('removeTab Action', () => {
    let firstTabId, secondTabId;
    beforeEach(() => {
      act(() => {
        // Start with two tabs
        useQueryTabStore.getState().addTab('SELECT 1;'); // This becomes Query 2
        const tabs = useQueryTabStore.getState().tabs;
        firstTabId = tabs[0].id;
        secondTabId = tabs[1].id;
        useQueryTabStore.getState().setActiveTab(secondTabId); // Make second tab active
      });
    });

    it('should remove a tab and activate the previous one', () => {
      act(() => {
        useQueryTabStore.getState().removeTab(secondTabId);
      });
      
      const { tabs, activeTabId } = useQueryTabStore.getState();
      expect(tabs.length).toBe(1);
      expect(tabs.find(t => t.id === secondTabId)).toBeUndefined();
      expect(activeTabId).toBe(firstTabId); // Active tab switched to the remaining one
    });

    it('should remove a tab and activate the next one if the first is removed', () => {
        act(() => {
            useQueryTabStore.getState().setActiveTab(firstTabId); // Make first tab active
            useQueryTabStore.getState().removeTab(firstTabId);
        });
        const { tabs, activeTabId } = useQueryTabStore.getState();
        expect(tabs.length).toBe(1);
        expect(activeTabId).toBe(secondTabId); // Should activate the remaining tab (which was second)
    });


    it('should re-create a default tab if all tabs are removed', () => {
      act(() => {
        useQueryTabStore.getState().removeTab(firstTabId);
        useQueryTabStore.getState().removeTab(secondTabId); // Remove the last tab
      });
      
      const { tabs, activeTabId } = useQueryTabStore.getState();
      expect(tabs.length).toBe(1); // A new default tab should be created
      expect(tabs[0].name).toBe('Query 1');
      expect(activeTabId).toBe(tabs[0].id);
    });
  });

  describe('setActiveTab Action', () => {
    it('should set the active tab ID', () => {
      let newTab;
      act(() => {
        newTab = useQueryTabStore.getState().addTab();
      });
      act(() => {
        useQueryTabStore.getState().setActiveTab(newTab.id);
      });
      expect(useQueryTabStore.getState().activeTabId).toBe(newTab.id);
    });
  });

  describe('updateTabContent Action', () => {
    it('should update the SQL content of a specific tab', () => {
      const initialTabId = useQueryTabStore.getState().tabs[0].id;
      const newSql = 'SELECT * FROM customers;';
      act(() => {
        useQueryTabStore.getState().updateTabContent(initialTabId, newSql);
      });
      
      const updatedTab = useQueryTabStore.getState().tabs.find(t => t.id === initialTabId);
      expect(updatedTab.sql).toBe(newSql);
    });
  });
  
  describe('updateTabName Action', () => {
    it('should update the name of a specific tab', () => {
      const initialTabId = useQueryTabStore.getState().tabs[0].id;
      const newName = 'My Custom Query';
      act(() => {
        useQueryTabStore.getState().updateTabName(initialTabId, newName);
      });
      const updatedTab = useQueryTabStore.getState().tabs.find(t => t.id === initialTabId);
      expect(updatedTab.name).toBe(newName);
    });
  });

  describe('updateTabConnection Action', () => {
    it('should update the connection ID of a specific tab', () => {
      const initialTabId = useQueryTabStore.getState().tabs[0].id;
      const newConnectionId = 'conn-123';
      act(() => {
        useQueryTabStore.getState().updateTabConnection(initialTabId, newConnectionId);
      });
      const updatedTab = useQueryTabStore.getState().tabs.find(t => t.id === initialTabId);
      expect(updatedTab.connectionId).toBe(newConnectionId);
    });
  });
  
  describe('initializeTabs with persisted state', () => {
    it('should not override persisted tabs if they exist', () => {
      const persistedTabs = [
        { id: 'p1', name: 'Persisted Query 1', sql: 'SELECT P1', connectionId: null },
        { id: 'p2', name: 'Persisted Query 2', sql: 'SELECT P2', connectionId: 'conn-abc' },
      ];
      // Simulate persisted state
      localStorage.setItem('query-tab-storage', JSON.stringify({
        state: { tabs: persistedTabs, activeTabId: 'p2' },
        version: 0 // Assuming version 0 if not specified by persist config
      }));
      
      act(() => {
        useQueryTabStore.persist.rehydrate();
        useQueryTabStore.getState().initializeTabs(); // Call initialize explicitly after rehydrate
      });

      const { tabs, activeTabId } = useQueryTabStore.getState();
      expect(tabs.length).toBe(2);
      expect(tabs[0].id).toBe('p1');
      expect(tabs[1].id).toBe('p2');
      expect(activeTabId).toBe('p2');
    });

    it('should set activeTabId to the first tab if persisted activeTabId is invalid but tabs exist', () => {
        const persistedTabs = [
            { id: 'p1', name: 'Persisted Query 1', sql: 'SELECT P1', connectionId: null },
        ];
        localStorage.setItem('query-tab-storage', JSON.stringify({
            state: { tabs: persistedTabs, activeTabId: 'invalid-id' }, // Invalid activeTabId
            version: 0
        }));

        act(() => {
            useQueryTabStore.persist.rehydrate();
            useQueryTabStore.getState().initializeTabs();
        });
        
        const { tabs, activeTabId } = useQueryTabStore.getState();
        expect(tabs.length).toBe(1);
        expect(activeTabId).toBe('p1'); // Should default to the first available tab
    });
  });
});
