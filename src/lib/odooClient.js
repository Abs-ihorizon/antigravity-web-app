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
      let errorMsg = data.error.data?.message || data.error.message || "Odoo RPC Error";
      if (errorMsg === "Access Denied") {
         errorMsg = "Wrong login/password | غلط لاگ ان / پاس ورڈ";
      }
      throw new Error(errorMsg);
    }
    
    return data.result;
  }

  async login(url, db, login, password) {
    this.baseUrl = url.replace(/\/$/, "");
    this.db = db;
    
    // 1. Authenticate the Portal User to verify credentials
    const portalResult = await this.rpcCall('/web/session/authenticate', {
      db: this.db,
      login: login,
      password: password
    });

    if (!portalResult || !portalResult.uid) {
      throw new Error("Authentication failed: Incorrect credentials or database.");
    }
    const portalUsername = portalResult.name || login;
    localStorage.setItem('portal_user_name', portalUsername);
    localStorage.setItem('portal_user_id', portalResult.uid);

    // 2. Automatically switch to the backend Admin service account to grant RPC capabilities
    const adminResult = await this.rpcCall('/web/session/authenticate', {
      db: this.db,
      login: 'admin@admin.com',
      password: 'admin'
    });

    if (!adminResult || !adminResult.uid) {
      throw new Error("Critical Error: Core Admin Identity failed. Please contact your system administrator.");
    }

    this.uid = adminResult.uid;
    this.session_id = adminResult.session_id;

    localStorage.setItem('odoo_server', this.baseUrl);
    localStorage.setItem('odoo_db', this.db);
    localStorage.setItem('odoo_uid', this.uid); // Storing the admin ID to maintain session continuity
    if (this.session_id) localStorage.setItem('odoo_session_id', this.session_id);

    return portalResult;
  }

  logout() {
    this.uid = null;
    this.session_id = null;
    localStorage.removeItem('odoo_uid');
    localStorage.removeItem('odoo_session_id');
    localStorage.removeItem('portal_user_name');
    
    // Optionally call endpoint to destroy on server
    this.rpcCall('/web/session/destroy', {}).catch(() => {});
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

  async getIntervalPayments(startDate, endDate, targetUserIds = null) {
    if (!this.uid) throw new Error("Not authenticated");

    const portalUserId = parseInt(localStorage.getItem('portal_user_id'));
    const lookupIds = targetUserIds || [portalUserId];

    const domain = [
      ['payment_type', '=', 'inbound'],
      ['x_portal_user', 'in', lookupIds],
      ['date', '>=', startDate],
      ['date', '<=', endDate]
    ];

    const records = await this.rpcCall('/web/dataset/call_kw', {
      model: 'account.payment',
      method: 'search_read',
      args: [domain],
      kwargs: { 
        fields: ['id', 'name', 'amount', 'date', 'state', 'journal_id', 'payment_reference', 'partner_id', 'x_portal_user', 'x_approval_state', 'x_manager_user'],
        order: 'create_date desc',
        context: { uid: this.uid } 
      }
    });

    return records;
  }

  async getAllIntervalPayments(startDate, endDate, targetUserIds = null) {
    if (!this.uid) throw new Error("Not authenticated");

    const portalUserId = parseInt(localStorage.getItem('portal_user_id'));
    const lookupIds = targetUserIds || [portalUserId];

    const domain = [
      ['payment_type', '=', 'inbound'],
      ['x_portal_user', 'in', lookupIds],
      ['date', '>=', startDate],
      ['date', '<=', endDate]
    ];

    const records = await this.rpcCall('/web/dataset/call_kw', {
      model: 'account.payment',
      method: 'search_read',
      args: [domain],
      kwargs: { 
        fields: ['id', 'name', 'amount', 'date', 'state', 'journal_id', 'payment_reference', 'partner_id', 'create_uid', 'x_portal_user', 'x_approval_state', 'x_manager_user'],
        order: 'create_date desc',
        context: { uid: this.uid } 
      }
    });

    return records;
  }

  async getOrCreatePartner(name, phone) {
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
      // If a contact number is provided, elegantly update the existing profile
      if (phone && phone.trim() !== '') {
         await this.rpcCall('/web/dataset/call_kw', {
            model: 'res.partner',
            method: 'write',
            args: [[existing[0].id], { phone: phone.trim() }],
            kwargs: { context: { uid: this.uid } }
         }).catch(() => {}); // catch silently in case of ACL constraints on write
      }
      return existing[0].id;
    }

    // No contact found, create a new one!
    const newPartnerPayload = { name: name.trim(), is_company: false };
    if (phone && phone.trim() !== '') {
      newPartnerPayload.phone = phone.trim();
    }

    const newPartner = await this.rpcCall('/web/dataset/call_kw', {
      model: 'res.partner',
      method: 'create',
      args: [newPartnerPayload],
      kwargs: { context: { uid: this.uid } }
    });

    return Array.isArray(newPartner) ? newPartner[0] : newPartner;
  }

  // --- Manager Hierarchy & Approvals API ---

  async fetchMyTeam() {
    if (!this.uid) return [];
    
    try {
      const portalUserId = parseInt(localStorage.getItem('portal_user_id'));
      if (!portalUserId) return [];

      // 1. Find my own hr.employee record
      const myEmployees = await this.rpcCall('/web/dataset/call_kw', {
        model: 'hr.employee',
        method: 'search_read',
        args: [[['user_id', '=', portalUserId]]],
        kwargs: { fields: ['id'], limit: 1, context: { uid: this.uid } }
      });

      if (!myEmployees || myEmployees.length === 0) return [];

      // 2. Find any employee downstream recursively mapped dynamically to me in the hierarchy!
      const myHrId = myEmployees[0].id;
      const subordinates = await this.rpcCall('/web/dataset/call_kw', {
        model: 'hr.employee',
        method: 'search_read',
        args: [[['id', 'child_of', myHrId], ['id', '!=', myHrId]]],
        kwargs: { fields: ['id', 'name', 'user_id'], context: { uid: this.uid } }
      });

      // Filter to securely map to exactly which portal user IDs they connect to
      const team = [];
      for (const sub of subordinates) {
        if (sub.user_id) {
          team.push({
            employeeId: sub.id,
            employeeName: sub.name,
            userId: parseInt(sub.user_id[0]), 
            userName: sub.user_id[1]
          });
        }
      }
      return team;
    } catch (e) {
      console.warn("Could not fetch team subordinates:", e);
      return [];
    }
  }

  async fetchMyManager(portalName) {
    if (!this.uid || !portalName) return null;
    try {
      // 1. Check if approval is actually required for this user
      const users = await this.rpcCall('/web/dataset/call_kw', {
        model: 'res.users',
        method: 'search_read',
        args: [[['name', 'ilike', portalName.trim()]]],
        kwargs: { fields: ['id', 'x_approval_required'], limit: 1, context: { uid: this.uid } }
      });
      
      const approvalRequired = users && users.length > 0 ? !!users[0].x_approval_required : false;

      // 2. Fetch the manager from their employee record
      const employees = await this.rpcCall('/web/dataset/call_kw', {
        model: 'hr.employee',
        method: 'search_read',
        args: [[['name', 'ilike', portalName.trim()]]],
        kwargs: { fields: ['id', 'parent_id'], limit: 1, context: { uid: this.uid } }
      });
      
      let managerName = null;
      if (employees && employees.length > 0 && employees[0].parent_id) {
        managerName = employees[0].parent_id[1];
      }
      
      return { managerName, approvalRequired };
    } catch (err) {
      console.warn("Could not fetch manager or approval requirements:", err);
      return { managerName: null, approvalRequired: false };
    }
  }

  async getPendingApprovals(managerName) {
    if (!this.uid || !managerName) return [];
    const domain = [
      ['payment_type', '=', 'inbound'],
      ['x_manager_user', '=', managerName],
      ['x_approval_state', '=', 'pending_approval']
    ];
    return await this.rpcCall('/web/dataset/call_kw', {
      model: 'account.payment',
      method: 'search_read',
      args: [domain],
      kwargs: { 
        fields: ['id', 'name', 'amount', 'date', 'state', 'journal_id', 'payment_reference', 'partner_id', 'x_portal_user', 'x_approval_state'],
        order: 'create_date desc',
        context: { uid: this.uid } 
      }
    });
  }

  async processApproval(paymentId, status) {
    if (!this.uid) throw new Error("Not authenticated");
    await this.rpcCall('/web/dataset/call_kw', {
      model: 'account.payment',
      method: 'write',
      args: [[paymentId], { x_approval_state: status }],
      kwargs: { context: { uid: this.uid } }
    });
    return true;
  }

  // --- Sequence Management API ---

  async fetchNextSequence(portalName) {
    if (!this.uid || !portalName) return { error: "Authentication required" };

    try {
       // 1. Resolve exact internal User ID
       let userId = null;
       const cachedId = localStorage.getItem('portal_user_id');
       
       if (cachedId) {
          userId = parseInt(cachedId);
       } else {
          const users = await this.rpcCall('/web/dataset/call_kw', {
             model: 'res.users',
             method: 'search_read',
             args: [[['name', '=', portalName.trim()]]], // Explicit equality to avoid fuzzy collisions!
             kwargs: { fields: ['id'], limit: 1, context: { uid: this.uid } }
          });
          if (!users || users.length === 0) {
             return { error: "Could not map Portal User to internal ID automatically. Please log out and log back in to restamp identity." };
          }
          userId = users[0].id;
       }

       // 2. Fetch Sequence configuration
       const sequences = await this.rpcCall('/web/dataset/call_kw', {
          model: 'x_user_sequence',
          method: 'search_read',
          args: [[['x_user', '=', userId]]],
          kwargs: { fields: ['id', 'x_from', 'x_to'], context: { uid: this.uid } }
       });

       if (!sequences || sequences.length === 0) {
          return { error: `No book sequence has been issued to you. Kindly contact the Admin Department. | آپ کو کوئی کتابی سلسلہ جاری نہیں کیا گیا ہے۔ براہ کرم ایڈمن ڈیپارٹمنٹ سے رابطہ کریں۔` };
       }

       const seq = sequences[0];
       const fromVal = parseInt(seq.x_from) || 0;
       const toVal = parseInt(seq.x_to) || 0;

       // 3. Find the Last Created Receipt mathematically!
       const lastPayments = await this.rpcCall('/web/dataset/call_kw', {
           model: 'account.payment',
           method: 'search_read',
           args: [[['x_portal_user', '=', userId]]],
           kwargs: { fields: ['name', 'payment_reference'], order: 'id desc', limit: 1, context: { uid: this.uid } }
       });

       let nextValue = fromVal;

       if (lastPayments && lastPayments.length > 0) {
           const doc = lastPayments[0];
           const docSequenceString = doc.payment_reference || doc.name || "";
           const match = docSequenceString.match(/\d+/);
           
           if (match) {
               const lastMathematicalSeq = parseInt(match[0], 10);
               if (lastMathematicalSeq >= fromVal) {
                   nextValue = lastMathematicalSeq + 1;
               }
           }
       }

       if (nextValue > toVal) {
          return { error: `Receipt limit exhausted (Max allowed: ${toVal}). Cannot proceed.` };
       }

       return {
          sequenceId: seq.id,
          nextValueStr: nextValue.toString()
       };

    } catch (err) {
       console.error("Sequence Error: ", err);
       return { error: "Data integrity issue communicating with Sequence parameters." };
    }
  }

  logout() {
    this.uid = null;
    this.session_id = null;
    localStorage.clear();
  }
}

export const odoo = new OdooClient();
