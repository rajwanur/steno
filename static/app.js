const form = document.getElementById("job-form");
const fileInput = document.getElementById("file");
const audioPreview = document.getElementById("audio-preview");
const modelSelect = document.getElementById("model_name");
const deviceSelect = document.getElementById("device");
const formatList = document.getElementById("format-list");
const historyList = document.getElementById("history-list");
const refreshHistoryBtn = document.getElementById("refresh-history");
const cancelActiveBtn = document.getElementById("cancel-active");
const clearQueueBtn = document.getElementById("clear-queue");
const regenerateSummaryBtn = document.getElementById("regenerate-summary");
const regenerateStyleSelect = document.getElementById("summary-regenerate-style");
const summaryLoading = document.getElementById("summary-loading");
const copyPreviewBtn = document.getElementById("copy-preview");
const copySummaryBtn = document.getElementById("copy-summary");
const progressBar = document.getElementById("progress-bar");
const statusText = document.getElementById("status-text");
const errorText = document.getElementById("error-text");
const eventsList = document.getElementById("events");
const downloads = document.getElementById("downloads");
const previewFormat = document.getElementById("preview-format");
const previewContent = document.getElementById("preview-content");
const summaryBox = document.getElementById("summary-box");

let pollTimer = null;
let activeJobId = null;
let objectUrl = null;

async function copyText(value, successMessage) {
  const text = (value || "").trim();
  if (!text) {
    errorText.textContent = "Nothing to copy.";
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    errorText.textContent = successMessage;
  } catch {
    errorText.textContent = "Clipboard copy failed in this browser context.";
  }
}

function selectedFormats() {
  return [...document.querySelectorAll("input[name='output_format']:checked")].map((el) => el.value);
}

function setProgress(value, step, status) {
  const safe = Math.max(0, Math.min(100, value || 0));
  progressBar.style.width = `${safe}%`;
  statusText.textContent = `${safe}% - ${step} (${status})`;
}

function badgeClass(status) {
  return `status-badge status-${status}`;
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function applyJobParams(job) {
  if (!job?.params) return;
  const p = job.params;
  modelSelect.value = p.model_name;
  document.getElementById("language").value = p.language || "";
  document.getElementById("batch_size").value = p.batch_size;
  deviceSelect.value = p.device;
  document.getElementById("compute_type").value = p.compute_type;
  document.getElementById("diarization").checked = !!p.diarization;
  document.getElementById("summary_enabled").checked = !!p.summary_enabled;
  document.getElementById("summary_style").value = p.summary_style;
  regenerateStyleSelect.value = p.summary_style;

  const selected = new Set(p.output_formats || []);
  document.querySelectorAll("input[name='output_format']").forEach((el) => {
    el.checked = selected.has(el.value);
  });
}

async function loadConfig() {
  const res = await fetch("/api/config");
  const cfg = await res.json();

  modelSelect.innerHTML = "";
  cfg.models.forEach((m) => {
    const option = document.createElement("option");
    option.value = m;
    option.textContent = m;
    if (m === cfg.defaults.model) option.selected = true;
    modelSelect.appendChild(option);
  });

  deviceSelect.innerHTML = "";
  cfg.devices.forEach((d) => {
    const option = document.createElement("option");
    option.value = d;
    option.textContent = d;
    if (d === cfg.defaults.device) option.selected = true;
    deviceSelect.appendChild(option);
  });

  formatList.innerHTML = "";
  cfg.formats.forEach((f) => {
    const label = document.createElement("label");
    const checked = ["txt", "srt", "vtt", "json"].includes(f) ? "checked" : "";
    label.innerHTML = `<input type="checkbox" name="output_format" value="${f}" ${checked}> ${f.toUpperCase()}`;
    formatList.appendChild(label);
  });

  document.getElementById("language").value = cfg.defaults.language;
  document.getElementById("batch_size").value = cfg.defaults.batch_size;
  document.getElementById("compute_type").value = cfg.defaults.compute_type;
}

async function fetchJobs() {
  const res = await fetch("/api/jobs");
  if (!res.ok) throw new Error("Failed to load jobs");
  return res.json();
}

function renderHistory(jobs) {
  historyList.innerHTML = "";
  if (!jobs.length) {
    historyList.textContent = "No jobs yet.";
    return;
  }

  jobs.forEach((job) => {
    const item = document.createElement("div");
    item.className = `job-item ${job.id === activeJobId ? "active" : ""}`;
    item.innerHTML = `
      <strong>${job.filename}</strong>
      <div><span class="${badgeClass(job.status)}">${job.status}</span>${job.progress}% - ${job.step}</div>
      <small>${formatDate(job.updated_at)}</small>
    `;
    item.addEventListener("click", async () => {
      activeJobId = job.id;
      await selectJob(job.id);
      renderHistory(jobs);
    });
    historyList.appendChild(item);
  });
}

function renderEvents(events) {
  eventsList.innerHTML = "";
  (events || []).slice().reverse().forEach((evt) => {
    const li = document.createElement("li");
    li.textContent = evt;
    eventsList.appendChild(li);
  });
}

function renderDownloads(job) {
  downloads.innerHTML = "";
  previewFormat.innerHTML = "";
  previewContent.textContent = "";

  const fmts = Object.keys(job.result.generated_files || {});
  fmts.forEach((fmt, idx) => {
    const a = document.createElement("a");
    a.className = "dl-link";
    a.href = `/api/jobs/${job.id}/download/${fmt}`;
    a.textContent = `Download ${fmt.toUpperCase()}`;
    downloads.appendChild(a);

    const o = document.createElement("option");
    o.value = fmt;
    o.textContent = fmt.toUpperCase();
    if (idx === 0) o.selected = true;
    previewFormat.appendChild(o);
  });

  if (fmts.length) {
    previewJobOutput(job.id, previewFormat.value);
  }
}

async function previewJobOutput(jobId, fmt) {
  if (!fmt) return;
  if (fmt === "json") {
    const res = await fetch(`/api/jobs/${jobId}/output/${fmt}`);
    const data = await res.json();
    previewContent.textContent = JSON.stringify(data, null, 2);
    return;
  }
  const res = await fetch(`/api/jobs/${jobId}/output/${fmt}`);
  previewContent.textContent = await res.text();
}

async function fetchJob(jobId) {
  const res = await fetch(`/api/jobs/${jobId}`);
  if (!res.ok) throw new Error("Job not found");
  return res.json();
}

async function pollActiveJob() {
  if (!activeJobId) return;

  const job = await fetchJob(activeJobId);
  setProgress(job.progress, job.step, job.status);
  errorText.textContent = job.error || "";
  renderEvents(job.events);
  summaryBox.textContent = job.result.summary || "";
  renderDownloads(job);
  applyJobParams(job);

  if (job.status === "processing" || job.status === "queued") return;

  clearInterval(pollTimer);
  pollTimer = null;
  await refreshHistory();
}

async function selectJob(jobId) {
  activeJobId = jobId;
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }

  await pollActiveJob();
  const job = await fetchJob(jobId);
  if (job.status === "processing" || job.status === "queued") {
    pollTimer = setInterval(pollActiveJob, 2000);
  }
}

async function refreshHistory() {
  const jobs = await fetchJobs();
  renderHistory(jobs);
  if (!activeJobId && jobs.length) {
    activeJobId = jobs[0].id;
    await selectJob(activeJobId);
    renderHistory(jobs);
  }
}

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(file);
  audioPreview.src = objectUrl;
  audioPreview.hidden = false;
});

previewFormat.addEventListener("change", async () => {
  if (activeJobId) await previewJobOutput(activeJobId, previewFormat.value);
});

refreshHistoryBtn.addEventListener("click", async () => {
  await refreshHistory();
});

cancelActiveBtn.addEventListener("click", async () => {
  if (!activeJobId) return;
  const res = await fetch(`/api/jobs/${activeJobId}/cancel`, { method: "POST" });
  const body = await res.json();
  if (!res.ok) {
    errorText.textContent = body.detail || "Failed to cancel job.";
    return;
  }
  errorText.textContent = body.message;
  await pollActiveJob();
});

clearQueueBtn.addEventListener("click", async () => {
  const res = await fetch("/api/queue/clear?include_active=true", { method: "POST" });
  const body = await res.json();
  if (!res.ok) {
    errorText.textContent = body.detail || "Failed to clear queue.";
    return;
  }
  errorText.textContent = body.message;
  await refreshHistory();
  if (activeJobId) await pollActiveJob();
});

regenerateSummaryBtn.addEventListener("click", async () => {
  if (!activeJobId) {
    errorText.textContent = "Select a job first.";
    return;
  }
  const style = regenerateStyleSelect.value;
  summaryLoading.hidden = false;
  regenerateSummaryBtn.disabled = true;
  regenerateSummaryBtn.textContent = "Generating...";
  statusText.textContent = "Summary generation in progress...";
  try {
    const res = await fetch(`/api/jobs/${activeJobId}/summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ style }),
    });
    const body = await res.json();
    if (!res.ok) {
      errorText.textContent = body.detail || "Summary generation failed.";
      return;
    }
    summaryBox.textContent = body.result.summary || "";
    renderEvents(body.events);
    errorText.textContent = "";
    setProgress(body.progress, body.step, body.status);
  } finally {
    summaryLoading.hidden = true;
    regenerateSummaryBtn.disabled = false;
    regenerateSummaryBtn.textContent = "Generate Summary";
  }
});

copyPreviewBtn.addEventListener("click", async () => {
  await copyText(previewContent.textContent, "Preview copied.");
});

copySummaryBtn.addEventListener("click", async () => {
  await copyText(summaryBox.textContent, "Summary copied.");
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorText.textContent = "";

  const file = fileInput.files?.[0];
  if (!file) {
    errorText.textContent = "Please select a file.";
    return;
  }

  const fd = new FormData();
  fd.append("file", file);
  fd.append("model_name", modelSelect.value);
  fd.append("language", document.getElementById("language").value);
  fd.append("batch_size", document.getElementById("batch_size").value);
  fd.append("device", deviceSelect.value);
  fd.append("compute_type", document.getElementById("compute_type").value);
  fd.append("diarization", document.getElementById("diarization").checked);
  fd.append("summary_enabled", document.getElementById("summary_enabled").checked);
  fd.append("summary_style", document.getElementById("summary_style").value);
  fd.append("output_formats", JSON.stringify(selectedFormats()));

  const res = await fetch("/api/jobs", { method: "POST", body: fd });
  const body = await res.json();
  if (!res.ok) {
    errorText.textContent = body.detail || "Failed to create job.";
    return;
  }

  activeJobId = body.job_id;
  await refreshHistory();
  await selectJob(activeJobId);
});

async function init() {
  await loadConfig();
  await refreshHistory();
}

init().catch((err) => {
  errorText.textContent = `Failed to initialize UI: ${err.message}`;
});
