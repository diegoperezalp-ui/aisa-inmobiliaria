const windows = new Map();

// Lightweight per-process limit for the single Render API instance.
export const rateLimit = ({ limit, windowMs, message = 'Demasiadas solicitudes. Intenta de nuevo más tarde.' }) => {
  return (req, res, next) => {
    const now = Date.now();
    const key = `${req.baseUrl}${req.route?.path || req.path}:${req.ip || req.socket.remoteAddress || 'unknown'}`;
    let window = windows.get(key);

    if (!window || now >= window.resetAt) {
      window = { count: 0, resetAt: now + windowMs };
      windows.set(key, window);
    }

    window.count += 1;
    if (windows.size > 10000) {
      for (const [entryKey, entry] of windows) {
        if (now >= entry.resetAt) windows.delete(entryKey);
      }
    }

    res.set('RateLimit-Limit', String(limit));
    res.set('RateLimit-Remaining', String(Math.max(0, limit - window.count)));
    res.set('RateLimit-Reset', String(Math.ceil(window.resetAt / 1000)));

    if (window.count > limit) {
      res.set('Retry-After', String(Math.max(1, Math.ceil((window.resetAt - now) / 1000))));
      return res.status(429).json({ success: false, message });
    }

    return next();
  };
};
