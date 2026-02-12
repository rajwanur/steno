const el = (id) => document.getElementById(id);
const THEME_STORAGE_KEY = "ui-theme-preference";
const systemThemeQuery = window.matchMedia("(prefers-color-scheme: dark)");

const state = {
  currentTab: "history",
  previewMode: "text",
  recording: false,
  recordingTime: 0,
  recordingTimer: null,
  activeJobId: null,
  pollTimer: null,
  jobs: [],
  audioUrl: null,
};

const refs = {
  openSettingsBtn: el("openSettingsBtn"),
  settingsModal: el("settingsModal"),
  settingsBackdrop: el("settingsBackdrop"),
  closeSettingsBtnTop: el("closeSettingsBtnTop"),
  closeSettingsBtnBottom: el("closeSettingsBtnBottom"),
  saveSettingsBtn: el("saveSettingsBtn"),
  toggleTranscriptionSettings: el("toggleTranscriptionSettings"),
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
  previewTextBtn: el("previewTextBtn"),
  previewTimestampsBtn: el("previewTimestampsBtn"),
  previewContent: el("previewContent"),
  copyTranscriptionBtn: el("copyTranscriptionBtn"),
  summaryType: el("summaryType"),
  generateSummaryBtn: el("generateSummaryBtn"),
  regenerateSummaryBtn: el("regenerateSummaryBtn"),
  copySummaryBtn: el("copySummaryBtn"),
  summaryOutput: el("summaryOutput"),
  toast: el("toast"),
  toastMessage: el("toastMessage"),
  themeMenuBtn: el("themeMenuBtn"),
  themeMenuIcon: el("themeMenuIcon"),
  themeMenu: el("themeMenu"),
  themeLightBtn: el("themeLightBtn"),
  themeDarkBtn: el("themeDarkBtn"),
  themeSystemBtn: el("themeSystemBtn"),
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
    .map((entry) => {
      if (state.previewMode === "timestamps") {
        return `<div class="font-mono text-[10px] bg-[var(--bg-card)] rounded-lg p-2">${escapeHtml(entry)}</div>`;
      }
      return `<div class="p-2 bg-[var(--bg-card)] rounded-lg"><div class="text-[var(--text-secondary)]">${escapeHtml(entry)}</div></div>`;
    })
    .join("");
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
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
  if (!segments.length) {
    if (!fallbackText.trim()) {
      return '<div class="text-[var(--text-muted)] italic">Transcript unavailable for this job.</div>';
    }
    return `<div class="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg px-2 py-1.5 text-xs text-[var(--text-secondary)] whitespace-pre-wrap">${escapeHtml(fallbackText)}</div>`;
  }

  return segments
    .map((seg) => {
      const start = formatClock(seg?.start);
      const end = formatClock(seg?.end);
      const speaker =
        typeof seg?.speaker === "string" && seg.speaker.trim()
          ? seg.speaker.trim()
          : "";
      const text = typeof seg?.text === "string" ? seg.text.trim() : "";
      return `<div class="m-2"><span class="text-[10px] font-mono text-[var(--accent)]">${start}-${end}</span>${
        speaker
          ? `<span class="text-[10px] ml-1 px-1.5 py-0.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-primary)]">${escapeHtml(speaker)}</span>`
          : ""
      }<span class="ml-1">${escapeHtml(text || "(no text)")}</span></div>`;
    })
    .join("");
}

function toggleSettings(show) {
  refs.settingsModal.classList.toggle("hidden", !show);
  document.body.style.overflow = show ? "hidden" : "";
}

function toggleAdvancedPanel(force) {
  const show =
    typeof force === "boolean"
      ? force
      : refs.transcriptionSettingsPanel.classList.contains("hidden");
  refs.transcriptionSettingsPanel.classList.toggle("hidden", !show);
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

  refs.model_name.innerHTML = "";
  cfg.models.forEach((m) => {
    const o = document.createElement("option");
    o.value = m;
    o.textContent = m;
    if (m === cfg.defaults.model) o.selected = true;
    refs.model_name.appendChild(o);
  });

  refs.device.innerHTML = "";
  cfg.devices.forEach((d) => {
    const o = document.createElement("option");
    o.value = d;
    o.textContent = d;
    if (d === cfg.defaults.device) o.selected = true;
    refs.device.appendChild(o);
  });

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
    row.innerHTML = `
      <div class="flex items-start justify-between mb-2">
        <h4 class="font-medium text-sm text-[var(--text-primary)] line-clamp-1">${escapeHtml(job.filename)}</h4>
        <span class="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${statusClass(job.status)}">
          <span class="inline-block w-1.5 h-1.5 rounded-full" style="background:${statusDotColor(job.status)}"></span>
          <span>${job.status}</span>
        </span>
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
  if (!summaryText || !summaryText.trim()) {
    refs.summaryOutput.innerHTML =
      '<div class="text-[var(--text-muted)] italic text-sm">AI summary will be generated after transcription is complete.</div>';
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
  refs.summary_style.value =
    job.params.summary_style || refs.summary_style.value;
  refs.summaryType.value = job.params.summary_style || refs.summaryType.value;
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
  refs.transcriptionOutput.innerHTML = renderSegmentedTranscript(
    job,
    resolvedTranscript,
  );
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
  window.location.href = `/api/jobs/${state.activeJobId}/download/${fmt}`;
  refs.exportMenu.classList.add("hidden");
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
    renderSummary(body.result.summary || "");
    refreshPreview(body);
    showToast("Summary generated");
  } finally {
    refs.generateSummaryBtn.disabled = false;
    refs.regenerateSummaryBtn.disabled = false;
    refs.generateSummaryBtn.textContent = "Generate";
  }
}

async function copyFromNode(node, message) {
  const text = (node.textContent || "").trim();
  if (!text) return;
  await navigator.clipboard.writeText(text);
  showToast(message);
}

function attachEvents() {
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
  refs.saveSettingsBtn.addEventListener("click", () => {
    toggleSettings(false);
    showToast("Settings saved");
  });

  refs.toggleTranscriptionSettings.addEventListener("click", () =>
    toggleAdvancedPanel(),
  );
  refs.applyTranscriptionSettingsBtn.addEventListener("click", () => {
    toggleAdvancedPanel(false);
    showToast("Advanced options applied");
  });

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
    state.previewMode = "text";
    refs.previewTextBtn.classList.add(
      "bg-[var(--bg-card)]",
      "text-[var(--text-primary)]",
    );
    refs.previewTextBtn.classList.remove("text-[var(--text-muted)]");
    refs.previewTimestampsBtn.classList.remove(
      "bg-[var(--bg-card)]",
      "text-[var(--text-primary)]",
    );
    refs.previewTimestampsBtn.classList.add("text-[var(--text-muted)]");
    if (state.activeJobId) refreshPreview(await fetchJob(state.activeJobId));
  });

  refs.previewTimestampsBtn.addEventListener("click", async () => {
    state.previewMode = "timestamps";
    refs.previewTimestampsBtn.classList.add(
      "bg-[var(--bg-card)]",
      "text-[var(--text-primary)]",
    );
    refs.previewTimestampsBtn.classList.remove("text-[var(--text-muted)]");
    refs.previewTextBtn.classList.remove(
      "bg-[var(--bg-card)]",
      "text-[var(--text-primary)]",
    );
    refs.previewTextBtn.classList.add("text-[var(--text-muted)]");
    if (state.activeJobId) refreshPreview(await fetchJob(state.activeJobId));
  });

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

  refs.generateSummaryBtn.style.pointerEvents = "auto";
  refs.regenerateSummaryBtn.style.pointerEvents = "auto";

  document.addEventListener("click", (e) => {
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
      refs.exportMenu.classList.add("hidden");
      refs.themeMenu.classList.add("hidden");
    }
  });
}

async function init() {
  applyThemePreference(getStoredThemePreference(), false);
  systemThemeQuery.addEventListener("change", () => {
    if (getStoredThemePreference() === "system") {
      applyThemePreference("system", false);
    }
  });
  attachEvents();
  await loadConfig();
  await refreshJobs();
}

init().catch((e) => {
  setError(`Failed to initialize UI: ${e.message}`);
});
