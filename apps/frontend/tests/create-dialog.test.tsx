import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreateRecordDialog } from '../src/components/common/CreateRecordDialog';
import { api } from '../src/lib/api';

function renderDialog(fields: any[], defaults = {}) {
  render(<QueryClientProvider client={new QueryClient()}><CreateRecordDialog title="New workflow" endpoint="/workflows" queryKeys={['workflowsList']} fields={fields} defaults={defaults} /></QueryClientProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'New workflow' }));
}
describe('CRM creation forms', () => {
  it('shows malformed configuration errors and avoids submitting', () => {
    const post = vi.spyOn(api, 'post');
    renderDialog([{ name: 'actions', label: 'Actions', type: 'json' }]);
    fireEvent.change(screen.getByLabelText('Actions'), { target: { value: '{invalid' } });
    fireEvent.submit(screen.getByRole('form'));
    expect(screen.getByRole('alert').textContent).toContain('valid JSON');
    expect(post).not.toHaveBeenCalled();
    post.mockRestore();
  });
  it('submits typed data and closes after a successful API write', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ success: true, data: {} });
    renderDialog([{ name: 'value', label: 'Value', type: 'number' }], { title: 'Test deal' });
    fireEvent.change(screen.getByLabelText('Value'), { target: { value: '1200' } });
    fireEvent.submit(screen.getByRole('form'));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/workflows', { title: 'Test deal', value: 1200 }));
    await waitFor(() => expect(screen.queryByRole('form')).toBeNull());
    post.mockRestore();
  });
  it('shows backend failures without silently reporting success', async () => {
    const post = vi.spyOn(api, 'post').mockRejectedValue(new Error('Access denied'));
    renderDialog([]);
    fireEvent.submit(screen.getByRole('form'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Access denied'));
    expect(screen.getByRole('form')).toBeTruthy();
    post.mockRestore();
  });
});
