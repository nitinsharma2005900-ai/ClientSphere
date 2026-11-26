// ClientSphere Unified API Client
// Developer: Nitin Sharma

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

class ApiClient {
  public getBaseUrl(): string {
    return process.env.NEXT_PUBLIC_API_URL || '/api/v1';
  }

  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('clientsphere_token');
  }

  private setAuthToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('clientsphere_token', token);
    }
  }

  private refreshing: Promise<string | null> | null = null;
  private async ensureAuthenticated(): Promise<string | null> {
    const token = this.getAuthToken();
    if (token) return token;
    if (typeof window === 'undefined') return null;
    const refreshToken = localStorage.getItem('clientsphere_refresh');
    if (!refreshToken) return null;
    if (!this.refreshing) this.refreshing = (async () => {
      try {
        const response = await fetch(`${this.getBaseUrl()}/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken }) });
        if (!response.ok) throw new Error('Session expired');
        const data = await response.json();
        this.setAuthToken(data.data.accessToken);
        return data.data.accessToken;
      } catch {
        localStorage.removeItem('clientsphere_refresh');
        window.dispatchEvent(new Event('clientsphere-session-expired'));
        return null;
      } finally { this.refreshing = null; }
    })();
    return this.refreshing;
  }

  public async request<T = any>(
    endpoint: string,
    options: RequestInit = {},
    isRetry = false
  ): Promise<ApiResponse<T>> {
    let token = this.getAuthToken();
    if (!token && !endpoint.includes('/auth/login')) {
      token = await this.ensureAuthenticated();
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.getBaseUrl()}${cleanEndpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Unexpected non-JSON response from ${url}: ${text.slice(0, 100)}`);
      }

      const data = await response.json();

      if (!response.ok) {
        // If 401 Unauthorized and haven't retried yet, refresh token and retry
        if (response.status === 401 && !isRetry && !endpoint.includes('/auth/login')) {
          localStorage.removeItem('clientsphere_token');
          await this.ensureAuthenticated();
          return this.request<T>(endpoint, options, true);
        }
        throw new Error(data?.error?.message || `API error with status ${response.status}`);
      }

      return data;
    } catch (err: any) {
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('clientsphere-api-error', { detail: err.message }));
      throw err;
    }
  }

  public get<T = any>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  public post<T = any>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public put<T = any>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public patch<T = any>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public delete<T = any>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  public async uploadFile<T = any>(endpoint: string, file: File): Promise<ApiResponse<T>> {
    let token = this.getAuthToken();
    if (!token) {
      token = await this.ensureAuthenticated();
    }

    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.getBaseUrl()}${cleanEndpoint}`;

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || 'File upload failed');
    }
    return data;
  }
  public async download(endpoint: string, filename: string) {
    const token = this.getAuthToken();
    const response = await fetch(`${this.getBaseUrl()}${endpoint}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!response.ok) throw new Error('Download failed. Please retry.');
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
  }
}

export const api = new ApiClient();
