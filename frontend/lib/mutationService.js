import { mutate } from 'swr';
import { getTicketInfo } from './contractService';

// Local ticket cache to optimize performance
let ticketsCache = new Map();

// Initialize cache from localStorage if available
if (typeof window !== 'undefined') {
  try {
    const savedCache = localStorage.getItem('adrenaline_tickets_cache');
    if (savedCache) {
      const parsed = JSON.parse(savedCache);
      if (parsed && typeof parsed === 'object') {
        // Convert object back to Map
        ticketsCache = new Map(Object.entries(parsed));
      }
    }
  } catch (err) {
    console.warn('Failed to load tickets cache from localStorage', err);
  }
}

// Save cache to localStorage
const persistCache = () => {
  if (typeof window !== 'undefined') {
    try {
      // Convert Map to object for JSON serialization
      const cacheObject = Object.fromEntries(ticketsCache);
      localStorage.setItem('adrenaline_tickets_cache', JSON.stringify(cacheObject));
    } catch (err) {
      console.warn('Failed to save tickets cache to localStorage', err);
    }
  }
};

// Add or update a ticket in the cache
export const updateTicketCache = (ticketId, ticketData) => {
  if (!ticketId || !ticketData) return;
  
  // Update local cache
  ticketsCache.set(ticketId.toString(), {
    ...ticketData,
    cachedAt: Date.now()
  });
  
  // Update SWR cache
  mutate(['ticket', ticketId.toString()], ticketData, false);
  
  // Persist to localStorage
  persistCache();
};

// Invalidate a ticket in the cache (force refetch on next request)
export const invalidateTicketCache = (ticketId) => {
  if (!ticketId) return;
  
  // Remove from local cache
  ticketsCache.delete(ticketId.toString());
  
  // Revalidate SWR cache (forces refetch)
  mutate(['ticket', ticketId.toString()]);
  
  // Persist to localStorage
  persistCache();
};

// Get a ticket from cache or fetch it
export const getTicketWithCache = async (ticketId) => {
  if (!ticketId) return null;
  
  const stringId = ticketId.toString();
  
  // Check cache first
  const cachedTicket = ticketsCache.get(stringId);
  
  // If cached and not too old (5 minutes), return it
  if (cachedTicket && (Date.now() - cachedTicket.cachedAt < 5 * 60 * 1000)) {
    return cachedTicket;
  }
  
  // Otherwise fetch fresh data
  try {
    const result = await getTicketInfo(stringId);
    
    if (result.success) {
      // Update cache with fresh data
      updateTicketCache(stringId, result.ticketInfo);
      return result.ticketInfo;
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching ticket ${stringId} for cache:`, error);
    return cachedTicket || null; // Return cached version if available, otherwise null
  }
};

// Clear entire cache (used for debugging or after major changes)
export const clearTicketCache = () => {
  ticketsCache.clear();
  
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('adrenaline_tickets_cache');
    } catch (err) {
      console.warn('Failed to clear tickets cache from localStorage', err);
    }
  }
};

// Service for ticket mutations with optimistic cache updates
export const ticketMutations = {
  // Lock a ticket
  lockTicket: async (tokenId, centerCode, reservationDate) => {
    // Convert tokenId to number for consistency
    tokenId = Number(tokenId);
    
    // Get the current ticket (from API or cache)
    let ticket;
    try {
      const cachedTicket = ticketsCache.get(tokenId.toString());
      if (cachedTicket) {
        ticket = { ...cachedTicket };
      } else {
        const result = await getTicketInfo(tokenId);
        if (result.success) {
          ticket = result.ticketInfo;
        }
      }
    } catch (error) {
      console.error("Error while retrieving ticket", error);
    }
    
    if (!ticket) return;
    
    // Optimistic ticket update
    const optimisticTicket = {
      ...ticket,
      status: 1, // Locked
      centerCode: centerCode,
      reservationDate: reservationDate
    };
    
    // Update local cache
    updateTicketCache(tokenId.toString(), optimisticTicket);
    
    // Update global SWR cache for all-tickets
    mutate('all-tickets', prevTickets => {
      if (!prevTickets) return [];
      
      return prevTickets.map(t => 
        t.id === tokenId.toString() ? optimisticTicket : t
      );
    }, false);
    
    // Revalidate any ticket-by-id cache that might include this ticket
    mutate(key => {
      return Array.isArray(key) && 
        key[0] === 'tickets-by-id' && 
        key[1] && key[1].includes(tokenId.toString());
    });
  },
  
  // Unlock a ticket
  unlockTicket: async (tokenId) => {
    // Convert tokenId to number for consistency
    tokenId = Number(tokenId);
    
    // Get the current ticket (from API or cache)
    let ticket;
    try {
      const cachedTicket = ticketsCache.get(tokenId.toString());
      if (cachedTicket) {
        ticket = { ...cachedTicket };
      } else {
        const result = await getTicketInfo(tokenId);
        if (result.success) {
          ticket = result.ticketInfo;
        }
      }
    } catch (error) {
      console.error("Error while retrieving ticket", error);
    }
    
    if (!ticket) return;
    
    // Optimistic ticket update
    const optimisticTicket = {
      ...ticket,
      status: 0, // Available
      center: null
    };
    
    // Update local cache
    updateTicketCache(tokenId.toString(), optimisticTicket);
    
    // Update global SWR cache for all-tickets
    mutate('all-tickets', prevTickets => {
      if (!prevTickets) return [];
      
      return prevTickets.map(t => 
        t.id === tokenId.toString() ? optimisticTicket : t
      );
    }, false);
    
    // Revalidate any ticket-by-id cache that might include this ticket
    mutate(key => {
      return Array.isArray(key) && 
        key[0] === 'tickets-by-id' && 
        key[1] && key[1].includes(tokenId.toString());
    });
  },
  
  // Use a ticket (change to collector)
  useTicket: async (tokenId) => {
    // Convert tokenId to number for consistency
    tokenId = Number(tokenId);
    
    // Get the current ticket (from API or cache)
    let ticket;
    try {
      const cachedTicket = ticketsCache.get(tokenId.toString());
      if (cachedTicket) {
        ticket = { ...cachedTicket };
      } else {
        const result = await getTicketInfo(tokenId);
        if (result.success) {
          ticket = result.ticketInfo;
        }
      }
    } catch (error) {
      console.error("Error while retrieving ticket", error);
    }
    
    if (!ticket) return;
    
    // Optimistic ticket update
    const optimisticTicket = {
      ...ticket,
      status: 4, // Collector
    };
    
    // Update local cache
    updateTicketCache(tokenId.toString(), optimisticTicket);
    
    // Update global SWR cache for all-tickets
    mutate('all-tickets', prevTickets => {
      if (!prevTickets) return [];
      
      return prevTickets.map(t => 
        t.id === tokenId.toString() ? optimisticTicket : t
      );
    }, false);
    
    // Revalidate any ticket-by-id cache that might include this ticket
    mutate(key => {
      return Array.isArray(key) && 
        key[0] === 'tickets-by-id' && 
        key[1] && key[1].includes(tokenId.toString());
    });
  },
  
  // Create a new ticket
  createTicket: async (newTicket) => {
    // Update local cache
    updateTicketCache(newTicket.id.toString(), newTicket);
    
    // Update global SWR cache
    mutate('all-tickets', prevTickets => {
      if (!prevTickets) return [newTicket];
      return [...prevTickets, newTicket];
    }, false);
  },
  
  // Refresh all tickets cache
  invalidateCache: () => {
    // Reset local cache
    clearTicketCache();
    
    // Force SWR to revalidate
    mutate('all-tickets');
  }
};

export default {
  updateTicketCache,
  invalidateTicketCache,
  getTicketWithCache,
  clearTicketCache,
  ticketMutations
}; 