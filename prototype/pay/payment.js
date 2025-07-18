// ===== PAYMENT FLOW CONTROLLER =====

// State Management
const paymentState = {
    currentScreen: 'recipients-screen',
    selectedRecipient: null,
    selectedAccount: null,
    paymentAmount: 0,
    pin: '',
    category: null,
    recipients: [] // Store all recipients (frequent + saved)
};

// Load recipients from localStorage
function loadRecipientsFromStorage() {
    const savedRecipients = localStorage.getItem('savedRecipients');
    if (savedRecipients) {
        return JSON.parse(savedRecipients);
    }
    return [];
}

// Save recipients to localStorage
function saveRecipientsToStorage() {
    localStorage.setItem('savedRecipients', JSON.stringify(paymentState.recipients));
}

// Screen Navigation
function goToScreen(screenId) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Show target screen
    document.getElementById(screenId).classList.add('active');
    paymentState.currentScreen = screenId;
}

// ===== SCREEN 1: RECIPIENTS =====

// Initialize Recipients
function initializeRecipients() {
    // Initialize search with debounce
    const searchInput = document.getElementById('recipient-search');
    searchInput.addEventListener('input', debounce(handleRecipientSearch, 300));

    // Load initial recipients from storage and mock data
    const savedRecipients = loadRecipientsFromStorage();
    const frequentRecipients = getFrequentRecipients();
    
    // Combine saved and frequent recipients, removing duplicates by ID
    const allRecipients = [...savedRecipients];
    frequentRecipients.forEach(frequent => {
        if (!allRecipients.some(saved => saved.id === frequent.id)) {
            allRecipients.push(frequent);
        }
    });
    
    paymentState.recipients = allRecipients;
    
    // Render the recipients list
    renderRecipientsList();
}

// New function to handle rendering of recipients list
function renderRecipientsList() {
    const recipientsGrid = document.querySelector('.recipients-grid');
    
    // Create Add New button
    const addNewButton = document.createElement('button');
    addNewButton.className = 'recipient-card add-new';
    addNewButton.onclick = () => showAddRecipientModal();
    addNewButton.innerHTML = `
        <div class="recipient-icon">+</div>
        <h3>Add New Recipient</h3>
        <p>Create new payment</p>
    `;
    
    // Clear and rebuild the grid
    recipientsGrid.innerHTML = '';
    recipientsGrid.appendChild(addNewButton);
    
    // Add all recipients
    paymentState.recipients.forEach(recipient => {
        const card = createRecipientCard(recipient);
        recipientsGrid.appendChild(card);
    });
}

function createRecipientCard(recipient) {
    const card = document.createElement('button');
    card.className = 'recipient-card';
    card.setAttribute('data-recipient-id', recipient.id);
    
    // Create delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-recipient';
    deleteBtn.innerHTML = '×';
    deleteBtn.onclick = (e) => {
        e.stopPropagation(); // Prevent card click when clicking delete
        deleteRecipient(recipient.id);
    };
    
    card.innerHTML = `
        <div class="recipient-icon">${recipient.icon || recipient.name[0]}</div>
        <h3>${recipient.name}</h3>
        <p>${recipient.lastTransaction ? `Last: RM ${recipient.lastTransaction.toFixed(2)}` : 'New Recipient'}</p>
    `;
    
    // Add delete button to top-right corner
    card.appendChild(deleteBtn);
    
    // Add click handler for payment
    card.addEventListener('click', () => selectRecipient(recipient));
    
    return card;
}

function deleteRecipient(recipientId) {
    if (confirm('Are you sure you want to delete this recipient?')) {
        // Remove from state
        paymentState.recipients = paymentState.recipients.filter(r => r.id !== recipientId);
        
        // Save to localStorage if using it
        if (typeof saveRecipientsToStorage === 'function') {
            saveRecipientsToStorage();
        }
        
        // Re-render the recipients list
        renderRecipientsList();
    }
}

function getFrequentRecipients() {
    // Get recipients from mock data and sort by frequency
    const recipients = mockData.transactions.reduce((acc, txn) => {
        if (txn.type === 'expense') {
            const recipient = acc.find(r => r.name === txn.description.split(' - ')[1]);
            if (recipient) {
                recipient.frequency++;
                recipient.lastTransaction = txn.amount;
            } else {
                acc.push({
                    id: `recipient_${acc.length + 1}`,
                    name: txn.description.split(' - ')[1] || txn.description,
                    frequency: 1,
                    lastTransaction: txn.amount,
                    type: 'business', // Assume business for existing transactions
                    bankName: 'Maybank', // Default for mock data
                    accountNumber: '****' + Math.floor(1000 + Math.random() * 9000)
                });
            }
        }
        return acc;
    }, []);
    
    return recipients.sort((a, b) => b.frequency - a.frequency).slice(0, 5);
}

// Debounce helper function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function handleRecipientSearch(event) {
    const searchTerm = event.target.value.toLowerCase().trim();
    const searchResults = document.querySelector('.search-results');
    const searchResultsList = document.querySelector('.search-results-list');
    
    if (searchTerm.length < 2) {
        searchResults.style.display = 'none';
        renderRecipientsList(); // Show all recipients
        return;
    }

    // Search through all recipients
    const results = searchRecipients(searchTerm);
    
    if (results.length > 0) {
        searchResults.style.display = 'block';
        searchResultsList.innerHTML = results.map(recipient => `
            <div class="search-result-item" onclick="selectRecipient(${JSON.stringify(recipient).replace(/"/g, '&quot;')})">
                <div class="search-result-icon">${recipient.icon || recipient.name[0]}</div>
                <div class="search-result-info">
                    <h4>${recipient.name}</h4>
                    <p>${recipient.bankName} - ${recipient.accountNumber}</p>
                </div>
            </div>
        `).join('');
    } else {
        searchResults.style.display = 'block';
        searchResultsList.innerHTML = `
            <div class="search-result-item" onclick="showAddRecipientModal('${searchTerm}')">
                <div class="search-result-icon">+</div>
                <div class="search-result-info">
                    <h4>Add "${searchTerm}" as new recipient</h4>
                    <p>Click to add new recipient</p>
                </div>
            </div>
        `;
    }
}

function searchRecipients(searchTerm) {
    return paymentState.recipients.filter(recipient => 
        recipient.name.toLowerCase().includes(searchTerm) ||
        recipient.accountNumber.includes(searchTerm)
    );
}

// ===== NEW RECIPIENT MODAL =====

function showAddRecipientModal(searchTerm = '') {
    const modal = document.getElementById('add-recipient-modal');
    modal.classList.add('active');
    
    // Pre-fill name if coming from search
    if (searchTerm) {
        document.getElementById('recipient-name').value = searchTerm;
    }
}

function closeAddRecipientModal() {
    const modal = document.getElementById('add-recipient-modal');
    modal.classList.remove('active');
    document.getElementById('add-recipient-form').reset();
}

function toggleBusinessFields() {
    const recipientType = document.getElementById('recipient-type').value;
    const businessFields = document.querySelectorAll('.business-field');
    
    businessFields.forEach(field => {
        field.style.display = recipientType === 'business' ? 'block' : 'none';
        field.querySelector('input')?.removeAttribute('required');
        if (recipientType === 'business') {
            field.querySelector('input')?.setAttribute('required', 'required');
        }
    });
}

function handleAddRecipient(event) {
    event.preventDefault();
    
    const newRecipient = {
        id: `recipient_${Date.now()}`,
        type: document.getElementById('recipient-type').value,
        name: document.getElementById('recipient-name').value,
        businessRegistration: document.getElementById('business-registration').value,
        bankName: document.getElementById('bank-name').options[document.getElementById('bank-name').selectedIndex].text,
        accountNumber: document.getElementById('account-number').value,
        reference: document.getElementById('reference').value,
        icon: document.getElementById('recipient-name').value[0],
        frequency: 0,
        lastTransaction: null,
        dateAdded: new Date().toISOString() // Add timestamp for sorting
    };
    
    // Add to state at the beginning of the array
    paymentState.recipients.unshift(newRecipient);
    
    // Save to localStorage
    saveRecipientsToStorage();
    
    // Re-render the recipients list
    renderRecipientsList();
    
    // Close modal and proceed with payment
    closeAddRecipientModal();
    selectRecipient(newRecipient);
}

function selectRecipient(recipient) {
    paymentState.selectedRecipient = recipient;
    goToScreen('account-screen');
    initializeAccounts();
}

// ===== SCREEN 2: ACCOUNT SELECTION =====

function initializeAccounts() {
    const accountsList = document.querySelector('.accounts-list');
    accountsList.innerHTML = ''; // Clear existing accounts
    
    mockData.accounts.forEach(account => {
        const card = createAccountCard(account);
        accountsList.appendChild(card);
    });
}

function createAccountCard(account) {
    const card = document.createElement('div');
    card.className = 'account-card';
    card.innerHTML = `
        <div class="bank-logo">${account.bankCode[0]}</div>
        <div class="account-info">
            <h3>${account.bankName}</h3>
            <p>${account.accountNumber}</p>
        </div>
        <div class="account-balance">
            <strong>RM ${account.balance.toFixed(2)}</strong>
            <span>${account.accountType}</span>
        </div>
    `;
    card.addEventListener('click', () => selectAccount(account));
    return card;
}

function selectAccount(account) {
    paymentState.selectedAccount = account;
    
    // If it's an existing recipient (has frequency), skip QR and go straight to bank screen
    if (paymentState.selectedRecipient.frequency > 0) {
        // Set a default payment amount based on last transaction or 0
        paymentState.paymentAmount = paymentState.selectedRecipient.lastTransaction || 0;
        goToScreen('bank-screen');
        initializeBankInterface();
    } else {
        // For new recipients, continue with QR flow
        goToScreen('qr-screen');
        initializeQRScanner();
    }
}

// ===== SCREEN 3: QR SCANNER =====

function initializeQRScanner() {
    const video = document.getElementById('qr-video');
    const scanBtn = document.getElementById('scan-qr');
    const manualBtn = document.getElementById('manual-entry');
    
    // Simulate camera initialization
    video.poster = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3C/svg%3E';
    
    scanBtn.addEventListener('click', simulateQRScan);
    manualBtn.addEventListener('click', showManualEntry);
}

function simulateQRScan() {
    // Simulate QR code scanning with mock data
    const qrData = {
        recipient: paymentState.selectedRecipient.name,
        amount: Math.floor(Math.random() * 500) + 50
    };
    
    paymentState.paymentAmount = qrData.amount;
    goToScreen('bank-screen');
    initializeBankInterface();
}

function showManualEntry() {
    // Implementation for manual entry form
    // This would be implemented based on specific requirements
    alert('Manual entry feature coming soon');
}

// ===== SCREEN 4: BANK INTERFACE =====

function initializeBankInterface() {
    updatePaymentDetails();
    initializePinPad();
    initializeBiometric();
}

function updatePaymentDetails() {
    document.getElementById('bank-recipient-name').textContent = paymentState.selectedRecipient.name;
    document.getElementById('bank-payment-amount').textContent = `RM ${paymentState.paymentAmount.toFixed(2)}`;
    document.getElementById('bank-source-account').textContent = `${paymentState.selectedAccount.bankName} (${paymentState.selectedAccount.accountNumber})`;
}

function initializePinPad() {
    const pinPad = document.querySelector('.pin-pad');
    pinPad.innerHTML = '';
    
    // Create number keys
    for (let i = 1; i <= 9; i++) {
        const key = createPinKey(i.toString());
        pinPad.appendChild(key);
    }
    
    // Create special keys
    pinPad.appendChild(createPinKey('⌫', 'backspace')); // Backspace
    pinPad.appendChild(createPinKey('0'));
    pinPad.appendChild(createPinKey('✓', 'confirm')); // Confirm
}

function createPinKey(value, action = 'number') {
    const key = document.createElement('button');
    key.className = 'pin-key';
    key.textContent = value;
    key.addEventListener('click', () => handlePinInput(value, action));
    return key;
}

function handlePinInput(value, action) {
    const dots = document.querySelectorAll('.pin-dot');
    
    switch (action) {
        case 'number':
            if (paymentState.pin.length < 6) {
                paymentState.pin += value;
                dots[paymentState.pin.length - 1].classList.add('filled');
                if (paymentState.pin.length === 6) {
                    setTimeout(validatePin, 500);
                }
            }
            break;
            
        case 'backspace':
            if (paymentState.pin.length > 0) {
                paymentState.pin = paymentState.pin.slice(0, -1);
                dots[paymentState.pin.length].classList.remove('filled');
            }
            break;
            
        case 'confirm':
            if (paymentState.pin.length === 6) {
                validatePin();
            }
            break;
    }
}

function initializeBiometric() {
    const biometricBtn = document.getElementById('use-biometric');
    biometricBtn.addEventListener('click', showBiometricPrompt);
}

function showBiometricPrompt() {
    // Hide PIN pad and show biometric screen
    document.querySelector('.pin-entry').style.display = 'none';
    document.querySelector('.security-section').innerHTML = `
        <div class="biometric-prompt">
            <h3>Touch Fingerprint Sensor</h3>
            <button class="fingerprint-button" id="fingerprint-sensor">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0-2c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/>
                    <path d="M12 14c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
                <div class="fingerprint-ripple"></div>
            </button>
            <p>Place your finger on the sensor</p>
        </div>
    `;

    // Add click handler for fingerprint sensor
    const sensor = document.getElementById('fingerprint-sensor');
    sensor.addEventListener('click', handleBiometricAuth);
}

function handleBiometricAuth() {
    const sensor = document.getElementById('fingerprint-sensor');
    sensor.classList.add('authenticating');
    
    // Simulate authentication process
    setTimeout(() => {
        sensor.classList.add('authenticated');
        
        // Process payment after short delay
        setTimeout(() => {
            processPayment();
        }, 500);
    }, 1000);
}

function validatePin() {
    // Simulate PIN validation (demo always succeeds)
    processPayment();
}

// ===== SCREEN 5: CONFIRMATION =====

function processPayment() {
    // Simulate payment processing
    setTimeout(() => {
        // Set category based on recipient's business type
        const category = getBusinessCategory(paymentState.selectedRecipient.type);
        
        const transaction = {
            id: `txn_${Date.now()}`,
            type: 'expense',
            amount: paymentState.paymentAmount,
            description: `Payment to ${paymentState.selectedRecipient.name}`,
            date: new Date().toISOString(),
            status: 'completed',
            accountId: paymentState.selectedAccount.id,
            category: category,
            reference: `TXN${new Date().toISOString().slice(0,10).replace(/-/g,'')}${Math.floor(Math.random() * 1000)}`
        };
        
        mockData.transactions.unshift(transaction);
        goToScreen('confirmation-screen');
        initializeConfirmation(transaction);
    }, 1000);
}

// Helper function to determine category based on business type
function getBusinessCategory(type) {
    const categoryMap = {
        'retail': 'Shopping',
        'food': 'Food & Beverage',
        'transport': 'Transport',
        'services': 'Services',
        'utilities': 'Utilities',
        'education': 'Education',
        'healthcare': 'Healthcare',
        'individual': 'Transfer',
        'business': 'Business'
    };
    return categoryMap[type] || 'Other';
}

function initializeConfirmation(transaction) {
    // Update confirmation screen content
    const confirmationContent = document.querySelector('.confirmation-content');
    confirmationContent.innerHTML = `
        <div class="success-animation">
            <div class="success-icon">✓</div>
        </div>
        <h2>Payment Successful!</h2>
        <div class="transaction-details">
            <div class="detail-row">
                <span>Amount</span>
                <strong id="confirm-amount">RM ${transaction.amount.toFixed(2)}</strong>
            </div>
            <div class="detail-row">
                <span>To</span>
                <strong id="confirm-recipient">${paymentState.selectedRecipient.name}</strong>
            </div>
            <div class="detail-row">
                <span>Reference</span>
                <strong id="confirm-reference">${transaction.reference}</strong>
            </div>
            <div class="detail-row">
                <span>Date</span>
                <strong id="confirm-date">${new Date(transaction.date).toLocaleString()}</strong>
            </div>
            <div class="detail-row">
                <span>Category</span>
                <strong>${transaction.category}</strong>
            </div>
        </div>
        <div class="confirmation-actions">
            <button class="btn-primary" onclick="goToDashboard()">Done</button>
        </div>
    `;
}

function goToDashboard() {
    window.location.href = 'index.html';
}

// Initialize payment flow when the page loads
document.addEventListener('DOMContentLoaded', () => {
    initializeRecipients();
}); 