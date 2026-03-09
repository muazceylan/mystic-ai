'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/layout/AdminLayout';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { nameSourcesApi } from '@/lib/api';
import { canManageNameSources, getUser } from '@/lib/auth';
import type {
  NameReviewActionResponse,
  NameReviewBatchActionResponse,
  NameReviewGroup,
  NameReviewStatus,
  Page,
} from '@/types';

const PAGE_SIZE = 20;

const SOURCE_OPTIONS = ['BEBEKISMI', 'SFK_ISTANBUL_EDU', 'ALFABETIK', 'UFUK'] as const;
const STATUS_OPTIONS: NameReviewStatus[] = ['PENDING', 'IN_REVIEW', 'SKIPPED', 'APPROVED', 'REJECTED', 'MERGED'];
const QUALITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH'] as const;

const FIELD_LABELS: Record<string, string> = {
  gender: 'Gender',
  meaning_short: 'Meaning (Short)',
  meaning_long: 'Meaning (Long)',
  origin: 'Origin',
  character_traits_text: 'Character Traits',
  letter_analysis_text: 'Letter Analysis',
  quran_flag: 'Quran Flag',
};

function statusBadge(status: NameReviewStatus) {
  switch (status) {
    case 'PENDING': return 'bg-yellow-900 text-yellow-300';
    case 'IN_REVIEW': return 'bg-blue-900 text-blue-300';
    case 'SKIPPED': return 'bg-gray-700 text-gray-300';
    case 'APPROVED': return 'bg-green-900 text-green-300';
    case 'REJECTED': return 'bg-red-900 text-red-300';
    case 'MERGED': return 'bg-purple-900 text-purple-300';
    default: return 'bg-gray-700 text-gray-300';
  }
}

function recommendationBadge(status: string) {
  switch (status) {
    case 'AUTO_MERGE_ELIGIBLE': return 'bg-emerald-900 text-emerald-300';
    case 'MERGE_SUGGESTED': return 'bg-cyan-900 text-cyan-300';
    case 'MANUAL_REVIEW_REQUIRED': return 'bg-amber-900 text-amber-300';
    default: return 'bg-gray-700 text-gray-300';
  }
}

function boolParam(value: string) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

function text(value?: string | null, max = 220) {
  if (!value) return '-';
  if (value.length <= max) return value;
  return `${value.slice(0, max)}...`;
}

export default function NameReviewQueuePage() {
  const user = getUser();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const [sourceName, setSourceName] = useState('');
  const [reviewStatus, setReviewStatus] = useState('');
  const [mismatchFlag, setMismatchFlag] = useState('');
  const [duplicateFlag, setDuplicateFlag] = useState('');
  const [contentQuality, setContentQuality] = useState('');
  const [canonicalName, setCanonicalName] = useState('');
  const [hasConflict, setHasConflict] = useState('');
  const [includeResolved, setIncludeResolved] = useState(false);

  const [selectedQueueIds, setSelectedQueueIds] = useState<number[]>([]);
  const [sourceDrafts, setSourceDrafts] = useState<Record<number, string>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<number, string>>({});
  const [bulkSource, setBulkSource] = useState('');
  const [bulkNote, setBulkNote] = useState('');

  const [mergeTarget, setMergeTarget] = useState<NameReviewGroup | null>(null);
  const [mergeSource, setMergeSource] = useState('');
  const [mergeFallbackCandidateId, setMergeFallbackCandidateId] = useState('');
  const [mergeFieldSelections, setMergeFieldSelections] = useState<Record<string, string>>({});

  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const params = useMemo(() => ({
    sourceName: sourceName || undefined,
    reviewStatus: reviewStatus || undefined,
    mismatchFlag: boolParam(mismatchFlag),
    duplicateContentFlag: boolParam(duplicateFlag),
    contentQuality: contentQuality || undefined,
    canonicalName: canonicalName || undefined,
    conflict: boolParam(hasConflict),
    includeResolved,
    page,
    size: PAGE_SIZE,
  }), [sourceName, reviewStatus, mismatchFlag, duplicateFlag, contentQuality, canonicalName, hasConflict, includeResolved, page]);

  const queueQuery = useQuery<Page<NameReviewGroup>>({
    queryKey: ['name-review-queue', params],
    queryFn: () => nameSourcesApi.listGroupedQueue(params).then((res) => res.data),
  });

  const refresh = async (message?: string) => {
    await queryClient.invalidateQueries({ queryKey: ['name-review-queue'] });
    if (message) setActionMessage(message);
  };

  const actionMutation = useMutation<NameReviewActionResponse, Error, { type: 'approve' | 'reject' | 'skip' | 'note'; queueId: number }>({
    mutationFn: async ({ type, queueId }) => {
      const note = noteDrafts[queueId] ?? '';
      const chosenSource = sourceDrafts[queueId] || undefined;
      if (type === 'approve') {
        return nameSourcesApi.approve(queueId, { chosenSource, reviewNote: note }).then((res) => res.data);
      }
      if (type === 'reject') {
        return nameSourcesApi.reject(queueId, { reviewNote: note }).then((res) => res.data);
      }
      if (type === 'skip') {
        return nameSourcesApi.skip(queueId, { reviewNote: note }).then((res) => res.data);
      }
      return nameSourcesApi.updateNote(queueId, { reviewNote: note }).then((res) => res.data);
    },
    onSuccess: async (_, variables) => {
      setActionError(null);
      await refresh(`Queue #${variables.queueId} için ${variables.type.toUpperCase()} başarılı.`);
      setSelectedQueueIds((prev) => prev.filter((id) => id !== variables.queueId));
    },
    onError: (error) => {
      setActionMessage(null);
      setActionError(error.message || 'Aksiyon başarısız.');
    },
  });

  const autoMergeMutation = useMutation<NameReviewBatchActionResponse, Error, { queueIds: number[]; mode: 'single' | 'bulk'; reviewNote?: string }>({
    mutationFn: async ({ queueIds, reviewNote }) => {
      const payload = {
        queueIds,
        reviewNote: reviewNote || undefined,
      };
      return nameSourcesApi.autoMerge(payload).then((res) => res.data);
    },
    onSuccess: async (result, variables) => {
      setActionError(null);
      const prefix = variables.mode === 'single' ? 'Auto Merge' : 'Bulk Auto Merge';
      await refresh(`${prefix} tamamlandı: ${result.succeeded}/${result.processed}.`);
      setSelectedQueueIds((prev) => prev.filter((id) => !variables.queueIds.includes(id)));
      if (variables.mode === 'bulk') {
        setBulkNote('');
      }
    },
    onError: (error) => {
      setActionMessage(null);
      setActionError(error.message || 'Auto merge işlemi başarısız.');
    },
  });

  const mergeMutation = useMutation<NameReviewActionResponse, Error, number>({
    mutationFn: async (queueId) => {
      const fieldMap: Record<string, number> = {};
      for (const [field, candidateId] of Object.entries(mergeFieldSelections)) {
        const numeric = Number(candidateId);
        if (!Number.isNaN(numeric) && numeric > 0) {
          fieldMap[field] = numeric;
        }
      }
      const payload = {
        chosenSource: mergeSource || undefined,
        fallbackCandidateId: mergeFallbackCandidateId ? Number(mergeFallbackCandidateId) : undefined,
        selectedFieldCandidateIds: fieldMap,
        reviewNote: mergeTarget ? (noteDrafts[mergeTarget.queueId] ?? '') : '',
      };
      return nameSourcesApi.merge(queueId, payload).then((res) => res.data);
    },
    onSuccess: async (result) => {
      setActionError(null);
      setMergeTarget(null);
      setMergeFieldSelections({});
      await refresh(`Queue #${result.queueId} merge edildi.`);
    },
    onError: (error) => {
      setActionMessage(null);
      setActionError(error.message || 'Merge işlemi başarısız.');
    },
  });

  const bulkMutation = useMutation<NameReviewBatchActionResponse, Error, 'approve' | 'reject'>({
    mutationFn: async (type) => {
      const payload = {
        queueIds: selectedQueueIds,
        chosenSource: type === 'approve' ? (bulkSource || undefined) : undefined,
        reviewNote: bulkNote || undefined,
      };
      if (type === 'approve') {
        return nameSourcesApi.bulkApprove(payload).then((res) => res.data);
      }
      return nameSourcesApi.bulkReject(payload).then((res) => res.data);
    },
    onSuccess: async (result, type) => {
      setActionError(null);
      await refresh(`Bulk ${type.toUpperCase()} tamamlandı: ${result.succeeded}/${result.processed}.`);
      setSelectedQueueIds([]);
      setBulkNote('');
    },
    onError: (error) => {
      setActionMessage(null);
      setActionError(error.message || 'Bulk işlem başarısız.');
    },
  });

  const groups = queueQuery.data?.content ?? [];
  const queueErrorMessage = (() => {
    const error = queueQuery.error as { response?: { data?: { message?: string } }; message?: string } | null;
    if (!error) return null;
    return error.response?.data?.message || error.message || 'Queue verisi alınamadı.';
  })();

  function toggleSelected(queueId: number, checked: boolean) {
    setSelectedQueueIds((prev) => {
      if (checked) {
        if (prev.includes(queueId)) return prev;
        return [...prev, queueId];
      }
      return prev.filter((id) => id !== queueId);
    });
  }

  function openMergeModal(group: NameReviewGroup) {
    setMergeTarget(group);
    setMergeSource(sourceDrafts[group.queueId] || group.chosenSource || '');
    setMergeFallbackCandidateId('');

    const initialSelections: Record<string, string> = {};
    for (const field of group.conflictingFields) {
      const preferredSource = group.recommendedFieldSources?.[field];
      if (preferredSource) {
        const match = group.candidates.find((candidate) => candidate.sourceName === preferredSource);
        if (match) {
          initialSelections[field] = String(match.candidateId);
          continue;
        }
      }
      const firstCandidate = group.conflictDetails.find((item) => item.field === field)?.values?.[0];
      if (firstCandidate) {
        initialSelections[field] = String(firstCandidate.candidateId);
      }
    }
    setMergeFieldSelections(initialSelections);
  }

  if (!canManageNameSources(user)) {
    return (
      <AdminLayout>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-sm text-gray-300">
          Bu ekranı görüntülemek için yetkiniz yok.
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Name Review Queue</h1>
          <p className="text-gray-400 text-sm mt-1">Canonical isim bazlı grouped candidate inceleme</p>
        </div>
        <div className="text-sm text-gray-400">
          {queueQuery.data?.totalElements ?? 0} kayıt
        </div>
      </div>

      {(actionMessage || actionError) && (
        <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${actionError
          ? 'border-red-800 bg-red-900/30 text-red-300'
          : 'border-green-800 bg-green-900/20 text-green-300'}`}>
          {actionError || actionMessage}
        </div>
      )}

      {queueQuery.isError && (
        <div className="mb-4 rounded-xl border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-300">
          {queueErrorMessage}
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-9 gap-3">
          <Select value={sourceName} onChange={(e) => { setSourceName(e.target.value); setPage(0); }}>
            <option value="">Source (All)</option>
            {SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Select value={reviewStatus} onChange={(e) => { setReviewStatus(e.target.value); setPage(0); }}>
            <option value="">Review Status (Active)</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Select value={mismatchFlag} onChange={(e) => { setMismatchFlag(e.target.value); setPage(0); }}>
            <option value="">Mismatch (All)</option>
            <option value="true">Mismatch = True</option>
            <option value="false">Mismatch = False</option>
          </Select>
          <Select value={duplicateFlag} onChange={(e) => { setDuplicateFlag(e.target.value); setPage(0); }}>
            <option value="">Duplicate (All)</option>
            <option value="true">Duplicate = True</option>
            <option value="false">Duplicate = False</option>
          </Select>
          <Select value={contentQuality} onChange={(e) => { setContentQuality(e.target.value); setPage(0); }}>
            <option value="">Quality (All)</option>
            {QUALITY_OPTIONS.map((q) => <option key={q} value={q}>{q}</option>)}
          </Select>
          <Select value={hasConflict} onChange={(e) => { setHasConflict(e.target.value); setPage(0); }}>
            <option value="">Conflict (All)</option>
            <option value="true">Conflict = True</option>
            <option value="false">Conflict = False</option>
          </Select>
          <Input
            placeholder="canonical_name"
            value={canonicalName}
            onChange={(e) => { setCanonicalName(e.target.value); setPage(0); }}
          />
          <Select value={includeResolved ? 'true' : 'false'} onChange={(e) => { setIncludeResolved(e.target.value === 'true'); setPage(0); }}>
            <option value="false">Active Queue</option>
            <option value="true">Include Resolved</option>
          </Select>
          <Button variant="secondary" onClick={() => {
            setSourceName('');
            setReviewStatus('');
            setMismatchFlag('');
            setDuplicateFlag('');
            setContentQuality('');
            setCanonicalName('');
            setHasConflict('');
            setIncludeResolved(false);
            setPage(0);
          }}>
            Filtreleri Sıfırla
          </Button>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-gray-400">Seçili queue: {selectedQueueIds.length}</span>
          <Select className="w-48" value={bulkSource} onChange={(e) => setBulkSource(e.target.value)}>
            <option value="">Bulk source (opsiyonel)</option>
            {SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Input
            className="max-w-md"
            placeholder="Bulk review note"
            value={bulkNote}
            onChange={(e) => setBulkNote(e.target.value)}
          />
          <Button
            variant="primary"
            size="sm"
            disabled={!selectedQueueIds.length || bulkMutation.isPending || autoMergeMutation.isPending}
            onClick={() => bulkMutation.mutate('approve')}
          >
            Toplu Approve
          </Button>
          <Button
            variant="danger"
            size="sm"
            disabled={!selectedQueueIds.length || bulkMutation.isPending || autoMergeMutation.isPending}
            onClick={() => bulkMutation.mutate('reject')}
          >
            Toplu Reject
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={!selectedQueueIds.length || autoMergeMutation.isPending}
            onClick={() => autoMergeMutation.mutate({ queueIds: selectedQueueIds, mode: 'bulk', reviewNote: bulkNote || undefined })}
          >
            Toplu Auto Merge
          </Button>
        </div>
      </div>

      {queueQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-48 bg-gray-900 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const selected = selectedQueueIds.includes(group.queueId);
            const note = noteDrafts[group.queueId] ?? group.reviewNote ?? '';
            const sourceDraft = sourceDrafts[group.queueId] ?? group.chosenSource ?? '';

            return (
              <div key={group.queueId} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={(e) => toggleSelected(group.queueId, e.target.checked)}
                      className="h-4 w-4"
                    />
                    <div>
                      <h2 className="text-lg font-semibold text-white">{group.canonicalName}</h2>
                      <p className="text-xs text-gray-500">Queue #{group.queueId}</p>
                    </div>
                    <Badge className={statusBadge(group.reviewStatus)}>{group.reviewStatus}</Badge>
                    {group.hasConflict && <Badge className="bg-red-900 text-red-300">CONFLICT</Badge>}
                    <Badge className={recommendationBadge(group.mergeRecommendationStatus)}>
                      {group.mergeRecommendationStatus}
                    </Badge>
                    {group.autoMergeEligible && <Badge className="bg-emerald-900 text-emerald-300">AUTO MERGE READY</Badge>}
                    {typeof group.mergeConfidence === 'number' && (
                      <Badge className="bg-gray-800 text-gray-300">confidence: {group.mergeConfidence.toFixed(3)}</Badge>
                    )}
                  </div>
                </div>

                {group.conflictingFields.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 uppercase mb-2">Conflicting Fields</p>
                    <div className="flex flex-wrap gap-2">
                      {group.conflictingFields.map((field) => (
                        <Badge key={field} className="bg-red-900/40 text-red-300">{FIELD_LABELS[field] ?? field}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mb-3 border border-gray-800 rounded-lg p-3 bg-gray-950/30 text-xs text-gray-300 space-y-2">
                  <p>
                    <span className="text-gray-500">recommendation:</span> {group.mergeRecommendationStatus}
                  </p>
                  <p>
                    <span className="text-gray-500">canonical suggestion:</span> {group.recommendedCanonicalName || group.canonicalName}
                  </p>
                  <p>
                    <span className="text-gray-500">reason:</span> {group.autoMergeReasonSummary || '-'}
                  </p>
                  {group.recommendedFieldSources && Object.keys(group.recommendedFieldSources).length > 0 && (
                    <div>
                      <p className="text-gray-500 mb-1">recommended field sources:</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(group.recommendedFieldSources).map(([field, source]) => (
                          <span key={`${group.queueId}-${field}`} className="bg-gray-800 rounded px-2 py-1">
                            {FIELD_LABELS[field] ?? field}: {source}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mb-3">
                  {group.candidates.map((candidate) => (
                    <div
                      key={candidate.candidateId}
                      className={`border rounded-lg p-3 ${candidate.mismatchFlag || candidate.duplicateContentFlag
                        ? 'border-red-800 bg-red-950/20'
                        : 'border-gray-800 bg-gray-950/40'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium text-white">{candidate.displayName}</p>
                          <p className="text-xs text-gray-500">{candidate.sourceName}</p>
                        </div>
                        <div className="flex gap-2">
                          <Badge className="bg-gray-700 text-gray-200">{candidate.contentQuality}</Badge>
                          {candidate.mismatchFlag && <Badge className="bg-red-900 text-red-300">Mismatch</Badge>}
                          {candidate.duplicateContentFlag && <Badge className="bg-orange-900 text-orange-300">Duplicate</Badge>}
                        </div>
                      </div>

                      <div className="space-y-1 text-xs text-gray-300">
                        <p><span className="text-gray-500">normalized_name:</span> {candidate.normalizedName}</p>
                        <p className={group.conflictingFields.includes('gender') ? 'text-red-300' : ''}><span className="text-gray-500">gender:</span> {candidate.gender ?? '-'}</p>
                        <p className={group.conflictingFields.includes('meaning_short') ? 'text-red-300' : ''}><span className="text-gray-500">meaning_short:</span> {text(candidate.meaningShort, 120)}</p>
                        <p className={group.conflictingFields.includes('meaning_long') ? 'text-red-300' : ''}><span className="text-gray-500">meaning_long:</span> {text(candidate.meaningLong, 160)}</p>
                        <p className={group.conflictingFields.includes('origin') ? 'text-red-300' : ''}><span className="text-gray-500">origin:</span> {candidate.origin || '-'}</p>
                        <p className={group.conflictingFields.includes('character_traits_text') ? 'text-red-300' : ''}><span className="text-gray-500">character_traits_text:</span> {text(candidate.characterTraitsText, 120)}</p>
                        <p className={group.conflictingFields.includes('letter_analysis_text') ? 'text-red-300' : ''}><span className="text-gray-500">letter_analysis_text:</span> {text(candidate.letterAnalysisText, 120)}</p>
                        <p className={group.conflictingFields.includes('quran_flag') ? 'text-red-300' : ''}><span className="text-gray-500">quran_flag:</span> {candidate.quranFlag === null || candidate.quranFlag === undefined ? '-' : String(candidate.quranFlag)}</p>
                        <p><span className="text-gray-500">source_confidence:</span> {candidate.sourceConfidence}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {group.conflictDetails.length > 0 && (
                  <div className="mb-4 border border-gray-800 rounded-lg p-3 bg-gray-950/30">
                    <p className="text-xs text-gray-500 uppercase mb-2">Conflict Diff</p>
                    <div className="space-y-2">
                      {group.conflictDetails.map((field) => (
                        <div key={field.field} className="text-xs text-gray-300">
                          <p className="text-red-300 mb-1">{FIELD_LABELS[field.field] ?? field.field}</p>
                          <div className="flex flex-wrap gap-2">
                            {field.values.map((value) => (
                              <span key={`${field.field}-${value.candidateId}`} className="bg-gray-800 rounded px-2 py-1">
                                {value.sourceName}: {text(value.value, 60)}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-center">
                  <Select value={sourceDraft} onChange={(e) => setSourceDrafts((prev) => ({ ...prev, [group.queueId]: e.target.value }))}>
                    <option value="">Chosen Source (auto)</option>
                    {SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </Select>
                  <Input
                    placeholder="Review note"
                    value={note}
                    onChange={(e) => setNoteDrafts((prev) => ({ ...prev, [group.queueId]: e.target.value }))}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => actionMutation.mutate({ type: 'approve', queueId: group.queueId })} disabled={actionMutation.isPending || autoMergeMutation.isPending}>Approve</Button>
                    <Button size="sm" variant="danger" onClick={() => actionMutation.mutate({ type: 'reject', queueId: group.queueId })} disabled={actionMutation.isPending || autoMergeMutation.isPending}>Reject</Button>
                    <Button size="sm" variant="secondary" onClick={() => openMergeModal(group)} disabled={mergeMutation.isPending || autoMergeMutation.isPending}>Merge</Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => autoMergeMutation.mutate({ queueIds: [group.queueId], mode: 'single', reviewNote: note || undefined })}
                      disabled={!group.autoMergeEligible || autoMergeMutation.isPending || actionMutation.isPending}
                    >
                      Auto Merge
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => actionMutation.mutate({ type: 'skip', queueId: group.queueId })} disabled={actionMutation.isPending || autoMergeMutation.isPending}>Skip</Button>
                    <Button size="sm" variant="ghost" onClick={() => actionMutation.mutate({ type: 'note', queueId: group.queueId })} disabled={actionMutation.isPending || autoMergeMutation.isPending}>Save Note</Button>
                  </div>
                </div>
              </div>
            );
          })}

          {!queueQuery.isError && !groups.length && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500">
              {includeResolved
                ? 'Queue kaydı bulunamadı.'
                : 'Aktif queue kaydı bulunamadı. Resolve edilmiş kayıtları görmek için "Include Resolved" seçin.'}
            </div>
          )}
        </div>
      )}

      {queueQuery.data && queueQuery.data.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
          <span>Sayfa {page + 1} / {queueQuery.data.totalPages} ({queueQuery.data.totalElements} kayıt)</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              ← Önceki
            </Button>
            <Button variant="secondary" size="sm" disabled={page >= queueQuery.data.totalPages - 1} onClick={() => setPage((p) => p + 1)}>
              Sonraki →
            </Button>
          </div>
        </div>
      )}

      <Modal
        open={!!mergeTarget}
        onClose={() => setMergeTarget(null)}
        title={mergeTarget ? `Merge: ${mergeTarget.canonicalName}` : 'Merge'}
        className="max-w-3xl"
      >
        {mergeTarget && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Chosen Source</p>
                <Select value={mergeSource} onChange={(e) => setMergeSource(e.target.value)}>
                  <option value="">Auto</option>
                  {SOURCE_OPTIONS.map((source) => <option key={source} value={source}>{source}</option>)}
                </Select>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Fallback Candidate</p>
                <Select value={mergeFallbackCandidateId} onChange={(e) => setMergeFallbackCandidateId(e.target.value)}>
                  <option value="">Auto</option>
                  {mergeTarget.candidates.map((candidate) => (
                    <option key={candidate.candidateId} value={String(candidate.candidateId)}>
                      #{candidate.candidateId} - {candidate.displayName} ({candidate.sourceName})
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 uppercase mb-2">Field Selection</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {mergeTarget.conflictingFields.map((field) => (
                  <div key={field}>
                    <p className="text-xs text-red-300 mb-1">{FIELD_LABELS[field] ?? field}</p>
                    <Select
                      value={mergeFieldSelections[field] ?? ''}
                      onChange={(e) => setMergeFieldSelections((prev) => ({ ...prev, [field]: e.target.value }))}
                    >
                      <option value="">Auto</option>
                      {mergeTarget.candidates.map((candidate) => (
                        <option key={`${field}-${candidate.candidateId}`} value={String(candidate.candidateId)}>
                          #{candidate.candidateId} - {candidate.sourceName}
                        </option>
                      ))}
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setMergeTarget(null)}>Vazgeç</Button>
              <Button
                variant="primary"
                disabled={mergeMutation.isPending}
                onClick={() => mergeMutation.mutate(mergeTarget.queueId)}
              >
                Merge Uygula
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}
