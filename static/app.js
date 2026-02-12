const form = document.getElementById("job-form");
const modelSelect = document.getElementById("model_name");
const formatList = document.getElementById("format-list");
const statusCard = document.getElementById("status-card");
const progressBar = document.getElementById("progress-bar");
const statusText = document.getElementById("status-text");
const errorText = document.getElementById("error-text");
const downloads = document.getElementById("downloads");
const summaryBox = document.getElementById("summary-box");

let pollTimer = null;

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

  formatList.innerHTML = "";
  cfg.formats.forEach((f) => {
    const label = document.createElement("label");
    label.innerHTML = `<input type="checkbox" name="output_format" value="${f}" ${["txt","srt","vtt","json"].includes(f) ? "checked" : ""}> ${f.toUpperCase()}`;
    formatList.appendChild(label);
  });

  document.getElementById("language").value = cfg.defaults.language;
  document.getElementById("batch_size").value = cfg.defaults.batch_size;
  document.getElementById("device").value = cfg.defaults.device;
  document.getElementById("compute_type").value = cfg.defaults.compute_type;
}

function selectedFormats() {
  return [...document.querySelectorAll("input[name='output_format']:checked")].map((el) => el.value);
}

function setProgress(value, step) {
  progressBar.style.width = `${Math.max(0, Math.min(100, value))}%`;
  statusText.textContent = `${value}% - ${step}`;
}

async function poll(jobId) {
  const res = await fetch(`/api/jobs/${jobId}`);
  const data = await res.json();

  setProgress(data.progress, data.step);

  if (data.status === "failed") {
    errorText.textContent = data.error || "Job failed";
    clearInterval(pollTimer);
    return;
  }

  if (data.status === "completed") {
    clearInterval(pollTimer);
    errorText.textContent = "";
    downloads.innerHTML = "";

    Object.keys(data.result.generated_files).forEach((fmt) => {
      const a = document.createElement("a");
      a.href = `/api/jobs/${jobId}/download/${fmt}`;
      a.textContent = `Download ${fmt.toUpperCase()}`;
      a.style.marginRight = "0.8rem";
      downloads.appendChild(a);
    });

    summaryBox.textContent = data.result.summary || "";
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorText.textContent = "";
  downloads.innerHTML = "";
  summaryBox.textContent = "";

  const fd = new FormData();
  fd.append("file", document.getElementById("file").files[0]);
  fd.append("model_name", document.getElementById("model_name").value);
  fd.append("language", document.getElementById("language").value);
  fd.append("batch_size", document.getElementById("batch_size").value);
  fd.append("device", document.getElementById("device").value);
  fd.append("compute_type", document.getElementById("compute_type").value);
  fd.append("diarization", document.getElementById("diarization").checked);
  fd.append("summary_enabled", document.getElementById("summary_enabled").checked);
  fd.append("summary_style", document.getElementById("summary_style").value);
  fd.append("output_formats", JSON.stringify(selectedFormats()));

  const res = await fetch("/api/jobs", { method: "POST", body: fd });
  if (!res.ok) {
    const err = await res.json();
    errorText.textContent = err.detail || "Failed to create job";
    return;
  }

  const data = await res.json();
  statusCard.hidden = false;
  setProgress(1, "queued");

  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => poll(data.job_id), 2000);
  poll(data.job_id);
});

loadConfig().catch((err) => {
  errorText.textContent = `Failed to load config: ${err.message}`;
  statusCard.hidden = false;
});
