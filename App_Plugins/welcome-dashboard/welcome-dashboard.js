import { LitElement, html, css } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";

export default class MyWelcomeDashboard extends UmbElementMixin(LitElement) {
    static properties = {
        _loading: { type: Boolean, state: true },
        _contentCount: { type: Number, state: true },
        _mediaCount: { type: Number, state: true },
        _userCount: { type: Number, state: true },
        _recentContent: { type: Array, state: true },
        _currentUser: { type: String, state: true },
    };

    constructor() {
        super();
        this._loading = true;
        this._contentCount = 0;
        this._mediaCount = 0;
        this._userCount = 0;
        this._recentContent = [];
        this._currentUser = '';
    }

    connectedCallback() {
        super.connectedCallback();
        this._loadDashboardData();
    }

    async _loadDashboardData() {
        this._loading = true;
        
        try {
            await Promise.all([
                this._fetchContentStats(),
                this._fetchMediaStats(),
                this._fetchUserStats(),
                this._fetchRecentContent(),
                this._fetchCurrentUser(),
            ]);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            this._loading = false;
        }
    }

    async _fetchContentStats() {
        try {
            const response = await fetch('/umbraco/management/api/v1/tree/document/root/children?skip=0&take=1');
            if (response.ok) {
                const data = await response.json();
                this._contentCount = data.total || 0;
            }
        } catch (error) {
            console.error('Error fetching content stats:', error);
        }
    }

    async _fetchMediaStats() {
        try {
            const response = await fetch('/umbraco/management/api/v1/tree/media/root/children?skip=0&take=1');
            if (response.ok) {
                const data = await response.json();
                this._mediaCount = data.total || 0;
            }
        } catch (error) {
            console.error('Error fetching media stats:', error);
        }
    }

    async _fetchUserStats() {
        try {
            const response = await fetch('/umbraco/management/api/v1/user?skip=0&take=1');
            if (response.ok) {
                const data = await response.json();
                this._userCount = data.total || 0;
            }
        } catch (error) {
            console.error('Error fetching user stats:', error);
        }
    }

    async _fetchRecentContent() {
        try {
            const response = await fetch('/umbraco/management/api/v1/tree/document/root/children?skip=0&take=5');
            if (response.ok) {
                const data = await response.json();
                this._recentContent = data.items || [];
            }
        } catch (error) {
            console.error('Error fetching recent content:', error);
        }
    }

    async _fetchCurrentUser() {
        try {
            const response = await fetch('/umbraco/management/api/v1/user/current');
            if (response.ok) {
                const data = await response.json();
                this._currentUser = data.name || 'User';
            }
        } catch (error) {
            console.error('Error fetching current user:', error);
        }
    }

    _handleRefresh() {
        this._loadDashboardData();
    }

    static styles = [
        css`
            :host {
                display: block;
                padding: var(--uui-size-space-5);
            }

            .dashboard-container {
                max-width: 1200px;
                margin: 0 auto;
            }

            .welcome-header {
                margin-bottom: var(--uui-size-space-6);
            }

            .welcome-header h1 {
                font-size: var(--uui-type-h2-size);
                margin: 0 0 var(--uui-size-space-3) 0;
                color: var(--uui-color-text);
            }

            .welcome-header p {
                font-size: var(--uui-type-default-size);
                color: var(--uui-color-text-alt);
                margin: 0;
            }

            .dashboard-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: var(--uui-size-space-5);
                margin-bottom: var(--uui-size-space-6);
            }

            .dashboard-card {
                background: var(--uui-color-surface);
                border: 1px solid var(--uui-color-border);
                border-radius: var(--uui-border-radius);
                padding: var(--uui-size-space-5);
                transition: box-shadow 0.2s ease;
            }

            .dashboard-card:hover {
                box-shadow: var(--uui-shadow-depth-3);
            }

            .card-icon {
                font-size: 2rem;
                margin-bottom: var(--uui-size-space-3);
            }

            .card-title {
                font-size: var(--uui-type-h5-size);
                font-weight: 700;
                margin: 0 0 var(--uui-size-space-2) 0;
                color: var(--uui-color-text);
            }

            .card-description {
                font-size: var(--uui-type-small-size);
                color: var(--uui-color-text-alt);
                margin: 0 0 var(--uui-size-space-4) 0;
                line-height: 1.5;
            }

            .card-link {
                display: inline-flex;
                align-items: center;
                gap: var(--uui-size-space-2);
                color: var(--uui-color-interactive);
                text-decoration: none;
                font-weight: 600;
                font-size: var(--uui-type-small-size);
            }

            .card-link:hover {
                text-decoration: underline;
            }

            .stats-section {
                background: var(--uui-color-surface);
                border: 1px solid var(--uui-color-border);
                border-radius: var(--uui-border-radius);
                padding: var(--uui-size-space-5);
            }

            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: var(--uui-size-space-4);
            }

            .stat-item {
                text-align: center;
                padding: var(--uui-size-space-4);
            }

            .stat-value {
                font-size: var(--uui-type-h3-size);
                font-weight: 700;
                color: var(--uui-color-interactive);
                margin: 0 0 var(--uui-size-space-1) 0;
            }

            .stat-label {
                font-size: var(--uui-type-small-size);
                color: var(--uui-color-text-alt);
                margin: 0;
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

            .header-actions {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: var(--uui-size-space-6);
            }

            .user-greeting {
                font-size: var(--uui-type-h5-size);
                color: var(--uui-color-text-alt);
                margin: 0;
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

            .recent-content-section {
                background: var(--uui-color-surface);
                border: 1px solid var(--uui-color-border);
                border-radius: var(--uui-border-radius);
                padding: var(--uui-size-space-5);
                margin-top: var(--uui-size-space-6);
            }

            .recent-content-list {
                list-style: none;
                padding: 0;
                margin: 0;
            }

            .recent-content-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: var(--uui-size-space-3);
                border-bottom: 1px solid var(--uui-color-border);
                transition: background 0.2s ease;
            }

            .recent-content-item:last-child {
                border-bottom: none;
            }

            .recent-content-item:hover {
                background: var(--uui-color-surface-alt);
            }

            .recent-content-name {
                font-weight: 600;
                color: var(--uui-color-text);
                text-decoration: none;
            }

            .recent-content-name:hover {
                color: var(--uui-color-interactive);
            }

            .recent-content-type {
                font-size: var(--uui-type-small-size);
                color: var(--uui-color-text-alt);
            }

            .empty-state {
                text-align: center;
                padding: var(--uui-size-space-6);
                color: var(--uui-color-text-alt);
            }

            .stat-change {
                display: inline-block;
                margin-left: var(--uui-size-space-2);
                font-size: var(--uui-type-small-size);
                font-weight: 600;
            }

            .stat-change.positive {
                color: var(--uui-color-positive);
            }

            .stat-change.negative {
                color: var(--uui-color-danger);
            }
        `,
    ];

    render() {
        if (this._loading) {
            return html`
                <div class="dashboard-container">
                    <div class="loading">
                        <div class="loading-spinner"></div>
                        <p>Loading dashboard...</p>
                    </div>
                </div>
            `;
        }

        return html`
            <div class="dashboard-container">
                <div class="header-actions">
                    <div class="welcome-header">
                        <h1>Welcome ${this._currentUser ? ', ' + this._currentUser : ''}!</h1>
                        <p>Get started with your Umbraco 17 site - manage content, configure settings, and explore features.</p>
                    </div>
                    <button 
                        class="refresh-button" 
                        @click=${this._handleRefresh}
                        ?disabled=${this._loading}>
                        ?? Refresh
                    </button>
                </div>

                <div class="dashboard-grid">
                    <div class="dashboard-card">
                        <div class="card-icon">??</div>
                        <h2 class="card-title">Create Content</h2>
                        <p class="card-description">
                            Start creating pages, posts, and other content for your website.
                        </p>
                        <a href="/umbraco#/content" class="card-link">
                            Go to Content ?
                        </a>
                    </div>

                    <div class="dashboard-card">
                        <div class="card-icon">??</div>
                        <h2 class="card-title">Media Library</h2>
                        <p class="card-description">
                            Upload and manage images, videos, and other media files.
                        </p>
                        <a href="/umbraco#/media" class="card-link">
                            Go to Media ?
                        </a>
                    </div>

                    <div class="dashboard-card">
                        <div class="card-icon">??</div>
                        <h2 class="card-title">Settings</h2>
                        <p class="card-description">
                            Configure your site settings, document types, and more.
                        </p>
                        <a href="/umbraco#/settings" class="card-link">
                            Go to Settings ?
                        </a>
                    </div>

                    <div class="dashboard-card">
                        <div class="card-icon">??</div>
                        <h2 class="card-title">Packages</h2>
                        <p class="card-description">
                            Browse and install packages to extend your Umbraco installation.
                        </p>
                        <a href="/umbraco#/packages" class="card-link">
                            Go to Packages ?
                        </a>
                    </div>
                </div>

                <div class="stats-section">
                    <h2 class="card-title" style="margin-bottom: var(--uui-size-space-4);">Quick Stats</h2>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <p class="stat-value">${this._contentCount}</p>
                            <p class="stat-label">Total Content Items</p>
                        </div>
                        <div class="stat-item">
                            <p class="stat-value">${this._mediaCount}</p>
                            <p class="stat-label">Media Items</p>
                        </div>
                        <div class="stat-item">
                            <p class="stat-value">${this._userCount}</p>
                            <p class="stat-label">Users</p>
                        </div>
                        <div class="stat-item">
                            <p class="stat-value">Umbraco 17</p>
                            <p class="stat-label">Version</p>
                        </div>
                    </div>
                </div>

                ${this._recentContent.length > 0 ? html`
                    <div class="recent-content-section">
                        <h2 class="card-title" style="margin-bottom: var(--uui-size-space-4);">Recent Content</h2>
                        <ul class="recent-content-list">
                            ${this._recentContent.map(item => html`
                                <li class="recent-content-item">
                                    <div>
                                        <a href="/umbraco#/content/content/edit/${item.id}" class="recent-content-name">
                                            ${item.name || 'Untitled'}
                                        </a>
                                        <div class="recent-content-type">${item.type || 'Document'}</div>
                                    </div>
                                    <span style="color: var(--uui-color-text-alt); font-size: var(--uui-type-small-size);">
                                        ${item.hasChildren ? '??' : '??'}
                                    </span>
                                </li>
                            `)}
                        </ul>
                    </div>
                ` : html`
                    <div class="recent-content-section">
                        <div class="empty-state">
                            <p>No content items yet. Start by creating your first page!</p>
                        </div>
                    </div>
                `}
            </div>
        `;
    }
}

customElements.define("my-welcome-dashboard", MyWelcomeDashboard);
