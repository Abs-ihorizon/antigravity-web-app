import { odoo } from './odooClient';

const QUEUE_KEY = 'receipt_offline_queue';

class SyncManager {
  /**
   * Retrieves the current offline queue from localStorage
   */
  getQueue() {
    try {
      const data = localStorage.getItem(QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * Saves to local storage
   */
  setQueue(queue) {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    // Dispatch a custom event so UI components (like Dashboard) know the queue changed
    window.dispatchEvent(new Event('offline-queue-updated'));
  }

  /**
   * Appends an intercepted payment explicitly into the queue
   * assigning a random ID for manipulation until upload.
   */
  addToQueue(paymentPayload) {
    const queue = this.getQueue();
    const entry = {
      _localId: `OFFLINE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      payload: paymentPayload
    };
    queue.push(entry);
    this.setQueue(queue);
    return entry._localId;
  }

  /**
   * Safely delete an item from the queue
   */
  removeFromQueue(localId) {
    let queue = this.getQueue();
    queue = queue.filter((item) => item._localId !== localId);
    this.setQueue(queue);
  }

  /**
   * When internet restores, lock out concurrent loops and blast to Odoo!
   */
  async flushQueue() {
    if (!navigator.onLine) return; // double check context
    if (this.isFlushing) return;
    
    this.isFlushing = true;

    try {
      const queue = this.getQueue();
      if (queue.length === 0) return;

      console.log(`[SyncManager] Beginning flush of ${queue.length} offline records...`);

      for (let i = 0; i < queue.length; i++) {
        const item = queue[i];
        
        try {
          // 1. Resolve Target Contact strictly if provided
          let finalPartnerId = false;
          if (item.payload._rawPayerName) {
            finalPartnerId = await odoo.getOrCreatePartner(item.payload._rawPayerName, item.payload._rawContactNo || '');
          }

          // 2. Fetch the REAL sequence natively from Odoo
          const portalUser = localStorage.getItem('portal_user_name');
          const seqInfo = await odoo.fetchNextSequence(portalUser);
          
          if (seqInfo.error) {
            console.error(`[SyncManager] Queue flush deferred. Sequence Error: ${seqInfo.error}`);
            // Can't assign sequence, stop the flush process without destroying the rest!
            break;
          }

          // 3. Rebuild Odoo mapping natively
          const formattedPayment = {
             name: seqInfo.nextValueStr,
             payment_type: 'inbound',
             partner_type: 'customer',
             amount: item.payload.amount,
             date: item.payload.date,
             journal_id: item.payload.journal_id,
             payment_reference: seqInfo.nextValueStr,
             x_portal_user: item.payload.x_portal_user,
             x_approval_state: item.payload.x_approval_state,
             x_manager_user: item.payload.x_manager_user,
             memo: item.payload.memo,
             partner_id: finalPartnerId
          };

          // Strip undefined values smoothly
          Object.keys(formattedPayment).forEach(key => formattedPayment[key] === undefined && delete formattedPayment[key]);

          // 4. Create Standard Entry
          await odoo.createPayment(formattedPayment);

          // 5. Success! Destroy the local memory slot
          this.removeFromQueue(item._localId);

        } catch (err) {
           console.error(`[SyncManager] Element ${item._localId} failed execution:`, err);
           // We do NOT break here to skip malformed items if others are intact
        }
      }
    } finally {
      this.isFlushing = false;
      // Triggers UI refresh when flush ends
      window.dispatchEvent(new Event('offline-queue-updated'));
    }
  }
}

export const syncManager = new SyncManager();
