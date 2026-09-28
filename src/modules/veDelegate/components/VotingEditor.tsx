import React, { useRef, useState } from 'react';
import type { VotePreference } from '../types';
import { validateVotes, voteKey, type VotingApp } from '../voting';

interface Props {
    apps: VotingApp[];
    preference: VotePreference;
    appId: string;
    loading: boolean;
    error: string | null;
    onRetry: () => void;
    onSave: (preference: VotePreference) => Promise<void>;
    mode?: 'dark' | 'light';
    primaryColor?: string;
}

export function VotingEditor({ apps, preference, appId, loading, error, onRetry, onSave, mode = 'dark', primaryColor = '#ea580c' }: Props) {
    const [draft, setDraft] = useState<Record<string, string> | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const submitting = useRef(false);
    const saved = Object.fromEntries(preference.appIds.map((id, i) => [id.toLowerCase(), String(preference.percentages[i])]));
    const values = draft ?? saved;
    const selected = new Set(preference.appIds.filter((_, i) => preference.percentages[i] > 0).map(id => id.toLowerCase()));
    const sortedApps = [...apps].sort((a, b) => Number(selected.has(b.id)) - Number(selected.has(a.id)) || a.name.localeCompare(b.name));
    const ids = Object.keys(values);
    const proposed = { appIds: ids, percentages: ids.map(id => values[id].trim() === '' ? NaN : Number(values[id])) };
    let validated: VotePreference | null = null;
    let validationError: string | null = null;
    try { validated = validateVotes(proposed, new Set(apps.filter(app => app.eligible).map(app => app.id))); }
    catch (error) { validationError = error instanceof Error ? error.message : 'Check your percentages.'; }
    const canSave = !loading && !error && !saving && validated !== null && voteKey(proposed) !== voteKey(preference);
    const platform = apps.find(app => app.id === appId.toLowerCase());
    const edit = (next: Record<string, string>) => { setDraft(next); setSuccess(false); setSaveError(null); };
    const save = async () => {
        if (!canSave || !validated || submitting.current) return;
        submitting.current = true;
        setSaving(true); setSaveError(null); setSuccess(false);
        try {
            await onSave(validated);
            setDraft(null); setSuccess(true);
        } catch (error) {
            setSaveError(error instanceof Error ? error.message : 'Unable to save votes. Please retry.');
        } finally { submitting.current = false; setSaving(false); }
    };
    const buttonStyle: React.CSSProperties = { padding: '10px 14px', borderRadius: 8, border: '1px solid currentColor', color: 'inherit', background: 'transparent', cursor: 'pointer' };
    if (error) return <section aria-label="Voting preferences"><p role="alert">{error}</p><button style={buttonStyle} onClick={onRetry}>Retry</button></section>;
    if (loading && !apps.length) return <p role="status">Loading voting preferences…</p>;
    return <section aria-label="Voting preferences" style={{ display: 'grid', gap: 16, color: mode === 'dark' ? '#f3f4f6' : '#111827' }}>
        <p style={{ margin: 0 }}>Change your voting preference.</p>
        {!preference.appIds.length && <p style={{ margin: 0 }}>No voting preference saved.</p>}
        {platform?.eligible && <button style={buttonStyle} disabled={saving || loading} onClick={() => edit({ [platform.id]: '100' })}>100% for {platform.name}</button>}
        <div style={{ display: 'grid', gap: 8, maxHeight: '35vh', overflowY: 'auto', padding: 3 }}>
            {sortedApps.map(app => <label key={app.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #80808040' }}>
                <span style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>{app.name}{!app.eligible && <small style={{ display: 'block', color: mode === 'dark' ? '#fbbf24' : '#92400e' }}>Not currently eligible</small>}</span>
                <span style={{ position: 'relative', flexShrink: 0 }}>
                    <input aria-label={`${app.name} (%)`} type="number" inputMode="numeric" min="0" max="100" step="1" value={values[app.id] ?? '0'} disabled={saving || loading}
                        onChange={event => edit({ ...values, [app.id]: event.target.value })}
                        style={{ boxSizing: 'border-box', width: 96, padding: '10px 28px 10px 10px', borderRadius: 6, border: '1px solid #80808080', background: mode === 'dark' ? '#1f2937' : '#fff', color: 'inherit', textAlign: 'right' }} />
                    <span aria-hidden="true" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>%</span>
                </span>
            </label>)}
        </div>
        {validationError && <p role="status" style={{ margin: 0 }}>{validationError}</p>}
        {loading && <p role="status">Refreshing voting preferences…</p>}
        {saveError && <p role="alert">{saveError}</p>}
        {success && <p role="status">Voting preferences saved.</p>}
        <button disabled={!canSave} onClick={() => void save()} style={{ ...buttonStyle, background: canSave ? primaryColor : mode === 'dark' ? '#374151' : '#e5e7eb', color: canSave ? '#fff' : 'inherit', border: 'none', cursor: canSave ? 'pointer' : 'default', opacity: canSave ? 1 : 0.65 }}>{saving ? 'Saving votes…' : 'Save votes'}</button>
    </section>;
}
