import { useState, useRef, useEffect, useCallback } from 'react';
import { Save, Check, Paperclip, Download, Trash2, FileText, Image as ImageIcon, Loader2, X } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import { supabase } from '../../../lib/supabase';

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

export interface NoteAttachment {
  id: string;
  storage_path: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
}

export interface SavedNote {
  id: string;
  text: string;
  created_at: string;
  author: string;
  attachments: NoteAttachment[];
}

interface NotesEditorProps {
  leadId: string;
  initialNotes: string;
  onSave: (leadId: string, notes: string) => Promise<void>;
  onError?: (msg: string) => void;
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

function parseNotes(raw: string): SavedNote[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as SavedNote[];
    return [];
  } catch {
    // Legacy: free-text notes — wrap as a single historical note
    return raw.trim() ? [{ id: 'legacy', text: raw, created_at: new Date().toISOString(), author: '', attachments: [] }] : [];
  }
}

function serializeNotes(notes: SavedNote[]): string {
  return JSON.stringify(notes);
}

export default function NotesEditor({ leadId, initialNotes, onSave, onError }: NotesEditorProps) {
  const [savedNotes, setSavedNotes] = useState<SavedNote[]>(() => parseNotes(initialNotes ?? ''));
  const [draftText, setDraftText] = useState('');
  const [draftAttachments, setDraftAttachments] = useState<NoteAttachment[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [confirmDeleteNote, setConfirmDeleteNote] = useState<string | null>(null);
  const [confirmDeleteAtt, setConfirmDeleteAtt] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSavedNotes(parseNotes(initialNotes ?? ''));
    setDraftText('');
    setDraftAttachments([]);
    setError(null);
    setSavedFlash(false);
  }, [leadId, initialNotes]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [draftText]);

  const reportError = useCallback((msg: string) => {
    setError(msg);
    onError?.(msg);
  }, [onError]);

  // Generate signed URLs for image previews (draft + saved)
  useEffect(() => {
    const allAtts = [
      ...draftAttachments,
      ...savedNotes.flatMap(n => n.attachments),
    ];
    const imageAtts = allAtts.filter(a => IMAGE_MIME.has(a.mime_type));
    if (imageAtts.length === 0) {
      setPreviewUrls({});
      return;
    }
    let cancelled = false;
    const urls: Record<string, string> = {};
    Promise.all(
      imageAtts.map(async att => {
        const { data, error: sigError } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(att.storage_path, 300);
        if (!sigError && data?.signedUrl) {
          urls[att.id] = data.signedUrl;
        }
      })
    ).then(() => {
      if (!cancelled) setPreviewUrls(urls);
    });
    return () => { cancelled = true; };
  }, [draftAttachments, savedNotes]);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!ALLOWED_MIME[file.type]) {
      reportError(`Unsupported file type. Use JPG, PNG, WEBP, PDF, DOC, or DOCX.`);
      return;
    }
    if (file.size > MAX_SIZE) {
      reportError(`File is ${formatSize(file.size)}. Maximum is 10 MB.`);
      return;
    }
    setUploading(true);
    const ext = ALLOWED_MIME[file.type] || 'bin';
    const fileId = crypto.randomUUID();
    const storagePath = `${leadId}/${fileId}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      reportError('Upload failed. Please try again.');
      setUploading(false);
      return;
    }

    const newAtt: NoteAttachment = {
      id: fileId,
      storage_path: storagePath,
      original_filename: file.name,
      mime_type: file.type,
      file_size: file.size,
    };
    setDraftAttachments(prev => [...prev, newAtt]);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeDraftAttachment = async (att: NoteAttachment) => {
    await supabase.storage.from(BUCKET).remove([att.storage_path]);
    setDraftAttachments(prev => prev.filter(a => a.id !== att.id));
  };

  const handleSave = async () => {
    if ((!draftText.trim() && draftAttachments.length === 0) || saving) return;
    setError(null);
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const author = userData.user?.email ?? '';
      const newNote: SavedNote = {
        id: crypto.randomUUID(),
        text: draftText.trim(),
        created_at: new Date().toISOString(),
        author,
        attachments: draftAttachments,
      };
      const updated = [newNote, ...savedNotes];
      await onSave(leadId, serializeNotes(updated));
      setSavedNotes(updated);
      setDraftText('');
      setDraftAttachments([]);
      setSaving(false);
      setSavedFlash(true);
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setSavedFlash(false), 2000);
    } catch {
      setSaving(false);
      setError('Failed to save. Please try again.');
    }
  };

  const handleDeleteNote = async (note: SavedNote) => {
    if (confirmDeleteNote !== note.id) {
      setConfirmDeleteNote(note.id);
      return;
    }
    // Delete attachment files from storage
    if (note.attachments.length > 0) {
      await supabase.storage.from(BUCKET).remove(note.attachments.map(a => a.storage_path));
    }
    const updated = savedNotes.filter(n => n.id !== note.id);
    try {
      await onSave(leadId, serializeNotes(updated));
      setSavedNotes(updated);
    } catch {
      reportError('Failed to delete note.');
    }
    setConfirmDeleteNote(null);
  };

  const handleDeleteSavedAttachment = async (noteId: string, att: NoteAttachment) => {
    if (confirmDeleteAtt !== att.id) {
      setConfirmDeleteAtt(att.id);
      return;
    }
    await supabase.storage.from(BUCKET).remove([att.storage_path]);
    const updated = savedNotes.map(n =>
      n.id === noteId
        ? { ...n, attachments: n.attachments.filter(a => a.id !== att.id) }
        : n
    );
    try {
      await onSave(leadId, serializeNotes(updated));
      setSavedNotes(updated);
    } catch {
      reportError('Failed to remove attachment.');
    }
    setConfirmDeleteAtt(null);
  };

  const handleDownload = async (att: NoteAttachment) => {
    const { data, error: sigError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(att.storage_path, 300);
    if (sigError || !data?.signedUrl) {
      reportError('Failed to generate download link.');
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const hasDraft = draftText.trim() || draftAttachments.length > 0;

  return (
    <div className="space-y-4">
      {/* ── New note entry ─────────────────────────────────── */}
      <div className="space-y-2">
        <textarea
          ref={textareaRef}
          value={draftText}
          onChange={e => { setDraftText(e.target.value); setError(null); setSavedFlash(false); }}
          disabled={saving}
          placeholder="Add a private note…"
          rows={3}
          className="w-full resize-none rounded-xl px-3.5 py-3 text-[16px] sm:text-xs leading-relaxed outline-none transition-all duration-200 disabled:opacity-50"
          style={{
            background: 'var(--ds-bg-overlay)',
            color: 'var(--ds-text-primary)',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.07)',
            minHeight: '76px',
          }}
          onFocus={e => (e.currentTarget.style.boxShadow = '0 0 0 1.5px var(--ds-gold)')}
          onBlur={e => (e.currentTarget.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.07)')}
        />

        {/* Draft attachments */}
        {draftAttachments.length > 0 && (
          <div className="space-y-1.5">
            {draftAttachments.map(att => (
              <AttachmentRow
                key={att.id}
                att={att}
                previewUrl={previewUrls[att.id]}
                onDownload={() => handleDownload(att)}
                onDelete={() => removeDraftAttachment(att)}
                confirmDelete={false}
              />
            ))}
          </div>
        )}

        {/* Attach File + Save Note */}
        <div className="flex items-center justify-between gap-3">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,image/jpeg,image/png,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={e => handleFileSelect(e.target.files)}
            disabled={uploading || saving}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || saving}
            className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            style={{
              color: 'var(--ds-gold-light)',
              background: 'var(--ds-gold-muted)',
              boxShadow: '0 0 0 1px rgba(196,164,106,0.3)',
            }}
            onMouseEnter={e => !uploading && !saving && (e.currentTarget.style.boxShadow = '0 0 0 1px rgba(196,164,106,0.5)')}
            onMouseLeave={e => !uploading && !saving && (e.currentTarget.style.boxShadow = '0 0 0 1px rgba(196,164,106,0.3)')}
          >
            {uploading ? <Loader2 size={11} className="animate-spin" /> : <Paperclip size={11} />}
            Attach file
          </button>

          <div className="flex items-center gap-3">
            <div className="text-xs transition-all duration-200" style={{ minHeight: '18px' }}>
              {error && <span style={{ color: '#f87171' }}>{error}</span>}
              {savedFlash && !error && (
                <span className="flex items-center gap-1" style={{ color: '#6ee7b7' }}>
                  <Check size={11} />
                  Saved
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasDraft || saving || uploading}
              className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              style={{
                background: hasDraft && !saving ? 'var(--ds-gold-muted)' : 'var(--ds-bg-overlay)',
                color: hasDraft && !saving ? 'var(--ds-gold-light)' : 'var(--ds-text-tertiary)',
                boxShadow: hasDraft && !saving
                  ? '0 0 0 1px rgba(196,164,106,0.3)'
                  : '0 0 0 1px rgba(255,255,255,0.07)',
              }}
            >
              {saving
                ? <><LoadingSpinner size="sm" /> Saving…</>
                : <><Save size={11} /> Save note</>
              }
            </button>
          </div>
        </div>
      </div>

      {/* ── Saved notes history ────────────────────────────── */}
      {savedNotes.length > 0 && (
        <div className="space-y-3 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {savedNotes.map(note => (
            <div
              key={note.id}
              className="rounded-xl p-3.5"
              style={{ background: 'var(--ds-bg-overlay)', boxShadow: '0 0 0 1px rgba(255,255,255,0.04)' }}
            >
              {note.text && (
                <p
                  className="text-sm leading-relaxed whitespace-pre-wrap"
                  style={{ color: 'var(--ds-text-primary)' }}
                >
                  {note.text}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[11px]" style={{ color: 'var(--ds-text-tertiary)' }}>
                  {formatDate(note.created_at)}
                </span>
                {note.author && (
                  <span className="text-[11px]" style={{ color: 'var(--ds-text-tertiary)' }}>
                    · {note.author}
                  </span>
                )}
                <button
                  onClick={() => handleDeleteNote(note)}
                  className="ml-auto flex items-center gap-1 text-[11px] font-medium transition-colors duration-150"
                  style={{ color: confirmDeleteNote === note.id ? '#f87171' : 'var(--ds-text-tertiary)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                  onMouseLeave={e => (e.currentTarget.style.color = confirmDeleteNote === note.id ? '#f87171' : 'var(--ds-text-tertiary)')}
                >
                  <Trash2 size={10} />
                  {confirmDeleteNote === note.id ? 'Confirm?' : 'Delete'}
                </button>
              </div>
              {note.attachments.length > 0 && (
                <div className="space-y-1.5 mt-2.5">
                  {note.attachments.map(att => (
                    <AttachmentRow
                      key={att.id}
                      att={att}
                      previewUrl={previewUrls[att.id]}
                      onDownload={() => handleDownload(att)}
                      onDelete={() => handleDeleteSavedAttachment(note.id, att)}
                      confirmDelete={confirmDeleteAtt === att.id}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Attachment row ─────────────────────────────────────────────
function AttachmentRow({
  att,
  previewUrl,
  onDownload,
  onDelete,
  confirmDelete,
}: {
  att: NoteAttachment;
  previewUrl?: string;
  onDownload: () => void;
  onDelete: () => void;
  confirmDelete: boolean;
}) {
  return (
    <div
      className="rounded-lg p-2.5 flex items-start gap-2.5"
      style={{ background: 'rgba(255,255,255,0.025)', boxShadow: '0 0 0 1px rgba(255,255,255,0.04)' }}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.03)' }}
      >
        {IMAGE_MIME.has(att.mime_type) && previewUrl ? (
          <img src={previewUrl} alt={att.original_filename} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <FileText size={16} style={{ color: 'var(--ds-text-tertiary)' }} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: '#f0ede8' }}>
          {att.original_filename}
        </p>
        <p className="text-[11px] mt-0.5" style={{ color: 'var(--ds-text-tertiary)' }}>
          {formatSize(att.file_size)}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <button
            onClick={onDownload}
            className="flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-md transition-colors duration-150"
            style={{ color: 'var(--ds-text-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#f0ede8')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--ds-text-secondary)')}
          >
            <Download size={10} />
            Download
          </button>
          <button
            onClick={onDelete}
            className="flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-md transition-colors duration-150"
            style={{ color: confirmDelete ? '#f87171' : 'var(--ds-text-tertiary)' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
            onMouseLeave={e => (e.currentTarget.style.color = confirmDelete ? '#f87171' : 'var(--ds-text-tertiary)')}
          >
            <Trash2 size={10} />
            {confirmDelete ? 'Confirm?' : 'Remove'}
          </button>
        </div>
      </div>
      {IMAGE_MIME.has(att.mime_type) && !previewUrl && (
        <ImageIcon size={12} style={{ color: 'var(--ds-text-tertiary)' }} className="shrink-0 mt-1" />
      )}
    </div>
  );
}
