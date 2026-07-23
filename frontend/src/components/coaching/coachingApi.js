import axios from 'axios';
import { API } from '../../App';

// base() is computed lazily (not at module load) because App.js imports
// CoachingEngine, which imports this module, which imports API back from
// App.js — a circular import. Reading API at module-evaluation time hits it
// mid-TDZ ("Cannot access 'API' before initialization"); reading it inside
// each function call is safe since App.js has finished evaluating by then.
const base = () => `${API}/coaching`;

export const fetchCompetencies = () => axios.get(`${base()}/competencies`).then(r => r.data);
export const fetchGoalTemplates = () => axios.get(`${base()}/goal-templates`).then(r => r.data);
export const fetchContextMetrics = () => axios.get(`${base()}/context-metrics`).then(r => r.data);
export const checkLanguage = (text) => axios.post(`${base()}/language-check`, { text }).then(r => r.data);

export const createSession = (payload) => axios.post(`${base()}/sessions`, payload).then(r => r.data);
export const getSession = (id) => axios.get(`${base()}/sessions/${id}`).then(r => r.data);
export const listSessions = (viewer_id, viewer_role, representative_id) =>
  axios.get(`${base()}/sessions`, { params: { viewer_id, viewer_role, representative_id } }).then(r => r.data);
export const updateSession = (id, patch) => axios.put(`${base()}/sessions/${id}`, patch).then(r => r.data);
export const completeSession = (id, payload) => axios.post(`${base()}/sessions/${id}/complete`, payload);
export const fetchComment = (id) => axios.get(`${base()}/sessions/${id}/comment`).then(r => r.data);
export const csvExportUrl = (id) => `${base()}/sessions/${id}/export.csv`;

export const fetchUsers = () => axios.get(`${API}/users`).then(r => r.data);

export const SESSION_TYPE_LABELS = {
  joint_field_visit: 'İkili ziyaret',
  one_to_one: 'Bire bir görüşme',
  follow_up: 'Takip görüşmesi',
  skill_practice: 'Beceri çalışması',
  other: 'Diğer',
};

export const CUSTOMER_TYPE_LABELS = {
  doctor: 'Doktor',
  pharmacy: 'Eczane',
  other: 'Diğer',
};

export const RATING_STATUS_LABELS = {
  observed: 'Gözlendi',
  partly_observed: 'Kısmen gözlendi',
  not_observed: 'Gözlenmedi',
  not_assessed: 'Değerlendirilmedi',
};

export const CLASSIFICATION_LABELS = {
  strength: 'Güçlü yön',
  expected: 'Beklenen düzey',
  development: 'Gelişim alanı',
  not_assessed: 'Değerlendirilmedi',
};

export const GOAL_STATUS_LABELS = {
  planned: 'Planlandı',
  in_progress: 'Devam ediyor',
  completed: 'Tamamlandı',
  replanned: 'Yeniden planlandı',
};

export const classificationFor = (score) => {
  if (score === null || score === undefined) return 'not_assessed';
  if (score <= 2) return 'development';
  if (score === 3) return 'expected';
  return 'strength';
};

export const DRAFT_KEY = 'growcoach_draft_session_id';
export const draftStorageKey = (id) => `growcoach_draft_${id}`;
