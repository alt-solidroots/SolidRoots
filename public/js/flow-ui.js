// ============================================================
// Solid Roots — Flow UI Helpers
// Pure functions that build HTML strings for each question type.
// Depends on: flow-config.js
// ============================================================

/* global FLOW_TYPE */

function buildChoiceButtons(type, options) {
    const buttons = options.map((opt) => `
        <button
            onclick="saveAnswer('${type}', '${opt}')"
            class="px-5 md:px-8 py-3 md:py-4 bg-surface-container-lowest text-primary font-bold
                   text-base md:text-lg rounded-none hover:bg-primary hover:text-white
                   transition-all duration-300 shadow-xl text-left"
        >${opt}</button>
    `).join("");

    return `<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">${buttons}</div>`;
}

function buildMultiSelectButtons(options) {
    const buttons = options.map((opt) => `
        <button
            onclick="this.classList.toggle('bg-tertiary-fixed');
                     this.classList.toggle('text-on-tertiary-fixed');
                     this.classList.toggle('border-tertiary-fixed')"
            class="feature-btn px-6 py-4 bg-black/40 backdrop-blur-md border-2
                   border-white/30 text-white font-bold text-lg rounded-none
                   hover:bg-black/60 transition-all"
        >${opt}</button>
    `).join("");

    return `<div class="grid grid-cols-2 gap-4 mb-8">${buttons}</div>`;
}

function buildTextInput(type, step, flowData) {
    const isAgeQuestion = flowData.q.includes("How old is the property?");
    const inputType = flowData.inputType || "text";
    const clearFn = flowData.inputType === "tel"
        ? `this.value = this.value.replace(/[^0-9]/g, ''); clearError('${type}', ${step}, this)`
        : `clearError('${type}', ${step}, this)`;
    const submitFn = isAgeQuestion ? `saveAgeAnswer('${type}')` : `saveTextAnswer('${type}')`;
    const ageButton = isAgeQuestion
        ? `<button id="age-unit-btn"
               onclick="toggleAgeUnit()"
               class="absolute right-3 px-4 py-2 bg-tertiary-fixed text-on-tertiary-fixed
                      font-bold text-sm rounded-none hover:bg-white transition-all shadow-md"
           >Years</button>`
        : "";

    return `
        <div class="space-y-4">
            <div class="relative flex items-center">
                <input
                    type="${inputType}"
                    id="${type}-input-${step}"
                    onkeydown="handleEnter(event, '${type}')"
                    oninput="${clearFn}"
                    placeholder="${flowData.placeholder}"
                    class="w-full px-6 py-5 bg-black/40 backdrop-blur-md border-2
                           border-white/50 text-white placeholder-white/60 font-bold
                           text-xl focus:outline-none focus:bg-white focus:text-primary
                           focus:border-white transition-all duration-300 ${isAgeQuestion ? "pr-32" : ""}"
                >
                ${ageButton}
            </div>
            <p id="${type}-error-${step}"
               class="text-white font-medium text-sm hidden mt-2 m-0 bg-black/50 p-2
                      rounded border-l-4 border-error"
            ></p>
            <button
                onclick="${submitFn}"
                class="w-full py-4 md:py-5 bg-surface-container-lowest text-primary font-bold
                       text-lg md:text-xl rounded-none hover:bg-primary hover:text-white
                       transition-all duration-300 shadow-xl"
            >Next</button>
        </div>
    `;
}

function buildQuestionHTML(type, step, flowData) {
    const heading = `
        <p class="text-white font-headline text-xl md:text-2xl lg:text-3xl font-bold
                  tracking-tight text-shadow-premium mb-6 md:mb-8">
            ${step + 1}. ${flowData.q}
        </p>
    `;

    const bodyMap = {
        choice: () => buildChoiceButtons(type, flowData.options),
        multi: () => buildMultiSelectButtons(flowData.options)
            + `<button onclick="saveMultiAnswer('${type}')"
                   class="w-full py-4 md:py-5 bg-tertiary-fixed text-on-tertiary-fixed
                          font-bold text-lg md:text-xl rounded-none hover:bg-white transition-all"
               >Next</button>`,
        text: () => buildTextInput(type, step, flowData),
    };

    const body = bodyMap[flowData.type] ? bodyMap[flowData.type]() : "";
    return heading + body;
}

function buildSuccessHTML() {
    return `
        <div class="text-center space-y-8 py-12 px-8 bg-black/60 backdrop-blur-lg
                    border border-white/20 rounded-xl shadow-2xl transform transition-all duration-500">
            <span class="material-symbols-outlined text-8xl text-tertiary-fixed
                         drop-shadow-xl animate-bounce">verified</span>
            <h3 class="text-4xl md:text-5xl font-headline font-extrabold text-white
                       tracking-tighter text-shadow-premium">Requirements Submitted</h3>
            <p class="text-white/90 text-xl font-medium leading-relaxed max-w-md mx-auto">
                Our premium advisors will review your details and contact you within 24 hours.
            </p>
            <div class="pt-6">
                <a href="index.html"
                   class="inline-block px-10 py-5 bg-white text-primary font-bold text-lg
                          rounded-none hover:bg-tertiary-fixed transition-all shadow-xl"
                >Return Home</a>
            </div>
        </div>
    `;
}
