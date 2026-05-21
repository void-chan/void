/**
 * src/hooks/useApi.js
 *
 * Generic async state hook for API calls.
 * Reduces boilerplate: loading/error/data state + execute function.
 *
 * Usage:
 *  const { data, loading, error, execute } = useApi(api.get, '/uploads');
 *  useEffect(() => { execute(); }, [execute]);
 */

import { useState, useCallback } from 'react';

export function useApi(apiFunction, ...defaultArgs) {
  const [state, setState] = useState({
    data:    null,
    loading: false,
    error:   null,
  });

  const execute = useCallback(
    async (...args) => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const callArgs = args.length > 0 ? args : defaultArgs;
        const { ok, data } = await apiFunction(...callArgs);
        if (!ok) {
          setState({ data: null, loading: false, error: data.message ?? 'Request failed.' });
          return { ok: false, data };
        }
        setState({ data: data.data, loading: false, error: null });
        return { ok: true, data: data.data };
      } catch (err) {
        setState({ data: null, loading: false, error: 'Network error. Is the server running?' });
        return { ok: false, data: null };
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiFunction, ...defaultArgs]
  );

  return { ...state, execute };
}
