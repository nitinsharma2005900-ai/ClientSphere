// ClientSphere Integrations Sandbox Page (Assessment 08)
// Email Sandbox, Calendar Sandbox, Telephony Mock & Webhook Lead Capture
// Developer: Nitin Sharma

'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Boxes,
  Mail,
  Calendar,
  PhoneCall,
  Webhook,
  Send,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from 'lucide-react';

export default function IntegrationsPage() {
  const [emailTo, setEmailTo] = useState('v.sterling@apexcloud.io');
  const [emailSubj, setEmailSubj] = useState('Executive Architecture Review Follow-up');
  const [emailBody, setEmailBody] = useState('Hi Victoria, following up on our multi-region enterprise cloud governance briefing.');
  const [emailResult, setEmailResult] = useState<any | null>(null);

  const [callNumber, setCallNumber] = useState('+1-415-555-0192');
  const [callNotes, setCallNotes] = useState('Roadmap synchronization call regarding SOC2 compliance.');
  const [callResult, setCallResult] = useState<any | null>(null);

  const { data: statusData } = useQuery({
    queryKey: ['integrationsStatus'],
    queryFn: async () => {
      const res = await api.get('/integrations/status');
      return res.data;
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/integrations/sandbox/email', {
        to: emailTo,
        subject: emailSubj,
        body: emailBody,
      });
      return res.data;
    },
    onSuccess: (data) => setEmailResult(data),
  });

  const triggerCallMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/integrations/sandbox/telephony', {
        phoneNumber: callNumber,
        direction: 'OUTBOUND',
        durationSeconds: 185,
        notes: callNotes,
      });
      return res.data;
    },
    onSuccess: (data) => setCallResult(data),
  });

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl">
      <div>
        <h1 className="text-2xl font-extrabold text-[#070C1B] dark:text-[#FAF9F0] flex items-center gap-2">
          <Boxes className="text-violet-600" /> CRM External Integrations Sandbox
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Assessment 08: Safe email/calendar sandbox, WebRTC telephony simulation, and authenticated web-to-lead webhook endpoints.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Email Sandbox Simulation Panel */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#111B38] border border-[#E2DCBF] dark:border-[#233464] shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2DCBF] dark:border-[#233464]">
            <h2 className="font-bold text-sm text-[#070C1B] dark:text-[#FAF9F0] flex items-center gap-2">
              <Mail className="text-violet-600" /> Email Sandbox Simulation
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              SANDBOX ONLINE
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-semibold block mb-1">Recipient (To)</label>
              <input
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#E2DCBF] dark:border-[#233464] bg-transparent"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Subject</label>
              <input
                type="text"
                value={emailSubj}
                onChange={(e) => setEmailSubj(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#E2DCBF] dark:border-[#233464] bg-transparent"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Body</label>
              <textarea
                rows={3}
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#E2DCBF] dark:border-[#233464] bg-transparent"
              />
            </div>
          </div>

          <button
            onClick={() => sendEmailMutation.mutate()}
            disabled={sendEmailMutation.isPending}
            className="w-full py-2.5 rounded-xl font-bold text-xs bg-violet-600 hover:bg-violet-700 text-white shadow-sm flex items-center justify-center gap-2 transition-all"
          >
            <Send size={14} /> {sendEmailMutation.isPending ? 'Delivering to Sandbox...' : 'Deliver Simulated Email'}
          </button>

          {emailResult && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300">
              ✓ Message dispatched to sandbox mail spool ({emailResult.sandboxDeliveryTimeMs}ms latency). Activity timeline logged.
            </div>
          )}
        </div>

        {/* Telephony Mock Panel */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#111B38] border border-[#E2DCBF] dark:border-[#233464] shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2DCBF] dark:border-[#233464]">
            <h2 className="font-bold text-sm text-[#070C1B] dark:text-[#FAF9F0] flex items-center gap-2">
              <PhoneCall className="text-emerald-500" /> Click-to-Call Telephony Mock
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              DIALER READY
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-semibold block mb-1">Target Phone Number</label>
              <input
                type="text"
                value={callNumber}
                onChange={(e) => setCallNumber(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#E2DCBF] dark:border-[#233464] bg-transparent"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Call Notes / Disposition</label>
              <textarea
                rows={3}
                value={callNotes}
                onChange={(e) => setCallNotes(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#E2DCBF] dark:border-[#233464] bg-transparent"
              />
            </div>
          </div>

          <button
            onClick={() => triggerCallMutation.mutate()}
            disabled={triggerCallMutation.isPending}
            className="w-full py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center justify-center gap-2 transition-all"
          >
            <PhoneCall size={14} /> {triggerCallMutation.isPending ? 'Simulating Call Session...' : 'Execute Mock Call'}
          </button>

          {callResult && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300">
              ✓ Call completed ({callResult.duration}). Call recording URL simulated and linked to timeline.
            </div>
          )}
        </div>
      </div>

      {/* Webhook Lead Capture Spec Box */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#111B38] border border-[#E2DCBF] dark:border-[#233464] shadow-sm space-y-3">
        <h3 className="font-bold text-sm text-[#070C1B] dark:text-[#FAF9F0] flex items-center gap-2">
          <Webhook size={16} className="text-violet-600" /> Public Web-to-Lead Webhook Specification
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          External marketing landing pages push leads to ClientSphere with HMAC or API Key verification:
        </p>
        <pre className="p-3.5 rounded-xl bg-[#FAF9F0] dark:bg-[#070C1B] border border-[#E2DCBF] dark:border-[#233464] font-mono text-xs overflow-x-auto text-gray-800 dark:text-gray-200">
POST /api/v1/integrations/lead-capture
Header: X-API-KEY: whsec_clientsphere_sandbox_secret_998877
Content-Type: application/json

&#123;
  &quot;firstName&quot;: &quot;Elena&quot;,
  &quot;lastName&quot;: &quot;Vasquez&quot;,
  &quot;email&quot;: &quot;elena.v@example.com&quot;,
  &quot;companyName&quot;: &quot;BioGenix Labs&quot;,
  &quot;jobTitle&quot;: &quot;Director of Bioinformatics&quot;,
  &quot;consentGiven&quot;: true
&#125;
        </pre>
      </div>
    </div>
  );
}
