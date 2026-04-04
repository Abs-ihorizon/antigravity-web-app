class OdooClient {
  constructor() {
    this.baseUrl = localStorage.getItem('odoo_server') || '';
    this.db = localStorage.getItem('odoo_db') || '';
    const storedUid = localStorage.getItem('odoo_uid');
    this.uid = storedUid && storedUid !== 'null' ? parseInt(storedUid, 10) : null;
    this.session_id = localStorage.getItem('odoo_session_id') || null;
  }

  async rpcCall(endpoint, params) {
    if (!this.baseUrl) throw new Error("No server URL configured");

    const payload = {
      jsonrpc: "2.0",
      method: "call",
      params: params,
      id: Math.floor(Math.random() * 1000 * 1000 * 1000)
    };

    const headers = { 'Content-Type': 'application/json' };
    
    // We use relative paths in development so Vite can proxy them securely, ignoring baseUrl
    const url = this.session_id 
      ? `${endpoint}?session_id=${this.session_id}` 
      : `${endpoint}`;

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    
    if (data.error) {
      throw new Error(data.error.data?.message || data.error.message || "Odoo RPC Error");
    }
    
    return data.result;
  }

  async login(url, db, login, password) {
    this.baseUrl = url.replace(/\/$/, "");
    this.db = db;
    
    const result = await this.rpcCall('/web/session/authenticate', {
      db: this.db,
      login: login,
      password: password
    });

    if (!result || !result.uid) {
      throw new Error("Authentication failed: Incorrect credentials or database.");
    }

    this.uid = result.uid;
    this.session_id = result.session_id;

    localStorage.setItem('odoo_server', this.baseUrl);
    localStorage.setItem('odoo_db', this.db);
    localStorage.setItem('odoo_uid', this.uid);
    if (this.session_id) localStorage.setItem('odoo_session_id', this.session_id);

    return result;
  }

  async createPayment(paymentData) {
    if (!this.uid) throw new Error("Not authenticated");
    
    // Dynamically resolve the correct payment_method_line_id for the chosen journal
    if (paymentData.journal_id && !paymentData.payment_method_line_id) {
        const lines = await this.rpcCall('/web/dataset/call_kw', {
          model: 'account.payment.method.line',
          method: 'search_read',
          args: [[['journal_id', '=', paymentData.journal_id], ['payment_type', '=', paymentData.payment_type || 'inbound']]],
          kwargs: { fields: ['id', 'name'], context: { uid: this.uid } }
        });
        
        let targetLine = lines && lines.length > 0 ? lines.find(l => l.name && l.name.toLowerCase().includes('manual')) || lines[0] : null;
        
        if (targetLine) {
          paymentData.payment_method_line_id = targetLine.id;
        } else {
          throw new Error(`The selected Journal ID (${paymentData.journal_id}) does not have ANY Inbound Payment Methods configured in Odoo!`);
        }
    }

    const result = await this.rpcCall('/web/dataset/call_kw', {
      model: 'account.payment',
      method: 'create',
      args: [paymentData],
      kwargs: { context: { uid: this.uid } }
    });

    return result;
  }

  async getIntervalPayments(startDate, endDate) {
    if (!this.uid) throw new Error("Not authenticated");

    // Fetch payments explicitly inside the date interval
    const domain = [
      ['payment_type', '=', 'inbound'],
      ['create_uid', '=', this.uid],
      ['date', '>=', startDate],
      ['date', '<=', endDate]
    ];

    const records = await this.rpcCall('/web/dataset/call_kw', {
      model: 'account.payment',
      method: 'search_read',
      args: [domain],
      kwargs: { 
        fields: ['id', 'name', 'amount', 'date', 'state', 'journal_id', 'payment_reference', 'partner_id'],
        order: 'create_date desc',
        context: { uid: this.uid } 
      }
    });

    return records;
  }

  async getOrCreatePartner(name) {
    if (!this.uid) throw new Error("Not authenticated");
    if (!name || name.trim() === '') return false;

    // Search for existing contact first using case-insensitive ilike
    const existing = await this.rpcCall('/web/dataset/call_kw', {
      model: 'res.partner',
      method: 'search_read',
      args: [[['name', 'ilike', name.trim()]]],
      kwargs: { fields: ['id'], limit: 1, context: { uid: this.uid } }
    });

    if (existing && existing.length > 0) {
      return existing[0].id;
    }

    // No contact found, create a new one!
    const newPartner = await this.rpcCall('/web/dataset/call_kw', {
      model: 'res.partner',
      method: 'create',
      args: [{ name: name.trim(), is_company: false }],
      kwargs: { context: { uid: this.uid } }
    });

    return Array.isArray(newPartner) ? newPartner[0] : newPartner;
  }

  logout() {
    this.uid = null;
    this.session_id = null;
    localStorage.clear();
  }
}

export const odoo = new OdooClient();
