// Currency utility
export function formatCurrency(amount) {
    const settings = JSON.parse(localStorage.getItem('userSettings')) || { currency: 'RWF' };
    const currency = settings.currency || 'RWF';
    
    const currencySymbols = {
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'RWF': 'RWF'
    };
    
    const symbol = currencySymbols[currency] || currency;
    return `${symbol} ${Math.abs(amount).toFixed(2)}`;
}

// Modal utility
export class Modal {
    constructor(id, options = {}) {
        this.id = id;
        this.options = {
            size: options.size || 'medium',
            closable: options.closable !== false,
            backdrop: options.backdrop !== false,
            ...options
        };
        this.element = null;
        this.isOpen = false;
    }

    create() {
        if (document.getElementById(this.id)) return;

        const modal = document.createElement('div');
        modal.id = this.id;
        modal.className = `modal-overlay ${this.options.size}`;
        
        modal.innerHTML = `
            <div class="modal-container">
                <div class="modal-header">
                    <h3 class="modal-title">${this.options.title || ''}</h3>
                    ${this.options.closable ? '<button class="modal-close" onclick="closeModal(\'' + this.id + '\')">&times;</button>' : ''}
                </div>
                <div class="modal-body">
                    ${this.options.content || ''}
                </div>
                ${this.options.actions ? `<div class="modal-footer">${this.options.actions}</div>` : ''}
            </div>
        `;

        document.body.appendChild(modal);
        this.element = modal;

        if (this.options.backdrop) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.close();
            });
        }
    }

    open() {
        if (!this.element) this.create();
        this.element.classList.add('active');
        document.body.style.overflow = 'hidden';
        this.isOpen = true;
    }

    close() {
        if (this.element) {
            this.element.classList.remove('active');
            document.body.style.overflow = '';
            this.isOpen = false;
        }
    }

    setContent(content) {
        if (this.element) {
            this.element.querySelector('.modal-body').innerHTML = content;
        }
    }

    setTitle(title) {
        if (this.element) {
            this.element.querySelector('.modal-title').textContent = title;
        }
    }
}

// Global modal functions
window.closeModal = function(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
};

window.closeAllModals = function() {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.classList.remove('active');
    });
    document.body.style.overflow = '';
};