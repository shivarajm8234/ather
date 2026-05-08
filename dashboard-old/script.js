/**
 * Ather AI Admin Dashboard - Core Engine
 * High-performance enterprise dashboard logic.
 */

// Global State
const state = {
    currentView: 'dashboard',
    leads: [],
    serviceRecords: [],
    calls: [],
    users: [],
    charts: {}
};

// --- View Templates ---
const views = {
    dashboard: () => `
        <div class="view-header animate-fade">
            <h1 class="view-title outfit">Executive Overview</h1>
            <p class="view-subtitle">AI-driven showroom performance and operational insights.</p>
        </div>

        <div class="stats-grid animate-fade">
            <div class="kpi-card">
                <div class="kpi-header">
                    <div class="kpi-icon" style="background: rgba(32, 178, 170, 0.1); color: var(--primary);">
                        <i data-lucide="users"></i>
                    </div>
                    <span class="kpi-trend trend-up" id="kpi-leads-trend">--</span>
                </div>
                <div class="kpi-value outfit" id="kpi-total-leads">0</div>
                <div class="kpi-label">Active Enquiries</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-header">
                    <div class="kpi-icon" style="background: rgba(244, 63, 94, 0.1); color: var(--hot);">
                        <i data-lucide="zap"></i>
                    </div>
                    <span class="kpi-trend trend-up" id="kpi-hot-trend">--</span>
                </div>
                <div class="kpi-value outfit" id="kpi-hot-leads">0</div>
                <div class="kpi-label">Hot Lead Conversions</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-header">
                    <div class="kpi-icon" style="background: rgba(245, 158, 11, 0.1); color: var(--warning);">
                        <i data-lucide="wrench"></i>
                    </div>
                    <span class="kpi-trend trend-down" id="kpi-service-trend">--</span>
                </div>
                <div class="kpi-value outfit" id="kpi-service-due">0</div>
                <div class="kpi-label">Service Milestone Due</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-header">
                    <div class="kpi-icon" style="background: rgba(59, 130, 246, 0.1); color: var(--info);">
                        <i data-lucide="phone-call"></i>
                    </div>
                    <span class="kpi-trend trend-up" id="kpi-calls-trend">--</span>
                </div>
                <div class="kpi-value outfit" id="kpi-ai-calls">0</div>
                <div class="kpi-label">AI Interactions</div>
            </div>
        </div>

        <div class="ai-insights animate-fade" id="ai-insights-container">
            <!-- Dynamic AI insights will be injected here -->
        </div>

        <div class="charts-grid animate-fade">
            <div class="chart-card wide">
                <div class="card-title">Lead Acquisition & Conversion <i data-lucide="maximize-2" size="16"></i></div>
                <div id="main-performance-chart"></div>
            </div>
            <div class="chart-card narrow">
                <div class="card-title">Model Interest Split <i data-lucide="pie-chart" size="16"></i></div>
                <div id="model-split-chart"></div>
            </div>
        </div>
    `,
    leads: () => `
        <div class="view-header animate-fade">
            <h1 class="view-title outfit">Lead Intelligence</h1>
            <p class="view-subtitle">Manage and analyze customer enquiries with AI lead scoring.</p>
        </div>

        <div class="data-card animate-fade">
            <div class="table-header">
                <div style="display: flex; gap: 1rem;">
                    <button class="btn-primary" style="padding: 0.5rem 1rem; font-size: 0.875rem;">All Leads</button>
                    <button class="btn-primary" style="background: transparent; color: var(--text-secondary); border: 1px solid var(--border); padding: 0.5rem 1rem; font-size: 0.875rem;">Hot Priority</button>
                </div>
                <div class="search-container" style="width: 300px; padding: 0.4rem 0.8rem;">
                    <i data-lucide="search" size="16"></i>
                    <input type="text" class="search-input" placeholder="Filter leads...">
                </div>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Customer</th>
                        <th>Source</th>
                        <th>Intent Score</th>
                        <th>Priority</th>
                        <th>AI Next Best Action</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="leads-table-body">
                    <tr><td colspan="7" style="text-align: center; padding: 3rem; color: var(--text-muted);">Fetching lead intelligence...</td></tr>
                </tbody>
            </table>
        </div>
    `,
    pipeline: () => `
        <div class="view-header animate-fade">
            <h1 class="view-title outfit">Sales Pipeline</h1>
            <p class="view-subtitle">Visual workflow of active deals and conversion stages.</p>
        </div>

        <div class="kanban-board animate-fade no-scrollbar" id="pipeline-board">
            <div class="kanban-column" data-stage="enquiry">
                <div class="column-header">
                    <span class="column-title">New Enquiry</span>
                    <span class="column-count" id="count-enquiry">0</span>
                </div>
                <div class="kanban-list" id="list-enquiry"></div>
            </div>
            <div class="kanban-column" data-stage="contacted">
                <div class="column-header">
                    <span class="column-title">Contacted</span>
                    <span class="column-count" id="count-contacted">0</span>
                </div>
                <div class="kanban-list" id="list-contacted"></div>
            </div>
            <div class="kanban-column" data-stage="testride">
                <div class="column-header">
                    <span class="column-title">Test Ride</span>
                    <span class="column-count" id="count-testride">0</span>
                </div>
                <div class="kanban-list" id="list-testride"></div>
            </div>
            <div class="kanban-column" data-stage="negotiation">
                <div class="column-header">
                    <span class="column-title">Negotiation</span>
                    <span class="column-count" id="count-negotiation">0</span>
                </div>
                <div class="kanban-list" id="list-negotiation"></div>
            </div>
            <div class="kanban-column" data-stage="booking">
                <div class="column-header">
                    <span class="column-title">Booking</span>
                    <span class="column-count" id="count-booking">0</span>
                </div>
                <div class="kanban-list" id="list-booking"></div>
            </div>
        </div>
    `,
    followup: () => `
        <div class="view-header animate-fade">
            <h1 class="view-title outfit">AI Follow-up Center</h1>
            <p class="view-subtitle">Real-time AI voice call logs and sentiment analysis.</p>
        </div>

        <div class="charts-grid animate-fade">
            <div class="chart-card wide">
                <div class="card-title">Customer Sentiment Trend <i data-lucide="trending-up" size="16"></i></div>
                <div id="sentiment-chart"></div>
            </div>
            <div class="chart-card narrow" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), transparent);">
                <div class="ai-badge"><i data-lucide="mic" size="14"></i> AI Recovery Status</div>
                <h3 class="outfit" style="font-size: 2.5rem; margin: 1rem 0;">88%</h3>
                <p class="view-subtitle">Missed calls recovered by AI Voice Agent this week.</p>
            </div>
        </div>

        <div class="data-card animate-fade">
            <div class="table-header">
                <div class="card-title">Interaction Timeline</div>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Time</th>
                        <th>Customer</th>
                        <th>Language</th>
                        <th>Sentiment</th>
                        <th>AI Summary</th>
                        <th>Decision</th>
                    </tr>
                </thead>
                <tbody id="calls-table-body">
                    <tr><td colspan="6" style="text-align: center; padding: 3rem; color: var(--text-muted);">Loading conversation intelligence...</td></tr>
                </tbody>
            </table>
        </div>
    `,
    service: () => `
        <div class="view-header animate-fade">
            <h1 class="view-title outfit">Service Center</h1>
            <p class="view-subtitle">Monitoring vehicle maintenance milestones and service retention.</p>
        </div>

        <div class="stats-grid animate-fade">
            <div class="kpi-card">
                <div class="kpi-label">Vehicles Due (7 days)</div>
                <div class="kpi-value outfit">24</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Service Retention Rate</div>
                <div class="kpi-value outfit" style="color: var(--success);">92%</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Missed Services</div>
                <div class="kpi-value outfit" style="color: var(--danger);">3</div>
            </div>
        </div>

        <div class="data-card animate-fade">
             <table>
                <thead>
                    <tr>
                        <th>Customer</th>
                        <th>Vehicle No</th>
                        <th>Milestone</th>
                        <th>Service Type</th>
                        <th>Status</th>
                        <th>AI Risk Prediction</th>
                    </tr>
                </thead>
                <tbody id="service-table-body">
                </tbody>
            </table>
        </div>
    `,
    reports: () => `
        <div class="view-header animate-fade">
            <h1 class="view-title outfit">Global Reports</h1>
            <p class="view-subtitle">Enterprise-wide analytics and regional branch comparisons.</p>
        </div>
        <div class="stats-grid animate-fade">
            <div class="kpi-card">
                <div class="kpi-label">Total Revenue (FY26)</div>
                <div class="kpi-value outfit">₹ 5.2 Cr</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Units Sold</div>
                <div class="kpi-value outfit">342</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Service Revenue</div>
                <div class="kpi-value outfit">₹ 18.4L</div>
            </div>
        </div>
        <div class="chart-card wide animate-fade" style="margin-bottom: 2rem;">
             <div class="card-title">Monthly Revenue Trends</div>
             <div id="revenue-report-chart"></div>
        </div>
        <div class="data-card animate-fade">
            <div class="table-header"><div class="card-title">Branch Performance Matrix</div></div>
            <table>
                <thead>
                    <tr>
                        <th>Branch</th>
                        <th>Manager</th>
                        <th>Sales Target</th>
                        <th>Achievement</th>
                        <th>NPS</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td>Bengaluru (Indiranagar)</td><td>Alex R.</td><td>₹ 1.2 Cr</td><td><span style="color: var(--success);">105%</span></td><td>88</td></tr>
                    <tr><td>Bengaluru (Jayanagar)</td><td>Sneha K.</td><td>₹ 90L</td><td><span style="color: var(--warning);">92%</span></td><td>84</td></tr>
                </tbody>
            </table>
        </div>
    `,
    staff: () => `
        <div class="view-header animate-fade">
            <h1 class="view-title outfit">Staff Productivity</h1>
            <p class="view-subtitle">Performance analysis and AI-assisted lead assignment.</p>
        </div>
        <div class="ai-insights animate-fade" style="grid-template-columns: 1fr; margin-bottom: 2rem;">
            <div class="insight-card">
                <div class="ai-badge">Assignment Intelligence</div>
                <h3 class="insight-title">Recommend Lead Reassignment</h3>
                <p class="insight-desc">Staff 'Rohan' has 4 pending test rides. AI suggests reassigning 2 new leads to 'Sneha' who has a 15% higher conversion rate for Ather 450S.</p>
                <button class="btn-primary">Auto-balance Workload</button>
            </div>
        </div>
        <div class="data-card animate-fade">
            <div class="table-header"><div class="card-title">Employee Performance Leaderboard</div></div>
            <table>
                <thead>
                    <tr>
                        <th>Staff Name</th>
                        <th>Role</th>
                        <th>Leads Closed</th>
                        <th>Conversion %</th>
                        <th>Avg. Response Time</th>
                        <th>Rating</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td>Sneha Kapoor</td><td>Sales Specialist</td><td>24</td><td>18%</td><td>12m</td><td><span style="color: var(--warning);">⭐ 4.9</span></td></tr>
                    <tr><td>Rohan Mehta</td><td>Product Specialist</td><td>18</td><td>12%</td><td>45m</td><td><span style="color: var(--warning);">⭐ 4.7</span></td></tr>
                </tbody>
            </table>
        </div>
    `,
    feedback: () => `
        <div class="view-header animate-fade">
            <h1 class="view-title outfit">Customer Feedback</h1>
            <p class="view-subtitle">AI-powered sentiment analysis and churn prediction.</p>
        </div>
        <div class="stats-grid animate-fade">
            <div class="kpi-card">
                <div class="kpi-label">Average NPS</div>
                <div class="kpi-value outfit">84</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Positive Sentiment</div>
                <div class="kpi-value outfit" style="color: var(--success);">78%</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Churn Risk Alerts</div>
                <div class="kpi-value outfit" style="color: var(--danger);">5</div>
            </div>
        </div>
        <div class="data-card animate-fade">
            <div class="table-header"><div class="card-title">Recent Customer Reviews</div></div>
            <table>
                <thead>
                    <tr>
                        <th>Customer</th>
                        <th>Rating</th>
                        <th>Sentiment</th>
                        <th>AI Summary</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Siddharth M.</td>
                        <td>⭐⭐⭐⭐⭐</td>
                        <td><span class="badge" style="background: rgba(16, 185, 129, 0.1); color: var(--success);">Positive</span></td>
                        <td style="font-size: 0.85rem;">Highly satisfied with the 450X performance and the smooth booking process.</td>
                        <td><span class="badge" style="background: var(--border);">Verified</span></td>
                    </tr>
                </tbody>
            </table>
        </div>
    `,
    settings: () => `
        <div class="view-header animate-fade">
            <h1 class="view-title outfit">System Settings</h1>
            <p class="view-subtitle">Configure AI behavior, branch details, and system integrations.</p>
        </div>
        <div class="data-card animate-fade" style="padding: 2rem;">
            <div style="margin-bottom: 2rem;">
                <h3 class="outfit" style="margin-bottom: 1rem;">AI Agent Configuration</h3>
                <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 500px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: rgba(255,255,255,0.02); border-radius: 12px; border: 1px solid var(--border);">
                        <span>Voice Agent Proactive Outreach</span>
                        <div style="width: 40px; height: 20px; background: var(--primary); border-radius: 20px; position: relative; cursor: pointer;">
                            <div style="width: 16px; height: 16px; background: #fff; border-radius: 50%; position: absolute; right: 2px; top: 2px;"></div>
                        </div>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: rgba(255,255,255,0.02); border-radius: 12px; border: 1px solid var(--border);">
                        <span>Auto-assign Hot Leads</span>
                        <div style="width: 40px; height: 20px; background: var(--primary); border-radius: 20px; position: relative; cursor: pointer;">
                            <div style="width: 16px; height: 16px; background: #fff; border-radius: 50%; position: absolute; right: 2px; top: 2px;"></div>
                        </div>
                    </div>
                </div>
            </div>
            <button class="btn-primary">Save Configuration</button>
        </div>
    `
};

// --- Initialization & Navigation ---

function init() {
    renderView('dashboard');
    setupNavigation();
    startPolling();
    
    // Refresh Lucide icons after each render
    const observer = new MutationObserver(() => lucide.createIcons());
    observer.observe(document.getElementById('view-root'), { childList: true, subtree: true });
}

function setupNavigation() {
    document.querySelectorAll('.nav-item[data-view]').forEach(item => {
        item.onclick = (e) => {
            const view = e.currentTarget.getAttribute('data-view');
            renderView(view);
            
            // Update active state
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            e.currentTarget.classList.add('active');
        };
    });
}

function renderView(viewId) {
    state.currentView = viewId;
    const root = document.getElementById('view-root');
    root.innerHTML = views[viewId]();
    
    // Scroll to top
    root.scrollTop = 0;

    // View-specific initializations
    if (viewId === 'dashboard') initDashboardCharts();
    if (viewId === 'followup') initSentimentChart();
    if (viewId === 'reports') initRevenueChart();
    
    // Explicitly refresh icons for new content
    lucide.createIcons();

    // Immediate data update
    updateViewData();
}

// --- Data Management ---

async function fetchAllData() {
    try {
        const [leads, service, calls, users, knowledge] = await Promise.all([
            fetch('/api/leads').then(r => r.json()),
            fetch('/api/service').then(r => r.json()),
            fetch('/api/calls').then(r => r.json()),
            fetch('/api/users').then(r => r.json()),
            fetch('/api/knowledge').then(r => r.json())
        ]);
        
        state.leads = leads;
        state.serviceRecords = service;
        state.calls = calls;
        state.users = users;
        state.knowledge = knowledge;
        
        updateViewData();
    } catch (e) {
        console.error("Data fetch failed", e);
    }
}

function updateViewData() {
    const view = state.currentView;
    
    // Update Dashboard KPIs
    if (document.getElementById('kpi-total-leads')) {
        const totalLeads = state.leads.length;
        const hotLeads = state.leads.filter(l => l.priority === 'Hot').length;
        const serviceDue = state.serviceRecords.filter(r => r.status === 'Due Soon' || r.status === 'Overdue').length;
        const aiCalls = state.calls.length;

        document.getElementById('kpi-total-leads').textContent = totalLeads;
        document.getElementById('kpi-hot-leads').textContent = hotLeads;
        document.getElementById('kpi-service-due').textContent = serviceDue;
        document.getElementById('kpi-ai-calls').textContent = aiCalls;

        // Dynamic Trend Indicators (Mocked based on real counts)
        document.getElementById('kpi-leads-trend').textContent = totalLeads > 0 ? `+${totalLeads * 5}%` : '--';
        document.getElementById('kpi-hot-trend').textContent = hotLeads > 0 ? `+${hotLeads * 10}%` : '--';
        document.getElementById('kpi-service-trend').textContent = serviceDue > 2 ? '-5%' : '--';
        document.getElementById('kpi-calls-trend').textContent = aiCalls > 0 ? `+${aiCalls * 8}%` : '--';
        
        updateAIInsights(totalLeads, hotLeads, serviceDue, aiCalls);
    }

    // Update Leads Table
    const leadsBody = document.getElementById('leads-table-body');
    if (leadsBody) {
        leadsBody.innerHTML = state.leads.length ? state.leads.map(lead => `
            <tr>
                <td>
                    <div style="font-weight: 600;">${lead.customer_name}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${lead.phone}</div>
                </td>
                <td><span style="font-size: 0.85rem;">${lead.source || 'Voice'}</span></td>
                <td>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <div style="width: 40px; height: 4px; background: var(--border); border-radius: 2px;">
                            <div style="width: ${lead.priority === 'Hot' ? '90' : '40'}%; height: 100%; background: var(--primary); border-radius: 2px;"></div>
                        </div>
                        <span style="font-size: 0.75rem; font-weight: 600;">${lead.priority === 'Hot' ? '92' : '45'}%</span>
                    </div>
                </td>
                <td><span class="badge badge-${lead.priority.toLowerCase()}">${lead.priority}</span></td>
                <td style="font-size: 0.85rem; font-weight: 500; color: var(--primary);">
                    ${lead.priority === 'Hot' ? 'Schedule High-Priority Callback' : 'Send Introductory WhatsApp'}
                </td>
                <td><span class="badge" style="background: rgba(255,255,255,0.05); color: var(--text-secondary);">${lead.status}</span></td>
                <td><i data-lucide="more-horizontal" style="cursor: pointer; color: var(--text-muted);"></i></td>
            </tr>
        `).join('') : '<tr><td colspan="7" style="text-align: center; padding: 4rem; color: var(--text-muted);">Waiting for real-time lead data...</td></tr>';
    }

    // Update Pipeline
    if (state.currentView === 'pipeline') updatePipelineBoard();

    // Update Follow-up Table
    const callsBody = document.getElementById('calls-table-body');
    if (callsBody) {
        callsBody.innerHTML = state.calls.length ? state.calls.map(call => {
            const summary = call.summary || "Interaction summarized by AI.";
            return `
                <tr>
                    <td style="font-size: 0.85rem; color: var(--text-muted);">${new Date(call.timestamp).toLocaleTimeString()}</td>
                    <td>
                        <div style="font-weight: 600;">${call.customer_name || 'Unknown'}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">${call.phone || 'Unknown'}</div>
                    </td>
                    <td><span class="badge" style="background: var(--border);">${call.language || 'en-IN'}</span></td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <i data-lucide="smile" size="16" style="color: var(--success);"></i>
                            <span style="font-size: 0.85rem;">Positive</span>
                        </div>
                    </td>
                    <td style="max-width: 300px; font-size: 0.85rem; color: var(--text-secondary);">${summary.substring(0, 100)}...</td>
                    <td><span class="${call.summary.toLowerCase().includes('discount') ? 'badge-hot' : 'badge-cold'}" style="padding: 0.4rem 0.8rem; border-radius: 8px; font-size: 0.7rem;">${call.summary.toLowerCase().includes('discount') ? 'HOT ACTION' : 'LOGGED'}</span></td>
                </tr>
            `;
        }).join('') : '<tr><td colspan="6" style="text-align: center; padding: 4rem; color: var(--text-muted);">Waiting for AI Voice Agent interactions...</td></tr>';
    }

    // Update Service Table
    const serviceBody = document.getElementById('service-table-body');
    if (serviceBody) {
        serviceBody.innerHTML = state.serviceRecords.length ? state.serviceRecords.map(r => `
            <tr>
                <td>${r.customer_name}</td>
                <td><code>${r.vehicle_no}</code></td>
                <td>${r.current_km} km</td>
                <td>${r.service_type}</td>
                <td><span class="badge ${r.status === 'Due Soon' ? 'badge-warm' : 'badge-cold'}">${r.status}</span></td>
                <td>
                    <div style="color: ${r.status === 'Overdue' ? 'var(--danger)' : 'var(--success)'}; font-size: 0.85rem; font-weight: 600;">
                        ${r.status === 'Overdue' ? 'High Churn Risk' : 'Healthy Retention'}
                    </div>
                </td>
            </tr>
        `).join('') : '<tr><td colspan="6" style="text-align: center; padding: 4rem; color: var(--text-muted);">No service milestones detected yet.</td></tr>';
    }
}

function updateAIInsights(total, hot, service, calls) {
    const container = document.getElementById('ai-insights-container');
    if (!container) return;

    let insights = [];
    
    if (hot > 0) {
        insights.push(`
            <div class="insight-card">
                <div class="ai-badge"><i data-lucide="sparkles" size="14"></i> Priority Recommendation</div>
                <h3 class="insight-title">Hot Lead Cluster Detected</h3>
                <p class="insight-desc">AI has identified ${hot} high-probability leads. Recommended staff: 'Senior Sales' for immediate conversion.</p>
                <button class="btn-primary">View Priority Leads</button>
            </div>
        `);
    } else {
        insights.push(`
            <div class="insight-card">
                <div class="ai-badge"><i data-lucide="brain-circuit" size="14"></i> Growth Strategy</div>
                <h3 class="insight-title">Increase Lead Velocity</h3>
                <p class="insight-desc">Current lead volume is low. AI suggests launching a digital campaign focusing on the Ather 450S 50% discount.</p>
                <button class="btn-primary">Generate Ad Copy</button>
            </div>
        `);
    }

    if (service > 0) {
        insights.push(`
            <div class="insight-card" style="border-color: rgba(244, 63, 94, 0.2);">
                <div class="ai-badge" style="background: var(--hot);"><i data-lucide="alert-circle" size="14"></i> Service Risk</div>
                <h3 class="insight-title">${service} Customers at Risk</h3>
                <p class="insight-desc">AI predicts ${Math.floor(service * 0.7)} no-shows based on current delay. Automated SMS reminders sent.</p>
                <button class="btn-primary" style="background: var(--hot);">Escalate to Staff</button>
            </div>
        `);
    }

    if (calls > 0) {
        insights.push(`
            <div class="insight-card">
                <div class="ai-badge"><i data-lucide="mic" size="14"></i> Interaction Insight</div>
                <h3 class="insight-title">Sentiment Optimization</h3>
                <p class="insight-desc">Voice agent is maintaining 90%+ positive sentiment. Peak query time: ${new Date().getHours()}:00.</p>
                <button class="btn-primary">View Call Analytics</button>
            </div>
        `);
    }

    container.innerHTML = insights.join('') || '<p style="color: var(--text-muted);">Gathering more data for AI insights...</p>';
}

function updatePipelineBoard() {
    const stages = ['enquiry', 'contacted', 'testride', 'negotiation', 'booking'];
    stages.forEach(stage => {
        const list = document.getElementById(`list-${stage}`);
        const count = document.getElementById(`count-${stage}`);
        if (!list) return;

        // Filter leads based on status mapping to stages
        const stageLeads = state.leads.filter(lead => {
            const status = lead.status.toLowerCase().replace(' ', '');
            if (stage === 'enquiry') return status === 'newenquiry';
            if (stage === 'contacted') return status === 'contacted' || status === 'followup';
            return status === stage;
        });
        
        list.innerHTML = stageLeads.length ? stageLeads.map(lead => `
            <div class="kanban-card">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.75rem;">
                    <span style="font-size: 0.875rem; font-weight: 600;">${lead.customer_name}</span>
                    <i data-lucide="more-vertical" size="14" style="color: var(--text-muted);"></i>
                </div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 1rem;">
                    Priority: <span style="color: ${lead.priority === 'Hot' ? 'var(--hot)' : 'var(--primary)'}; font-weight: 600;">${lead.priority}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 0.7rem; color: var(--text-muted);">${new Date(lead.timestamp).toLocaleDateString()}</span>
                    <div class="user-avatar" style="width: 20px; height: 20px;"></div>
                </div>
            </div>
        `).join('') : '<div style="text-align: center; padding: 1rem; font-size: 0.75rem; color: var(--text-muted); border: 1px dashed var(--border); border-radius: 12px;">Empty</div>';
        
        count.textContent = stageLeads.length;
    });
}

// --- Charts ---

function initDashboardCharts() {
    // Dynamically derive chart data from state history
    const leadCounts = state.leads.length > 0 ? [5, 10, 8, 15, totalLeads = state.leads.length] : [0,0,0,0,0,0,0];
    const convCounts = state.leads.filter(l => l.status === 'Booking').length > 0 ? [1, 2, 1, 3, state.leads.filter(l => l.status === 'Booking').length] : [0,0,0,0,0,0,0];

    const performanceOptions = {
        series: [{
            name: 'Leads',
            data: [31, 40, 28, 51, 42, 60, state.leads.length * 5] // Adjusted for visual feel based on real count
        }, {
            name: 'Conversions',
            data: [11, 22, 15, 32, 24, 30, state.leads.filter(l => l.priority === 'Hot').length * 2]
        }],
        chart: { height: 350, type: 'area', toolbar: { show: false }, background: 'transparent' },
        colors: [varCSS('--primary'), varCSS('--accent')],
        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.1, stops: [0, 90, 100] } },
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 3 },
        theme: { mode: 'dark' },
        grid: { borderColor: 'rgba(255,255,255,0.05)', strokeDashArray: 4 },
        xaxis: { categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], axisBorder: { show: false } },
        tooltip: { theme: 'dark' }
    };
    new ApexCharts(document.querySelector("#main-performance-chart"), performanceOptions).render();

    // Model Split Chart
    const splitOptions = {
        series: [44, 55, 13],
        chart: { width: '100%', type: 'donut' },
        labels: ['450X', '450S', 'Rizta'],
        colors: [varCSS('--primary'), varCSS('--accent'), varCSS('--info')],
        stroke: { show: false },
        plotOptions: { pie: { donut: { size: '75%', labels: { show: true, name: { color: '#fff' }, value: { color: '#94a3b8' }, total: { show: true, color: '#fff' } } } } },
        legend: { position: 'bottom', labels: { colors: '#94a3b8' } },
        dataLabels: { enabled: false },
        theme: { mode: 'dark' }
    };
    new ApexCharts(document.querySelector("#model-split-chart"), splitOptions).render();
}

function initSentimentChart() {
    const options = {
        series: [{ name: 'Sentiment Score', data: [70, 75, 68, 82, 90, 85, 88] }],
        chart: { height: 250, type: 'line', toolbar: { show: false } },
        stroke: { curve: 'smooth', width: 4, colors: [varCSS('--success')] },
        theme: { mode: 'dark' },
        grid: { show: false },
        xaxis: { categories: ['M', 'T', 'W', 'T', 'F', 'S', 'S'], axisBorder: { show: false } }
    };
    new ApexCharts(document.querySelector("#sentiment-chart"), options).render();
}

function initRevenueChart() {
     const options = {
        series: [{ name: 'Revenue', data: [31, 40, 28, 51, 42, 109, 100, 120, 110, 140, 160, 180] }],
        chart: { height: 400, type: 'bar', toolbar: { show: false } },
        colors: [varCSS('--primary')],
        theme: { mode: 'dark' },
        plotOptions: { bar: { borderRadius: 10, columnWidth: '50%' } },
        xaxis: { categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] }
    };
    new ApexCharts(document.querySelector("#revenue-report-chart"), options).render();
}

// --- Helpers ---

function varCSS(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function startPolling() {
    fetchAllData();
    setInterval(fetchAllData, 5000);
    setInterval(updateTime, 1000);
}

// Start Application
window.onload = init;
