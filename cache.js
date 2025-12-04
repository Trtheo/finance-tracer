// Transaction cache system
class TransactionCache {
    constructor() {
        this.cache = new Map();
        this.lastFetch = null;
        this.cacheTimeout = 30000; // 30 seconds
    }

    set(userId, transactions) {
        this.cache.set(userId, {
            data: transactions,
            timestamp: Date.now()
        });
        this.lastFetch = Date.now();
    }

    get(userId) {
        const cached = this.cache.get(userId);
        if (!cached) return null;
        
        const isExpired = Date.now() - cached.timestamp > this.cacheTimeout;
        return isExpired ? null : cached.data;
    }

    invalidate(userId) {
        this.cache.delete(userId);
        this.lastFetch = null;
    }

    needsRefresh(userId) {
        const cached = this.cache.get(userId);
        if (!cached) return true;
        return Date.now() - cached.timestamp > this.cacheTimeout;
    }
}

export const transactionCache = new TransactionCache();