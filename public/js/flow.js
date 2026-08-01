// ============================================================
// Solid Roots — Inquiry Flow Controller
// Orchestrates state, rendering, validation, and submission.
// Depends on: flow-config.js, flow-ui.js, flow-validation.js
// ============================================================

/* global FLOW_TYPE, AGE_UNIT_LABELS, SUBMIT_ENDPOINT, FLOWS, TYPE_QUESTIONS, ERROR_MESSAGES */
/* global CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET */
/* global getValidationError, showInputError, clearInputError, isPhoneValid */
/* global buildQuestionHTML, buildSuccessHTML */

const flowState = {
    currentStep: { buy: 0, sell: 0 },
    answers: { buy: {}, sell: {} },
};

// ── DOM Helpers ──────────────────────────────────────────────

function getElementById(id) {
    return document.getElementById(id);
}

// Flow branches after the property-type question based on the answer given.
function getFlow(type) {
    const questions = FLOWS[type];
    const propertyType = flowState.answers[type][questions[0].q];
    const override = TYPE_QUESTIONS[type][propertyType];
    return override ? [questions[0], ...override] : questions;
}

// Styled inline (not via Tailwind classes) since public/styles.css is a prebuilt
// static file that isn't recompiled when JS changes — classes used only here
// would silently have no effect until someone reruns `npm run build:css`.
function showPopup(message) {
    let popup = getElementById("flow-popup");
    if (!popup) {
        popup = document.createElement("div");
        popup.id = "flow-popup";
        Object.assign(popup.style, {
            position: "fixed",
            top: "24px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: "1000",
            pointerEvents: "none",
            background: "rgba(0,0,0,0.85)",
            color: "#fff",
            fontWeight: "700",
            padding: "16px 24px",
            border: "2px solid #ba1a1a",
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.3)",
            opacity: "0",
            transition: "opacity 0.3s",
        });
        document.body.appendChild(popup);
    }

    popup.textContent = message;
    popup.style.opacity = "1";
    clearTimeout(popup._hideTimeout);
    popup._hideTimeout = setTimeout(() => { popup.style.opacity = "0"; }, 2500);
}

function focusInputAfterRender(type, step) {
    setTimeout(() => {
        const input = getElementById(`${type}-input-${step}`);
        if (input) input.focus();
    }, 100);
}

function updateProgressBar(type, step) {
    const progress = getElementById(`${type}-progress`);
    const percentage = (step / getFlow(type).length) * 100;
    progress.style.width = `${percentage}%`;
}

// ── Flow Navigation ──────────────────────────────────────────

function startFlow(type) {
    const other = type === FLOW_TYPE.BUY ? FLOW_TYPE.SELL : FLOW_TYPE.BUY;

    resetSideToIntro(other);
    expandActiveSection(type, other);

    getElementById(`${type}-intro`).classList.add("hidden");

    const questionsEl = getElementById(`${type}-questions`);
    questionsEl.classList.remove("hidden");
    questionsEl.classList.add("flex");

    renderQuestion(type);
}

function resetSideToIntro(type) {
    getElementById(`${type}-questions`).classList.add("hidden");
    getElementById(`${type}-intro`).classList.remove("hidden");
    flowState.currentStep[type] = 0;
}

function expandActiveSection(activeType, otherType) {
    getElementById(`${activeType}-section`).style.flex = "3";
    getElementById(`${otherType}-section`).style.flex = "1";
}

function advanceStep(type) {
    flowState.currentStep[type]++;

    const hasMoreSteps = flowState.currentStep[type] < getFlow(type).length;
    if (hasMoreSteps) {
        renderQuestion(type);
    } else {
        submitAndShowSuccess(type);
    }
}

// ── Rendering ────────────────────────────────────────────────

function renderQuestion(type) {
    const step = flowState.currentStep[type];
    const flowData = getFlow(type)[step];
    const contentEl = getElementById(`${type}-question-content`);

    updateProgressBar(type, step);
    contentEl.innerHTML = stripDangerousHTML(buildQuestionHTML(type, step, flowData));
    focusInputAfterRender(type, step);
}

// ── Answer Saving ────────────────────────────────────────────

function saveAnswer(type, value) {
    const questionText = getFlow(type)[flowState.currentStep[type]].q;
    flowState.answers[type][questionText] = value;
    advanceStep(type);
}

function saveTextAnswer(type) {
    const step = flowState.currentStep[type];
    const flowData = getFlow(type)[step];
    const input = getElementById(`${type}-input-${step}`);
    const value = input.value.trim();

    clearInputError(type, step, input);

    const error = getValidationError(flowData, value);
    if (error) {
        showInputError(type, step, input, error);
        return;
    }

    saveAnswer(type, value);
}

async function uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, {
        method: "POST",
        body: formData,
    });
    if (!response.ok) throw new Error("Upload failed");
    const data = await response.json();
    return data.secure_url;
}

async function saveFormAnswer(type) {
    const step = flowState.currentStep[type];
    const fields = getFlow(type)[step].fields;
    const inputs = fields.map((field, i) => getElementById(`${type}-input-${step}-${i}`));
    const values = inputs.map((input, i) => (fields[i].type === "file" ? "" : input.value.trim()));

    // File fields are optional and never block submission.
    const isFieldInvalid = (field, value) =>
        field.type !== "file" && (value === "" || (field.type === "tel" && !isPhoneValid(value)));

    const hasInvalid = fields.some((field, i) => isFieldInvalid(field, values[i]));
    if (hasInvalid) {
        inputs.forEach((input, i) => {
            if (isFieldInvalid(fields[i], values[i])) {
                input.classList.remove("border-white/50");
                input.classList.add("border-error");
            }
        });
        const hasBadPhone = fields.some((field, i) => field.type === "tel" && values[i] !== "" && !isPhoneValid(values[i]));
        if (hasBadPhone) showPopup(ERROR_MESSAGES.INVALID_PHONE);
        return;
    }

    const button = getElementById(`${type}-form-next-${step}`);
    const fileUploads = fields
        .map((field, i) => ({ i, file: field.type === "file" && inputs[i].files[0] }))
        .filter((entry) => entry.file);

    if (fileUploads.length > 0) {
        button.disabled = true;
        button.textContent = "Uploading...";
        try {
            for (const { i, file } of fileUploads) {
                values[i] = await uploadToCloudinary(file);
            }
        } catch (err) {
            showPopup("File upload failed, please try again");
            button.disabled = false;
            button.textContent = "Next";
            return;
        }
    }

    fields.forEach((field, i) => {
        flowState.answers[type][field.key] = values[i];
    });
    advanceStep(type);
}

function saveMultiAnswer(type) {
    const selectedButtons = document.querySelectorAll(".feature-btn.bg-tertiary-fixed");
    const selected = Array.from(selectedButtons).map((btn) => btn.innerText).join(", ");
    saveAnswer(type, selected);
}

function saveAgeAnswer(type) {
    const step = flowState.currentStep[type];
    const input = getElementById(`${type}-input-${step}`);
    const unitButton = getElementById("age-unit-btn");

    if (!input || input.value.trim() === "") return;

    const unit = unitButton ? unitButton.innerText : AGE_UNIT_LABELS.YEARS;
    saveAnswer(type, `${input.value} ${unit}`);
}

// ── UI Interactions ──────────────────────────────────────────

function toggleAgeUnit() {
    const btn = getElementById("age-unit-btn");
    if (!btn) return;
    btn.innerText = btn.innerText === AGE_UNIT_LABELS.YEARS
        ? AGE_UNIT_LABELS.MONTHS
        : AGE_UNIT_LABELS.YEARS;
}

function handleEnter(event, type) {
    if (event.key !== "Enter") return;

    const isAgeQuestion = getFlow(type)[flowState.currentStep[type]].q.includes("How old is the property?");
    if (isAgeQuestion) {
        saveAgeAnswer(type);
    } else {
        saveTextAnswer(type);
    }
}

// Public aliases for inline HTML event handlers
function clearError(type, step, input) {
    clearInputError(type, step, input);
}

// ── Submission ───────────────────────────────────────────────

function pickAnswer(answers, keys) {
    return keys.map((key) => answers[key]).find((value) => value);
}

async function submitInquiry(type) {
    const answers = flowState.answers[type];
    const payload = {
        type,
        email: pickAnswer(answers, ["What is your email address?"]),
        phone: pickAnswer(answers, ["What is your phone number?", "Phone Number", "Contact"]),
        answers,
    };

    const response = await fetch(SUBMIT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error || "Submission failed");
    }
}

async function submitAndShowSuccess(type) {
    const contentEl = getElementById(`${type}-question-content`);
    const progressEl = getElementById(`${type}-progress`);

    progressEl.style.width = "100%";
    contentEl.innerHTML = stripDangerousHTML(buildSuccessHTML());

    try {
        await submitInquiry(type);
    } catch (err) {
        console.error("Inquiry submission error:", err.message);
    }
}
// Utility to strip dangerous content before injecting HTML into DOM
function stripDangerousHTML(html) {
  if (typeof html !== 'string' || !html) return html;
  const div = document.createElement('div');
  div.innerHTML = html;
  // Remove script-like elements
  const toRemove = div.querySelectorAll('script, iframe, object, embed');
  toRemove.forEach(n => n.parentNode && n.parentNode.removeChild(n));
  return div.innerHTML;
}
