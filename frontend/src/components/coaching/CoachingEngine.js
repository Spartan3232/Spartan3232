import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Save, CheckCircle2, Circle, RotateCcw, Loader2 } from 'lucide-react';
import { UserContext } from '../../App';
import {
  fetchCompetencies, fetchGoalTemplates, fetchContextMetrics, fetchUsers, listSessions,
  createSession, updateSession, completeSession, fetchComment, csvExportUrl, getSession,
  SESSION_TYPE_LABELS, DRAFT_KEY, draftStorageKey,
} from './coachingApi';
import Step1Setup from './Step1Setup';
import Step2Context from './Step2Context';
import Step3Calls from './Step3Calls';
import Step4Competencies from './Step4Competencies';
import Step5Reflection from './Step5Reflection';
import Step6Grow from './Step6Grow';
import Step7Goals from './Step7Goals';
import Step8Followup from './Step8Followup';

const STEPS = [
  { id: 1, label: 'Kurulum' },
  { id: 2, label: 'Veri bağlamı' },
  { id: 3, label: 'Gözlenen görüşmeler' },
  { id: 4, label: 'Yetkinlik profili' },
  { id: 5, label: 'Çalışan görüşü' },
  { id: 6, label: 'GROW görüşmesi' },
  { id: 7, label: 'Gelişim hedefleri' },
  { id: 8, label: 'Takip ve çıktı' },
];

const initialSession = () => ({
  id: null,
  schemaVersion: '6.0',
  representative: null,
  manager: { name: '' },
  sessionDate: new Date().toISOString().slice(0, 10),
  sessionType: 'joint_field_visit',
  status: 'draft',
  province: '',
  bricks: [],
  focusCompetencies: [],
  previousSessionId: null,
  fieldDayStart: '',
  fieldDayEnd: '',
  contextMetrics: [],
  observedCalls: [],
  noCallsJustification: '',
  competencyRatings: [],
  employeeReflection: { whatWentWell: '', whatWasDifficult: '', chosenFocus: '', employeeStatement: '' },
  growConversation: { goal: '', reality: '', options: [], wayForward: '' },
  developmentGoals: [],
  followUps: [],
  languageWarnings: [],
  auditLog: [],
});

const CoachingEngine = () => {
  const { user } = useContext(UserContext);
  const [session, setSession] = useState(initialSession());
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [competencies, setCompetencies] = useState(null);
  const [goalTemplates, setGoalTemplates] = useState([]);
  const [previousSessions, setPreviousSessions] = useState([]);
  const [saveStatus, setSaveStatus] = useState(null); // null | 'saving' | 'saved' | 'error'
  const [saveError, setSaveError] = useState(null);
  const [comment, setComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completionErrors, setCompletionErrors] = useState([]);

  // İlk yükleme: kullanıcılar, yetkinlikler, hedef şablonları, ticari bağlam kartları
  useEffect(() => {
    Promise.all([fetchUsers(), fetchCompetencies(), fetchGoalTemplates(), fetchContextMetrics()])
      .then(([usersRes, comp, tmpl, ctx]) => {
        setUsers(usersRes.users || []);
        setCompetencies(comp);
        setGoalTemplates(tmpl.templates || []);
        setSession(prev => ({ ...prev, contextMetrics: prev.contextMetrics.length ? prev.contextMetrics : ctx.metrics }));
      })
      .catch(err => console.error('Coaching bootstrap error:', err));
  }, []);

  // Yarım kalmış taslağı geri yükle (localStorage-first, sonra sunucu)
  useEffect(() => {
    const init = async () => {
      const savedId = localStorage.getItem(DRAFT_KEY);
      if (savedId) {
        const localDraft = localStorage.getItem(draftStorageKey(savedId));
        if (localDraft) {
          try {
            const parsed = JSON.parse(localDraft);
            if (parsed.status !== 'completed') {
              setSession(parsed);
              setLoading(false);
              return;
            }
          } catch (e) { /* ignore corrupt draft */ }
        }
        try {
          const remote = await getSession(savedId);
          if (remote.status !== 'completed') {
            setSession(remote);
          } else {
            localStorage.removeItem(DRAFT_KEY);
          }
        } catch (e) {
          localStorage.removeItem(DRAFT_KEY);
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  // Taslağı tarayıcıda sakla (sayfa yeniden açıldığında korunması için)
  useEffect(() => {
    if (loading) return;
    const key = session.id ? draftStorageKey(session.id) : draftStorageKey('new');
    localStorage.setItem(key, JSON.stringify(session));
    if (session.id) localStorage.setItem(DRAFT_KEY, session.id);
  }, [session, loading]);

  useEffect(() => {
    if (!session.representative?.id || !user) return;
    listSessions(user.id, user.role, session.representative.id)
      .then(list => setPreviousSessions(list.filter(s => s.id !== session.id)))
      .catch(err => console.error('Previous sessions fetch error:', err));
  }, [session.representative?.id]);

  const patchSession = useCallback((patch) => setSession(prev => ({ ...prev, ...patch })), []);

  const stepPatchFields = {
    1: ['representative', 'manager', 'sessionDate', 'sessionType', 'province', 'bricks', 'focusCompetencies', 'previousSessionId', 'fieldDayStart', 'fieldDayEnd'],
    3: ['observedCalls', 'noCallsJustification'],
    4: ['competencyRatings'],
    5: ['employeeReflection'],
    6: ['growConversation'],
    7: ['developmentGoals'],
  };

  const buildPatch = (step) => {
    const fields = stepPatchFields[step];
    if (!fields) return null;
    const patch = { actor: user?.name };
    fields.forEach(f => { patch[f] = session[f]; });
    return patch;
  };

  const saveCurrentStep = async () => {
    if (!session.id) return true;
    const patch = buildPatch(currentStep);
    if (!patch) return true;
    setSaveStatus('saving');
    setSaveError(null);
    try {
      const updated = await updateSession(session.id, patch);
      setSession(updated);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(null), 2000);
      return true;
    } catch (err) {
      console.error('Save error:', err);
      const detail = err.response?.data?.detail;
      setSaveError(detail?.message || 'Kaydedilirken hata oluştu.');
      setSaveStatus('error');
      return false;
    }
  };

  const handleCreateAndContinue = async () => {
    if (!session.representative?.id || !session.manager?.name || !session.sessionDate || !session.sessionType) {
      setSaveError('Temsilci, yönetici, tarih ve koçluk türü zorunludur.');
      setSaveStatus('error');
      return;
    }
    setSaveStatus('saving');
    setSaveError(null);
    try {
      const created = await createSession({
        representative: session.representative,
        manager: session.manager,
        sessionDate: session.sessionDate,
        sessionType: session.sessionType,
        province: session.province,
        bricks: session.bricks,
        focusCompetencies: session.focusCompetencies,
        previousSessionId: session.previousSessionId,
        actor: user?.name,
      });
      setSession(prev => ({ ...created, fieldDayStart: prev.fieldDayStart, fieldDayEnd: prev.fieldDayEnd }));
      setSaveStatus('saved');
      setCurrentStep(2);
    } catch (err) {
      console.error('Create session error:', err);
      setSaveError('Koçluk kaydı oluşturulamadı.');
      setSaveStatus('error');
    }
  };

  const goToStep = async (target) => {
    if (target === currentStep) return;
    if (currentStep === 1 && !session.id) {
      if (target > 1) { await handleCreateAndContinue(); }
      return;
    }
    if (session.id && stepPatchFields[currentStep]) {
      const ok = await saveCurrentStep();
      if (!ok) return;
    }
    setCurrentStep(target);
  };

  const handleNext = () => {
    if (currentStep === 1 && !session.id) {
      handleCreateAndContinue();
      return;
    }
    goToStep(Math.min(8, currentStep + 1));
  };

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `coaching_${session.id || 'draft'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFetchComment = async () => {
    if (!session.id) return;
    setCommentLoading(true);
    try {
      const res = await fetchComment(session.id);
      setComment(res.comment);
    } catch (err) {
      console.error('Comment fetch error:', err);
    } finally {
      setCommentLoading(false);
    }
  };

  const handleComplete = async (ackWarnings) => {
    if (!session.id) return;
    setCompleting(true);
    setCompletionErrors([]);
    try {
      const res = await completeSession(session.id, { actor: user?.name, acknowledgeWarnings: ackWarnings });
      setSession(res.data);
      localStorage.removeItem(DRAFT_KEY);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (detail?.errors) {
        setCompletionErrors(detail.errors);
        if (detail.languageWarnings) setSession(prev => ({ ...prev, languageWarnings: detail.languageWarnings }));
      } else {
        setCompletionErrors(['Koçluk tamamlanırken beklenmeyen bir hata oluştu.']);
      }
    } finally {
      setCompleting(false);
    }
  };

  const handleNewCoaching = () => {
    if (!window.confirm('Yeni bir koçluk başlatmak istediğinize emin misiniz? Mevcut taslak bilgisi kaybolmaz, kaydedilmiş haliyle saklanır.')) return;
    localStorage.removeItem(DRAFT_KEY);
    setSession(initialSession());
    setCurrentStep(1);
    setComment('');
    setCompletionErrors([]);
  };

  const checklist = useMemo(() => ([
    { ok: session.observedCalls.length > 0 || !!(session.noCallsJustification || '').trim(), label: 'En az bir gözlenen görüşme veya gerekçe' },
    { ok: session.competencyRatings.some(r => r.status !== 'not_assessed'), label: 'En az bir yetkinlik kriteri değerlendirildi' },
    { ok: !session.competencyRatings.some(r => [1, 2, 4, 5].includes(r.score) && (!r.evidenceNote?.trim() || !r.evidenceCallIds?.length)), label: '1, 2, 4, 5 puanların tamamında kanıt var' },
    { ok: !!(session.employeeReflection.whatWentWell || session.employeeReflection.whatWasDifficult || session.employeeReflection.chosenFocus || session.employeeReflection.employeeStatement), label: 'Çalışan öz değerlendirmesi girildi' },
    { ok: session.developmentGoals.length > 0, label: 'En az bir gelişim hedefi eklendi' },
    { ok: !(session.languageWarnings || []).some(w => w.severity === 'block'), label: 'Disiplin/fesih dili yok' },
  ]), [session]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1Setup
            setup={session}
            onChange={(next) => setSession(prev => ({ ...prev, ...next }))}
            users={users}
            currentUser={user}
            competencies={competencies}
            previousSessions={previousSessions}
            readOnlyRepresentative={session.status === 'completed'}
          />
        );
      case 2:
        return <Step2Context contextMetrics={session.contextMetrics} />;
      case 3:
        return (
          <Step3Calls
            calls={session.observedCalls}
            onChange={(calls) => patchSession({ observedCalls: calls })}
            noCallsJustification={session.noCallsJustification}
            onJustificationChange={(v) => patchSession({ noCallsJustification: v })}
          />
        );
      case 4:
        return (
          <Step4Competencies
            competencies={competencies}
            ratings={session.competencyRatings}
            calls={session.observedCalls}
            onChange={(ratings) => patchSession({ competencyRatings: ratings })}
          />
        );
      case 5:
        return <Step5Reflection reflection={session.employeeReflection} onChange={(v) => patchSession({ employeeReflection: v })} />;
      case 6:
        return <Step6Grow grow={session.growConversation} onChange={(v) => patchSession({ growConversation: v })} />;
      case 7:
        return (
          <Step7Goals
            goals={session.developmentGoals}
            onChange={(goals) => patchSession({ developmentGoals: goals })}
            calls={session.observedCalls}
            templates={goalTemplates}
          />
        );
      case 8:
        return (
          <Step8Followup
            session={session}
            checklist={checklist}
            comment={comment}
            onFetchComment={handleFetchComment}
            commentLoading={commentLoading}
            onDownloadJson={handleDownloadJson}
            csvUrl={session.id ? csvExportUrl(session.id) : '#'}
            onComplete={handleComplete}
            completing={completing}
            completionErrors={completionErrors}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 print:h-auto">
      <header className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/" className="p-2 hover:bg-gray-100 rounded-lg flex-shrink-0"><ArrowLeft className="w-5 h-5 text-gray-600" /></Link>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-gray-900 truncate">GROW 360 Koçluk Motoru</h1>
            <p className="text-xs text-gray-500 truncate">
              {session.representative?.name || 'Temsilci seçilmedi'} · {SESSION_TYPE_LABELS[session.sessionType]}
              {session.status === 'completed' && <span className="ml-2 text-green-600 font-medium">Tamamlandı</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {saveStatus === 'saving' && <span className="text-xs text-gray-400 flex items-center gap-1"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Kaydediliyor</span>}
          {saveStatus === 'saved' && <span className="text-xs text-green-600">Kaydedildi ✓</span>}
          {saveStatus === 'error' && <span className="text-xs text-red-600">{saveError}</span>}
          <button type="button" onClick={handleNewCoaching} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-600 hover:bg-gray-50">
            <RotateCcw className="w-3.5 h-3.5" /> Yeni Koçluk
          </button>
        </div>
      </header>

      {/* Mobil/tablet: yatay adım navigasyonu */}
      <nav className="lg:hidden flex-shrink-0 overflow-x-auto border-b border-gray-200 bg-white print:hidden">
        <div className="flex gap-1 p-2 min-w-max">
          {STEPS.map(s => (
            <button
              key={s.id}
              type="button"
              disabled={s.id > 1 && !session.id}
              onClick={() => goToStep(s.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                currentStep === s.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
              } disabled:opacity-40`}
            >
              {s.id}. {s.label}
            </button>
          ))}
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        {/* Masaüstü: sol adım navigasyonu */}
        <nav className="hidden lg:block w-56 flex-shrink-0 border-r border-gray-200 bg-white overflow-y-auto print:hidden">
          <ul className="p-3 space-y-1">
            {STEPS.map(s => (
              <li key={s.id}>
                <button
                  type="button"
                  disabled={s.id > 1 && !session.id}
                  onClick={() => goToStep(s.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                    currentStep === s.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {currentStep > s.id || (s.id === 8 && session.status === 'completed')
                    ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    : <Circle className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                  <span>{s.id}. {s.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 print:overflow-visible">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{currentStep}. {STEPS[currentStep - 1].label}</h2>
            {renderStep()}
            {currentStep < 8 && (
              <div className="flex justify-between mt-6 pt-4 border-t border-gray-200 print:hidden">
                <button
                  type="button"
                  disabled={currentStep === 1}
                  onClick={() => goToStep(currentStep - 1)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm disabled:opacity-40"
                >
                  Geri
                </button>
                <button type="button" onClick={handleNext} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">
                  {currentStep === 1 && !session.id ? 'Oluştur ve Devam Et' : 'İleri'}
                </button>
              </div>
            )}
          </div>
        </main>

        {/* Sağ özet paneli */}
        <aside className="hidden xl:block w-72 flex-shrink-0 border-l border-gray-200 bg-white overflow-y-auto p-4 print:hidden">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Koçluk özeti</h3>
          <dl className="space-y-2 text-sm mb-4">
            <div className="flex justify-between"><dt className="text-gray-500">Görüşme</dt><dd className="font-medium">{session.observedCalls.length}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Değerlendirilen kriter</dt><dd className="font-medium">{session.competencyRatings.filter(r => r.status !== 'not_assessed').length} / {competencies?.criteria?.length || 34}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Gelişim hedefi</dt><dd className="font-medium">{session.developmentGoals.length}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Dil uyarısı</dt><dd className={`font-medium ${session.languageWarnings?.length ? 'text-amber-600' : ''}`}>{session.languageWarnings?.length || 0}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Durum</dt><dd className="font-medium">{session.status}</dd></div>
          </dl>
          <button
            type="button"
            disabled={!session.id || !stepPatchFields[currentStep]}
            onClick={saveCurrentStep}
            className="w-full flex items-center justify-center gap-2 py-2 bg-gray-900 text-white rounded-lg text-sm disabled:opacity-40"
          >
            <Save className="w-4 h-4" /> Kaydet
          </button>
          <ul className="mt-4 space-y-1.5">
            {checklist.map((c, i) => (
              <li key={i} className={`text-xs flex items-center gap-1.5 ${c.ok ? 'text-green-600' : 'text-gray-400'}`}>
                {c.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />} {c.label}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
};

export default CoachingEngine;
