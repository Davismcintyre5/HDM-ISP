const STATUS_DEFAULTS = {
  401: 'Session expired. Please sign in again.',
  403: 'You do not have permission for this action.',
  404: 'Not found.',
  409: 'Already exists.',
  429: 'Too many requests. Try again shortly.',
  500: 'Server error.',
  502: 'Upstream service unavailable.',
};

export const errors = {
  isNetwork(err) {
    return !err?.response;
  },
  isUnauthorized(err) {
    return err?.response?.status === 401;
  },
  fromAxios(err) {
    if (!err) return { message: 'Something went wrong', code: null, requestId: null, status: null };
    if (!err.response) {
      const message = err.code === 'ECONNABORTED'
        ? 'Request timed out.'
        : 'Network error. Check your connection.';
      return { message, code: err.code || 'NETWORK', requestId: null, status: null };
    }
    const { status, data } = err.response;
    const message = data?.message || STATUS_DEFAULTS[status] || 'Something went wrong.';
    if (data?.requestId) console.debug('[api] requestId', data.requestId);
    return { message, code: data?.code || null, requestId: data?.requestId || null, status };
  },
};