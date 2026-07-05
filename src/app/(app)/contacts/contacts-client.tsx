'use client';

import React, { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import Papa from 'papaparse';
import {
  Search,
  Plus,
  Upload,
  Filter,
  ArrowUpDown,
  AlertTriangle,
  X,
  Sparkles,
  Mail,
  Phone,
  Briefcase,
  Calendar,
  DollarSign,
  Tag,
  Loader2,
  Check
} from 'lucide-react';
import { Contact, Deal } from '@/lib/db';
import { createContact, bulkInsertContacts } from '@/app/actions/contacts';

interface ContactsClientProps {
  initialContacts: Contact[];
  initialDeals: Deal[];
}

type SortKey = 'name_first_asc' | 'name_first_desc' | 'name_last_asc' | 'name_last_desc' | 'date_newest' | 'date_oldest' | 'deal_value_highest' | 'deal_value_lowest';

export default function ContactsClient({ initialContacts, initialDeals }: ContactsClientProps) {
  // Contacts and Deals state
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [deals] = useState<Deal[]>(initialDeals);

  // Search, Filter, Sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('date_newest');

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Add Contact Form state
  const [formFirst, setFormFirst] = useState('');
  const [formLast, setFormLast] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formSource, setFormSource] = useState('Manual');
  const [formTags, setFormTags] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // CSV Import State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company: '',
    title: '',
    source: '',
    tags: '',
    notes: '',
  });
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extract all unique tags and sources for filters
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    contacts.forEach(c => {
      if (Array.isArray(c.tags)) {
        c.tags.forEach(t => {
          if (t) tagsSet.add(t.trim());
        });
      }
    });
    return Array.from(tagsSet).sort();
  }, [contacts]);

  const allSources = useMemo(() => {
    const sourcesSet = new Set<string>();
    contacts.forEach(c => {
      if (c.source) sourcesSet.add(c.source.trim());
    });
    return Array.from(sourcesSet).sort();
  }, [contacts]);

  // Aggregate deal value per contact
  const contactDealValues = useMemo(() => {
    const values: Record<string, number> = {};
    deals.forEach(d => {
      if (d.contact_id) {
        values[d.contact_id] = (values[d.contact_id] || 0) + (d.value || 0);
      }
    });
    return values;
  }, [deals]);

  // Check duplicate email warning in Add Form
  const isDuplicateEmail = useMemo(() => {
    if (!formEmail || formEmail.trim() === '') return false;
    return contacts.some(
      c => c.email?.toLowerCase().trim() === formEmail.toLowerCase().trim()
    );
  }, [formEmail, contacts]);

  // Filtered & Sorted Contacts
  const processedContacts = useMemo(() => {
    let result = [...contacts];

    // 1. Search Query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(c => {
        const first = (c.first_name || '').toLowerCase();
        const last = (c.last_name || '').toLowerCase();
        const comp = (c.company || '').toLowerCase();
        const mail = (c.email || '').toLowerCase();
        return first.includes(query) || last.includes(query) || comp.includes(query) || mail.includes(query);
      });
    }

    // 2. Tag Filter
    if (selectedTag !== '') {
      result = result.filter(c => c.tags && c.tags.includes(selectedTag));
    }

    // 3. Source Filter
    if (selectedSource !== '') {
      result = result.filter(c => c.source === selectedSource);
    }

    // 4. Sort
    result.sort((a, b) => {
      const getFullName = (c: Contact) => `${c.first_name || ''} ${c.last_name || ''}`.trim().toLowerCase();
      
      switch (sortBy) {
        case 'name_first_asc':
          return (a.first_name || '').localeCompare(b.first_name || '');
        case 'name_first_desc':
          return (b.first_name || '').localeCompare(a.first_name || '');
        case 'name_last_asc':
          return (a.last_name || '').localeCompare(b.last_name || '');
        case 'name_last_desc':
          return (b.last_name || '').localeCompare(a.last_name || '');
        case 'date_newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'date_oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'deal_value_highest':
          return (contactDealValues[b.id] || 0) - (contactDealValues[a.id] || 0);
        case 'deal_value_lowest':
          return (contactDealValues[a.id] || 0) - (contactDealValues[b.id] || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [contacts, searchQuery, selectedTag, selectedSource, sortBy, contactDealValues]);

  // Handle Add Contact Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    const tagsArray = formTags
      .split(',')
      .map(t => t.trim())
      .filter(t => t !== '');

    const res = await createContact({
      first_name: formFirst || null,
      last_name: formLast || null,
      email: formEmail || null,
      phone: formPhone || null,
      company: formCompany || null,
      title: formTitle || null,
      source: formSource || 'Manual',
      tags: tagsArray,
      notes: formNotes || null,
    });

    if (res.success && res.contact) {
      setContacts(prev => [res.contact!, ...prev]);
      // Reset form
      setFormFirst('');
      setFormLast('');
      setFormEmail('');
      setFormPhone('');
      setFormCompany('');
      setFormTitle('');
      setFormSource('Manual');
      setFormTags('');
      setFormNotes('');
      setAddModalOpen(false);
    } else {
      setFormError(res.error || 'Failed to create contact.');
    }
    setFormLoading(false);
  };

  // PapaParse Client-Side parser
  const handleCsvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    setImportError(null);
    setImportSuccess(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          console.warn('CSV Parse Warnings:', results.errors);
        }
        if (results.meta.fields) {
          setCsvHeaders(results.meta.fields);
          setCsvRows(results.data);
          
          // Try to auto-map fields based on matching names
          const autoMapping: Record<string, string> = {};
          const fields = ['first_name', 'last_name', 'email', 'phone', 'company', 'title', 'source', 'tags', 'notes'];
          
          fields.forEach(field => {
            const match = results.meta.fields!.find(h => {
              const headerClean = h.toLowerCase().replace(/[\s_-]/g, '');
              const fieldClean = field.toLowerCase().replace(/[\s_-]/g, '');
              return headerClean === fieldClean || 
                (field === 'first_name' && (headerClean === 'firstname' || headerClean === 'givenname')) ||
                (field === 'last_name' && (headerClean === 'lastname' || headerClean === 'surname')) ||
                (field === 'phone' && (headerClean === 'phonenumber' || headerClean === 'mobile' || headerClean === 'tel'));
            });
            autoMapping[field] = match || '';
          });
          
          setMapping(autoMapping);
        } else {
          setImportError('No headers found in the CSV. Please ensure the first row has column titles.');
        }
      },
      error: (err) => {
        setImportError(`Failed to parse CSV: ${err.message}`);
      }
    });
  };

  // Execute bulk import
  const handleImportSubmit = async () => {
    if (csvRows.length === 0) {
      setImportError('No CSV data loaded.');
      return;
    }

    setImportLoading(true);
    setImportError(null);

    // Map rows to contacts format
    const contactsToImport = csvRows.map(row => {
      const getValue = (field: string) => {
        const csvColumn = mapping[field];
        return csvColumn ? row[csvColumn] : null;
      };

      const tagsRaw = getValue('tags');
      let tagsArray: string[] = [];
      if (tagsRaw) {
        tagsArray = String(tagsRaw)
          .split(/[,;|]/)
          .map(t => t.trim())
          .filter(t => t !== '');
      }

      return {
        first_name: getValue('first_name'),
        last_name: getValue('last_name'),
        email: getValue('email'),
        phone: getValue('phone'),
        company: getValue('company'),
        title: getValue('title'),
        source: getValue('source') || 'CSV Import',
        tags: tagsArray,
        notes: getValue('notes'),
      };
    });

    const res = await bulkInsertContacts(contactsToImport);
    if (res.success) {
      setImportSuccess(`Successfully imported ${res.count} contacts!`);
      // Update contacts local state by appending newly fetched ones or re-loading
      // For sandbox simplicity, let's refresh page or merge
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } else {
      setImportError(res.error || 'Bulk insert failed.');
      setImportLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            Contacts
            <span className="text-sm font-semibold px-2.5 py-0.5 rounded-full bg-[#0f1a1c] border border-[#1a2e30] text-neutral-400">
              {contacts.length} total
            </span>
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Manage your leads, segment by tags/source, and import via CSV.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setImportModalOpen(true)}
            className="flex items-center gap-2 bg-[#0f1a1c] hover:bg-[#1a2e30] border border-[#1a2e30] text-neutral-200 px-4 py-2.5 rounded-xl font-medium text-sm transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4" /> Import CSV
          </button>
          <button
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-2 bg-[#06b6d4] hover:bg-[#0891b2] text-[#09100f] px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Contact
          </button>
        </div>
      </div>

      {/* Search, Filter, Sort Controls Panel */}
      <div className="bg-[#0f1a1c] border border-[#1a2e30] p-4 rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Search */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search name, company, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-2 pl-9 pr-4 text-white text-sm placeholder-neutral-600 outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-500 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Tag */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-500">
            <Tag className="w-4 h-4" />
          </span>
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="w-full bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-2 pl-9 pr-4 text-white text-sm outline-none transition-colors appearance-none cursor-pointer"
          >
            <option value="">All Tags</option>
            {allTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>

        {/* Filter Source */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-500">
            <Filter className="w-4 h-4" />
          </span>
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="w-full bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-2 pl-9 pr-4 text-white text-sm outline-none transition-colors appearance-none cursor-pointer"
          >
            <option value="">All Sources</option>
            {allSources.map(src => (
              <option key={src} value={src}>{src}</option>
            ))}
          </select>
        </div>

        {/* Sort */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-500">
            <ArrowUpDown className="w-4 h-4" />
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="w-full bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-2 pl-9 pr-4 text-white text-sm outline-none transition-colors appearance-none cursor-pointer"
          >
            <option value="date_newest">Created: Newest First</option>
            <option value="date_oldest">Created: Oldest First</option>
            <option value="name_first_asc">First Name: A to Z</option>
            <option value="name_first_desc">First Name: Z to A</option>
            <option value="name_last_asc">Last Name: A to Z</option>
            <option value="name_last_desc">Last Name: Z to A</option>
            <option value="deal_value_highest">Deal Value: Highest</option>
            <option value="deal_value_lowest">Deal Value: Lowest</option>
          </select>
        </div>
      </div>

      {/* Contacts Table / Grid */}
      <div className="bg-[#0f1a1c] border border-[#1a2e30] rounded-2xl overflow-hidden shadow-xl">
        {processedContacts.length === 0 ? (
          <div className="p-12 text-center text-neutral-500">
            <p className="text-lg font-medium mb-1">No contacts found</p>
            <p className="text-sm">Try adjusting your filters, search terms, or add a new contact.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#09100f]/80 border-b border-[#1a2e30]">
                  <th className="p-4 text-sm font-semibold text-neutral-400">Name</th>
                  <th className="p-4 text-sm font-semibold text-neutral-400">Title / Company</th>
                  <th className="p-4 text-sm font-semibold text-neutral-400">Contact Details</th>
                  <th className="p-4 text-sm font-semibold text-neutral-400">Source</th>
                  <th className="p-4 text-sm font-semibold text-neutral-400">Tags</th>
                  <th className="p-4 text-sm font-semibold text-neutral-400 text-right">Deal Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a2e30]/40">
                {processedContacts.map(c => {
                  const dealVal = contactDealValues[c.id] || 0;
                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-[#1a2e30]/10 transition-colors group cursor-pointer"
                      onClick={() => {
                        window.location.href = `/contacts/${c.id}`;
                      }}
                    >
                      <td className="p-4">
                        <div className="font-semibold text-white group-hover:text-[#06b6d4] transition-colors">
                          {c.first_name} {c.last_name}
                        </div>
                        <div className="text-xs text-neutral-500">
                          Added {new Date(c.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm text-neutral-200">{c.title || '—'}</div>
                        <div className="text-xs text-neutral-400">{c.company || '—'}</div>
                      </td>
                      <td className="p-4 space-y-1">
                        {c.email && (
                          <div className="text-sm text-neutral-300 flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-neutral-500" />
                            {c.email}
                          </div>
                        )}
                        {c.phone && (
                          <div className="text-xs text-neutral-400 flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-neutral-500" />
                            {c.phone}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs bg-[#09100f] border border-[#1a2e30] text-neutral-300">
                          {c.source || 'Manual'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {c.tags && c.tags.length > 0 ? (
                            c.tags.map(t => (
                              <span
                                key={t}
                                className="px-1.5 py-0.5 rounded text-[10px] bg-[#06b6d4]/10 text-[#06b6d4] border border-[#06b6d4]/20"
                              >
                                {t}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-neutral-600">—</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="font-bold text-white">
                          {dealVal > 0 ? (
                            <span className="text-[#06b6d4]">${dealVal.toLocaleString()}</span>
                          ) : (
                            <span className="text-neutral-600">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-[#09100f]/80 backdrop-blur-sm" onClick={() => setAddModalOpen(false)}></div>
          <div className="relative w-full max-w-2xl bg-[#0f1a1c] border border-[#1a2e30] rounded-2xl shadow-2xl p-6 overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setAddModalOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-lg border border-[#1a2e30]"
            >
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#06b6d4]" /> Add New Contact
            </h2>

            {formError && (
              <div className="mb-4 p-4 bg-red-950/40 border border-red-900/60 rounded-xl text-red-400 text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">First Name</label>
                  <input
                    type="text"
                    required
                    value={formFirst}
                    onChange={(e) => setFormFirst(e.target.value)}
                    className="w-full bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-2.5 px-4 text-white text-sm outline-none transition-colors"
                    placeholder="Alice"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Last Name</label>
                  <input
                    type="text"
                    required
                    value={formLast}
                    onChange={(e) => setFormLast(e.target.value)}
                    className="w-full bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-2.5 px-4 text-white text-sm outline-none transition-colors"
                    placeholder="Smith"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Email Address</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-2.5 px-4 text-white text-sm outline-none transition-colors"
                  placeholder="alice@example.com"
                />
                {isDuplicateEmail && (
                  <div className="mt-2 text-xs text-yellow-400 bg-yellow-950/30 border border-yellow-800/40 p-2 rounded-lg flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    Warning: A contact with this email already exists in the database. Saving will create a duplicate.
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Phone</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-2.5 px-4 text-white text-sm outline-none transition-colors"
                    placeholder="555-0101"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Source</label>
                  <input
                    type="text"
                    value={formSource}
                    onChange={(e) => setFormSource(e.target.value)}
                    className="w-full bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-2.5 px-4 text-white text-sm outline-none transition-colors"
                    placeholder="e.g. LinkedIn, Referral, Inbound"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Company</label>
                  <input
                    type="text"
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                    className="w-full bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-2.5 px-4 text-white text-sm outline-none transition-colors"
                    placeholder="Acme Corp"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Job Title</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-2.5 px-4 text-white text-sm outline-none transition-colors"
                    placeholder="VP of Product"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Tags (Comma-separated)</label>
                <input
                  type="text"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  className="w-full bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-2.5 px-4 text-white text-sm outline-none transition-colors"
                  placeholder="Enterprise, SaaS, Outbound"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Notes</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-2.5 px-4 text-white text-sm outline-none transition-colors resize-none"
                  placeholder="Enter initial follow up details, notes or context..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="bg-transparent border border-[#1a2e30] hover:bg-[#1a2e30] text-neutral-300 px-5 py-2.5 rounded-xl font-medium text-sm transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="bg-[#06b6d4] hover:bg-[#0891b2] disabled:opacity-50 text-[#09100f] font-bold px-6 py-2.5 rounded-xl text-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {formLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    'Save Contact'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import & Mapping Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-[#09100f]/80 backdrop-blur-sm" onClick={() => setImportModalOpen(false)}></div>
          <div className="relative w-full max-w-3xl bg-[#0f1a1c] border border-[#1a2e30] rounded-2xl shadow-2xl p-6 overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setImportModalOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-lg border border-[#1a2e30]"
            >
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-[#06b6d4]" /> Import Contacts from CSV
            </h2>

            {importSuccess ? (
              <div className="p-8 text-center space-y-4">
                <div className="w-12 h-12 bg-green-950/40 border border-green-500/50 rounded-full flex items-center justify-center mx-auto text-green-400">
                  <Check className="w-6 h-6" />
                </div>
                <p className="text-lg font-semibold text-white">{importSuccess}</p>
                <p className="text-sm text-neutral-400">Refreshing your contact list now...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {importError && (
                  <div className="p-4 bg-red-950/40 border border-red-900/60 rounded-xl text-red-400 text-sm">
                    {importError}
                  </div>
                )}

                {/* File Upload Selector */}
                <div className="bg-[#09100f] border border-dashed border-[#1a2e30] hover:border-[#06b6d4]/50 rounded-2xl p-8 text-center cursor-pointer transition-colors relative">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    ref={fileInputRef}
                  />
                  <div className="space-y-2">
                    <Upload className="w-8 h-8 mx-auto text-neutral-500" />
                    <p className="text-sm font-semibold text-white">
                      {csvFile ? csvFile.name : 'Select or drag a CSV file to upload'}
                    </p>
                    <p className="text-xs text-neutral-500">
                      Supports comma, tab, or pipe separated files. Size up to 10MB.
                    </p>
                  </div>
                </div>

                {/* Column Mapping Section */}
                {csvHeaders.length > 0 && (
                  <div className="space-y-4">
                    <div className="border-b border-[#1a2e30] pb-2">
                      <h3 className="text-md font-semibold text-white">Map CSV Columns</h3>
                      <p className="text-xs text-neutral-400">
                        Choose which column from your CSV maps to each of the fields below.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[40vh] overflow-y-auto pr-2">
                      {[
                        { key: 'first_name', label: 'First Name *', required: true },
                        { key: 'last_name', label: 'Last Name *', required: true },
                        { key: 'email', label: 'Email Address' },
                        { key: 'phone', label: 'Phone' },
                        { key: 'company', label: 'Company' },
                        { key: 'title', label: 'Job Title' },
                        { key: 'source', label: 'Lead Source' },
                        { key: 'tags', label: 'Tags' },
                        { key: 'notes', label: 'Notes' },
                      ].map(field => (
                        <div key={field.key} className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-neutral-400">
                            {field.label}
                          </label>
                          <select
                            value={mapping[field.key]}
                            onChange={(e) => setMapping(prev => ({ ...prev, [field.key]: e.target.value }))}
                            className="bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-2 px-3 text-white text-xs outline-none transition-colors cursor-pointer"
                          >
                            <option value="">[ Don't Import / Skip ]</option>
                            {csvHeaders.map(header => (
                              <option key={header} value={header}>{header}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>

                    <div className="bg-[#09100f] p-3.5 border border-[#1a2e30] rounded-xl flex items-start gap-2.5 text-xs text-neutral-400">
                      <Sparkles className="w-4 h-4 text-[#06b6d4] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-neutral-200">Ready to import {csvRows.length} rows.</p>
                        <p>Duplicate contacts (matching emails that already exist in your contacts list) will be skipped automatically.</p>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-[#1a2e30]">
                      <button
                        type="button"
                        onClick={() => {
                          setCsvHeaders([]);
                          setCsvRows([]);
                          setCsvFile(null);
                          setImportModalOpen(false);
                        }}
                        className="bg-transparent border border-[#1a2e30] hover:bg-[#1a2e30] text-neutral-300 px-5 py-2.5 rounded-xl font-medium text-sm transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleImportSubmit}
                        disabled={importLoading || !mapping.first_name || !mapping.last_name}
                        className="bg-[#06b6d4] hover:bg-[#0891b2] disabled:opacity-50 text-[#09100f] font-bold px-6 py-2.5 rounded-xl text-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        {importLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" /> Importing...
                          </>
                        ) : (
                          'Run Bulk Import'
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
