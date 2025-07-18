// Modular Receive Payment Feature (Embedded UI)
(function() {
    // Mock bank account data
    const accounts = [
      { id: 'maybank', name: 'Maybank', number: '1234 5678 9012' },
      { id: 'cimb', name: 'CIMB', number: '2345 6789 0123' },
      { id: 'public', name: 'Public Bank', number: '3456 7890 1234' }
    ];
    const QR_IMAGE_PATH = 'assets/images/qr.png'; // Use your actual QR image path
    const LOCALSTORAGE_KEY = 'selected_receive_account';
  
    // Utility to get/set selected account
    function getSelectedAccountId() {
      return localStorage.getItem(LOCALSTORAGE_KEY) || accounts[0].id;
    }
    function setSelectedAccountId(id) {
      localStorage.setItem(LOCALSTORAGE_KEY, id);
    }
  
    // Success popup
    function showSuccessPopup() {
      let popup = document.createElement('div');
      popup.innerHTML = `
        <div style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.3);z-index:9999;display:flex;align-items:center;justify-content:center;">
          <div style="background:#fff;padding:32px 40px;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.15);display:flex;flex-direction:column;align-items:center;">
            <div style="font-size:48px;color:#4BB543;margin-bottom:12px;">&#10003;</div>
            <div style="font-size:20px;font-weight:600;">QR Display Updated!</div>
          </div>
        </div>
      `;
      document.body.appendChild(popup);
      setTimeout(() => {
        popup.remove();
      }, 1500);
    }
  
    // Render the receive payment UI into a container
    function renderReceivePaymentUI(containerId) {
      const container = document.getElementById(containerId);
      if (!container) return;
      const selectedId = getSelectedAccountId();
      container.innerHTML = `
        <div style="background:#fff;padding:32px 24px 24px 24px;border-radius:16px;min-width:320px;max-width:420px;box-shadow:0 4px 24px rgba(0,0,0,0.08);margin:32px auto;position:relative;">
          <h2 style="margin-top:0;margin-bottom:16px;font-size:1.4em;text-align:center;">Receive Payment</h2>
          <div style="margin-bottom:18px;">
            <div style="font-weight:600;margin-bottom:8px;">Select Bank Account:</div>
            <form id="bank-account-form">
              ${accounts.map(acc => `
                <label style="display:flex;align-items:center;margin-bottom:6px;cursor:pointer;">
                  <input type="radio" name="bank-account" value="${acc.id}" ${acc.id === selectedId ? 'checked' : ''} style="margin-right:8px;" />
                  <span>${acc.name} <span style='color:#888;font-size:0.95em;'>(${acc.number})</span></span>
                </label>
              `).join('')}
            </form>
          </div>
          <div style="text-align:center;margin-bottom:8px;">
            <img src="${QR_IMAGE_PATH}" alt="QR Code" style="width:180px;height:180px;object-fit:contain;border:1px solid #eee;border-radius:12px;background:#fafafa;" id="qr-image-display" />
          </div>
          <div style="text-align:center;color:#666;font-size:0.98em;">Show this QR to receive payment into the selected account.</div>
        </div>
      `;
      // Handle account change
      container.querySelector('#bank-account-form').onchange = (e) => {
        if (e.target.name === 'bank-account') {
          setSelectedAccountId(e.target.value);
          showSuccessPopup();
          // No need to change QR image since all use same image in this mockup
        }
      };
    }
  
    // Expose globally
    window.renderReceivePaymentUI = renderReceivePaymentUI;
  })();
  
  renderReceivePaymentUI('receive-payment-root');