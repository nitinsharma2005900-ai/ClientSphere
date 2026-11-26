'use client';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

type Field = { name: string; label: string; type?: string; required?: boolean; options?: { value: string; label: string }[] };
export function CreateRecordDialog({ title, endpoint, fields, defaults = {}, queryKeys }: { title: string; endpoint: string; fields: Field[]; defaults?: Record<string, any>; queryKeys: string[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const client = useQueryClient();
  const create = useMutation({ mutationFn: (payload: any) => api.post(endpoint, payload), onSuccess: () => { for (const key of queryKeys) client.invalidateQueries({ queryKey: [key] }); setOpen(false); }, onError: (failure: Error) => setError(failure.message) });
  return <>
    <button onClick={() => { setError(''); setOpen(true); }} className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold shadow-md transition-all hover:scale-105">{title}</button>
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-5 backdrop-blur-sm"><form aria-label={title} className="bg-white dark:bg-[#111B38] border border-[#E2DCBF] rounded-2xl p-6 space-y-4 w-full max-w-lg max-h-[90vh] overflow-auto" onSubmit={event => {
      event.preventDefault(); setError('');
      try {
        const data: Record<string, any> = { ...defaults };
        const form = new FormData(event.currentTarget);
        for (const field of fields) {
          const value = String(form.get(field.name) || '');
          if (value) data[field.name] = field.type === 'number' ? Number(value) : field.type === 'json' ? JSON.parse(value) : value;
        }
        create.mutate(data);
      } catch { setError('Enter valid JSON in the configuration fields.'); }
    }}>
      <div className="flex justify-between gap-5"><h2 className="text-xl font-bold">{title}</h2><button type="button" aria-label="Close dialog" onClick={() => setOpen(false)}>Close</button></div>
      {fields.map(field => <label key={field.name} className="block text-sm font-semibold">{field.label}{field.options ? <select name={field.name} required={field.required} className="block w-full p-3 mt-1 rounded-lg border bg-transparent">{field.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : field.type === 'json' ? <textarea name={field.name} required={field.required} defaultValue={defaults[field.name] ? JSON.stringify(defaults[field.name]) : ''} className="block w-full p-3 mt-1 rounded-lg border bg-transparent font-mono" /> : <input name={field.name} type={field.type || 'text'} step={field.type === 'number' ? 'any' : undefined} required={field.required} className="block w-full p-3 mt-1 rounded-lg border bg-transparent" />}</label>)}
      {error && <p role="alert" className="text-red-600">{error}</p>}
      <button type="submit" disabled={create.isPending} className="w-full rounded-xl p-3 bg-violet-600 text-white font-bold">{create.isPending ? 'Saving...' : 'Save'}</button>
    </form></div>}
  </>;
}
