'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { createComplaint, uploadAttachment } from '@/lib/api';
import { Brain, CheckCircle, PlusCircle, Paperclip, Trash2, FileText, Image, Shield } from 'lucide-react';

const DEPARTMENTS = ['IT', 'HR', 'Finance', 'Operations', 'Legal', 'Facilities', 'Management', 'Other'];
const CATEGORIES = [
  'General',
  'Harassment / Discrimination',
  'Equipment / Infrastructure',
  'Compensation / Benefits',
  'Operational Issue',
  'Compliance / Policy',
  'Facilities / Workspace',
  'Interpersonal / Management'
];

interface FileAttachment {
  file: File;
  id: string;
  error?: string;
}

export default function SubmitComplaint() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [form, setForm] = useState({
    title: '',
    description: '',
    employee_department: '',
    employee_category: '',
    employee_subcategory: '',
    is_anonymous: false,
    visibility_settings: 'HR,CMD,ADMIN'
  });
  
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<any>(null);

  // File Validations
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    addFiles(Array.from(e.target.files));
  };

  const addFiles = (files: File[]) => {
    const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.png', '.jpg', '.jpeg'];
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB

    const newAttachments = files.map((file) => {
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      let fileError = '';

      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        fileError = 'Unsupported type. Only PDF, DOCX, PNG, JPG, JPEG are allowed.';
      } else if (file.size > MAX_SIZE) {
        fileError = 'File size exceeds the 10 MB limit.';
      }

      return {
        file,
        id: Math.random().toString(36).substring(2, 9),
        error: fileError
      };
    });

    setAttachments((prev) => [...prev, ...newAttachments]);
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
    if (['.png', '.jpg', '.jpeg'].includes(ext)) return <Image size={18} className="text-blue-400" />;
    return <FileText size={18} className="text-emerald-400" />;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.description.trim().length < 20) {
      setError('Description must be at least 20 characters.');
      return;
    }

    // Check if there are any invalid files
    const hasErrors = attachments.some(a => a.error);
    if (hasErrors) {
      setError('Please remove the invalid attachments before submitting.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // 1. Create Complaint
      const payload = {
        title: form.title,
        description: form.description,
        employee_department: form.employee_department || null,
        employee_category: form.employee_category || null,
        employee_subcategory: form.employee_subcategory || null,
        is_anonymous: form.is_anonymous,
        visibility_settings: form.visibility_settings
      };
      
      const res = await createComplaint(payload);
      const createdComplaint = res.data;

      // 2. Upload Attachments
      for (const att of attachments) {
        try {
          await uploadAttachment(createdComplaint.id, att.file);
        } catch (uploadErr: any) {
          console.error(`Failed to upload ${att.file.name}:`, uploadErr);
        }
      }

      setSuccess(createdComplaint);
      // Clear form
      setForm({
        title: '',
        description: '',
        employee_department: '',
        employee_category: '',
        employee_subcategory: '',
        is_anonymous: false,
        visibility_settings: 'HR,CMD,ADMIN'
      });
      setAttachments([]);
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.detail || 'Failed to submit complaint.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout title="Submit Complaint">
      {success ? (
        <div className="glass animate-fade-in" style={{ padding: 32, maxWidth: 640, margin: '0 auto' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <CheckCircle size={28} style={{ color: '#34d399' }} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', marginBottom: 6 }}>Complaint Submitted!</h2>
            <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20 }}>
              AI is analyzing your complaint and assigning appropriate routing and priority details.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => router.push(`/employee/complaints/${success.id}`)}>View Complaint</button>
              <button className="btn btn-secondary" onClick={() => setSuccess(null)}><PlusCircle size={14} /> Submit Another</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass animate-fade-in" style={{ padding: 28, maxWidth: 640, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Brain size={18} color="white" />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#f1f5f9' }}>New Complaint</div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>Fill out the details. AI will assist with classification and analysis.</div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Title */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#94a3b8', marginBottom: 6 }}>Complaint Title *</label>
              <input className="input" placeholder="Brief, descriptive title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
            </div>

            {/* Description */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#94a3b8', marginBottom: 6 }}>
                Description * <span style={{ color: '#475569', fontWeight: 400 }}>(min 20 characters)</span>
              </label>
              <textarea className="input textarea" rows={5} placeholder="Describe your complaint in detail. Explain what happened, when, and who was involved..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required />
              <div style={{ fontSize: 11, color: form.description.length >= 20 ? '#34d399' : '#64748b', marginTop: 4 }}>
                {form.description.length}/20 characters
              </div>
            </div>

            {/* Categorization Dropdowns */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#94a3b8', marginBottom: 6 }}>Department</label>
                <select className="input select" value={form.employee_department} onChange={e => setForm(f => ({ ...f, employee_department: e.target.value }))}>
                  <option value="">Select (AI Prediction fallback)</option>
                  {DEPARTMENTS.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#94a3b8', marginBottom: 6 }}>Category</label>
                <select className="input select" value={form.employee_category} onChange={e => setForm(f => ({ ...f, employee_category: e.target.value }))}>
                  <option value="">Select (AI Prediction fallback)</option>
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
            </div>

            {/* Subcategory */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#94a3b8', marginBottom: 6 }}>Sub-category</label>
              <input className="input" placeholder="e.g., Workplace Harassment, Payroll Delay, Printer issues (Optional)" value={form.employee_subcategory} onChange={e => setForm(f => ({ ...f, employee_subcategory: e.target.value }))} />
            </div>

            {/* Privacy and Anonymity */}
            <div className="info-box" style={{ marginBottom: 20, background: 'rgba(30, 41, 59, 0.5)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <Shield size={18} style={{ color: '#34d399', marginTop: 2, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 4 }}>Privacy Settings</div>
                  
                  {/* Anonymity */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 10, fontSize: 12.5, color: '#cbd5e1' }}>
                    <input type="checkbox" checked={form.is_anonymous} onChange={e => setForm(f => ({ ...f, is_anonymous: e.target.checked }))} style={{ accentColor: '#10b981' }} />
                    Submit Anonymous Complaint
                  </label>
                  <p style={{ fontSize: 11, color: '#64748b', marginBottom: 12 }}>
                    If enabled, your identity is hidden from Department Handlers/CMD. Only HR and Admins can view your name.
                  </p>

                  {/* Visibility Controls */}
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#94a3b8', marginBottom: 4 }}>Who can view this complaint?</label>
                  <select className="input select" value={form.visibility_settings} onChange={e => setForm(f => ({ ...f, visibility_settings: e.target.value }))} style={{ padding: '6px 12px', fontSize: 12.5 }}>
                    <option value="HR,CMD,ADMIN">Default (HR, Department CMD, and Admin)</option>
                    <option value="HR,ADMIN">HR and Admin Only (Restrict CMD access)</option>
                    <option value="CMD,ADMIN">Department CMD and Admin Only</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Evidence Attachments Dropzone */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#94a3b8', marginBottom: 6 }}>Evidence Attachments</label>
              
              <div 
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed var(--border)',
                  borderRadius: 12,
                  padding: '24px 16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: 'rgba(255, 255, 255, 0.01)',
                  transition: 'border-color 0.2s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--purple-light)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  multiple 
                  style={{ display: 'none' }} 
                  accept=".pdf,.docx,.png,.jpg,.jpeg"
                />
                <Paperclip size={24} style={{ color: '#64748b', margin: '0 auto 8px' }} />
                <p style={{ fontSize: 13, fontWeight: 500, color: '#f1f5f9', marginBottom: 2 }}>Drag & drop files here, or click to browse</p>
                <p style={{ fontSize: 11, color: '#64748b' }}>Supported formats: PDF, DOCX, PNG, JPG, JPEG (Max 10MB per file)</p>
              </div>

              {/* Attachment List */}
              {attachments.length > 0 && (
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {attachments.map((att) => (
                    <div 
                      key={att.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: att.error ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border)',
                        borderRadius: 8,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                        {getFileIcon(att.file.name)}
                        <div style={{ overflow: 'hidden' }}>
                          <p style={{ fontSize: 12.5, color: '#f1f5f9', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{att.file.name}</p>
                          <p style={{ fontSize: 10.5, color: att.error ? '#f87171' : '#64748b' }}>
                            {att.error ? att.error : formatSize(att.file.size)}
                          </p>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => removeAttachment(att.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#64748b',
                          cursor: 'pointer',
                          padding: 4,
                          display: 'flex',
                          alignItems: 'center',
                          borderRadius: 4
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#f87171'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && <div className="error-box" style={{ marginBottom: 14 }}>{error}</div>}
            
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
              {submitting ? <div className="spinner spinner-sm" /> : <><Brain size={15} /> Submit Complaint</>}
            </button>
          </form>
        </div>
      )}
    </DashboardLayout>
  );
}
