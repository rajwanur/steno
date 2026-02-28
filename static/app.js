const el = (id) => document.getElementById(id);
const THEME_STORAGE_KEY = "ui-theme-preference";
const SUMMARY_RENDER_MODE_STORAGE_KEY = "summary-render-mode-preference";
const SPEAKER_NAME_OVERRIDES_STORAGE_KEY = "speaker-name-overrides-v1";
const systemThemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
const DEFAULT_SUMMARY_PROMPT_TEMPLATES = {
  short: "Give a concise 3-5 sentence summary.",
  detailed:
    "Provide a detailed structured summary with key context and decisions.",
  bullet: "Provide a bullet-point summary of key points.",
  action_items:
    "Extract clear action items with owners if mentioned and deadlines if present.",
};

const state = {
  currentTab: "history",
  previewMode: "text",
  summaryRenderMode: "text",
  settingsTab: "general",
  recording: false,
  recordingTime: 0,
  recordingTimer: null,
  activeJobId: null,
  pollTimer: null,
  jobs: [],
  audioUrl: null,
  deleteCandidateId: null,
  globalSettings: null,
  summaryPromptTemplates: { ...DEFAULT_SUMMARY_PROMPT_TEMPLATES },
  currentSummaryText: "",
  speakerNameOverridesByJob: {},
  speakerNameDraftByJob: {},
  activeJobData: null,
  activeJobResolvedTranscript: "",
};

const refs = {
  openSettingsBtn: el("openSettingsBtn"),
  settingsModal: el("settingsModal"),
  settingsBackdrop: el("settingsBackdrop"),
  closeSettingsBtnTop: el("closeSettingsBtnTop"),
  closeSettingsBtnBottom: el("closeSettingsBtnBottom"),
  saveSettingsBtn: el("saveSettingsBtn"),
  settingsDefaultModel: el("settingsDefaultModel"),
  settingsDefaultLanguage: el("settingsDefaultLanguage"),
  settingsDefaultBatchSize: el("settingsDefaultBatchSize"),
  settingsDefaultDevice: el("settingsDefaultDevice"),
  settingsComputeType: el("settingsComputeType"),
  settingsAppHost: el("settingsAppHost"),
  settingsAppPort: el("settingsAppPort"),
  settingsAppReload: el("settingsAppReload"),
  settingsLlmApiBase: el("settingsLlmApiBase"),
  settingsLlmApiKey: el("settingsLlmApiKey"),
  settingsLlmModel: el("settingsLlmModel"),
  settingsRetainSourceFiles: el("settingsRetainSourceFiles"),
  settingsRetainProcessedAudio: el("settingsRetainProcessedAudio"),
  settingsRetainExportFiles: el("settingsRetainExportFiles"),
  settingsHfToken: el("settingsHfToken"),
  aboutName: el("aboutName"),
  aboutDescription: el("aboutDescription"),
  aboutVersion: el("aboutVersion"),
  aboutLicense: el("aboutLicense"),
  aboutTechnologies: el("aboutTechnologies"),
  toggleTranscriptionSettings: el("toggleTranscriptionSettings"),
  toggleSpeakerNamesBtn: el("toggleSpeakerNamesBtn"),
  speakerNamePanel: el("speakerNamePanel"),
  transcriptionSettingsPanel: el("transcriptionSettingsPanel"),
  applyTranscriptionSettingsBtn: el("applyTranscriptionSettingsBtn"),
  tabHistory: el("tabHistory"),
  tabQueue: el("tabQueue"),
  sidebarContent: el("sidebarContent"),
  completedCount: el("completedCount"),
  queueCount: el("queueCount"),
  uploadBtn: el("uploadBtn"),
  fileInput: el("fileInput"),
  audioPreview: el("audioPreview"),
  recordBtn: el("recordBtn"),
  recordIcon: el("recordIcon"),
  recordingTime: el("recordingTime"),
  language: el("language"),
  model_name: el("model_name"),
  device: el("device"),
  compute_type: el("compute_type"),
  batch_size: el("batch_size"),
  diarization: el("diarization"),
  summary_enabled: el("summary_enabled"),
  summary_style: el("summary_style"),
  formatList: el("format-list"),
  startProcessBtn: el("startProcessBtn"),
  exportBtn: el("exportBtn"),
  exportMenu: el("exportMenu"),
  exportFormat: el("exportFormat"),
  confirmExportBtn: el("confirmExportBtn"),
  progressBar: el("progressBar"),
  statusText: el("statusText"),
  errorText: el("errorText"),
  transcriptionOutput: el("transcriptionOutput"),
  speakerLegendList: el("speakerLegendList"),
  clearSpeakerNamesBtn: el("clearSpeakerNamesBtn"),
  applySpeakerNamesBtn: el("applySpeakerNamesBtn"),
  speakerNamesStatus: el("speakerNamesStatus"),
  previewTextBtn: el("previewTextBtn"),
  previewTimestampsBtn: el("previewTimestampsBtn"),
  previewContent: el("previewContent"),
  copyTranscriptionBtn: el("copyTranscriptionBtn"),
  summaryType: el("summaryType"),
  summaryRenderTextBtn: el("summaryRenderTextBtn"),
  summaryRenderMarkdownBtn: el("summaryRenderMarkdownBtn"),
  summaryPromptPreview: el("summaryPromptPreview"),
  openPromptEditorBtn: el("openPromptEditorBtn"),
  generateSummaryBtn: el("generateSummaryBtn"),
  regenerateSummaryBtn: el("regenerateSummaryBtn"),
  downloadSummaryBtn: el("downloadSummaryBtn"),
  copySummaryBtn: el("copySummaryBtn"),
  summaryOutput: el("summaryOutput"),
  settingsSummaryPromptStyle: el("settingsSummaryPromptStyle"),
  settingsSummaryPromptText: el("settingsSummaryPromptText"),
  settingsSummaryPromptReset: el("settingsSummaryPromptReset"),
  settingsDeleteSummaryOptionBtn: el("settingsDeleteSummaryOptionBtn"),
  settingsNewSummaryOptionKey: el("settingsNewSummaryOptionKey"),
  settingsNewSummaryOptionPrompt: el("settingsNewSummaryOptionPrompt"),
  settingsAddSummaryOptionBtn: el("settingsAddSummaryOptionBtn"),
  toast: el("toast"),
  toastMessage: el("toastMessage"),
  themeMenuBtn: el("themeMenuBtn"),
  themeMenuIcon: el("themeMenuIcon"),
  themeMenu: el("themeMenu"),
  themeLightBtn: el("themeLightBtn"),
  themeDarkBtn: el("themeDarkBtn"),
  themeSystemBtn: el("themeSystemBtn"),
  deleteModal: el("deleteModal"),
  deleteBackdrop: el("deleteBackdrop"),
  deleteTargetName: el("deleteTargetName"),
  deleteConfirmInput: el("deleteConfirmInput"),
  deleteAcknowledge: el("deleteAcknowledge"),
  deleteCancelBtn: el("deleteCancelBtn"),
  deleteConfirmBtn: el("deleteConfirmBtn"),
};

function getThemeIconMarkup(preference) {
  if (preference === "light") {
    return `
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364 6.364-1.414-1.414M7.05 7.05 5.636 5.636m12.728 0-1.414 1.414M7.05 16.95l-1.414 1.414M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
    `;
  }
  if (preference === "dark") {
    return `
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        d="M21 12.79A9 9 0 1111.21 3c.1 0 .2.01.3.02A7 7 0 0018.98 12c0 .27-.02.53-.07.79A9.06 9.06 0 0021 12.79z"/>
    `;
  }
  return `
    <rect x="3" y="4" width="18" height="12" rx="2" ry="2" stroke-width="2"></rect>
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 20h8M12 16v4"></path>
  `;
}

function normalizeThemePreference(value) {
  return value === "light" || value === "dark" || value === "system"
    ? value
    : "system";
}

function getStoredThemePreference() {
  return normalizeThemePreference(localStorage.getItem(THEME_STORAGE_KEY));
}

function resolveTheme(preference) {
  if (preference === "system") {
    return systemThemeQuery.matches ? "dark" : "light";
  }
  return preference;
}

function setThemeMenuActive(preference) {
  const map = {
    light: refs.themeLightBtn,
    dark: refs.themeDarkBtn,
    system: refs.themeSystemBtn,
  };
  Object.entries(map).forEach(([key, node]) => {
    if (!node) return;
    const active = key === preference;
    node.classList.toggle("bg-[var(--bg-elevated)]", active);
    node.classList.toggle("text-[var(--text-primary)]", active);
    node.classList.toggle("text-[var(--text-secondary)]", !active);
  });
}

function applyThemePreference(preference, persist = true) {
  const normalized = normalizeThemePreference(preference);
  const resolved = resolveTheme(normalized);
  document.documentElement.setAttribute("data-theme", resolved);
  refs.themeMenuIcon.innerHTML = getThemeIconMarkup(normalized);
  setThemeMenuActive(normalized);
  if (persist) {
    localStorage.setItem(THEME_STORAGE_KEY, normalized);
  }
}

function showToast(message) {
  refs.toastMessage.textContent = message;
  refs.toast.classList.remove("hidden");
  setTimeout(() => refs.toast.classList.add("hidden"), 2200);
}

function setError(message = "") {
  refs.errorText.textContent = message;
}

function statusClass(status) {
  return "bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)]";
}

function statusDotColor(status) {
  if (status === "completed") return "var(--success)";
  if (status === "processing") return "var(--warning)";
  if (status === "queued") return "var(--info)";
  return "var(--error)";
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function formatEvents(job) {
  const events = job?.events || [];
  if (!events.length) {
    return '<div class="text-[var(--text-muted)] italic">No preview logs yet.</div>';
  }
  return events
    .slice()
    .reverse()
    .map(
      (entry) =>
        `<div class="p-2 bg-[var(--bg-card)] rounded-lg"><div class="text-[var(--text-secondary)]">${escapeHtml(entry)}</div></div>`,
    )
    .join("");
}

function getStoredSpeakerNameOverrides() {
  const raw = localStorage.getItem(SPEAKER_NAME_OVERRIDES_STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

function persistSpeakerNameOverrides() {
  localStorage.setItem(
    SPEAKER_NAME_OVERRIDES_STORAGE_KEY,
    JSON.stringify(state.speakerNameOverridesByJob || {}),
  );
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttr(str) {
  return escapeHtml(str)
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function applyInlineMarkdown(text) {
  return text
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function renderMarkdownSummary(markdownText) {
  const escaped = escapeHtml(markdownText || "").replace(/\r\n/g, "\n");
  const lines = escaped.split("\n");
  const blocks = [];
  let inCode = false;
  let codeBuffer = [];
  let listBuffer = [];

  const flushList = () => {
    if (!listBuffer.length) return;
    blocks.push(`<ul class="list-disc pl-5 space-y-1">${listBuffer.join("")}</ul>`);
    listBuffer = [];
  };

  const flushCode = () => {
    if (!codeBuffer.length) return;
    blocks.push(
      `<pre class="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg p-3 overflow-x-auto"><code>${codeBuffer.join("\n")}</code></pre>`,
    );
    codeBuffer = [];
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      if (inCode) {
        inCode = false;
        flushCode();
      } else {
        flushList();
        inCode = true;
      }
      return;
    }

    if (inCode) {
      codeBuffer.push(line);
      return;
    }

    if (!trimmed) {
      flushList();
      return;
    }

    const listMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (listMatch) {
      listBuffer.push(`<li>${applyInlineMarkdown(listMatch[1])}</li>`);
      return;
    }

    flushList();

    if (trimmed.startsWith("### ")) {
      blocks.push(`<h3 class="font-semibold text-sm">${applyInlineMarkdown(trimmed.slice(4))}</h3>`);
      return;
    }
    if (trimmed.startsWith("## ")) {
      blocks.push(`<h2 class="font-semibold text-base">${applyInlineMarkdown(trimmed.slice(3))}</h2>`);
      return;
    }
    if (trimmed.startsWith("# ")) {
      blocks.push(`<h1 class="font-semibold text-lg">${applyInlineMarkdown(trimmed.slice(2))}</h1>`);
      return;
    }

    blocks.push(`<p>${applyInlineMarkdown(trimmed)}</p>`);
  });

  flushList();
  if (inCode) flushCode();

  return blocks.join("");
}

function setSummaryRenderMode(mode) {
  state.summaryRenderMode = mode === "markdown" ? "markdown" : "text";
  localStorage.setItem(SUMMARY_RENDER_MODE_STORAGE_KEY, state.summaryRenderMode);
  if (refs.summaryRenderTextBtn && refs.summaryRenderMarkdownBtn) {
    const textActive = state.summaryRenderMode === "text";
    refs.summaryRenderTextBtn.classList.toggle("bg-[var(--bg-card)]", textActive);
    refs.summaryRenderTextBtn.classList.toggle("text-[var(--text-primary)]", textActive);
    refs.summaryRenderTextBtn.classList.toggle("text-[var(--text-muted)]", !textActive);
    refs.summaryRenderMarkdownBtn.classList.toggle(
      "bg-[var(--bg-card)]",
      !textActive,
    );
    refs.summaryRenderMarkdownBtn.classList.toggle(
      "text-[var(--text-primary)]",
      !textActive,
    );
    refs.summaryRenderMarkdownBtn.classList.toggle(
      "text-[var(--text-muted)]",
      textActive,
    );
  }
  renderSummary(state.currentSummaryText || "");
}

function getStoredSummaryRenderMode() {
  const value = localStorage.getItem(SUMMARY_RENDER_MODE_STORAGE_KEY);
  return value === "markdown" ? "markdown" : "text";
}

function formatTranscript(transcript) {
  const src = transcript || "";
  if (!src.trim()) {
    return '<span class="text-[var(--text-muted)] italic">Your transcription will appear here. Start recording or upload an audio file to begin.</span>';
  }
  return escapeHtml(src)
    .replace(
      /\[(\d{2}:\d{2}(?::\d{2})?)\]/g,
      '<span class="text-[var(--accent)] font-mono text-xs">[$1]</span>',
    )
    .replace(
      /Speaker\s+(\d+):/g,
      '<span class="text-[var(--info)] font-medium">Speaker $1:</span>',
    );
}

function formatClock(seconds) {
  const safe = Number.isFinite(Number(seconds))
    ? Math.max(0, Number(seconds))
    : 0;
  const total = Math.floor(safe);
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function transcriptFromSegments(segments) {
  if (!Array.isArray(segments) || !segments.length) return "";
  return segments
    .map((seg) => (seg && typeof seg.text === "string" ? seg.text.trim() : ""))
    .filter(Boolean)
    .join(" ")
    .trim();
}

function speakersFromSegments(segments) {
  if (!Array.isArray(segments) || !segments.length) return [];
  const unique = new Set();
  segments.forEach((seg) => {
    const speaker =
      typeof seg?.speaker === "string" && seg.speaker.trim()
        ? seg.speaker.trim()
        : "";
    if (speaker) unique.add(speaker);
  });
  return [...unique];
}

function getJobSpeakerOverrides(jobId) {
  const key = jobId ? String(jobId) : "";
  const overrides = key ? state.speakerNameOverridesByJob[key] : null;
  return overrides && typeof overrides === "object" ? overrides : {};
}

function getDisplaySpeakerName(jobId, rawSpeaker) {
  const safeRaw = typeof rawSpeaker === "string" ? rawSpeaker.trim() : "";
  if (!safeRaw) return "";
  const overrides = getJobSpeakerOverrides(jobId);
  const custom =
    typeof overrides[safeRaw] === "string" ? overrides[safeRaw].trim() : "";
  return custom || safeRaw;
}

function hashString(str) {
  const input = String(str || "");
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function speakerBadgeStyle(speaker) {
  const palette = [
    [59, 130, 246],
    [16, 185, 129],
    [245, 158, 11],
    [236, 72, 153],
    [139, 92, 246],
    [14, 165, 233],
    [249, 115, 22],
    [132, 204, 22],
  ];
  const [r, g, b] = palette[hashString(speaker) % palette.length];
  return `background-color: rgba(${r}, ${g}, ${b}, 0.16); border-color: rgba(${r}, ${g}, ${b}, 0.5); color: rgb(${r}, ${g}, ${b});`;
}

function hasTranscriptAvailable(job, resolvedTranscript = "") {
  const segments = Array.isArray(job?.result?.segments) ? job.result.segments : [];
  if (segments.length) return true;
  return !!String(resolvedTranscript || "").trim();
}

function setSpeakerNameControlsState(enabled, statusText = "") {
  if (refs.toggleSpeakerNamesBtn) {
    refs.toggleSpeakerNamesBtn.disabled = !enabled;
  }
  if (!enabled && refs.speakerNamePanel) {
    refs.speakerNamePanel.classList.add("hidden");
  }
  if (refs.applySpeakerNamesBtn) {
    refs.applySpeakerNamesBtn.disabled = !enabled;
  }
  if (refs.clearSpeakerNamesBtn) {
    refs.clearSpeakerNamesBtn.disabled = !enabled;
  }
  if (refs.speakerNamesStatus) {
    refs.speakerNamesStatus.textContent = statusText;
  }
}

function renderSpeakerLegend(job) {
  if (!refs.speakerLegendList) return;
  const segments = Array.isArray(job?.result?.segments) ? job.result.segments : [];
  const speakers = speakersFromSegments(segments);
  const transcriptionAvailable = hasTranscriptAvailable(
    job,
    state.activeJobResolvedTranscript,
  );

  if (!job?.id || !transcriptionAvailable) {
    setSpeakerNameControlsState(false, "Speaker names can be edited after transcription is available.");
    refs.speakerLegendList.innerHTML = "";
    return;
  }

  if (!speakers.length) {
    setSpeakerNameControlsState(
      false,
      "No diarized speakers found for this transcription.",
    );
    refs.speakerLegendList.innerHTML = "";
    return;
  }

  setSpeakerNameControlsState(true, "Edit names, then click Save & Apply.");
  const jobKey = String(job.id);
  const overrides = getJobSpeakerOverrides(job.id);
  if (!state.speakerNameDraftByJob[jobKey]) {
    state.speakerNameDraftByJob[jobKey] = { ...overrides };
  }
  const draft = state.speakerNameDraftByJob[jobKey];
  refs.speakerLegendList.innerHTML = speakers
    .map((speaker) => {
      const encodedSpeaker = encodeURIComponent(speaker);
      const value =
        typeof draft[speaker] === "string"
          ? escapeAttr(draft[speaker])
          : typeof overrides[speaker] === "string"
            ? escapeAttr(overrides[speaker])
            : "";
      return `<div class="flex items-center gap-2">
        <span class="text-[10px] px-2 py-0.5 rounded border font-medium" style="${speakerBadgeStyle(
          speaker,
        )}">${escapeHtml(speaker)}</span>
        <input
          data-speaker-key="${encodedSpeaker}"
          type="text"
          value="${value}"
          placeholder="Custom name"
          class="flex-1 min-w-0 text-xs bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-md px-2 py-1 text-[var(--text-primary)] focus-ring"
        />
      </div>`;
    })
    .join("");
}

async function resolveTranscript(job) {
  const direct = (job?.result?.transcript || "").trim();
  if (direct) return direct;

  const textField = (job?.result?.text || "").trim();
  if (textField) return textField;

  const fromSegments = transcriptFromSegments(job?.result?.segments);
  if (fromSegments) return fromSegments;

  const hasTxt =
    job?.result?.generated_files &&
    Object.prototype.hasOwnProperty.call(job.result.generated_files, "txt");
  if (!hasTxt || !job?.id) return "";

  try {
    const res = await fetch(`/api/jobs/${job.id}/output/txt`);
    if (!res.ok) return "";
    return (await res.text()).trim();
  } catch {
    return "";
  }
}

function renderSegmentedTranscript(job, fallbackText) {
  const segments = Array.isArray(job?.result?.segments)
    ? job.result.segments
    : [];
  const mode = state.previewMode === "timestamps" ? "timestamps" : "text";
  if (!segments.length) {
    if (!fallbackText.trim()) {
      return '<div class="text-[var(--text-muted)] italic">Transcript unavailable for this job.</div>';
    }
    if (mode === "timestamps") {
      return `<div class="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg px-2 py-1.5 text-xs text-[var(--text-secondary)] whitespace-pre-wrap">${formatTranscript(
        fallbackText,
      )}</div>`;
    }
    return `<div class="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg px-2 py-1.5 text-sm text-[var(--text-secondary)] whitespace-pre-wrap">${escapeHtml(fallbackText)}</div>`;
  }

  if (mode === "text") {
    return segments
      .map((seg) => {
        const rawSpeaker =
          typeof seg?.speaker === "string" && seg.speaker.trim()
            ? seg.speaker.trim()
            : "";
        const speaker = getDisplaySpeakerName(job?.id, rawSpeaker);
        const text = typeof seg?.text === "string" ? seg.text.trim() : "";
        return `<div class="m-2">${
          speaker
            ? `<span class="text-[10px] mr-1 px-1.5 py-0.5 rounded border font-medium" style="${speakerBadgeStyle(
                rawSpeaker,
              )}">${escapeHtml(speaker)}</span>`
            : ""
        }<span>${escapeHtml(text || "(no text)")}</span></div>`;
      })
      .join("");
  }

  return segments
    .map((seg) => {
      const start = formatClock(seg?.start);
      const end = formatClock(seg?.end);
      const rawSpeaker =
        typeof seg?.speaker === "string" && seg.speaker.trim()
          ? seg.speaker.trim()
          : "";
      const speaker = getDisplaySpeakerName(job?.id, rawSpeaker);
      const text = typeof seg?.text === "string" ? seg.text.trim() : "";
      return `<div class="m-2"><span class="text-[10px] font-mono text-[var(--accent)]">${start}-${end}</span>${
        speaker
          ? `<span class="text-[10px] ml-1 px-1.5 py-0.5 rounded border font-medium" style="${speakerBadgeStyle(
              rawSpeaker,
            )}">${escapeHtml(speaker)}</span>`
          : ""
      }<span class="ml-1">${escapeHtml(text || "(no text)")}</span></div>`;
    })
    .join("");
}

function renderTranscriptionOutput(job, resolvedTranscript) {
  state.activeJobData = job || null;
  state.activeJobResolvedTranscript = resolvedTranscript || "";
  refs.transcriptionOutput.innerHTML = renderSegmentedTranscript(
    job,
    state.activeJobResolvedTranscript,
  );
  renderSpeakerLegend(job);
}

function toggleSettings(show) {
  refs.settingsModal.classList.toggle("hidden", !show);
  document.body.style.overflow = show ? "hidden" : "";
  if (show) {
    setSettingsTab(state.settingsTab || "general");
  }
}

function setSettingsTab(tabName) {
  const buttons = refs.settingsModal.querySelectorAll("[data-settings-tab-btn]");
  const panels = refs.settingsModal.querySelectorAll("[data-settings-tab-panel]");
  const requested = (tabName || "").trim();
  const exists = [...panels].some(
    (node) => node.getAttribute("data-settings-tab-panel") === requested,
  );
  const activeTab = exists ? requested : "general";
  state.settingsTab = activeTab;

  panels.forEach((panel) => {
    const isActive = panel.getAttribute("data-settings-tab-panel") === activeTab;
    panel.classList.toggle("hidden", !isActive);
  });

  buttons.forEach((btn) => {
    const isActive = btn.getAttribute("data-settings-tab-btn") === activeTab;
    btn.classList.toggle("bg-[var(--bg-elevated)]", isActive);
    btn.classList.toggle("text-[var(--text-primary)]", isActive);
    btn.classList.toggle("text-[var(--text-secondary)]", !isActive);
  });
}

function canDeleteJob(job) {
  return ["completed", "failed", "cancelled"].includes(job?.status);
}

function currentDeleteJob() {
  return state.jobs.find((j) => j.id === state.deleteCandidateId) || null;
}

function updateDeleteConfirmState() {
  const job = currentDeleteJob();
  if (!job) {
    refs.deleteConfirmBtn.disabled = true;
    return;
  }
  const typed = (refs.deleteConfirmInput.value || "").trim();
  const acknowledged = !!refs.deleteAcknowledge.checked;
  refs.deleteConfirmBtn.disabled = !(acknowledged && typed === job.filename);
}

function toggleDeleteModal(show, job = null) {
  refs.deleteModal.classList.toggle("hidden", !show);
  if (!show) {
    state.deleteCandidateId = null;
    refs.deleteTargetName.textContent = "";
    refs.deleteConfirmInput.value = "";
    refs.deleteAcknowledge.checked = false;
    refs.deleteConfirmBtn.disabled = true;
    return;
  }

  state.deleteCandidateId = job?.id || null;
  refs.deleteTargetName.textContent = job?.filename || "";
  refs.deleteConfirmInput.value = "";
  refs.deleteAcknowledge.checked = false;
  refs.deleteConfirmBtn.disabled = true;
}

function toggleAdvancedPanel(force) {
  const show =
    typeof force === "boolean"
      ? force
      : refs.transcriptionSettingsPanel.classList.contains("hidden");
  refs.transcriptionSettingsPanel.classList.toggle("hidden", !show);
}

function setSelectOptions(node, values, selectedValue) {
  if (!node) return;
  node.innerHTML = "";
  values.forEach((value) => {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = value;
    if (value === selectedValue) opt.selected = true;
    node.appendChild(opt);
  });
}

function syncSummaryStyleAvailability() {
  if (!refs.summary_enabled || !refs.summary_style) return;
  const enabled = !!refs.summary_enabled.checked;
  refs.summary_style.disabled = !enabled;
  refs.summary_style.classList.toggle("opacity-50", !enabled);
  refs.summary_style.classList.toggle("cursor-not-allowed", !enabled);
}

function normalizeSummaryStyleKey(value) {
  const cleaned = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned;
}

function summaryStyleLabel(styleKey) {
  return String(styleKey || "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function listSummaryStyles() {
  return Object.keys(state.summaryPromptTemplates || {});
}

function isDefaultSummaryStyle(styleKey) {
  return Object.prototype.hasOwnProperty.call(
    DEFAULT_SUMMARY_PROMPT_TEMPLATES,
    styleKey,
  );
}

function syncSummaryOptionActionsState() {
  if (!refs.settingsDeleteSummaryOptionBtn || !refs.settingsSummaryPromptStyle) return;
  const style = normalizeSummaryStyleKey(refs.settingsSummaryPromptStyle.value || "");
  const canDelete = !!style && !isDefaultSummaryStyle(style);
  refs.settingsDeleteSummaryOptionBtn.disabled = !canDelete;
}

function normalizeSummaryPromptTemplates(templates) {
  const normalized = { ...DEFAULT_SUMMARY_PROMPT_TEMPLATES };
  if (!templates || typeof templates !== "object") return normalized;

  Object.entries(templates).forEach(([style, prompt]) => {
    const normalizedStyle = normalizeSummaryStyleKey(style);
    if (!normalizedStyle || typeof prompt !== "string") return;
    const cleaned = prompt.trim();
    if (cleaned) normalized[normalizedStyle] = cleaned;
  });
  return normalized;
}

function getPromptTemplate(style) {
  const normalizedStyle = normalizeSummaryStyleKey(style);
  const safeStyle =
    (normalizedStyle && state.summaryPromptTemplates[normalizedStyle] && normalizedStyle) ||
    "short";
  return (
    state.summaryPromptTemplates[safeStyle] ||
    DEFAULT_SUMMARY_PROMPT_TEMPLATES[safeStyle]
  );
}

function repopulateSummaryStyleSelect(node, selectedStyle) {
  if (!node) return;
  const styles = listSummaryStyles();
  node.innerHTML = "";
  styles.forEach((style) => {
    const opt = document.createElement("option");
    opt.value = style;
    opt.textContent = summaryStyleLabel(style);
    if (style === selectedStyle) opt.selected = true;
    node.appendChild(opt);
  });
}

function syncSummaryStyleSelectors(preferredStyle = "short") {
  const styles = listSummaryStyles();
  if (!styles.length) return;
  const normalizedPreferred = normalizeSummaryStyleKey(preferredStyle);
  const selectedStyle = styles.includes(normalizedPreferred)
    ? normalizedPreferred
    : styles[0];
  repopulateSummaryStyleSelect(refs.summaryType, selectedStyle);
  repopulateSummaryStyleSelect(refs.summary_style, selectedStyle);
  repopulateSummaryStyleSelect(refs.settingsSummaryPromptStyle, selectedStyle);
  syncSummaryOptionActionsState();
}

function syncSummaryPromptEditor() {
  if (!refs.settingsSummaryPromptStyle || !refs.settingsSummaryPromptText) return;
  const style = refs.settingsSummaryPromptStyle.value || listSummaryStyles()[0] || "short";
  refs.settingsSummaryPromptText.value = getPromptTemplate(style);
  syncSummaryOptionActionsState();
}

function syncSummaryPromptPreview() {
  if (!refs.summaryPromptPreview || !refs.summaryType) return;
  const style = refs.summaryType.value || listSummaryStyles()[0] || "short";
  refs.summaryPromptPreview.value = getPromptTemplate(style);
}

function addSummaryOption() {
  const rawKey = refs.settingsNewSummaryOptionKey?.value || "";
  const rawPrompt = refs.settingsNewSummaryOptionPrompt?.value || "";
  const styleKey = normalizeSummaryStyleKey(rawKey);
  const prompt = rawPrompt.trim();

  if (!styleKey) {
    setError("Provide a valid summary option key (letters, numbers, underscore).");
    return;
  }
  if (!prompt) {
    setError("Provide a template prompt for the new summary option.");
    return;
  }
  if (state.summaryPromptTemplates[styleKey]) {
    setError(`Summary option '${styleKey}' already exists.`);
    return;
  }

  state.summaryPromptTemplates[styleKey] = prompt;
  syncSummaryStyleSelectors(styleKey);
  syncSummaryPromptEditor();
  syncSummaryPromptPreview();

  if (refs.settingsNewSummaryOptionKey) refs.settingsNewSummaryOptionKey.value = "";
  if (refs.settingsNewSummaryOptionPrompt)
    refs.settingsNewSummaryOptionPrompt.value = "";

  setError("");
  showToast(`Added summary option: ${styleKey}`);
}

function deleteSelectedSummaryOption() {
  if (!refs.settingsSummaryPromptStyle) return;
  const style = normalizeSummaryStyleKey(refs.settingsSummaryPromptStyle.value || "");
  if (!style) return;
  if (isDefaultSummaryStyle(style)) {
    setError("Built-in summary options cannot be deleted.");
    return;
  }
  if (!state.summaryPromptTemplates[style]) return;
  const confirmed = window.confirm(
    `Delete summary option '${style}'? This change will be saved when you click Save Changes.`,
  );
  if (!confirmed) return;

  delete state.summaryPromptTemplates[style];
  const fallback = listSummaryStyles()[0] || "short";
  syncSummaryStyleSelectors(fallback);
  syncSummaryPromptEditor();
  syncSummaryPromptPreview();
  setError("");
  showToast(`Deleted summary option: ${style}`);
}

function renderAboutInfo(about) {
  if (!about) return;
  if (refs.aboutName) refs.aboutName.textContent = about.name || "Steno";
  if (refs.aboutDescription)
    refs.aboutDescription.textContent =
      about.description ||
      "WhisperX-powered transcription and summary workspace.";
  if (refs.aboutVersion)
    refs.aboutVersion.textContent = about.version || "0.1.0";
  if (refs.aboutLicense) refs.aboutLicense.textContent = about.license || "MIT";
  if (refs.aboutTechnologies) {
    refs.aboutTechnologies.innerHTML = "";
    const technologies = Array.isArray(about.technologies)
      ? about.technologies
      : [];
    technologies.forEach((tech) => {
      const chip = document.createElement("span");
      chip.className =
        "text-xs px-2 py-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)]";
      chip.textContent = tech;
      refs.aboutTechnologies.appendChild(chip);
    });
  }
}

function syncLanguageDefaultOptions(selectedValue) {
  if (!refs.settingsDefaultLanguage || !refs.language) return;
  refs.settingsDefaultLanguage.innerHTML = "";
  [...refs.language.options].forEach((opt) => {
    const copy = document.createElement("option");
    copy.value = opt.value;
    copy.textContent = opt.textContent;
    if (opt.value === selectedValue) copy.selected = true;
    refs.settingsDefaultLanguage.appendChild(copy);
  });
}

function applyGlobalSettings(settings) {
  if (!settings) return;
  state.globalSettings = settings;
  state.summaryPromptTemplates = normalizeSummaryPromptTemplates(
    settings.summary_prompt_templates,
  );

  if (refs.settingsDefaultModel)
    refs.settingsDefaultModel.value = settings.default_model || "";
  syncLanguageDefaultOptions(
    settings.default_language || refs.language.value || "en",
  );
  if (refs.settingsDefaultBatchSize)
    refs.settingsDefaultBatchSize.value = settings.default_batch_size ?? 16;
  if (refs.settingsDefaultDevice)
    refs.settingsDefaultDevice.value = settings.default_device || "auto";
  if (refs.settingsComputeType)
    refs.settingsComputeType.value = settings.compute_type || "float32";
  if (refs.settingsLlmApiBase)
    refs.settingsLlmApiBase.value = settings.llm_api_base || "";
  if (refs.settingsLlmApiKey)
    refs.settingsLlmApiKey.value = settings.llm_api_key || "";
  if (refs.settingsLlmModel)
    refs.settingsLlmModel.value = settings.llm_model || "";
  if (refs.settingsRetainSourceFiles)
    refs.settingsRetainSourceFiles.checked =
      settings.retain_source_files !== false;
  if (refs.settingsRetainProcessedAudio)
    refs.settingsRetainProcessedAudio.checked =
      settings.retain_processed_audio !== false;
  if (refs.settingsRetainExportFiles)
    refs.settingsRetainExportFiles.checked =
      settings.retain_export_files !== false;
  if (refs.settingsHfToken)
    refs.settingsHfToken.value = settings.hf_token || "";
  if (refs.settingsAppHost)
    refs.settingsAppHost.value = settings.app_host || "0.0.0.0";
  if (refs.settingsAppPort)
    refs.settingsAppPort.value = settings.app_port ?? 8000;
  if (refs.settingsAppReload)
    refs.settingsAppReload.checked = !!settings.app_reload;

  refs.model_name.value = settings.default_model || refs.model_name.value;
  refs.language.value = settings.default_language || refs.language.value;
  refs.batch_size.value = settings.default_batch_size ?? refs.batch_size.value;
  refs.device.value = settings.default_device || refs.device.value;
  refs.compute_type.value = settings.compute_type || refs.compute_type.value;

  syncSummaryStyleSelectors(refs.summaryType?.value || "short");
  syncSummaryPromptEditor();
  syncSummaryPromptPreview();
}

function buildGlobalSettingsPayload() {
  return {
    default_model: refs.settingsDefaultModel.value || "small",
    default_language: refs.settingsDefaultLanguage.value || "en",
    default_batch_size: Number(refs.settingsDefaultBatchSize.value || "16"),
    default_device: refs.settingsDefaultDevice.value || "auto",
    compute_type: refs.settingsComputeType.value || "float32",
    llm_api_base: (refs.settingsLlmApiBase.value || "").trim() || null,
    llm_api_key: (refs.settingsLlmApiKey.value || "").trim() || null,
    llm_model: (refs.settingsLlmModel.value || "").trim() || "gpt-4o-mini",
    retain_source_files: !!refs.settingsRetainSourceFiles.checked,
    retain_processed_audio: !!refs.settingsRetainProcessedAudio.checked,
    retain_export_files: !!refs.settingsRetainExportFiles.checked,
    summary_prompt_templates: { ...state.summaryPromptTemplates },
    hf_token: (refs.settingsHfToken.value || "").trim() || null,
    app_host: (refs.settingsAppHost.value || "").trim() || "0.0.0.0",
    app_port: Number(refs.settingsAppPort.value || "8000"),
    app_reload: !!refs.settingsAppReload.checked,
  };
}

async function loadGlobalSettings() {
  const res = await fetch("/api/settings/global");
  if (!res.ok) throw new Error("Failed to load global settings");
  const body = await res.json();
  applyGlobalSettings(body);
}

function toggleRecording() {
  state.recording = !state.recording;
  const bars = document.querySelectorAll(".waveform-bar");
  if (state.recording) {
    refs.recordBtn.classList.add("recording-pulse", "bg-[var(--error)]");
    refs.recordBtn.classList.remove("bg-[var(--accent)]");
    refs.recordIcon.innerHTML =
      '<rect x="6" y="6" width="12" height="12" rx="2"/>';
    bars.forEach((b) => (b.style.animationPlayState = "running"));
    state.recordingTimer = setInterval(() => {
      state.recordingTime += 1;
      const h = String(Math.floor(state.recordingTime / 3600)).padStart(2, "0");
      const m = String(Math.floor((state.recordingTime % 3600) / 60)).padStart(
        2,
        "0",
      );
      const s = String(state.recordingTime % 60).padStart(2, "0");
      refs.recordingTime.textContent = `${h}:${m}:${s}`;
    }, 1000);
  } else {
    refs.recordBtn.classList.remove("recording-pulse", "bg-[var(--error)]");
    refs.recordBtn.classList.add("bg-[var(--accent)]");
    refs.recordIcon.innerHTML = '<circle cx="12" cy="12" r="6"/>';
    bars.forEach((b) => (b.style.animationPlayState = "paused"));
    clearInterval(state.recordingTimer);
    state.recordingTimer = null;
  }
}

async function loadConfig() {
  const res = await fetch("/api/config");
  const cfg = await res.json();
  setSelectOptions(refs.model_name, cfg.models, cfg.defaults.model);
  setSelectOptions(refs.settingsDefaultModel, cfg.models, cfg.defaults.model);
  setSelectOptions(refs.device, cfg.devices, cfg.defaults.device);
  setSelectOptions(
    refs.settingsDefaultDevice,
    cfg.devices,
    cfg.defaults.device,
  );
  syncLanguageDefaultOptions(cfg.defaults.language || "en");
  renderAboutInfo(cfg.about);

  refs.language.value = cfg.defaults.language || "en";
  refs.compute_type.value = cfg.defaults.compute_type;
  refs.batch_size.value = cfg.defaults.batch_size;

  refs.formatList.innerHTML = "";
  cfg.formats.forEach((f) => {
    const checked = ["txt", "srt", "vtt", "json"].includes(f) ? "checked" : "";
    const row = document.createElement("label");
    row.className = "flex items-center gap-2";
    row.innerHTML = `<input type="checkbox" name="output_format" value="${f}" ${checked} class="w-4 h-4">${f.toUpperCase()}`;
    refs.formatList.appendChild(row);
  });
}

function selectedFormats() {
  return [
    ...document.querySelectorAll("input[name='output_format']:checked"),
  ].map((n) => n.value);
}

async function fetchJobs() {
  const res = await fetch("/api/jobs");
  if (!res.ok) throw new Error("Failed to load jobs");
  return res.json();
}

function filteredJobs() {
  if (state.currentTab === "queue") {
    return state.jobs.filter(
      (j) => j.status === "queued" || j.status === "processing",
    );
  }
  return state.jobs;
}

function renderSidebar() {
  const jobs = filteredJobs();
  refs.sidebarContent.innerHTML = "";
  if (!jobs.length) {
    refs.sidebarContent.innerHTML = `<div class="text-xs text-[var(--text-muted)] p-2">${state.currentTab === "queue" ? "Queue is empty." : "No history yet."}</div>`;
    return;
  }

  jobs.forEach((job, index) => {
    const row = document.createElement("div");
    row.className =
      "bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-3 cursor-pointer card-hover";
    row.style.animation = `fadeSlideUp 0.3s ease-out ${index * 0.05}s forwards`;
    row.style.opacity = "0";
    const active =
      state.activeJobId === job.id ? " ring-1 ring-[var(--accent)] " : "";
    row.className += active;
    const showDelete = state.currentTab === "history" && canDeleteJob(job);
    row.innerHTML = `
      <div class="flex items-start justify-between mb-2">
        <h4 class="font-medium text-sm text-[var(--text-primary)] line-clamp-1">${escapeHtml(job.filename)}</h4>
        <div class="flex items-center gap-1">
          <span class="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${statusClass(job.status)}">
            <span class="inline-block w-1.5 h-1.5 rounded-full" style="background:${statusDotColor(job.status)}"></span>
            <span>${job.status}</span>
          </span>
          ${
            showDelete
              ? `<button data-delete-id="${job.id}" type="button" class="ml-1 w-6 h-6 inline-flex items-center justify-center rounded-md border border-[var(--border-subtle)] text-[var(--error)] hover:bg-red-50/10 hover:border-[var(--error)]" title="Delete permanently" aria-label="Delete ${escapeHtml(job.filename)}">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-7 0h8"/>
            </svg>
          </button>`
              : ""
          }
        </div>
      </div>
      <div class="flex items-center gap-3 text-xs text-[var(--text-muted)]">
        <span>${formatDate(job.updated_at)}</span>
        <span>${job.progress}%</span>
      </div>
    `;
    row.addEventListener("click", async () => {
      await selectJob(job.id);
      renderSidebar();
    });
    const deleteBtn = row.querySelector("button[data-delete-id]");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleDeleteModal(true, job);
      });
    }
    refs.sidebarContent.appendChild(row);
  });
}

function updateStats() {
  refs.completedCount.textContent = String(
    state.jobs.filter((j) => j.status === "completed").length,
  );
  refs.queueCount.textContent = String(
    state.jobs.filter((j) => j.status === "queued" || j.status === "processing")
      .length,
  );
}

function renderSummary(summaryText) {
  state.currentSummaryText = summaryText || "";
  if (!summaryText || !summaryText.trim()) {
    refs.summaryOutput.innerHTML =
      '<div class="text-[var(--text-muted)] italic text-sm">AI summary will be generated after transcription is complete.</div>';
    return;
  }
  if (state.summaryRenderMode === "markdown") {
    refs.summaryOutput.innerHTML = `<div class="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-3 text-sm text-[var(--text-secondary)] space-y-2">${renderMarkdownSummary(summaryText)}</div>`;
    return;
  }
  refs.summaryOutput.innerHTML = `<div class="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-3 text-sm text-[var(--text-secondary)] whitespace-pre-wrap">${escapeHtml(summaryText)}</div>`;
}

function refreshPreview(job) {
  refs.previewContent.innerHTML = formatEvents(job);
}

function updateExportFormats(job) {
  refs.exportFormat.innerHTML = "";
  const generated = Object.keys(
    (job.result && job.result.generated_files) || {},
  );
  generated.forEach((fmt) => {
    const o = document.createElement("option");
    o.value = fmt;
    o.textContent = fmt.toUpperCase();
    refs.exportFormat.appendChild(o);
  });
}

async function fetchJob(jobId) {
  const res = await fetch(`/api/jobs/${jobId}`);
  if (!res.ok) throw new Error("Failed to load job");
  return res.json();
}

function applyJobConfig(job) {
  if (!job.params) return;
  refs.model_name.value = job.params.model_name || refs.model_name.value;
  refs.language.value = job.params.language || refs.language.value;
  refs.batch_size.value = job.params.batch_size || refs.batch_size.value;
  refs.device.value = job.params.device || refs.device.value;
  refs.compute_type.value = job.params.compute_type || refs.compute_type.value;
  refs.diarization.checked = !!job.params.diarization;
  refs.summary_enabled.checked = !!job.params.summary_enabled;
  const requestedStyle = normalizeSummaryStyleKey(job.params.summary_style || "");
  if (requestedStyle && !state.summaryPromptTemplates[requestedStyle]) {
    state.summaryPromptTemplates[requestedStyle] = "Give a concise summary.";
    syncSummaryStyleSelectors(requestedStyle);
  }
  refs.summary_style.value = requestedStyle || refs.summary_style.value;
  syncSummaryStyleAvailability();
  refs.summaryType.value = requestedStyle || refs.summaryType.value;
  syncSummaryPromptPreview();
  const set = new Set(job.params.output_formats || []);
  document.querySelectorAll("input[name='output_format']").forEach((i) => {
    i.checked = set.has(i.value);
  });
}

async function refreshActiveJob() {
  if (!state.activeJobId) return;
  const job = await fetchJob(state.activeJobId);
  refs.progressBar.style.width = `${Math.max(0, Math.min(100, job.progress || 0))}%`;
  refs.statusText.textContent = `${job.progress || 0}% - ${job.step} (${job.status})`;
  setError(job.error || "");
  const resolvedTranscript = await resolveTranscript(job);
  renderTranscriptionOutput(job, resolvedTranscript);
  renderSummary(job.result.summary || "");
  refreshPreview(job);
  updateExportFormats(job);
  applyJobConfig(job);

  if (job.status === "processing" || job.status === "queued") return;
  clearInterval(state.pollTimer);
  state.pollTimer = null;
  await refreshJobs();
}

async function selectJob(jobId) {
  state.activeJobId = jobId;
  clearInterval(state.pollTimer);
  state.pollTimer = null;
  await refreshActiveJob();
  const j = await fetchJob(jobId);
  if (j.status === "processing" || j.status === "queued") {
    state.pollTimer = setInterval(() => {
      refreshActiveJob().catch((e) => setError(e.message));
    }, 2000);
  }
}

async function refreshJobs() {
  state.jobs = await fetchJobs();
  updateStats();
  renderSidebar();
  if (!state.activeJobId && state.jobs.length) {
    await selectJob(state.jobs[0].id);
    renderSidebar();
  }
}

async function startProcessing() {
  setError("");
  const file = refs.fileInput.files && refs.fileInput.files[0];
  if (!file) {
    setError("Select an audio/video file first.");
    return;
  }

  const fd = new FormData();
  fd.append("file", file);
  fd.append("model_name", refs.model_name.value);
  fd.append("language", refs.language.value || "en");
  fd.append("batch_size", refs.batch_size.value || "16");
  fd.append("device", refs.device.value);
  fd.append("compute_type", refs.compute_type.value);
  fd.append("diarization", refs.diarization.checked ? "true" : "false");
  fd.append("summary_enabled", refs.summary_enabled.checked ? "true" : "false");
  fd.append("summary_style", refs.summary_style.value);
  fd.append("output_formats", JSON.stringify(selectedFormats()));

  const res = await fetch("/api/jobs", { method: "POST", body: fd });
  const body = await res.json();
  if (!res.ok) {
    setError(body.detail || "Failed to start processing.");
    return;
  }

  showToast("Job queued");
  state.activeJobId = body.job_id;
  refs.transcriptionSettingsPanel.classList.add("hidden");
  await refreshJobs();
  await selectJob(state.activeJobId);
}

async function exportCurrent() {
  if (!state.activeJobId) {
    setError("Select a session first.");
    return;
  }
  const fmt = refs.exportFormat.value;
  if (!fmt) {
    setError("No export format available for selected job.");
    return;
  }

  // Get speaker name overrides for this job
  const jobKey = String(state.activeJobId);
  const overrides = state.speakerNameOverridesByJob[jobKey] || {};

  // Use the new export endpoint that accepts speaker name overrides
  const formData = new FormData();
  formData.append("speaker_name_overrides", JSON.stringify(overrides));

  const url = `/api/jobs/${state.activeJobId}/export/${fmt}`;
  
  try {
    const response = await fetch(url, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Export failed");
    }

    // Download the file
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    const baseName = state.activeJobData?.filename?.replace(/\.[^.]+$/, "") || "transcript";
    a.download = `${baseName}.${fmt}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(downloadUrl);
    refs.exportMenu.classList.add("hidden");
  } catch (e) {
    setError("Export failed: " + e.message);
  }
}

async function generateSummary() {
  if (!state.activeJobId) {
    setError("Select a session first.");
    return;
  }
  const style = refs.summaryType.value || "short";
  refs.generateSummaryBtn.disabled = true;
  refs.regenerateSummaryBtn.disabled = true;
  refs.generateSummaryBtn.textContent = "Generating...";

  try {
    const res = await fetch(`/api/jobs/${state.activeJobId}/summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ style }),
    });
    const body = await res.json();
    if (!res.ok) {
      setError(body.detail || "Summary generation failed.");
      return;
    }
    if (body?.id === state.activeJobId) {
      const resolvedTranscript = await resolveTranscript(body);
      renderTranscriptionOutput(body, resolvedTranscript);
    }
    renderSummary(body.result.summary || "");
    refreshPreview(body);
    showToast("Summary generated");
  } finally {
    refs.generateSummaryBtn.disabled = false;
    refs.regenerateSummaryBtn.disabled = false;
    refs.generateSummaryBtn.textContent = "Generate";
  }
}

async function downloadSummaryMarkdown() {
  if (!state.activeJobId) {
    setError("Select a session first.");
    return;
  }
  try {
    const check = await fetch(`/api/jobs/${state.activeJobId}/summary/export`);
    if (!check.ok) {
      const body = await check.json().catch(() => ({}));
      setError(body.detail || "Summary markdown download failed.");
      return;
    }
    window.location.href = `/api/jobs/${state.activeJobId}/summary/export`;
  } catch {
    setError("Summary markdown download failed.");
  }
}

function resetOutputPanels() {
  refs.progressBar.style.width = "0%";
  refs.statusText.textContent = "Idle";
  refs.transcriptionOutput.innerHTML =
    '<span class="text-[var(--text-muted)] italic">Your transcription will appear here. Start recording or upload an audio file to begin.</span>';
  if (refs.speakerLegendList) refs.speakerLegendList.innerHTML = "";
  if (refs.speakerNamePanel) refs.speakerNamePanel.classList.add("hidden");
  setSpeakerNameControlsState(
    false,
    "Speaker names can be edited after transcription is available.",
  );
  refs.previewContent.innerHTML =
    '<div class="text-[var(--text-muted)] italic">No preview logs yet.</div>';
  renderSummary("");
  refs.exportFormat.innerHTML = "";
  state.activeJobData = null;
  state.activeJobResolvedTranscript = "";
  state.speakerNameDraftByJob = {};
}

async function deleteSelectedHistoryItem() {
  const job = currentDeleteJob();
  if (!job) {
    setError("No job selected for deletion.");
    return;
  }
  if (!canDeleteJob(job)) {
    setError("Only completed, failed, or cancelled jobs can be deleted.");
    return;
  }

  const confirmText = refs.deleteConfirmInput.value.trim();
  const qs = new URLSearchParams({
    confirm: "true",
    confirm_text: confirmText,
  });
  const res = await fetch(`/api/jobs/${job.id}?${qs.toString()}`, {
    method: "DELETE",
  });
  const body = await res.json();
  if (!res.ok) {
    setError(body.detail || "Delete failed.");
    return;
  }

  toggleDeleteModal(false);
  showToast("History item deleted");

  if (state.activeJobId === job.id) {
    state.activeJobId = null;
    clearInterval(state.pollTimer);
    state.pollTimer = null;
    resetOutputPanels();
  }

  await refreshJobs();
}

async function copyFromNode(node, message) {
  const text = (node.textContent || "").trim();
  if (!text) return;
  await navigator.clipboard.writeText(text);
  showToast(message);
}

async function rerenderActiveTranscriptOutput() {
  if (!state.activeJobId) return;
  let job = state.activeJobData;
  if (!job || job.id !== state.activeJobId) {
    job = await fetchJob(state.activeJobId);
  }
  let resolvedTranscript = state.activeJobResolvedTranscript || "";
  if (!resolvedTranscript.trim()) {
    resolvedTranscript = await resolveTranscript(job);
  }
  renderTranscriptionOutput(job, resolvedTranscript);
}

function applySpeakerNamesForActiveJob() {
  if (!state.activeJobId || !state.activeJobData) return;
  const job = state.activeJobData;
  const segments = Array.isArray(job?.result?.segments) ? job.result.segments : [];
  const speakers = speakersFromSegments(segments);
  if (!speakers.length) return;

  const jobKey = String(state.activeJobId);
  const draft = state.speakerNameDraftByJob[jobKey] || {};
  const cleaned = {};
  speakers.forEach((speaker) => {
    const value = typeof draft[speaker] === "string" ? draft[speaker].trim() : "";
    if (value) cleaned[speaker] = value;
  });

  if (Object.keys(cleaned).length) {
    state.speakerNameOverridesByJob[jobKey] = cleaned;
  } else {
    delete state.speakerNameOverridesByJob[jobKey];
  }
  state.speakerNameDraftByJob[jobKey] = { ...cleaned };
  persistSpeakerNameOverrides();
  renderTranscriptionOutput(state.activeJobData, state.activeJobResolvedTranscript);
  if (refs.speakerNamesStatus) {
    refs.speakerNamesStatus.textContent = "Saved and applied.";
  }
  showToast("Speaker names applied");
}

async function setTranscriptPreviewMode(mode) {
  state.previewMode = mode === "timestamps" ? "timestamps" : "text";
  const textActive = state.previewMode === "text";
  refs.previewTextBtn.classList.toggle("bg-[var(--bg-card)]", textActive);
  refs.previewTextBtn.classList.toggle("text-[var(--text-primary)]", textActive);
  refs.previewTextBtn.classList.toggle("text-[var(--text-muted)]", !textActive);
  refs.previewTimestampsBtn.classList.toggle("bg-[var(--bg-card)]", !textActive);
  refs.previewTimestampsBtn.classList.toggle(
    "text-[var(--text-primary)]",
    !textActive,
  );
  refs.previewTimestampsBtn.classList.toggle("text-[var(--text-muted)]", textActive);
  await rerenderActiveTranscriptOutput();
}

function attachEvents() {
  refs.settingsModal
    .querySelectorAll("[data-settings-tab-btn]")
    .forEach((btn) => {
      btn.addEventListener("click", () => {
        const tabName = btn.getAttribute("data-settings-tab-btn") || "general";
        setSettingsTab(tabName);
      });
    });

  refs.themeMenuBtn.addEventListener("click", () =>
    refs.themeMenu.classList.toggle("hidden"),
  );
  refs.themeLightBtn.addEventListener("click", () => {
    applyThemePreference("light");
    refs.themeMenu.classList.add("hidden");
    showToast("Light mode enabled");
  });
  refs.themeDarkBtn.addEventListener("click", () => {
    applyThemePreference("dark");
    refs.themeMenu.classList.add("hidden");
    showToast("Dark mode enabled");
  });
  refs.themeSystemBtn.addEventListener("click", () => {
    applyThemePreference("system");
    refs.themeMenu.classList.add("hidden");
    showToast("System theme enabled");
  });

  refs.openSettingsBtn.addEventListener("click", () => toggleSettings(true));
  refs.settingsBackdrop.addEventListener("click", () => toggleSettings(false));
  refs.closeSettingsBtnTop.addEventListener("click", () =>
    toggleSettings(false),
  );
  refs.closeSettingsBtnBottom.addEventListener("click", () =>
    toggleSettings(false),
  );
  refs.saveSettingsBtn.addEventListener("click", async () => {
    try {
      const payload = buildGlobalSettingsPayload();
      const res = await fetch("/api/settings/global", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.detail || "Failed to save global settings.");
        return;
      }
      applyGlobalSettings(body);
      toggleSettings(false);
      showToast("Global settings saved");
    } catch (e) {
      setError(e.message || "Failed to save global settings.");
    }
  });

  refs.deleteBackdrop.addEventListener("click", () => toggleDeleteModal(false));
  refs.deleteCancelBtn.addEventListener("click", () =>
    toggleDeleteModal(false),
  );
  refs.deleteConfirmInput.addEventListener("input", updateDeleteConfirmState);
  refs.deleteAcknowledge.addEventListener("change", updateDeleteConfirmState);
  refs.deleteConfirmBtn.addEventListener("click", () =>
    deleteSelectedHistoryItem().catch((e) => setError(e.message)),
  );

  refs.toggleTranscriptionSettings.addEventListener("click", () =>
    toggleAdvancedPanel(),
  );
  if (refs.toggleSpeakerNamesBtn && refs.speakerNamePanel) {
    refs.toggleSpeakerNamesBtn.addEventListener("click", () => {
      if (refs.toggleSpeakerNamesBtn.disabled) return;
      refs.speakerNamePanel.classList.toggle("hidden");
    });
  }
  refs.applyTranscriptionSettingsBtn.addEventListener("click", () => {
    toggleAdvancedPanel(false);
    showToast("Advanced options applied");
  });
  refs.summary_enabled.addEventListener("change", syncSummaryStyleAvailability);

  if (refs.summaryType) {
    refs.summaryType.addEventListener("change", syncSummaryPromptPreview);
  }
  if (refs.summaryRenderTextBtn) {
    refs.summaryRenderTextBtn.addEventListener("click", () =>
      setSummaryRenderMode("text"),
    );
  }
  if (refs.summaryRenderMarkdownBtn) {
    refs.summaryRenderMarkdownBtn.addEventListener("click", () =>
      setSummaryRenderMode("markdown"),
    );
  }
  if (refs.settingsSummaryPromptStyle) {
    refs.settingsSummaryPromptStyle.addEventListener("change", () => {
      syncSummaryPromptEditor();
    });
  }
  if (refs.settingsSummaryPromptText && refs.settingsSummaryPromptStyle) {
    refs.settingsSummaryPromptText.addEventListener("input", () => {
      const style = normalizeSummaryStyleKey(
        refs.settingsSummaryPromptStyle.value || "",
      );
      const value = refs.settingsSummaryPromptText.value.trim();
      if (!style) return;
      state.summaryPromptTemplates[style] =
        value || DEFAULT_SUMMARY_PROMPT_TEMPLATES[style] || "Give a concise summary.";
      syncSummaryPromptPreview();
    });
  }
  if (refs.settingsSummaryPromptReset && refs.settingsSummaryPromptStyle) {
    refs.settingsSummaryPromptReset.addEventListener("click", () => {
      const style = normalizeSummaryStyleKey(
        refs.settingsSummaryPromptStyle.value || "",
      );
      if (!style) return;
      state.summaryPromptTemplates[style] =
        DEFAULT_SUMMARY_PROMPT_TEMPLATES[style] || "Give a concise summary.";
      syncSummaryPromptEditor();
      syncSummaryPromptPreview();
      showToast("Template reset for selected summary style");
    });
  }
  if (refs.settingsAddSummaryOptionBtn) {
    refs.settingsAddSummaryOptionBtn.addEventListener("click", addSummaryOption);
  }
  if (refs.settingsDeleteSummaryOptionBtn) {
    refs.settingsDeleteSummaryOptionBtn.addEventListener(
      "click",
      deleteSelectedSummaryOption,
    );
  }
  if (refs.openPromptEditorBtn && refs.settingsSummaryPromptStyle) {
    refs.openPromptEditorBtn.addEventListener("click", () => {
      toggleSettings(true);
      setSettingsTab("summary");
      const selected = normalizeSummaryStyleKey(refs.summaryType.value || "");
      syncSummaryStyleSelectors(selected || "short");
      refs.settingsSummaryPromptStyle.value =
        selected || refs.settingsSummaryPromptStyle.value;
      syncSummaryPromptEditor();
    });
  }

  refs.tabHistory.addEventListener("click", () => {
    state.currentTab = "history";
    refs.tabHistory.classList.add("tab-active", "text-[var(--text-primary)]");
    refs.tabHistory.classList.remove("text-[var(--text-muted)]");
    refs.tabQueue.classList.remove("tab-active", "text-[var(--text-primary)]");
    refs.tabQueue.classList.add("text-[var(--text-muted)]");
    renderSidebar();
  });

  refs.tabQueue.addEventListener("click", () => {
    state.currentTab = "queue";
    refs.tabQueue.classList.add("tab-active", "text-[var(--text-primary)]");
    refs.tabQueue.classList.remove("text-[var(--text-muted)]");
    refs.tabHistory.classList.remove(
      "tab-active",
      "text-[var(--text-primary)]",
    );
    refs.tabHistory.classList.add("text-[var(--text-muted)]");
    renderSidebar();
  });

  refs.uploadBtn.addEventListener("click", () => refs.fileInput.click());
  refs.fileInput.addEventListener("change", () => {
    const f = refs.fileInput.files && refs.fileInput.files[0];
    if (!f) return;
    if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
    state.audioUrl = URL.createObjectURL(f);
    refs.audioPreview.src = state.audioUrl;
    refs.audioPreview.classList.remove("hidden");
    showToast(`Selected: ${f.name}`);
  });

  refs.recordBtn.addEventListener("click", toggleRecording);
  refs.startProcessBtn.addEventListener("click", () =>
    startProcessing().catch((e) => setError(e.message)),
  );

  refs.exportBtn.addEventListener("click", () =>
    refs.exportMenu.classList.toggle("hidden"),
  );
  refs.confirmExportBtn.addEventListener("click", exportCurrent);

  refs.previewTextBtn.addEventListener("click", async () => {
    await setTranscriptPreviewMode("text");
  });

  refs.previewTimestampsBtn.addEventListener("click", async () => {
    await setTranscriptPreviewMode("timestamps");
  });

  if (refs.speakerLegendList) {
    refs.speakerLegendList.addEventListener("input", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      const speakerKey = target.getAttribute("data-speaker-key");
      if (!speakerKey || !state.activeJobId) return;
      const rawSpeaker = decodeURIComponent(speakerKey);
      const jobKey = String(state.activeJobId);
      if (!state.speakerNameDraftByJob[jobKey]) {
        state.speakerNameDraftByJob[jobKey] = {
          ...(state.speakerNameOverridesByJob[jobKey] || {}),
        };
      }
      state.speakerNameDraftByJob[jobKey][rawSpeaker] = target.value;
      if (refs.speakerNamesStatus) {
        refs.speakerNamesStatus.textContent = "Unsaved changes.";
      }
    });
  }

  if (refs.applySpeakerNamesBtn) {
    refs.applySpeakerNamesBtn.addEventListener("click", () => {
      applySpeakerNamesForActiveJob();
    });
  }

  if (refs.clearSpeakerNamesBtn) {
    refs.clearSpeakerNamesBtn.addEventListener("click", () => {
      if (!state.activeJobId) return;
      const jobKey = String(state.activeJobId);
      delete state.speakerNameOverridesByJob[jobKey];
      delete state.speakerNameDraftByJob[jobKey];
      persistSpeakerNameOverrides();
      renderTranscriptionOutput(state.activeJobData, state.activeJobResolvedTranscript);
      if (refs.speakerNamesStatus) {
        refs.speakerNamesStatus.textContent = "Speaker names reset.";
      }
    });
  }

  refs.copyTranscriptionBtn.addEventListener("click", () =>
    copyFromNode(refs.transcriptionOutput, "Transcription copied").catch(() =>
      setError("Copy failed"),
    ),
  );
  refs.copySummaryBtn.addEventListener("click", () =>
    copyFromNode(refs.summaryOutput, "Summary copied").catch(() =>
      setError("Copy failed"),
    ),
  );

  refs.generateSummaryBtn.addEventListener("click", () =>
    generateSummary().catch((e) => setError(e.message)),
  );
  refs.regenerateSummaryBtn.addEventListener("click", () =>
    generateSummary().catch((e) => setError(e.message)),
  );
  refs.downloadSummaryBtn.addEventListener("click", () =>
    downloadSummaryMarkdown().catch((e) => setError(e.message)),
  );

  refs.generateSummaryBtn.style.pointerEvents = "auto";
  refs.regenerateSummaryBtn.style.pointerEvents = "auto";
  refs.downloadSummaryBtn.style.pointerEvents = "auto";

  document.addEventListener("click", (e) => {
    if (
      !refs.deleteModal.classList.contains("hidden") &&
      !refs.deleteModal.contains(e.target)
    ) {
      toggleDeleteModal(false);
    }
    if (
      !refs.themeMenu.contains(e.target) &&
      !refs.themeMenuBtn.contains(e.target)
    ) {
      refs.themeMenu.classList.add("hidden");
    }
    if (
      !refs.exportMenu.contains(e.target) &&
      !refs.exportBtn.contains(e.target)
    )
      refs.exportMenu.classList.add("hidden");
    if (
      refs.speakerNamePanel &&
      refs.toggleSpeakerNamesBtn &&
      !refs.speakerNamePanel.contains(e.target) &&
      !refs.toggleSpeakerNamesBtn.contains(e.target)
    ) {
      refs.speakerNamePanel.classList.add("hidden");
    }
    if (
      !refs.transcriptionSettingsPanel.contains(e.target) &&
      !refs.toggleTranscriptionSettings.contains(e.target)
    ) {
      refs.transcriptionSettingsPanel.classList.add("hidden");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      toggleSettings(false);
      toggleAdvancedPanel(false);
      toggleDeleteModal(false);
      refs.exportMenu.classList.add("hidden");
      refs.themeMenu.classList.add("hidden");
    }
  });
}

async function init() {
  applyThemePreference(getStoredThemePreference(), false);
  state.speakerNameOverridesByJob = getStoredSpeakerNameOverrides();
  systemThemeQuery.addEventListener("change", () => {
    if (getStoredThemePreference() === "system") {
      applyThemePreference("system", false);
    }
  });
  attachEvents();
  await setTranscriptPreviewMode(state.previewMode);
  setSummaryRenderMode(getStoredSummaryRenderMode());
  syncSummaryStyleAvailability();
  await loadConfig();
  await loadGlobalSettings();
  await refreshJobs();
}

init().catch((e) => {
  setError(`Failed to initialize UI: ${e.message}`);
});
