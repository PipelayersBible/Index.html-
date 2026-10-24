// A company pipelayer as the live server answers: no personal subscriptions row, a company_members row (role
// pipelayer) joined to an ACTIVE company. Installed after roles_lib's mocks (wraps window.supabase once more).
module.exports = () => {
  const d = Object.getOwnPropertyDescriptor(window, 'supabase');
  Object.defineProperty(window, 'supabase', { configurable: true, get() { const s = d.get(); return { createClient: (...a) => {
    const c = s.createClient(...a), from = c.from;
    c.from = (t) => {
      if (t === 'subscriptions') { const q = { select() { return q; }, eq() { return q; }, maybeSingle: async () => ({ data: null, error: null }) }; return q; }
      if (t === 'company_members') { const q = { select() { return q; }, eq() { return q; }, maybeSingle: async () => ({ data: { company_id: 'c1', role: localStorage.getItem('__role') || 'pipelayer', companies: { name: 'DIG Civil Construction', status: 'active' } }, error: null }) }; return q; }
      return from(t);
    };
    return c; } }; }, set(v) {} });
};
