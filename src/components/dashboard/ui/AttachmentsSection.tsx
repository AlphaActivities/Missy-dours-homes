import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { Paperclip, Download, Trash2, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';

const BUCKET = 'lead-attachments';
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

export interface Attachment {
  id: string;
  lead_id: string;
  storage_path: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  uploaded_by: string;
  created_at: string;
}

interface AttachmentsSectionProps {
  leadId: string;
  onError: (msg: string) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AttachmentsSection({ leadId, onError }: AttachmentsSectionProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch attachment metadata for this lead
  const fetchAttachments = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('lead_attachments')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });
    if (error) {
      onError('Failed to load attachments.');
      setLoading(false);
      return;
    }
    setAttachments((data as Attachment[]) ?? []);
    setLoading(false);
  }, [leadId, onError]);

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  // Generate short-lived signed URLs for image previews
  useEffect(() => {
    const imageAtts = attachments.filter(a => IMAGE_MIME.has(a.mime_type));
    if (imageAtts.length === 0) {
      setPreviewUrls({});
      return;
    }

    let cancelled = false;
    const urls: Record<string, string> = {};

    Promise.all(
      imageAtts.map(async att => {
        const { data, error } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(att.storage_path, 300); // 5-minute signed URL
        if (!error && data?.signedUrl) {
          urls[att.id] = data.signedUrl;
        }
      })
    ).then(() => {
      if (!cancelled) setPreviewUrls(urls);
    });

    return () => {
      cancelled = true;
    };
  }, [attachments]);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0]; // Upload one at a time for clear progress
    if (!ALLOWED_MIME[file.type]) {
      onError(`Unsupported file type: ${file.type || 'unknown'}. Use JPG, PNG, WEBP, PDF, DOC, or DOCX.`);
      return;
    }
    if (file.size > MAX_SIZE) {
      onError(`File is ${formatSize(file.size)}. Maximum is 10 MB.`);
      return;
    }

    setUploading(true);

    // Collision-resistant path: <lead_id>/<uuid>.<ext>
    const ext = ALLOWED_MIME[file.type] || 'bin';
    const fileId = crypto.randomUUID();
    const storagePath = `${leadId}/${fileId}.${ext}`;

    // Upload to private storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      onError('Upload failed. Please try again.');
      setUploading(false);
      return;
    }

    // Insert metadata
    const { data: userData } = await supabase.auth.getUser();
    const uploadedBy = userData.user?.email ?? '';

    const { data: meta, error: metaError } = await supabase
      .from('lead_attachments')
      .insert({
        lead_id: leadId,
        storage_path: storagePath,
        original_filename: file.name,
        mime_type: file.type,
        file_size: file.size,
        uploaded_by: uploadedBy,
      })
      .select()
      .single();

    if (metaError) {
      // Metadata failed — clean up the orphaned file
      await supabase.storage.from(BUCKET).remove([storagePath]);
      onError('Failed to save attachment. Please try again.');
      setUploading(false);
      return;
    }

    setAttachments(prev => [meta as Attachment, ...prev]);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownload = async (att: Attachment) => {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(att.storage_path, 300);
    if (error || !data?.signedUrl) {
      onError('Failed to generate download link.');
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDelete = async (att: Attachment) => {
    if (confirmDeleteId !== att.id) {
      setConfirmDeleteId(att.id);
      return;
    }

    // Confirm: delete metadata first, then file
    const { error: metaError } = await supabase
      .from('lead_attachments')
      .delete()
      .eq('id', att.id);

    if (metaError) {
      onError('Failed to delete attachment.');
      setConfirmDeleteId(null);
      return;
    }

    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .remove([att.storage_path]);

    if (storageError) {
      // Metadata deleted but file remains — report recoverable error
      onError('Attachment was removed, but the file could not be deleted from storage.');
    }

    setAttachments(prev => prev.filter(a => a.id !== att.id));
    setPreviewUrls(prev => {
      const next = { ...prev };
      delete next[att.id];
      return next;
    });
    setConfirmDeleteId(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <Label icon={<Paperclip size={11} />}>Attachments</Label>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,image/jpeg,image/png,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={e => handleFileSelect(e.target.files)}
          disabled={uploading}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-all duration-150 disabled:opacity-40"
          style={{
            color: 'var(--ds-gold-light)',
            background: 'var(--ds-gold-muted)',
            boxShadow: '0 0 0 1px rgba(196,164,106,0.3)',
          }}
          onMouseEnter={e => !uploading && (e.currentTarget.style.boxShadow = '0 0 0 1px rgba(196,164,106,0.5)')}
          onMouseLeave={e => !uploading && (e.currentTarget.style.boxShadow = '0 0 0 1px rgba(196,164,106,0.3)')}
        >
          {uploading ? <Loader2 size={11} className="animate-spin" /> : <Paperclip size={11} />}
          {uploading ? 'Uploading...' : 'Attach file'}
        </button>
      </div>

      <div className="mt-2">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={16} className="animate-spin" style={{ color: 'var(--ds-text-tertiary)' }} />
          </div>
        ) : attachments.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-8 px-4 text-center rounded-xl"
            style={{ background: 'var(--ds-bg-overlay)' }}
          >
            <Paperclip size={18} style={{ color: 'var(--ds-text-tertiary)' }} className="mb-2" />
            <p className="text-xs" style={{ color: 'var(--ds-text-tertiary)' }}>
              No attachments yet
            </p>
            <p className="text-[11px] mt-1" style={{ color: 'var(--ds-text-tertiary)' }}>
              JPG, PNG, WEBP, PDF, DOC, DOCX — up to 10 MB
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {attachments.map(att => (
              <div
                key={att.id}
                className="rounded-xl p-3 flex items-start gap-3"
                style={{ background: 'var(--ds-bg-overlay)', boxShadow: '0 0 0 1px rgba(255,255,255,0.04)' }}
              >
                {/* Preview / icon */}
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0 overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.03)' }}
                >
                  {IMAGE_MIME.has(att.mime_type) && previewUrls[att.id] ? (
                    <img
                      src={previewUrls[att.id]}
                      alt={att.original_filename}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <FileText size={18} style={{ color: 'var(--ds-text-tertiary)' }} />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium truncate"
                    style={{ color: '#f0ede8' }}
                  >
                    {att.original_filename}
                  </p>
                  <p
                    className="text-[11px] mt-0.5"
                    style={{ color: 'var(--ds-text-tertiary)' }}
                  >
                    {formatSize(att.file_size)} · {formatDate(att.created_at)}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => handleDownload(att)}
                      className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md transition-colors duration-150"
                      style={{ color: 'var(--ds-text-secondary)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#f0ede8')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--ds-text-secondary)')}
                    >
                      <Download size={11} />
                      Download
                    </button>
                    <button
                      onClick={() => handleDelete(att)}
                      className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md transition-colors duration-150"
                      style={{
                        color: confirmDeleteId === att.id ? '#f87171' : 'var(--ds-text-tertiary)',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                      onMouseLeave={e => (e.currentTarget.style.color = confirmDeleteId === att.id ? '#f87171' : 'var(--ds-text-tertiary)')}
                    >
                      <Trash2 size={11} />
                      {confirmDeleteId === att.id ? 'Click again to confirm' : 'Remove'}
                    </button>
                  </div>
                </div>

                {IMAGE_MIME.has(att.mime_type) && !previewUrls[att.id] && (
                  <ImageIcon size={14} style={{ color: 'var(--ds-text-tertiary)' }} className="shrink-0 mt-1" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Small label helper (matches LeadDrawer's Label) ──────────
function Label({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div
      className="flex items-center gap-1.5 pl-2.5"
      style={{ borderLeft: '2px solid var(--ds-gold-dim)' }}
    >
      {icon && <span style={{ color: 'var(--ds-text-tertiary)' }}>{icon}</span>}
      <p
        className="text-[10px] font-medium tracking-[0.14em] uppercase"
        style={{ color: 'var(--ds-text-secondary)' }}
      >
        {children}
      </p>
    </div>
  );
}
