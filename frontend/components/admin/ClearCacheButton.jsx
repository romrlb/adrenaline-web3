import { useCallback } from 'react';
import { useSWRConfig } from 'swr';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button"


/**
 * Hook that provides a function to clear all caches (SWR + localStorage)
 * and revalidate the tickets.
 */
function useClearCache() {
  const { mutate } = useSWRConfig();  // access to SWR mutate (global context)

  // useCallback to memorize the same function (avoiding unnecessary re-renders)
  const clearAllCaches = useCallback(() => {
    // 1. Clear SWR cache (all entries)
    mutate(() => true, undefined, { revalidate: false });
    // 2. Clear custom localStorage cache
    if (typeof window !== 'undefined') {
      localStorage.removeItem('adrenaline_tickets_cache');
    }
    // 3. Force revalidation of "all-tickets" data
    mutate('all-tickets');
    // 4. Confirmation notification 
    toast('✅ Caches réinitialisés avec succès');
  }, [mutate]);

  return clearAllCaches;
}

function ClearCacheButton() {
  const clearCache = useClearCache();
  return (
    <Button onClick={clearCache} variant="outline" className="ml-auto">
      Réinitialiser le cache
    </Button>
  );
}

export default ClearCacheButton;
