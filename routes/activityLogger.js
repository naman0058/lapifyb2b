// utils/activityLogger.js

function safeStringify(obj) {
  try {
    return obj ? JSON.stringify(obj) : null;
  } catch {
    return null;
  }
}

// Remove noisy or sensitive keys from logs (customize as needed)
function sanitizeQuery(query = {}) {
  const clone = { ...query };
  delete clone.token;
  delete clone.authorization;
  delete clone.password;
  return clone;
}

function getUserId(req) {
  // Prefer authenticated user if you have it (JWT middleware etc.)
  const fromAuth = req.user?.id || req.user?.userid;
  if (fromAuth) return Number(fromAuth);

  // Your routes are passing userid in query
  const fromQuery = req.query?.userid;
  if (fromQuery !== undefined && fromQuery !== null && String(fromQuery).trim() !== '') {
    const n = Number(fromQuery);
    return Number.isFinite(n) ? n : null;
  }

  return null;
}

function getClientIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (xf) return String(xf).split(',')[0].trim();
  return req.ip || req.connection?.remoteAddress || null;
}

/**
 * Factory middleware: logs after response finishes (non-blocking)
 *
 * @param {string} event - e.g. "search", "product_view"
 * @param {(req) => object} metaBuilder - returns { category, product_id, search_q, ... } etc
 * @param {object} deps - { queryAsync } injected dependency
 */
function createActivityLogger(event, metaBuilder, deps) {
  const { queryAsync } = deps;

  return (req, res, next) => {
    const startedAt = Date.now();

    res.on('finish', () => {
      // Log even for 304 (your logs show 304), so do not exclude it.
      const durationMs = Date.now() - startedAt;

      const userid = getUserId(req);
      const route = `${req.baseUrl || ''}${req.path || ''}`;
      const method = req.method;
      const statusCode = res.statusCode;

      const meta = metaBuilder ? metaBuilder(req) : {};
      const sanitizedQuery = sanitizeQuery(req.query || {});

      const row = {
        userid,
        event,
        route,
        method,
        status_code: statusCode,
        duration_ms: durationMs,

        category: meta.category || null,
        product_id: meta.product_id || null,
        search_q: meta.search_q || null,

        query_json: safeStringify(sanitizedQuery), // if JSON column, MySQL will accept string; better: pass object if driver supports it
        meta: safeStringify(meta),

        ip: getClientIp(req),
        user_agent: (req.get && req.get('user-agent')) || req.headers['user-agent'] || null,
        referrer: (req.get && req.get('referer')) || req.headers['referer'] || null
      };

      // Non-blocking insert
      setImmediate(async () => {
        try {
          await queryAsync(`INSERT INTO user_activity_log SET ?`, row);
        } catch (err) {
          // never break the API because of logging
          console.error('user_activity_log insert error:', err?.message || err);
        }
      });
    });

    next();
  };
}

module.exports = { createActivityLogger };
