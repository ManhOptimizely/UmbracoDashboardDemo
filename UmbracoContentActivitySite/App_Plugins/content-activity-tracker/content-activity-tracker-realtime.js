import { LitElement, html, css } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_AUTH_CONTEXT } from '@umbraco-cms/backoffice/auth';
export default class ContentActivityTrackerRealtime extends UmbElementMixin(LitElement) {
    static properties = {
        _loading: { type: Boolean, state: true },
        _activities: { type: Array, state: true },
        _filteredActivities: { type: Array, state: true },
        _pagedActivities: { type: Array, state: true },
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
        _currentPage: { type: Number, state: true },
        _itemsPerPage: { type: Number, state: true },
    };

    constructor() {
        super();
        this._loading = true;
        this._activities = [];
        this._filteredActivities = [];
        this._pagedActivities = [];
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
        this._currentPage = 1;
        this._itemsPerPage = 10;
    }

    async fetchData(host, endpoint) {
        const authContext = await host.getContext(UMB_AUTH_CONTEXT);
        const token = await authContext?.getLatestToken();

        const response = await fetch(endpoint, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch data');
        }

        return response.json();
    }

    async connectedCallback() {
        super.connectedCallback();
        await this._loadSignalR();
        await this._initializeSignalR();
        this._loadActivityData();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
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
        // When new activity arrives via SignalR, reload data from server
        this._loadActivityData();

        // Show notification
        this._showToast(`New activity: ${activity.contentName || 'Content'} was ${activity.action.toLowerCase()}`);
    }

    _showToast(message) {
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

    async _loadActivityData() {
        this._loading = true;
        this._error = null;

        try {
            // Build query parameters for server-side filtering and pagination
            const params = new URLSearchParams({
                take: this._itemsPerPage.toString(),
                skip: ((this._currentPage - 1) * this._itemsPerPage).toString(),
                sortOrder: this._sortOrder
            });

            // Add action filter if not 'all'
            if (this._filterType !== 'all') {
                params.append('action', this._filterType);
            }

            // Add search query if present
            if (this._searchQuery.trim()) {
                params.append('search', this._searchQuery.trim());
            }
            const data = await this.fetchData(this, `/umbraco/management/api/v1/content-activity?${params}`);
            // Don't know why tryExecute doesn't work with backoffice authentication
            //const { data, error } = await tryExecute(this, umbHttpClient.get({
            //    url: `/umbraco/management/api/v1/content-activity?${params}`
            //}));
            
            // Map API response to dashboard
            this._activities = (data.items || []).map(item => ({
                id: item.id,
                contentId: item.contentKey,
                contentName: item.contentName || 'Untitled',
                contentType: item.contentTypeAlias || 'Document',
                action: item.action.toLowerCase(),
                actionLabel: item.action,
                timestamp: item.timestamp,
                user: item.userName || 'Unknown',
                color: this._getColorForAction(item.action),
                isTrashed: item.isTrashed || false,
                culture: item.culture,
            }));

            // Update pagination info from server response
            this._totalActivities = data.total || 0;
            this._filteredActivities = this._activities;
            this._pagedActivities = this._activities;
            this._lastRefresh = new Date().toLocaleTimeString();
        } catch (error) {
            console.error('Error loading activity data:', error);
            this._error = `Failed to load content activities: ${error.message}. Please try again.`;
        } finally {
            this._loading = false;
        }
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

    _getTotalPages() {
        return Math.ceil(this._totalActivities / this._itemsPerPage);
    }

    _handlePageChange(newPage) {
        const totalPages = this._getTotalPages();
        if (newPage >= 1 && newPage <= totalPages) {
            this._currentPage = newPage;
            this._loadActivityData(); // Reload from server with new page
            // Scroll to top of activity list
            this.shadowRoot.querySelector('.activity-list')?.scrollIntoView({ behavior: 'smooth' });
        }
    }

    _handleItemsPerPageChange(e) {
        this._itemsPerPage = parseInt(e.target.value);
        this._currentPage = 1;
        this._loadActivityData(); // Reload from server with new page size
    }

    _getPageNumbers() {
        const totalPages = this._getTotalPages();
        const currentPage = this._currentPage;
        const pageNumbers = [];
        
        // Always show first page
        pageNumbers.push(1);
        
        // Calculate range around current page
        let startPage = Math.max(2, currentPage - 2);
        let endPage = Math.min(totalPages - 1, currentPage + 2);
        
        // Add ellipsis after first page if needed
        if (startPage > 2) {
            pageNumbers.push('...');
        }
        
        // Add pages around current page
        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.push(i);
        }
        
        // Add ellipsis before last page if needed
        if (endPage < totalPages - 1) {
            pageNumbers.push('...');
        }
        
        // Always show last page (if more than 1 page)
        if (totalPages > 1) {
            pageNumbers.push(totalPages);
        }
        
        return pageNumbers;
    }

    _handleRefresh() {
        this._loadActivityData();
    }

    _handleFilterChange(e) {
        this._filterType = e.target.value;
        this._currentPage = 1; // Reset to first page
        this._loadActivityData(); // Reload from server with new filter
    }

    _handleSearchInput(e) {
        this._searchQuery = e.target.value;
    }

    _handleSearchSubmit(e) {
        if (e) {
            e.preventDefault();
        }
        this._currentPage = 1; // Reset to first page
        this._loadActivityData(); // Reload from server with search query
    }

    _handleSearchKeyPress(e) {
        if (e.key === 'Enter') {
            this._handleSearchSubmit(e);
        }
    }

    _handleSortChange(e) {
        this._sortOrder = e.target.value;
        this._loadActivityData(); // Reload from server with new sort order
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
        // Note: This now shows counts from current page only
        if (type === 'all') {
            return this._totalActivities;
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

            .search-wrapper {
                display: flex;
                gap: var(--uui-size-space-2);
                align-items: flex-end;
            }

            .search-button {
                background: var(--uui-color-interactive);
                color: white;
                border: none;
                border-radius: var(--uui-border-radius);
                padding: var(--uui-size-space-2) var(--uui-size-space-4);
                font-size: var(--uui-type-default-size);
                font-weight: 600;
                cursor: pointer;
                transition: background 0.2s ease;
                white-space: nowrap;
                height: 38px;
            }

            .search-button:hover {
                background: var(--uui-color-interactive-emphasis);
            }

            .search-button:disabled {
                opacity: 0.6;
                cursor: not-allowed;
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
                cursor: pointer;
                text-decoration: none;
                color: inherit;
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

            .pagination {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: var(--uui-size-space-4);
                background: var(--uui-color-surface-alt);
                border-top: 1px solid var(--uui-color-border);
                flex-wrap: wrap;
                gap: var(--uui-size-space-3);
            }

            .pagination-info {
                font-size: var(--uui-type-small-size);
                color: var(--uui-color-text-alt);
            }

            .pagination-controls {
                display: flex;
                align-items: center;
                gap: var(--uui-size-space-2);
            }

            .pagination-button {
                background: var(--uui-color-surface);
                border: 1px solid var(--uui-color-border);
                border-radius: var(--uui-border-radius);
                padding: var(--uui-size-space-2) var(--uui-size-space-3);
                font-size: var(--uui-type-small-size);
                cursor: pointer;
                transition: all 0.2s ease;
                min-width: 36px;
                height: 36px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
            }

            .pagination-button:hover:not(:disabled) {
                background: var(--uui-color-interactive-emphasis);
                border-color: var(--uui-color-interactive);
                color: var(--uui-color-interactive);
            }

            .pagination-button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .pagination-button.active {
                background: var(--uui-color-interactive);
                border-color: var(--uui-color-interactive);
                color: white;
                font-weight: 600;
            }

            .pagination-button.ellipsis {
                border: none;
                background: transparent;
                cursor: default;
            }

            .pagination-button.ellipsis:hover {
                background: transparent;
                border: none;
            }

            .items-per-page {
                display: flex;
                align-items: center;
                gap: var(--uui-size-space-2);
                font-size: var(--uui-type-small-size);
            }

            .items-per-page select {
                padding: var(--uui-size-space-2);
                border: 1px solid var(--uui-color-border);
                border-radius: var(--uui-border-radius);
                background: var(--uui-color-surface);
                color: var(--uui-color-text);
                font-size: var(--uui-type-small-size);
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

                .search-wrapper {
                    flex-direction: column;
                    align-items: stretch;
                }

                .search-button {
                    width: 100%;
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

                .pagination {
                    flex-direction: column;
                    align-items: stretch;
                }

                .pagination-controls {
                    justify-content: center;
                    flex-wrap: wrap;
                }

                .pagination-info {
                    text-align: center;
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
                        <div class="search-wrapper">
                            <input 
                                type="text" 
                                id="search" 
                                placeholder="Search by content name, user, or type..." 
                                @input=${this._handleSearchInput}
                                @keypress=${this._handleSearchKeyPress}
                                .value=${this._searchQuery}
                            />
                            <button 
                                class="search-button"
                                @click=${this._handleSearchSubmit}
                                ?disabled=${this._loading}
                                title="Search"
                            >
                                🔍 Search
                            </button>
                        </div>
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
                            Showing ${this._pagedActivities.length} of ${this._filteredActivities.length} activities
                            ${this._filteredActivities.length !== this._totalActivities ? `(${this._totalActivities} total)` : ''}
                        </span>
                    </div>

                    ${this._pagedActivities.length > 0 ? html`
                        ${this._pagedActivities.map(activity => html`
                            <a 
                                href="/umbraco/section/content/workspace/document/edit/${activity.contentId}" 
                                class="activity-item"
                            >
                                <div class="activity-details">
                                    <div class="activity-title">
                                        <span class="activity-content-name">
                                            ${activity.contentName}
                                        </span>
                                        <span class="activity-action ${activity.action}">
                                            ${activity.actionLabel}
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
                            </a>
                        `)}
                    ` : html`
                        <div class="empty-state">
                            <div class="empty-state-icon">🔍</div>
                            <p>No activities found matching your filters.</p>
                            <p>Try adjusting your search criteria.</p>
                        </div>
                    `}

                    ${this._filteredActivities.length > 0 ? html`
                        <div class="pagination">
                            <div class="pagination-info">
                                Page ${this._currentPage} of ${this._getTotalPages()}
                                (${this._filteredActivities.length} activities)
                            </div>

                            <div class="pagination-controls">
                                <button 
                                    class="pagination-button"
                                    @click=${() => this._handlePageChange(1)}
                                    ?disabled=${this._currentPage === 1}
                                    title="First Page"
                                >
                                    ⏮️
                                </button>
                                
                                <button 
                                    class="pagination-button"
                                    @click=${() => this._handlePageChange(this._currentPage - 1)}
                                    ?disabled=${this._currentPage === 1}
                                    title="Previous Page"
                                >
                                    ◀️
                                </button>

                                ${this._getPageNumbers().map(pageNum => 
                                    pageNum === '...' 
                                        ? html`<span class="pagination-button ellipsis">...</span>`
                                        : html`
                                            <button 
                                                class="pagination-button ${pageNum === this._currentPage ? 'active' : ''}"
                                                @click=${() => this._handlePageChange(pageNum)}
                                            >
                                                ${pageNum}
                                            </button>
                                        `
                                )}

                                <button 
                                    class="pagination-button"
                                    @click=${() => this._handlePageChange(this._currentPage + 1)}
                                    ?disabled=${this._currentPage === this._getTotalPages()}
                                    title="Next Page"
                                >
                                    ▶️
                                </button>
                                
                                <button 
                                    class="pagination-button"
                                    @click=${() => this._handlePageChange(this._getTotalPages())}
                                    ?disabled=${this._currentPage === this._getTotalPages()}
                                    title="Last Page"
                                >
                                    ⏭️
                                </button>
                            </div>

                            <div class="items-per-page">
                                <label for="items-per-page">Items per page:</label>
                                <select 
                                    id="items-per-page"
                                    @change=${this._handleItemsPerPageChange}
                                    .value=${this._itemsPerPage.toString()}
                                >
                                    <option value="10">10</option>
                                    <option value="20">20</option>
                                    <option value="50">50</option>
                                    <option value="100">100</option>
                                </select>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
}

customElements.define("content-activity-tracker-realtime", ContentActivityTrackerRealtime);
