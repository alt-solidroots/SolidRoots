// ============================================================
// Solid Roots — Inquiry Flow Controller
// Orchestrates state, rendering, validation, and submission.
// Depends on: flow-config.js, flow-ui.js, flow-validation.js
// ============================================================

/* global FLOW_TYPE, AGE_UNIT_LABELS, SUBMIT_ENDPOINT, FLOWS */
/* global getValidationError, showInputError, clearInputError */
/* global buildQuestionHTML, buildSuccessHTML */

const flowState = {
    currentStep: { buy: 0, sell: 0 },
    answers: { buy: {}, sell: {} },
};

// ── DOM Helpers ──────────────────────────────────────────────

function getElementById(id) {
    return document.getElementById(id);
}

function focusInputAfterRender(type, step) {
    setTimeout(() => {
        const input = getElementById(`${type}-input-${step}`);
        if (input) input.focus();
    }, 100);
}

function updateProgressBar(type, step) {
    const progress = getElementById(`${type}-progress`);
    const percentage = (step / FLOWS[type].length) * 100;
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

    const hasMoreSteps = flowState.currentStep[type] < FLOWS[type].length;
    if (hasMoreSteps) {
        renderQuestion(type);
    } else {
        submitAndShowSuccess(type);
    }
}

// ── Rendering ────────────────────────────────────────────────

function renderQuestion(type) {
    const step = flowState.currentStep[type];
    const flowData = FLOWS[type][step];
    const contentEl = getElementById(`${type}-question-content`);

    updateProgressBar(type, step);
    contentEl.innerHTML = buildQuestionHTML(type, step, flowData);
    focusInputAfterRender(type, step);
}

// ── Answer Saving ────────────────────────────────────────────

function saveAnswer(type, value) {
    const questionText = FLOWS[type][flowState.currentStep[type]].q;
    flowState.answers[type][questionText] = value;
    advanceStep(type);
}

function saveTextAnswer(type) {
    const step = flowState.currentStep[type];
    const flowData = FLOWS[type][step];
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

    const isAgeQuestion = FLOWS[type][flowState.currentStep[type]].q.includes("How old is the property?");
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

async function submitInquiry(type) {
    const payload = {
        type,
        email: flowState.answers[type]["What is your email address?"],
        phone: flowState.answers[type]["What is your phone number?"],
        answers: flowState.answers[type],
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
    contentEl.innerHTML = buildSuccessHTML();

    try {
        await submitInquiry(type);
    } catch (err) {
        console.error("Inquiry submission error:", err.message);
    }
}
