// ============================================================
// Solid Roots — Flow Validation
// Pure functions for validating text-type question inputs.
// Depends on: flow-config.js
// ============================================================

/* global GMAIL_SUFFIX, PHONE_REGEX, ERROR_MESSAGES */

function isEmailValid(email) {
    return email.toLowerCase().endsWith(GMAIL_SUFFIX);
}

function isPhoneValid(phone) {
    return PHONE_REGEX.test(phone);
}

function getValidationError(flowData, value) {
    if (value === "") return ERROR_MESSAGES.REQUIRED;
    if (flowData.inputType === "email" && !isEmailValid(value)) return ERROR_MESSAGES.INVALID_EMAIL;
    if (flowData.inputType === "tel" && !isPhoneValid(value)) return ERROR_MESSAGES.INVALID_PHONE;
    return null;
}

function showInputError(type, step, input, message) {
    const errorEl = document.getElementById(`${type}-error-${step}`);
    if (errorEl) {
        errorEl.innerText = message;
        errorEl.classList.remove("hidden");
    }

    input.classList.remove("border-white/50", "focus:border-white");
    input.classList.add("shake", "border-error", "focus:border-error");

    setTimeout(() => input.classList.remove("shake"), 500);
}

function clearInputError(type, step, input) {
    const errorEl = document.getElementById(`${type}-error-${step}`);
    if (errorEl) {
        errorEl.classList.add("hidden");
        errorEl.innerText = "";
    }

    input.classList.remove("border-error", "focus:border-error");
    input.classList.add("border-white/50", "focus:border-white");
}
