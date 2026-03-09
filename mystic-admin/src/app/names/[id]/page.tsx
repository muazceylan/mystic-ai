'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import AdminLayout from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { canManageNameSources, getUser } from '@/lib/auth';
import { nameEnrichmentApi, namesApi } from '@/lib/api';
import { mapAdminNameDetail } from '@/lib/names-mapper';
import { formatDate } from '@/lib/utils';
import type { AdminNameDetail, NameStatus, NameTagTaxonomy } from '@/types';

const ALIAS_TYPES = [
  'SPELLING_VARIANT',
  'TRANSLITERATION',
  'SHORT_FORM',
  'COMPOUND_VARIANT',
  'RELATED_FORM',
] as const;

type TabKey = 'general' | 'meaning' | 'tags' | 'aliases' | 'system';

const TAG_GROUP_LABELS: Record<string, string> = {
  STYLE: 'STYLE',
  VIBE: 'VIBE',
  THEME: 'THEME',
  CULTURE: 'CULTURE',
  RELIGION: 'RELIGION',
  USAGE: 'USAGE',
};

type NameFormState = {
  name: string;
  gender: string;
  origin: string;
  meaningShort: string;
  meaningLong: string;
  characterTraitsText: string;
  letterAnalysisText: string;
  quranFlag: 'true' | 'false' | 'unknown';
  status: NameStatus;
};

function statusBadge(status: NameStatus) {
  switch (status) {
    case 'ACTIVE': return 'bg-green-900/40 text-green-300';
    case 'PENDING_REVIEW': return 'bg-yellow-900/40 text-yellow-300';
    case 'HIDDEN': return 'bg-blue-900/40 text-blue-300';
    case 'REJECTED': return 'bg-red-900/40 text-red-300';
    default: return 'bg-gray-700 text-gray-300';
  }
}

function toFormState(detail: AdminNameDetail): NameFormState {
  return {
    name: detail.name ?? '',
    gender: detail.gender ?? 'UNKNOWN',
    origin: detail.origin ?? '',
    meaningShort: detail.meaningShort ?? '',
    meaningLong: detail.meaningLong ?? '',
    characterTraitsText: detail.characterTraitsText ?? '',
    letterAnalysisText: detail.letterAnalysisText ?? '',
    quranFlag: detail.quranFlag == null ? 'unknown' : (detail.quranFlag ? 'true' : 'false'),
    status: detail.status,
  };
}

function normalizeTextInput(value: string): string | null {
  const normalized = value.trim();
  return normalized.length ? normalized : null;
}

export default function NameDetailPage() {
  const user = getUser();
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();

  const rawId = params?.id;
  const nameId = Number(Array.isArray(rawId) ? rawId[0] : rawId);

  const [activeTab, setActiveTab] = useState<TabKey>('general');
  const [formOverride, setFormOverride] = useState<NameFormState | null>(null);

  const [tagGroupInput, setTagGroupInput] = useState('');
  const [tagValueInput, setTagValueInput] = useState('');
  const [tagConfidence, setTagConfidence] = useState('1.0');
  const [tagEvidence, setTagEvidence] = useState('');

  const [aliasInput, setAliasInput] = useState('');
  const [aliasType, setAliasType] = useState<(typeof ALIAS_TYPES)[number]>('RELATED_FORM');
  const [aliasConfidence, setAliasConfidence] = useState('1.0');

  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const detailQuery = useQuery<AdminNameDetail>({
    queryKey: ['admin-name-detail', nameId],
    queryFn: async () => {
      const response = await namesApi.get(nameId);
      return mapAdminNameDetail(response.data);
    },
    enabled: Number.isFinite(nameId) && nameId > 0,
  });

  const taxonomyQuery = useQuery<NameTagTaxonomy>({
    queryKey: ['name-tag-taxonomy'],
    queryFn: async () => {
      const response = await nameEnrichmentApi.taxonomy();
      return response.data as NameTagTaxonomy;
    },
  });

  const baseForm = useMemo(() => {
    if (!detailQuery.data) {
      return null;
    }
    return toFormState(detailQuery.data);
  }, [detailQuery.data]);

  const form = formOverride ?? baseForm;

  const taxonomyGroups = useMemo(
    () => taxonomyQuery.data?.groups ?? [],
    [taxonomyQuery.data]
  );
  const effectiveTagGroup = useMemo(() => {
    if (!taxonomyGroups.length) {
      return '';
    }
    const exists = taxonomyGroups.some((group) => group.group === tagGroupInput);
    return exists ? tagGroupInput : taxonomyGroups[0].group;
  }, [taxonomyGroups, tagGroupInput]);

  const selectedTagValues = useMemo(
    () => taxonomyGroups.find((group) => group.group === effectiveTagGroup)?.values ?? [],
    [taxonomyGroups, effectiveTagGroup]
  );

  const effectiveTagValue = useMemo(() => {
    if (!selectedTagValues.length) {
      return '';
    }
    if (selectedTagValues.includes(tagValueInput)) {
      return tagValueInput;
    }
    return selectedTagValues[0];
  }, [selectedTagValues, tagValueInput]);

  const isDirty = useMemo(() => {
    if (!form || !baseForm) {
      return false;
    }
    return JSON.stringify(form) !== JSON.stringify(baseForm);
  }, [form, baseForm]);

  const applyFormPatch = (patch: Partial<NameFormState>) => {
    if (!form) {
      return;
    }
    setFormOverride({ ...form, ...patch });
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!form) {
        throw new Error('Form state unavailable');
      }
      if (!form.name.trim()) {
        throw new Error('İsim boş olamaz.');
      }

      const payload = {
        name: form.name.trim(),
        gender: form.gender || 'UNKNOWN',
        origin: normalizeTextInput(form.origin),
        meaningShort: normalizeTextInput(form.meaningShort),
        meaningLong: normalizeTextInput(form.meaningLong),
        characterTraitsText: normalizeTextInput(form.characterTraitsText),
        letterAnalysisText: normalizeTextInput(form.letterAnalysisText),
        quranFlag: form.quranFlag === 'unknown' ? null : form.quranFlag === 'true',
        status: form.status,
      };

      const response = await namesApi.update(nameId, payload);
      return mapAdminNameDetail(response.data);
    },
    onSuccess: async (updated) => {
      setErrorMessage(null);
      setInfoMessage('Kayıt başarıyla güncellendi.');
      setFormOverride(null);
      queryClient.setQueryData(['admin-name-detail', nameId], updated);
      await queryClient.invalidateQueries({ queryKey: ['admin-names'] });
    },
    onError: (error: unknown) => {
      const message = (error as { response?: { data?: { message?: string } }; message?: string }).response?.data?.message
        || (error as { message?: string }).message
        || 'Güncelleme başarısız.';
      setInfoMessage(null);
      setErrorMessage(message);
    },
  });

  const addTagMutation = useMutation({
    mutationFn: async () => {
      if (!effectiveTagGroup) {
        throw new Error('Tag grubu seçilmelidir.');
      }
      if (!effectiveTagValue) {
        throw new Error('Tag değeri seçilmelidir.');
      }
      const confidence = Number(tagConfidence);
      const payload = {
        tagGroup: effectiveTagGroup,
        tagValue: effectiveTagValue,
        source: 'MANUAL',
        confidence: Number.isFinite(confidence) ? confidence : 1,
        evidence: normalizeTextInput(tagEvidence),
      };
      await namesApi.addTag(nameId, payload);
    },
    onSuccess: async () => {
      setErrorMessage(null);
      setInfoMessage('Tag eklendi.');
      setTagConfidence('1.0');
      setTagEvidence('');
      await queryClient.invalidateQueries({ queryKey: ['admin-name-detail', nameId] });
    },
    onError: (error: unknown) => {
      const message = (error as { response?: { data?: { message?: string } }; message?: string }).response?.data?.message
        || (error as { message?: string }).message
        || 'Tag ekleme başarısız.';
      setInfoMessage(null);
      setErrorMessage(message);
    },
  });

  const recomputeEnrichmentMutation = useMutation({
    mutationFn: async () => {
      const response = await nameEnrichmentApi.recompute(nameId);
      return response.data as { insertedTagCount?: number; removedRuleTagCount?: number };
    },
    onSuccess: async (response) => {
      setErrorMessage(null);
      const inserted = response?.insertedTagCount ?? 0;
      const removed = response?.removedRuleTagCount ?? 0;
      setInfoMessage(`Rule enrichment tamamlandı. Eklenen tag: ${inserted}, yenilenen rule tag: ${removed}.`);
      await queryClient.invalidateQueries({ queryKey: ['admin-name-detail', nameId] });
      await queryClient.invalidateQueries({ queryKey: ['admin-names'] });
      await queryClient.invalidateQueries({ queryKey: ['name-enrichment-runs'] });
    },
    onError: (error: unknown) => {
      const message = (error as { response?: { data?: { message?: string } }; message?: string }).response?.data?.message
        || (error as { message?: string }).message
        || 'Rule enrichment yeniden hesaplama başarısız.';
      setInfoMessage(null);
      setErrorMessage(message);
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: async (tagId: number) => namesApi.deleteTag(nameId, tagId),
    onSuccess: async () => {
      setErrorMessage(null);
      setInfoMessage('Tag silindi.');
      await queryClient.invalidateQueries({ queryKey: ['admin-name-detail', nameId] });
    },
    onError: (error: unknown) => {
      const message = (error as { response?: { data?: { message?: string } }; message?: string }).response?.data?.message
        || (error as { message?: string }).message
        || 'Tag silme başarısız.';
      setInfoMessage(null);
      setErrorMessage(message);
    },
  });

  const addAliasMutation = useMutation({
    mutationFn: async () => {
      if (!aliasInput.trim()) {
        throw new Error('Alias boş olamaz.');
      }
      const confidence = Number(aliasConfidence);
      const payload = {
        aliasName: aliasInput.trim(),
        aliasType,
        confidence: Number.isFinite(confidence) ? confidence : 1,
      };
      await namesApi.addAlias(nameId, payload);
    },
    onSuccess: async () => {
      setErrorMessage(null);
      setInfoMessage('Alias eklendi.');
      setAliasInput('');
      setAliasType('RELATED_FORM');
      setAliasConfidence('1.0');
      await queryClient.invalidateQueries({ queryKey: ['admin-name-detail', nameId] });
      await queryClient.invalidateQueries({ queryKey: ['admin-names'] });
    },
    onError: (error: unknown) => {
      const message = (error as { response?: { data?: { message?: string } }; message?: string }).response?.data?.message
        || (error as { message?: string }).message
        || 'Alias ekleme başarısız.';
      setInfoMessage(null);
      setErrorMessage(message);
    },
  });

  const deleteAliasMutation = useMutation({
    mutationFn: async (aliasId: number) => namesApi.deleteAlias(nameId, aliasId),
    onSuccess: async () => {
      setErrorMessage(null);
      setInfoMessage('Alias silindi.');
      await queryClient.invalidateQueries({ queryKey: ['admin-name-detail', nameId] });
      await queryClient.invalidateQueries({ queryKey: ['admin-names'] });
    },
    onError: (error: unknown) => {
      const message = (error as { response?: { data?: { message?: string } }; message?: string }).response?.data?.message
        || (error as { message?: string }).message
        || 'Alias silme başarısız.';
      setInfoMessage(null);
      setErrorMessage(message);
    },
  });

  if (!canManageNameSources(user)) {
    return (
      <AdminLayout>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-sm text-gray-300">
          Bu ekranı görüntülemek için yetkiniz yok.
        </div>
      </AdminLayout>
    );
  }

  if (!Number.isFinite(nameId) || nameId <= 0) {
    return (
      <AdminLayout>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-sm text-red-300">
          Geçersiz isim kimliği.
        </div>
      </AdminLayout>
    );
  }

  if (detailQuery.isLoading || !detailQuery.data || !form) {
    return (
      <AdminLayout>
        <div className="space-y-4">
          <div className="h-10 bg-gray-900 rounded-xl animate-pulse" />
          <div className="h-64 bg-gray-900 rounded-xl animate-pulse" />
        </div>
      </AdminLayout>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    const message = (detailQuery.error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message
      || (detailQuery.error as { message?: string })?.message
      || 'İsim detayı alınamadı.';

    return (
      <AdminLayout>
        <div className="bg-gray-900 border border-red-800 rounded-xl p-6 text-sm text-red-300">
          {message}
        </div>
      </AdminLayout>
    );
  }

  const detail = detailQuery.data;
  const lastRuleTagUpdatedAt = detail.tags
    .filter((tag) => tag.source === 'RULE' || tag.source === 'AI')
    .map((tag) => tag.updatedAt)
    .sort()
    .at(-1);

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">{detail.name}</h1>
          <p className="text-xs text-gray-500 mt-1">#{detail.id} • {detail.normalizedName}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full ${statusBadge(detail.status)}`}>{detail.status}</span>
          <Button variant="secondary" onClick={() => router.push('/names')}>Listeye Dön</Button>
          <Button
            variant="secondary"
            onClick={() => recomputeEnrichmentMutation.mutate()}
            disabled={recomputeEnrichmentMutation.isPending}
          >
            {recomputeEnrichmentMutation.isPending ? 'Recompute...' : 'Enrichment Recompute'}
          </Button>
          <Button
            onClick={() => updateMutation.mutate()}
            disabled={!isDirty || updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </div>
      </div>

      {(infoMessage || errorMessage) && (
        <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${errorMessage
          ? 'border-red-800 bg-red-900/30 text-red-300'
          : 'border-green-800 bg-green-900/20 text-green-300'}`}>
          {errorMessage || infoMessage}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {([
          ['general', 'Genel Bilgiler'],
          ['meaning', 'Anlam & Açıklama'],
          ['tags', 'Tag\'ler'],
          ['aliases', 'Alias\'lar'],
          ['system', 'Sistem Bilgileri'],
        ] as [TabKey, string][]).map(([key, label]) => (
          <Button
            key={key}
            variant={activeTab === key ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setActiveTab(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        {activeTab === 'general' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">İsim</label>
              <Input
                value={form.name}
                onChange={(e) => applyFormPatch({ name: e.target.value })}
                placeholder="İsim"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Durum</label>
              <Select
                value={form.status}
                onChange={(e) => applyFormPatch({ status: e.target.value as NameStatus })}
              >
                <option value="PENDING_REVIEW">PENDING_REVIEW</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="HIDDEN">HIDDEN</option>
                <option value="REJECTED">REJECTED</option>
              </Select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Cinsiyet</label>
              <Select
                value={form.gender}
                onChange={(e) => applyFormPatch({ gender: e.target.value })}
              >
                <option value="UNKNOWN">UNKNOWN</option>
                <option value="MALE">MALE</option>
                <option value="FEMALE">FEMALE</option>
                <option value="UNISEX">UNISEX</option>
              </Select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Kur&apos;an Bilgisi</label>
              <Select
                value={form.quranFlag}
                onChange={(e) => applyFormPatch({ quranFlag: e.target.value as NameFormState['quranFlag'] })}
              >
                <option value="unknown">Bilinmiyor</option>
                <option value="true">Evet</option>
                <option value="false">Hayır</option>
              </Select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-400 mb-1">Köken</label>
              <Input
                value={form.origin}
                onChange={(e) => applyFormPatch({ origin: e.target.value })}
                placeholder="Köken"
              />
            </div>
          </div>
        )}

        {activeTab === 'meaning' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Kısa Anlam</label>
              <Input
                value={form.meaningShort}
                onChange={(e) => applyFormPatch({ meaningShort: e.target.value })}
                placeholder="Kısa anlam"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Uzun Anlam</label>
              <textarea
                className="w-full min-h-28 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                value={form.meaningLong}
                onChange={(e) => applyFormPatch({ meaningLong: e.target.value })}
                placeholder="Uzun anlam"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Karakter Metni</label>
              <textarea
                className="w-full min-h-24 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                value={form.characterTraitsText}
                onChange={(e) => applyFormPatch({ characterTraitsText: e.target.value })}
                placeholder="Karakter metni"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Harf Analizi</label>
              <textarea
                className="w-full min-h-24 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                value={form.letterAnalysisText}
                onChange={(e) => applyFormPatch({ letterAnalysisText: e.target.value })}
                placeholder="Harf analizi"
              />
            </div>
          </div>
        )}

        {activeTab === 'tags' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <Select
                value={effectiveTagGroup}
                onChange={(e) => {
                  const nextGroup = e.target.value;
                  setTagGroupInput(nextGroup);
                  const nextValues = taxonomyGroups.find((group) => group.group === nextGroup)?.values ?? [];
                  setTagValueInput(nextValues[0] ?? '');
                }}
                disabled={taxonomyQuery.isLoading || !taxonomyGroups.length}
              >
                {taxonomyGroups.map((group) => (
                  <option key={group.group} value={group.group}>
                    {TAG_GROUP_LABELS[group.group] ?? group.group}
                  </option>
                ))}
              </Select>
              <Select
                value={effectiveTagValue}
                onChange={(e) => setTagValueInput(e.target.value)}
                disabled={!selectedTagValues.length}
              >
                {selectedTagValues.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </Select>
              <Input
                value={tagConfidence}
                onChange={(e) => setTagConfidence(e.target.value)}
                placeholder="Confidence (0.1 - 1.0)"
              />
              <Input
                value={tagEvidence}
                onChange={(e) => setTagEvidence(e.target.value)}
                placeholder="Evidence / reason"
              />
              <Button
                onClick={() => addTagMutation.mutate()}
                disabled={addTagMutation.isPending || taxonomyQuery.isLoading || !effectiveTagGroup || !effectiveTagValue}
              >
                Tag Ekle
              </Button>
            </div>

            <div className="border border-gray-800 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-800/50">
                  <tr>
                    {['Grup', 'Tag', 'Source', 'Confidence', 'Evidence', 'Version', 'Güncelleme', ''].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-xs text-gray-400 font-semibold uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {detail.tags.map((tag) => (
                    <tr key={tag.id}>
                      <td className="px-3 py-2 text-gray-300">{tag.tagGroup ?? '-'}</td>
                      <td className="px-3 py-2 text-gray-200">{tag.tagValue}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
                          tag.source === 'MANUAL'
                            ? 'bg-emerald-900/40 text-emerald-300'
                            : tag.source === 'RULE'
                              ? 'bg-blue-900/40 text-blue-300'
                              : 'bg-purple-900/40 text-purple-300'
                        }`}>
                          {tag.source}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-400">{tag.confidence.toFixed(3)}</td>
                      <td className="px-3 py-2 text-gray-400 text-xs max-w-[280px]">{tag.evidence ?? '-'}</td>
                      <td className="px-3 py-2 text-gray-400">{tag.enrichmentVersion ?? '-'}</td>
                      <td className="px-3 py-2 text-gray-500 text-xs">{formatDate(tag.updatedAt)}</td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => deleteTagMutation.mutate(tag.id)}
                          disabled={deleteTagMutation.isPending}
                        >
                          Sil
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {detail.tags.length === 0 && (
                    <tr><td colSpan={8} className="px-3 py-4 text-center text-gray-500">Tag bulunmuyor.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'aliases' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Input
                value={aliasInput}
                onChange={(e) => setAliasInput(e.target.value)}
                placeholder="Yeni alias"
              />
              <Select value={aliasType} onChange={(e) => setAliasType(e.target.value as (typeof ALIAS_TYPES)[number])}>
                {ALIAS_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </Select>
              <Input
                value={aliasConfidence}
                onChange={(e) => setAliasConfidence(e.target.value)}
                placeholder="Confidence (0.1 - 1.0)"
              />
              <Button onClick={() => addAliasMutation.mutate()} disabled={addAliasMutation.isPending}>Alias Ekle</Button>
            </div>

            <div className="border border-gray-800 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-800/50">
                  <tr>
                    {['Alias', 'Type', 'Confidence', 'Manual', 'Güncelleme', ''].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-xs text-gray-400 font-semibold uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {detail.aliases.map((alias) => (
                    <tr key={alias.id}>
                      <td className="px-3 py-2 text-gray-200">{alias.aliasName}</td>
                      <td className="px-3 py-2 text-gray-400">{alias.aliasType}</td>
                      <td className="px-3 py-2 text-gray-400">{alias.confidence.toFixed(3)}</td>
                      <td className="px-3 py-2 text-gray-400">{alias.isManual ? 'Evet' : 'Hayır'}</td>
                      <td className="px-3 py-2 text-gray-500 text-xs">{formatDate(alias.updatedAt)}</td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => deleteAliasMutation.mutate(alias.id)}
                          disabled={deleteAliasMutation.isPending}
                        >
                          Sil
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {detail.aliases.length === 0 && (
                    <tr><td colSpan={6} className="px-3 py-4 text-center text-gray-500">Alias bulunmuyor.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'system' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <p className="text-gray-400">Canonical ID</p>
              <p className="text-white">{detail.canonicalInfo.id}</p>
            </div>
            <div className="space-y-2">
              <p className="text-gray-400">Canonical Name</p>
              <p className="text-white">{detail.canonicalInfo.name}</p>
            </div>
            <div className="space-y-2">
              <p className="text-gray-400">Canonical Normalized</p>
              <p className="text-white">{detail.canonicalInfo.normalizedName}</p>
            </div>
            <div className="space-y-2">
              <p className="text-gray-400">Data Quality Score</p>
              <p className="text-white">{detail.dataQualityScore ?? '-'}</p>
            </div>
            <div className="space-y-2">
              <p className="text-gray-400">Created At</p>
              <p className="text-white">{formatDate(detail.createdAt)}</p>
            </div>
            <div className="space-y-2">
              <p className="text-gray-400">Updated At</p>
              <p className="text-white">{formatDate(detail.updatedAt)}</p>
            </div>
            <div className="space-y-2">
              <p className="text-gray-400">Last Rule/AI Tag Update</p>
              <p className="text-white">{lastRuleTagUpdatedAt ? formatDate(lastRuleTagUpdatedAt) : '-'}</p>
            </div>
            <div className="space-y-2">
              <p className="text-gray-400">Taxonomy Source</p>
              <p className="text-white">{taxonomyQuery.isLoading ? 'Loading...' : taxonomyQuery.isError ? 'Unavailable' : 'Loaded'}</p>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
