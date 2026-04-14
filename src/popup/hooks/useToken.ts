import { useEffect, useState } from 'react';
import { getStoredAuth } from '../../lib/auth';

export function useToken(): string | null {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { token } = await getStoredAuth();
      if (!cancelled) setToken(token);
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return token;
}
