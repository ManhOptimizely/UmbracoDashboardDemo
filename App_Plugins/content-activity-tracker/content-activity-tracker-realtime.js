import { LitElement, html, css } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";

export default class ContentActivityTrackerRealtime extends UmbElementMixin(LitElement) {
    static properties = {
        _loading: { type: Boolean, state: true },
        _activities: { type: Array, state: true },
        _filteredActivities: { type: Array, state: true },
        _error: { type: String, state: true },
        _currentUser: { type: Object, state: true },
        _filterType: { type: String, state: true },
        _searchQuery: { type: String, state: true },
        _sortOrder: { type: String, state: true },
        _totalActivities: { type: Number, state: true },
        _autoRefresh: { type: Boolean, state: true },
        _lastRefresh: { type: String, state: true },
        _signalRConnected: { type: Boolean, state: true },
        _signalRConnection: { type: Object, state: true },
    };

    constructor() {
        super();
        this._loading = true;
        this._activities = [];
        this._filteredActivities = [];
        this._error = null;
        this._currentUser = null;
        this._filterType = 'all';
        this._searchQuery = '';
        this._sortOrder = 'newest';
        this._totalActivities = 0;
        this._autoRefresh = false;
        this._lastRefresh = '';
        this._refreshInterval = null;
        this._signalRConnected = false;
        this._signalRConnection = null;
    }

    async connectedCallback() {
        super.connectedCallback();
        await this._loadSignalR();
        await this._initializeSignalR();
        this._loadActivityData();
        this._checkAuthentication();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        //if (this._refreshInterval) {
        //    clearInterval(this._refreshInterval);
        //}
        this._disconnectSignalR();
    }

    async _loadSignalR() {
        // Load SignalR client library from CDN
        if (!window.signalR) {
            try {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/@microsoft/signalr@8.0.0/dist/browser/signalr.min.js';
                script.async = true;
                
                await new Promise((resolve, reject) => {
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
            } catch (error) {
                console.error('Failed to load SignalR library:', error);
            }
        }
    }

    async _initializeSignalR() {
        if (!window.signalR) {
            console.warn('SignalR library not loaded, real-time updates disabled');
            return;
        }

        try {
            // Create connection
            this._signalRConnection = new window.signalR.HubConnectionBuilder()
                .withUrl('/umbraco/signalr/content-activity')
                .withAutomaticReconnect()
                .configureLogging(window.signalR.LogLevel.Information)
                .build();

            // Handle incoming activity events
            this._signalRConnection.on('ReceiveActivity', (activity) => {
                this._handleRealtimeActivity(activity);
            });

            // Handle incoming statistics updates
            this._signalRConnection.on('ReceiveStatistics', (statistics) => {
                this._handleRealtimeStatistics(statistics);
            });

            // Connection state handlers
            this._signalRConnection.onreconnecting(() => {
                this._signalRConnected = false;
                console.log('SignalR reconnecting...');
            });

            this._signalRConnection.onreconnected(() => {
                this._signalRConnected = true;
                console.log('SignalR reconnected');
            });

            this._signalRConnection.onclose(() => {
                this._signalRConnected = false;
                console.log('SignalR connection closed');
            });

            // Start connection
            await this._signalRConnection.start();
            this._signalRConnected = true;
            console.log('SignalR connected successfully');

        } catch (error) {
            console.error('SignalR connection error:', error);
            this._signalRConnected = false;
        }
    }

    async _disconnectSignalR() {
        if (this._signalRConnection) {
            try {
                await this._signalRConnection.stop();
                this._signalRConnected = false;
            } catch (error) {
                console.error('Error disconnecting SignalR:', error);
            }
        }
    }

    _handleRealtimeActivity(activity) {
        // Add the new activity to the top of the list
        const newActivity = {
            id: activity.id || `${activity.contentKey}-${activity.action}-${Date.now()}`,
            contentId: activity.contentKey,
            contentName: activity.contentName || 'Untitled',
            contentType: activity.contentTypeAlias || 'Document',
            action: activity.action.toLowerCase(),
            actionLabel: activity.action,
            timestamp: activity.timestamp,
            user: activity.userName || 'Unknown',
            icon: activity.icon || '📝',
            color: activity.color || 'var(--uui-color-default)',
            isTrashed: activity.isTrashed || false,
            culture: activity.culture,
        };

        // Add to activities array
        this._activities = [newActivity, ...this._activities];
        this._totalActivities = this._activities.length;

        // Reapply filters
        this._applyFilters();

        // Show notification
        this._showToast(`New activity: ${newActivity.contentName} was ${newActivity.actionLabel.toLowerCase()}`);
    }

    _handleRealtimeStatistics(statistics) {
        // Update statistics (if you want to show them separately)
        console.log('Statistics updated:', statistics);
    }

    _showToast(message) {
        // Simple toast notification (you can enhance this)
        const toast = document.createElement('div');
        toast.className = 'activity-toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: var(--uui-color-positive);
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            box-shadow: var(--uui-shadow-depth-3);
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    async _checkAuthentication() {
        try {
            //const response = await fetch('/umbraco/management/api/v1/user/current');
            //if (!response.ok) {
            //    this._error = 'Authentication required. Please log in to the backoffice.';
            //    return;
            //}
            //const data = await response.json();
            this._currentUser = { email: "test1@gmail.com" } //data;
        } catch (error) {
            console.error('Authentication check failed:', error);
            this._error = 'Unable to verify authentication. Please ensure you are logged in.';
        }
    }

    async _loadActivityData() {
        this._loading = true;
        this._error = null;

        try {
            // Use the database API endpoint
            const action = this._filterType !== 'all' ? `&action=${this._filterType}` : '';
            const response = await fetch(`/umbraco/management/api/v1/content-activity?take=100${action}`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch activities');
            }

            const data = await response.json();
            
            // Map API response to dashboard format
            this._activities = (data.items || []).map(item => ({
                id: item.id,
                contentId: item.contentKey,
                contentName: item.contentName || 'Untitled',
                contentType: item.contentTypeAlias || 'Document',
                action: item.action.toLowerCase(),
                actionLabel: item.action,
                timestamp: item.timestamp,
                user: item.userName || 'Unknown',
                icon: this._getIconForAction(item.action),
                color: this._getColorForAction(item.action),
                isTrashed: item.isTrashed || false,
                culture: item.culture,
            }));

            this._totalActivities = data.total || this._activities.length;
            this._applyFilters();
            this._lastRefresh = new Date().toLocaleTimeString();
        } catch (error) {
            console.error('Error loading activity data:', error);
            this._error = 'Failed to load content activities. Please try again.';
        } finally {
            this._loading = false;
        }
    }

    _getIconForAction(action) {
        const actionLower = action.toLowerCase();
        const icons = {
            'created': '📄',
            'published': '✅',
            'unpublished': '❌',
            'saved': '💾',
            'trashed': '🗑️'
        };
        return icons[actionLower] || '📝';
    }

    _getColorForAction(action) {
        const actionLower = action.toLowerCase();
        const colors = {
            'created': 'var(--uui-color-positive)',
            'published': 'var(--uui-color-positive)',
            'unpublished': 'var(--uui-color-danger)',
            'saved': 'var(--uui-color-default)',
            'trashed': 'var(--uui-color-danger)'
        };
        return colors[actionLower] || 'var(--uui-color-default)';
    }

    _applyFilters() {
        let filtered = [...this._activities];

        // Apply type filter
        if (this._filterType !== 'all') {
            filtered = filtered.filter(activity => activity.action === this._filterType);
        }

        // Apply search filter
        if (this._searchQuery.trim()) {
            const query = this._searchQuery.toLowerCase();
            filtered = filtered.filter(activity => 
                activity.contentName.toLowerCase().includes(query) ||
                activity.user.toLowerCase().includes(query) ||
                activity.contentType.toLowerCase().includes(query)
            );
        }

        // Apply sort order
        if (this._sortOrder === 'oldest') {
            filtered.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        } else {
            filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        }

        this._filteredActivities = filtered;
    }

    _handleRefresh() {
        this._loadActivityData();
    }

    _handleFilterChange(e) {
        this._filterType = e.target.value;
        this._applyFilters();
    }

    _handleSearchInput(e) {
        this._searchQuery = e.target.value;
        this._applyFilters();
    }

    _handleSortChange(e) {
        this._sortOrder = e.target.value;
        this._applyFilters();
    }

    _handleAutoRefreshToggle(e) {
        this._autoRefresh = e.target.checked;
        
        if (this._autoRefresh) {
            // Refresh every 30 seconds (as backup to SignalR)
            this._refreshInterval = setInterval(() => {
                this._loadActivityData();
            }, 30000);
        } else {
            if (this._refreshInterval) {
                clearInterval(this._refreshInterval);
                this._refreshInterval = null;
            }
        }
    }

    _formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) {
            return 'Just now';
        } else if (diffMins < 60) {
            return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        } else if (diffHours < 24) {
            return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        } else if (diffDays < 7) {
            return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        } else {
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
    }

    _getActivityCount(type) {
        if (type === 'all') {
            return this._activities.length;
        }
        return this._activities.filter(a => a.action === type).length;
    }

    static styles = [
        css`
            :host {
                display: block;
                padding: var(--uui-size-space-5);
                background: var(--uui-color-background);
            }

            .tracker-container {
                max-width: 1400px;
                margin: 0 auto;
            }

            .header {
                margin-bottom: var(--uui-size-space-6);
                position: relative;
            }

            .header h1 {
                font-size: var(--uui-type-h2-size);
                margin: 0 0 var(--uui-size-space-2) 0;
                color: var(--uui-color-text);
            }

            .header p {
                font-size: var(--uui-type-default-size);
                color: var(--uui-color-text-alt);
                margin: 0;
            }

            .signalr-indicator {
                position: absolute;
                top: 0;
                right: 0;
                display: flex;
                align-items: center;
                gap: var(--uui-size-space-2);
                padding: var(--uui-size-space-2) var(--uui-size-space-3);
                background: var(--uui-color-surface);
                border: 1px solid var(--uui-color-border);
                border-radius: var(--uui-border-radius);
                font-size: var(--uui-type-small-size);
            }

            .signalr-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: var(--uui-color-danger);
            }

            .signalr-dot.connected {
                background: var(--uui-color-positive);
                animation: pulse 2s ease-in-out infinite;
            }

            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }

            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }

            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(400px);
                    opacity: 0;
                }
            }

            .controls {
                display: flex;
                flex-wrap: wrap;
                gap: var(--uui-size-space-4);
                margin-bottom: var(--uui-size-space-5);
                padding: var(--uui-size-space-4);
                background: var(--uui-color-surface);
                border: 1px solid var(--uui-color-border);
                border-radius: var(--uui-border-radius);
                align-items: center;
            }

            .control-group {
                display: flex;
                flex-direction: column;
                gap: var(--uui-size-space-2);
            }

            .control-group label {
                font-size: var(--uui-type-small-size);
                font-weight: 600;
                color: var(--uui-color-text);
            }

            .control-group select,
            .control-group input[type="text"] {
                padding: var(--uui-size-space-2) var(--uui-size-space-3);
                border: 1px solid var(--uui-color-border);
                border-radius: var(--uui-border-radius);
                font-size: var(--uui-type-default-size);
                background: var(--uui-color-surface);
                color: var(--uui-color-text);
                min-width: 200px;
            }

            .control-group input[type="text"] {
                min-width: 300px;
            }

            .refresh-section {
                margin-left: auto;
                display: flex;
                flex-direction: column;
                gap: var(--uui-size-space-2);
                align-items: flex-end;
            }

            .refresh-button {
                background: var(--uui-color-interactive);
                color: white;
                border: none;
                border-radius: var(--uui-border-radius);
                padding: var(--uui-size-space-3) var(--uui-size-space-4);
                font-size: var(--uui-type-small-size);
                font-weight: 600;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: var(--uui-size-space-2);
                transition: background 0.2s ease;
            }

            .refresh-button:hover {
                background: var(--uui-color-interactive-emphasis);
            }

            .refresh-button:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }

            .auto-refresh {
                display: flex;
                align-items: center;
                gap: var(--uui-size-space-2);
                font-size: var(--uui-type-small-size);
                color: var(--uui-color-text-alt);
            }

            .last-refresh {
                font-size: var(--uui-type-small-size);
                color: var(--uui-color-text-alt);
            }

            .stats {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: var(--uui-size-space-4);
                margin-bottom: var(--uui-size-space-5);
            }

            .stat-card {
                background: var(--uui-color-surface);
                border: 1px solid var(--uui-color-border);
                border-radius: var(--uui-border-radius);
                padding: var(--uui-size-space-4);
                text-align: center;
                transition: transform 0.2s ease;
            }

            .stat-card:hover {
                transform: translateY(-2px);
                box-shadow: var(--uui-shadow-depth-2);
            }

            .stat-card.active {
                border-color: var(--uui-color-interactive);
                background: var(--uui-color-interactive-emphasis);
            }

            .stat-icon {
                font-size: 2rem;
                margin-bottom: var(--uui-size-space-2);
            }

            .stat-value {
                font-size: var(--uui-type-h3-size);
                font-weight: 700;
                color: var(--uui-color-text);
                margin: 0 0 var(--uui-size-space-1) 0;
            }

            .stat-label {
                font-size: var(--uui-type-small-size);
                color: var(--uui-color-text-alt);
                margin: 0;
            }

            .activity-list {
                background: var(--uui-color-surface);
                border: 1px solid var(--uui-color-border);
                border-radius: var(--uui-border-radius);
                overflow: hidden;
            }

            .activity-header {
                padding: var(--uui-size-space-4);
                background: var(--uui-color-surface-alt);
                border-bottom: 1px solid var(--uui-color-border);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .activity-header h2 {
                font-size: var(--uui-type-h5-size);
                margin: 0;
                color: var(--uui-color-text);
            }

            .activity-count {
                font-size: var(--uui-type-small-size);
                color: var(--uui-color-text-alt);
            }

            .activity-item {
                padding: var(--uui-size-space-4);
                border-bottom: 1px solid var(--uui-color-border);
                display: grid;
                grid-template-columns: auto 1fr auto;
                gap: var(--uui-size-space-4);
                align-items: start;
                transition: background 0.2s ease;
            }

            .activity-item:last-child {
                border-bottom: none;
            }

            .activity-item:hover {
                background: var(--uui-color-surface-alt);
            }

            .activity-item.new {
                animation: highlightNew 2s ease-out;
            }

            @keyframes highlightNew {
                from { background: var(--uui-color-positive-emphasis); }
                to { background: transparent; }
            }

            .activity-icon {
                font-size: 1.5rem;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: var(--uui-color-surface-alt);
            }

            .activity-details {
                flex: 1;
                min-width: 0;
            }

            .activity-title {
                display: flex;
                align-items: center;
                gap: var(--uui-size-space-2);
                margin-bottom: var(--uui-size-space-1);
            }

            .activity-content-name {
                font-weight: 700;
                color: var(--uui-color-text);
                text-decoration: none;
                transition: color 0.2s ease;
            }

            .activity-content-name:hover {
                color: var(--uui-color-interactive);
            }

            .activity-action {
                padding: 2px 8px;
                border-radius: 12px;
                font-size: var(--uui-type-small-size);
                font-weight: 600;
                background: var(--uui-color-surface-alt);
            }

            .activity-action.created {
                background: #e8f5e9;
                color: #2e7d32;
            }

            .activity-action.published {
                background: #e3f2fd;
                color: #1565c0;
            }

            .activity-action.saved {
                background: #fff3e0;
                color: #e65100;
            }

            .activity-action.unpublished {
                background: #fce4ec;
                color: #c2185b;
            }

            .activity-action.trashed {
                background: #ffebee;
                color: #c62828;
            }

            .activity-meta {
                font-size: var(--uui-type-small-size);
                color: var(--uui-color-text-alt);
                display: flex;
                align-items: center;
                gap: var(--uui-size-space-3);
                flex-wrap: wrap;
            }

            .activity-meta-item {
                display: flex;
                align-items: center;
                gap: var(--uui-size-space-1);
            }

            .activity-timestamp {
                text-align: right;
                font-size: var(--uui-type-small-size);
                color: var(--uui-color-text-alt);
                white-space: nowrap;
            }

            .loading {
                text-align: center;
                padding: var(--uui-size-space-6);
            }

            .loading-spinner {
                display: inline-block;
                width: 40px;
                height: 40px;
                border: 4px solid var(--uui-color-border);
                border-top-color: var(--uui-color-interactive);
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }

            .error {
                background: var(--uui-color-danger-emphasis);
                color: var(--uui-color-danger);
                padding: var(--uui-size-space-4);
                border-radius: var(--uui-border-radius);
                margin-bottom: var(--uui-size-space-5);
                border: 1px solid var(--uui-color-danger);
            }

            .empty-state {
                text-align: center;
                padding: var(--uui-size-space-6);
                color: var(--uui-color-text-alt);
            }

            .empty-state-icon {
                font-size: 3rem;
                margin-bottom: var(--uui-size-space-3);
            }

            @media (max-width: 768px) {
                .controls {
                    flex-direction: column;
                    align-items: stretch;
                }

                .refresh-section {
                    margin-left: 0;
                    align-items: stretch;
                }

                .control-group input[type="text"] {
                    min-width: 100%;
                }

                .activity-item {
                    grid-template-columns: auto 1fr;
                    gap: var(--uui-size-space-3);
                }

                .activity-timestamp {
                    grid-column: 2;
                    text-align: left;
                }

                .signalr-indicator {
                    position: static;
                    margin-bottom: var(--uui-size-space-3);
                }
            }
        `,
    ];

    render() {
        if (this._error) {
            return html`
                <div class="tracker-container">
                    <div class="error">
                        <strong>Error:</strong> ${this._error}
                    </div>
                </div>
            `;
        }

        if (this._loading && this._activities.length === 0) {
            return html`
                <div class="tracker-container">
                    <div class="loading">
                        <div class="loading-spinner"></div>
                        <p>Loading content activity...</p>
                    </div>
                </div>
            `;
        }

        return html`
            <div class="tracker-container">
                <div class="header">
                    <h1>Content Activity Tracker</h1>
                    <p>Monitor recent content changes across your CMS with real-time updates</p>
                    
                    <div class="signalr-indicator">
                        <div class="signalr-dot ${this._signalRConnected ? 'connected' : ''}"></div>
                        <span>${this._signalRConnected ? 'Live Updates Active' : 'Connecting...'}</span>
                    </div>
                </div>

                <div class="stats">
                    <div class="stat-card ${this._filterType === 'all' ? 'active' : ''}">
                        <div class="stat-icon">📊</div>
                        <p class="stat-value">${this._getActivityCount('all')}</p>
                        <p class="stat-label">Total Activities</p>
                    </div>
                    <div class="stat-card ${this._filterType === 'created' ? 'active' : ''}">
                        <div class="stat-icon">📄</div>
                        <p class="stat-value">${this._getActivityCount('created')}</p>
                        <p class="stat-label">Created</p>
                    </div>
                    <div class="stat-card ${this._filterType === 'published' ? 'active' : ''}">
                        <div class="stat-icon">✅</div>
                        <p class="stat-value">${this._getActivityCount('published')}</p>
                        <p class="stat-label">Published</p>
                    </div>
                    <div class="stat-card ${this._filterType === 'saved' ? 'active' : ''}">
                        <div class="stat-icon">💾</div>
                        <p class="stat-value">${this._getActivityCount('saved')}</p>
                        <p class="stat-label">Saved</p>
                    </div>
                </div>

                <div class="controls">
                    <div class="control-group">
                        <label for="filter">Filter by Action</label>
                        <select id="filter" @change=${this._handleFilterChange} .value=${this._filterType}>
                            <option value="all">All Activities</option>
                            <option value="created">Created</option>
                            <option value="published">Published</option>
                            <option value="saved">Saved</option>
                            <option value="unpublished">Unpublished</option>
                            <option value="trashed">Trashed</option>
                        </select>
                    </div>

                    <div class="control-group">
                        <label for="search">Search</label>
                        <input 
                            type="text" 
                            id="search" 
                            placeholder="Search by content name, user, or type..." 
                            @input=${this._handleSearchInput}
                            .value=${this._searchQuery}
                        />
                    </div>

                    <div class="control-group">
                        <label for="sort">Sort Order</label>
                        <select id="sort" @change=${this._handleSortChange} .value=${this._sortOrder}>
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                        </select>
                    </div>

                    
                </div>

                <div class="activity-list">
                    <div class="activity-header">
                        <h2>Recent Activity</h2>
                        <span class="activity-count">
                            Showing ${this._filteredActivities.length} of ${this._totalActivities} activities
                        </span>
                    </div>

                    ${this._filteredActivities.length > 0 ? html`
                        ${this._filteredActivities.map(activity => html`
                            <div class="activity-item">
                                <div class="activity-icon" style="color: ${activity.color}">
                                    ${activity.icon}
                                </div>
                                <div class="activity-details">
                                    <div class="activity-title">
                                        <a 
                                            href="/umbraco#/content/content/edit/${activity.contentId}" 
                                            class="activity-content-name"
                                        >
                                            ${activity.contentName}
                                        </a>
                                        <span class="activity-action ${activity.action}">
                                            ${activity.actionLabel}F
                                        </span>
                                    </div>
                                    <div class="activity-meta">
                                        <span class="activity-meta-item">
                                            <span>👤</span>
                                            <span>${activity.user}</span>
                                        </span>
                                        <span class="activity-meta-item">
                                            <span>📋</span>
                                            <span>${activity.contentType}</span>
                                        </span>
                                        ${activity.culture ? html`
                                            <span class="activity-meta-item">
                                                <span>🌍</span>
                                                <span>${activity.culture}</span>
                                            </span>
                                        ` : ''}
                                        ${activity.isTrashed ? html`
                                            <span class="activity-meta-item" style="color: var(--uui-color-danger);">
                                                <span>🗑️</span>
                                                <span>Trashed</span>
                                            </span>
                                        ` : ''}
                                    </div>
                                </div>
                                <div class="activity-timestamp">
                                    ${this._formatTimestamp(activity.timestamp)}
                                </div>
                            </div>
                        `)}
                    ` : html`
                        <div class="empty-state">
                            <div class="empty-state-icon">🔍</div>
                            <p>No activities found matching your filters.</p>
                            <p>Try adjusting your search criteria.</p>
                        </div>
                    `}
                </div>
            </div>
        `;
    }
}

customElements.define("content-activity-tracker-realtime", ContentActivityTrackerRealtime);
