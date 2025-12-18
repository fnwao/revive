// API Configuration
let API_KEY = localStorage.getItem('revive_api_key') || '';
let API_URL = localStorage.getItem('revive_api_url') || 'http://localhost:8000';
let selectedDeals = new Set();
let approvals = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Load saved API key
    if (API_KEY) {
        document.getElementById('api-key').value = API_KEY;
    }
    document.getElementById('api-url').value = API_URL;
    
    // Check if already connected
    if (API_KEY) {
        showDashboard();
    }
    
    // Load approvals on startup
    if (API_KEY) {
        loadApprovals();
    }
});

// Save API Key
function saveApiKey() {
    const apiKey = document.getElementById('api-key').value.trim();
    const apiUrl = document.getElementById('api-url').value.trim();
    
    if (!apiKey) {
        showToast('Please enter an API key', 'error');
        return;
    }
    
    API_KEY = apiKey;
    API_URL = apiUrl;
    localStorage.setItem('revive_api_key', API_KEY);
    localStorage.setItem('revive_api_url', API_URL);
    
    showDashboard();
    showToast('API key saved!', 'success');
}

// Show Dashboard
function showDashboard() {
    document.getElementById('setup-section').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
}

// Show Loading
function showLoading() {
    document.getElementById('loading').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

// Toast Notifications
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// API Request Helper
async function apiRequest(endpoint, options = {}) {
    const url = `${API_URL}${endpoint}`;
    const headers = {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    try {
        const response = await fetch(url, {
            ...options,
            headers
        });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(error.detail || `HTTP ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        throw error;
    }
}

// Step 1: Detect Stalled Deals
async function detectStalledDeals() {
    const pipelineId = document.getElementById('pipeline-id').value.trim();
    const thresholdDays = parseInt(document.getElementById('threshold-days').value);
    
    if (!pipelineId) {
        showToast('Please enter a pipeline ID', 'error');
        return;
    }
    
    showLoading();
    
    try {
        const data = await apiRequest('/api/v1/deals/detect-stalled', {
            method: 'POST',
            body: JSON.stringify({
                pipeline_id: pipelineId,
                stalled_threshold_days: thresholdDays
            })
        });
        
        displayStalledDeals(data.stalled_deals || []);
        showToast(`Found ${data.total_found} stalled deal(s)`, 'success');
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
        console.error(error);
    } finally {
        hideLoading();
    }
}

// Display Stalled Deals
function displayStalledDeals(deals) {
    const resultsDiv = document.getElementById('stalled-results');
    selectedDeals.clear();
    
    if (deals.length === 0) {
        resultsDiv.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><p>No stalled deals found</p></div>';
        document.getElementById('generate-btn').disabled = true;
        return;
    }
    
    resultsDiv.innerHTML = deals.map(deal => `
        <div class="deal-item" data-deal-id="${deal.deal_id}">
            <div class="deal-info">
                <div class="deal-title">${deal.title || deal.deal_id}</div>
                <div class="deal-meta">
                    Value: $${deal.value?.toLocaleString() || 'N/A'} | 
                    Status: ${deal.status || 'N/A'} | 
                    Inactive: ${deal.days_since_activity || 0} days
                </div>
            </div>
            <div class="deal-actions">
                <input type="checkbox" class="checkbox" onchange="toggleDealSelection('${deal.deal_id}', this.checked)">
            </div>
        </div>
    `).join('');
    
    updateSelectedDeals();
}

// Toggle Deal Selection
function toggleDealSelection(dealId, selected) {
    const dealItem = document.querySelector(`[data-deal-id="${dealId}"]`);
    
    if (selected) {
        selectedDeals.add(dealId);
        dealItem.classList.add('selected');
    } else {
        selectedDeals.delete(dealId);
        dealItem.classList.remove('selected');
    }
    
    updateSelectedDeals();
}

// Update Selected Deals Display
function updateSelectedDeals() {
    const selectedDiv = document.getElementById('selected-deals');
    const generateBtn = document.getElementById('generate-btn');
    
    if (selectedDeals.size === 0) {
        selectedDiv.innerHTML = '<p style="color: #888;">No deals selected. Select deals above to generate messages.</p>';
        generateBtn.disabled = true;
    } else {
        selectedDiv.innerHTML = `<p><strong>${selectedDeals.size}</strong> deal(s) selected for message generation</p>`;
        generateBtn.disabled = false;
    }
}

// Step 2: Generate Messages
async function generateMessages() {
    if (selectedDeals.size === 0) {
        showToast('Please select at least one deal', 'error');
        return;
    }
    
    showLoading();
    const resultsDiv = document.getElementById('generate-results');
    resultsDiv.innerHTML = '<p>Generating messages...</p>';
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const dealId of selectedDeals) {
        try {
            const data = await apiRequest(`/api/v1/deals/${dealId}/generate-message`, {
                method: 'POST'
            });
            
            successCount++;
            resultsDiv.innerHTML += `
                <div class="deal-item">
                    <div class="deal-info">
                        <div class="deal-title">✅ Message generated for ${dealId}</div>
                        <div class="approval-message">${data.generated_message}</div>
                    </div>
                </div>
            `;
        } catch (error) {
            errorCount++;
            resultsDiv.innerHTML += `
                <div class="deal-item" style="border-color: #dc3545;">
                    <div class="deal-info">
                        <div class="deal-title">❌ Error for ${dealId}</div>
                        <div style="color: #dc3545;">${error.message}</div>
                    </div>
                </div>
            `;
        }
    }
    
    hideLoading();
    showToast(`Generated ${successCount} message(s)${errorCount > 0 ? `, ${errorCount} error(s)` : ''}`, 
              errorCount > 0 ? 'error' : 'success');
    
    // Refresh approvals
    setTimeout(() => loadApprovals(), 1000);
}

// Step 3: Load Approvals
async function loadApprovals() {
    showLoading();
    
    try {
        const data = await apiRequest('/api/v1/approvals?status_filter=pending');
        approvals = data.approvals || [];
        displayApprovals(approvals);
    } catch (error) {
        showToast(`Error loading approvals: ${error.message}`, 'error');
        console.error(error);
    } finally {
        hideLoading();
    }
}

// Display Approvals
function displayApprovals(approvalsList) {
    const listDiv = document.getElementById('approvals-list');
    
    if (approvalsList.length === 0) {
        listDiv.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><p>No pending approvals</p></div>';
        return;
    }
    
    listDiv.innerHTML = approvalsList.map(approval => `
        <div class="approval-item">
            <div class="approval-header">
                <div>
                    <strong>${approval.deal_title || approval.deal_id}</strong>
                    <span style="color: #888; margin-left: 10px;">${approval.deal_id}</span>
                </div>
                <span class="approval-status status-${approval.status}">${approval.status.toUpperCase()}</span>
            </div>
            <div class="approval-message">${approval.generated_message}</div>
            <div class="approval-actions">
                <button class="btn btn-success" onclick="approveMessage('${approval.id}')">✅ Approve</button>
                <button class="btn btn-danger" onclick="rejectMessage('${approval.id}')">❌ Reject</button>
                <button class="btn btn-primary" onclick="sendMessage('${approval.id}')">📤 Send</button>
            </div>
        </div>
    `).join('');
}

// Approve Message
async function approveMessage(approvalId) {
    showLoading();
    
    try {
        await apiRequest(`/api/v1/approvals/${approvalId}/approve`, {
            method: 'POST',
            body: JSON.stringify({})
        });
        
        showToast('Message approved!', 'success');
        loadApprovals();
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

// Reject Message
async function rejectMessage(approvalId) {
    if (!confirm('Are you sure you want to reject this message?')) {
        return;
    }
    
    showLoading();
    
    try {
        await apiRequest(`/api/v1/approvals/${approvalId}/reject`, {
            method: 'POST',
            body: JSON.stringify({})
        });
        
        showToast('Message rejected', 'success');
        loadApprovals();
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

// Send Message
async function sendMessage(approvalId) {
    if (!confirm('Send this message now?')) {
        return;
    }
    
    showLoading();
    
    try {
        await apiRequest(`/api/v1/approvals/${approvalId}/send`, {
            method: 'POST',
            body: JSON.stringify({})
        });
        
        showToast('Message sent!', 'success');
        loadApprovals();
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

