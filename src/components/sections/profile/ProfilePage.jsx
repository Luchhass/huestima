"use client";

import "./profile.css";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Check, Clock3, Gamepad2, Pencil, Shapes, Trophy, X } from 'lucide-react';
import { useTranslation } from '@/hooks/useLanguage';
import { useResponsiveCardHeight } from '@/hooks/useResponsiveCardHeight';
import { SCREEN_REVEAL_REPLAY_EVENT, useScreenReveal } from '@/hooks/useScreenReveal';
import { consumeCardRouteTransition, useWideCardNavigation, SCREEN_REVEAL_AFTER_RESIZE_MS, SCREEN_REVEAL_DIRECT_MS } from '@/hooks/useFooterPageTransition';
import { getProfileStats, importProfileHistory, PROFILE_CHANGE_EVENT, PROFILE_STORAGE_KEY } from '@/lib/profile';
import { cleanPlayerName, readStoredPlayerName, storePlayerName, validatePlayerName } from '@/components/ui/PlayerNameField';

const EMPTY = '';
function readSnapshot() {
  try { return window.localStorage.getItem(PROFILE_STORAGE_KEY) || EMPTY; }
  catch { return EMPTY; }
}
function subscribe(callback) {
  const onStorage = event => { if (!event.key || event.key === PROFILE_STORAGE_KEY || event.key === 'huestima-player-name') callback(); };
  window.addEventListener(PROFILE_CHANGE_EVENT, callback);
  window.addEventListener('storage', onStorage);
  return () => { window.removeEventListener(PROFILE_CHANGE_EVENT, callback); window.removeEventListener('storage', onStorage); };
}
function formatTime(ms, t) {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return seconds + ' ' + t('profile.seconds');
  const minutes = Math.floor(seconds / 60);
  return minutes < 60 ? minutes + ' ' + t('profile.minutes') : Math.floor(minutes / 60) + ' ' + t('profile.hours') + ' ' + minutes % 60 + ' ' + t('profile.minutes');
}
function getLevelProgress(value) {
  const safeValue = Math.max(0, Number.isFinite(value) ? value : 0);
  const levelIndex = Math.floor((Math.sqrt(1 + (4 * safeValue) / 5) - 1) / 2);
  const levelStart = 5 * levelIndex * (levelIndex + 1);
  const nextThreshold = 5 * (levelIndex + 1) * (levelIndex + 2);
  const segmentSize = nextThreshold - levelStart;
  const current = safeValue - levelStart;
  return {
    level: levelIndex + 1,
    start: levelStart,
    total: safeValue,
    threshold: nextThreshold,
    percent: Math.min(1, Math.max(0, current / segmentSize)),
  };
}
function Metric({ label, description, value, unit, text = false, icon: Icon, accent, chartValue, timeChart, progress, t, number }) {
  const circumference = 2 * Math.PI * 29;
  const timeRings = [
    { key: 'hours', radius: 30, value: timeChart?.progress, color: '#7790ff' },
    { key: 'minutes', radius: 22, value: timeChart?.minutes / 60, color: '#48d6bd' },
    { key: 'seconds', radius: 14, value: timeChart?.seconds / 60, color: '#ffc35d' },
  ];
  return (
    <div className={`profile-metric profile-metric--${accent}`}>
      <div className="profile-metric-top">
        <div className="profile-metric-heading">
          <dt>{label}</dt>
          <span className="profile-metric-icon"><Icon aria-hidden="true" /></span>
        </div>
        <p className="profile-metric-description">{description}</p>
      </div>
      <div className="profile-metric-bottom">
        <div className={chartValue === undefined && !timeChart ? 'profile-metric-content' : 'profile-metric-content profile-metric-content--chart'}>
          {timeChart ? (
            <dd className="profile-time-value" title={String(value)}>
              <span>{timeChart.hours} {t('profile.hours')}</span><span>{timeChart.minutes} {t('profile.minutes')}</span><span>{timeChart.seconds} {t('profile.seconds')}</span>
            </dd>
          ) : (
            <dd className={text ? 'profile-value profile-value--text' : 'profile-value'} title={String(value)}>
              {value}{unit && <span className="profile-unit">{unit}</span>}
            </dd>
          )}
          {chartValue !== undefined && (
            <svg className="profile-score-chart" viewBox="0 0 72 72" aria-label={chartValue === null ? label : `${label}: ${Math.round(chartValue * 100)}%`} role="img">
              <circle className="profile-score-track" cx="36" cy="36" r="29" />
              {chartValue !== null && <circle className="profile-score-fill" cx="36" cy="36" r="29" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - chartValue)} />}
            </svg>
          )}
          {timeChart && (
            <svg className="profile-time-chart" viewBox="0 0 72 72" role="img" aria-label={`${timeChart.hours} ${t('profile.hours')}, ${timeChart.minutes} ${t('profile.minutes')}, ${timeChart.seconds} ${t('profile.seconds')}`}>
              {timeRings.map(({ key, radius, value: fraction, color }) => {
                const ringCircumference = 2 * Math.PI * radius;
                const progressValue = Math.min(1, Math.max(0, fraction || 0));
                return (
                  <g key={key}>
                    <circle className="profile-time-chart-track" cx="36" cy="36" r={radius} strokeWidth="8" />
                    <circle
                      className="profile-time-chart-fill"
                      cx="36"
                      cy="36"
                      r={radius}
                      stroke={color}
                      strokeWidth="8"
                      strokeDasharray={ringCircumference}
                      strokeDashoffset={ringCircumference * (1 - progressValue)}
                    />
                  </g>
                );
              })}
            </svg>
          )}
        </div>
        {progress && !timeChart && (
          <div className="profile-metric-progress">
            <div className="profile-progress-meta">
              <span>{t('profile.level', { level: number(progress.level) })}</span>
              <span>{number(progress.total)} / {number(progress.threshold)} {progress.unit}</span>
            </div>
            <div
              className="profile-level-track"
              role="progressbar"
              aria-label={label}
              aria-valuemin={progress.start}
              aria-valuemax={progress.threshold}
              aria-valuenow={progress.total}
            >
              <span style={{ width: `${progress.percent * 100}%` }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { locale, t } = useTranslation();
  const scopeRef = useRef(null);
  const cardRef = useRef(null);
  const [transition] = useState(consumeCardRouteTransition);
  const direct = ['large', 'download'].includes(transition?.from);
  const [expanded, setExpanded] = useState(direct);
  const height = useResponsiveCardHeight(expanded);
  useWideCardNavigation(cardRef, scopeRef, setExpanded);
  const raw = useSyncExternalStore(subscribe, readSnapshot, () => EMPTY);
  const name = useSyncExternalStore(subscribe, readStoredPlayerName, () => EMPTY);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [nameError, setNameError] = useState('');
  const stats = useMemo(() => {
    try { return getProfileStats(raw ? JSON.parse(raw) : null); }
    catch { return getProfileStats(null); }
  }, [raw]);
  const number = value => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
  const score = value => value === null || value === undefined ? '—' : number(value);
  const familyName = id => t('gameFamily.' + id);
  const startNameEdit = () => {
    setNameDraft(name || '');
    setNameError('');
    setEditingName(true);
  };
  const saveName = event => {
    event?.preventDefault();
    const error = validatePlayerName(nameDraft, t);
    if (error) {
      setNameError(error);
      return;
    }
    storePlayerName(cleanPlayerName(nameDraft));
    window.dispatchEvent(new Event(PROFILE_CHANGE_EVENT));
    setNameError('');
    setEditingName(false);
  };

  useEffect(() => { importProfileHistory(); }, []);
  useEffect(() => {
    const expandId = direct ? null : window.setTimeout(() => setExpanded(true), 40);
    const revealId = window.setTimeout(() => window.dispatchEvent(new Event(SCREEN_REVEAL_REPLAY_EVENT)), direct ? SCREEN_REVEAL_DIRECT_MS : SCREEN_REVEAL_AFTER_RESIZE_MS + 160);
    return () => { window.clearTimeout(expandId); window.clearTimeout(revealId); };
  }, [direct]);
  useScreenReveal(scopeRef, [locale], { defer: true });
  const previousLocale = useRef(locale);
  useEffect(() => {
    const changed = previousLocale.current !== locale;
    previousLocale.current = locale;
    if (changed) window.dispatchEvent(new Event(SCREEN_REVEAL_REPLAY_EVENT));
  }, [locale]);

  const favoriteMode = stats.favoriteMode
    ? familyName(stats.favoriteMode.family) + ' · ' + t('gameMode.' + stats.favoriteMode.mode)
    : '—';
  const metrics = [
    { key: 'played', value: number(stats.total), description: t('profile.descriptionPlayed'), icon: Gamepad2, accent: 'blue', progress: { ...getLevelProgress(stats.total), unit: t('profile.games') } },
    { key: 'time', value: formatTime(stats.playTimeMs, t), description: t('profile.descriptionTime'), icon: Clock3, accent: 'mint', timeChart: { hours: Math.floor(stats.playTimeMs / 3600000), minutes: Math.floor(stats.playTimeMs / 60000) % 60, seconds: Math.floor(stats.playTimeMs / 1000) % 60, progress: getLevelProgress(Math.floor(stats.playTimeMs / 60000)).percent } },
    { key: 'favoriteMode', value: favoriteMode, description: t('profile.descriptionFavoriteMode'), text: true, icon: Shapes, accent: 'pink', progress: { ...getLevelProgress(stats.favoriteMode?.count || 0), unit: t('profile.games') } },
    { key: 'bestRound', value: score(stats.bestRound), description: t('profile.descriptionBestRound'), unit: '/ 10', icon: Trophy, accent: 'gold' },
  ];

  return (
    <main className="app-gradient flex h-dvh w-full items-center justify-center overflow-hidden p-6 sm:p-8">
      <section
        ref={cardRef}
        data-intro-card-target
        data-profile-card
        data-card-size="download"
        className={'profile-card relative w-full overflow-hidden rounded-[24px] bg-black p-6 text-white shadow-[var(--app-card-shadow)] transition-[height,max-width] duration-[860ms] ease-[cubic-bezier(0.87,0,0.13,1)] sm:rounded-[26px] sm:p-8 ' + (expanded ? 'max-w-125 lg:max-w-[64rem]' : 'max-w-125')}
        style={{ height }}
      >
        <div ref={scopeRef} data-route-transition-scope className="profile-content">
          <header data-screen-reveal className="profile-heading">
            <div className="profile-identity">
              <span className="profile-avatar" aria-hidden="true">{(name || t('profile.player')).slice(0, 1).toLocaleUpperCase(locale)}</span>
              <div className="profile-identity-copy">
                {!editingName ? (
                  <div className="profile-name-line">
                    <h1 title={name || t('profile.player')}>{name || t('profile.player')}</h1>
                    <button type="button" className="profile-edit-name" onClick={startNameEdit} aria-label={t('profile.editName')} title={t('profile.editName')}>
                      <Pencil aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <form className="profile-name-form" onSubmit={saveName}>
                    <input
                      autoFocus
                      value={nameDraft}
                      maxLength={26}
                      onChange={event => { setNameDraft(event.target.value); setNameError(''); }}
                      onFocus={event => event.currentTarget.select()}
                      onKeyDown={event => { if (event.key === 'Escape') setEditingName(false); }}
                      aria-label={t('player.nameAria')}
                      aria-invalid={Boolean(nameError)}
                    />
                    <button type="submit" className="profile-name-action" aria-label={t('profile.saveName')} title={t('profile.saveName')}><Check aria-hidden="true" /></button>
                    <button type="button" className="profile-name-action" aria-label={t('profile.cancelName')} title={t('profile.cancelName')} onClick={() => { setEditingName(false); setNameError(''); }}><X aria-hidden="true" /></button>
                    {nameError && <span className="profile-name-error" role="alert">{nameError}</span>}
                  </form>
                )}
              </div>
            </div>
          </header>
          <section data-screen-reveal className="profile-overview" aria-label={t('profile.overview')}>
            <dl className="profile-metrics">
              {metrics.map(({ key, ...metric }) => <Metric key={key} label={t('profile.' + key)} t={t} number={number} {...metric} />)}
            </dl>
          </section>
        </div>
      </section>
    </main>
  );
}
