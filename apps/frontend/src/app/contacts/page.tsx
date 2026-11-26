// ClientSphere Contacts Management Page
// Capstone Challenge: Multi-Company Associations & GDPR Consent Tracking
// Developer: Nitin Sharma

'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { CreateRecordDialog } from '@/components/common/CreateRecordDialog';
import {
  Contact,
  Plus,
  Building2,
  Mail,
  Phone,
  ShieldCheck,
  Link2,
  X,
  Briefcase,
  Share2,
} from 'lucide-react';

export default function ContactsPage() {
  const queryClient = useQueryClient();
  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const [showAssociateModal, setShowAssociateModal] = useState(false);
  const [targetContact, setTargetContact] = useState<any | null>(null);

  // Association form state
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [associationRole, setAssociationRole] = useState('');
  const [associationDept, setAssociationDept] = useState('');

  const { data: contactsData, isLoading } = useQuery({
    queryKey: ['contactsList'],
    queryFn: async () => {
      const res = await api.get('/contacts');
      return res.data;
    },
  });

  const { data: companiesData } = useQuery({
    queryKey: ['companiesBrief'],
    queryFn: async () => {
      const res = await api.get('/companies?limit=100');
      return res.data;
    },
  });

  const associateMutation = useMutation({
    mutationFn: async ({ contactId, payload }: { contactId: string; payload: any }) => {
      return await api.post(`/contacts/${contactId}/companies`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contactsList'] });
      setShowAssociateModal(false);
      alert('Successfully associated contact with additional company (Capstone Challenge)!');
    },
    onError: (err: any) => {
      alert(`Association Error: ${err.message}`);
    }
  });

  const contacts = contactsData || [];
  const companies = companiesData || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#070C1B] dark:text-[#FAF9F0] flex items-center gap-2">
            <Contact className="text-violet-600" /> Customer Relationships & Contacts
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Capstone Challenge: Single contacts affiliated across multiple companies with role-specific departmental contexts.
          </p>
        </div>
        <CreateRecordDialog title="New contact" endpoint="/contacts" queryKeys={['contactsList', 'dashboardMetrics']} fields={[{ name: 'firstName', label: 'First name', required: true }, { name: 'lastName', label: 'Last name', required: true }, { name: 'email', label: 'Email', type: 'email', required: true }, { name: 'phone', label: 'Phone' }]} />
      </div>

      {/* Contacts Table */}
      <div className="rounded-2xl bg-white dark:bg-[#111B38] border border-[#E2DCBF] dark:border-[#233464] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E2DCBF] dark:border-[#233464] bg-[#FAF9F0] dark:bg-[#070C1B] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-5">Contact Details</th>
                <th className="py-3.5 px-5">Primary Company Affiliation</th>
                <th className="py-3.5 px-5">Multi-Company Count</th>
                <th className="py-3.5 px-5">GDPR Consent</th>
                <th className="py-3.5 px-5 text-right">Capstone Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DCBF] dark:divide-[#233464]">
              {contacts.map((contact: any) => (
                <tr key={contact.id} className="hover:bg-[#FAF9F0]/60 dark:hover:bg-[#1C2B54]/40 transition-colors">
                  <td className="py-4 px-5">
                    <div className="font-bold text-sm text-[#070C1B] dark:text-[#FAF9F0]">
                      {contact.firstName} {contact.lastName}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-gray-500">
                      <span className="flex items-center gap-1">
                        <Mail size={12} /> {contact.email}
                      </span>
                      {contact.phone && (
                        <span className="flex items-center gap-1">
                          <Phone size={12} /> {contact.phone}
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-4 px-5">
                    {contact.primaryCompany ? (
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-gray-200 flex items-center gap-1.5">
                          <Building2 size={13} className="text-violet-600" />
                          {contact.primaryCompany.name}
                        </div>
                        <div className="text-gray-500 mt-0.5">{contact.primaryCompany.jobTitle}</div>
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">No primary company</span>
                    )}
                  </td>

                  <td className="py-4 px-5">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-violet-500/10 text-violet-600 border border-violet-500/20">
                      {contact.companyCount || 1} Companies Linked
                    </span>
                  </td>

                  <td className="py-4 px-5">
                    <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck size={14} /> Opted-in ({contact.consentSource || 'Direct'})
                    </span>
                  </td>

                  <td className="py-4 px-5 text-right space-x-2">
                    <button
                      onClick={async () => {
                        const full = await api.get(`/contacts/${contact.id}`);
                        setSelectedContact(full.data);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#E2DCBF] dark:border-[#233464] hover:bg-[#F4F1E4] transition-colors"
                    >
                      View Companies
                    </button>
                    <button
                      onClick={() => {
                        setTargetContact(contact);
                        setSelectedCompanyId(companies[0]?.id || '');
                        setAssociationRole('Strategic Advisor');
                        setShowAssociateModal(true);
                      }}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-violet-600 hover:bg-violet-700 text-white shadow-sm transition-all"
                    >
                      + Link Company
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Capstone Challenge: Multi-Company Associations Detail Drawer */}
      {selectedContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-white dark:bg-[#111B38] border border-[#E2DCBF] dark:border-[#233464] shadow-2xl space-y-5 animate-slide-up">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2DCBF] dark:border-[#233464]">
              <div>
                <h3 className="text-lg font-bold text-[#070C1B] dark:text-[#FAF9F0] flex items-center gap-2">
                  <Share2 size={18} className="text-violet-600" /> Multi-Company Affiliations
                </h3>
                <p className="text-xs text-gray-500">
                  {selectedContact.firstName} {selectedContact.lastName}
                </p>
              </div>
              <button onClick={() => setSelectedContact(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              {selectedContact.companies?.map((rel: any) => (
                <div
                  key={rel.relationId}
                  className="p-3.5 rounded-xl border border-[#E2DCBF] dark:border-[#233464] bg-[#FAF9F0] dark:bg-[#070C1B] flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-sm text-[#070C1B] dark:text-[#FAF9F0] flex items-center gap-2">
                      <Building2 size={14} className="text-violet-600" />
                      {rel.companyName}
                      {rel.isPrimary && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-extrabold bg-emerald-500 text-white">
                          PRIMARY
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Role: <span className="font-semibold">{rel.jobTitle}</span>{' '}
                      {rel.department && `• Dept: ${rel.department}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setSelectedContact(null)}
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-violet-600 text-white hover:bg-violet-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Link to Secondary Company Modal */}
      {showAssociateModal && targetContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-[#111B38] border border-[#E2DCBF] dark:border-[#233464] shadow-2xl space-y-4 animate-slide-up">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2DCBF] dark:border-[#233464]">
              <h3 className="font-bold text-base text-[#070C1B] dark:text-[#FAF9F0] flex items-center gap-2">
                <Link2 className="text-violet-600" /> Associate Additional Company
              </h3>
              <button onClick={() => setShowAssociateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Target Company *</label>
                <select
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E2DCBF] dark:border-[#233464] bg-white dark:bg-[#070C1B]"
                >
                  {companies.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.tier || 'Standard'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Job Title / Relationship *</label>
                <input
                  type="text"
                  value={associationRole}
                  onChange={(e) => setAssociationRole(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E2DCBF] dark:border-[#233464] bg-transparent"
                  placeholder="e.g. Strategic Board Advisor"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Department</label>
                <input
                  type="text"
                  value={associationDept}
                  onChange={(e) => setAssociationDept(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E2DCBF] dark:border-[#233464] bg-transparent"
                  placeholder="e.g. Advisory Council"
                />
              </div>
            </div>

            <button
              onClick={() =>
                associateMutation.mutate({
                  contactId: targetContact.id,
                  payload: {
                    companyId: selectedCompanyId,
                    jobTitle: associationRole,
                    department: associationDept,
                    isPrimary: false,
                  },
                })
              }
              disabled={associateMutation.isPending || !selectedCompanyId || !associationRole}
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white transition-colors"
            >
              {associateMutation.isPending ? 'Associating...' : 'Confirm Association'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
