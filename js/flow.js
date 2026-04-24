// ============================================================
// Solid Roots — Inquiry Flow Logic
// Handles Buy / Sell multi-step question flows
// ============================================================

const flows = {
    buy: [
        { q: "Are you looking to buy or rent?", type: "choice", options: ["Buy", "Rent"] },
        { q: "What type of property do you want?", type: "choice", options: ["Apartment", "House", "Villa", "Plot"] },
        { q: "Which city or area are you looking in?", type: "text", placeholder: "e.g. South Kensington, London" },
        { q: "What's your budget range?", type: "text", placeholder: "Budget Range (Financial)" },
        { q: "Will you be paying via home loan or cash?", type: "choice", options: ["Home Loan", "Cash"] },
        { q: "Are you pre-approved for a loan already?", type: "choice", options: ["Yes", "No", "In Process"] },
        { q: "How many bedrooms do you need ?", type: "choice", options: ["1 BHK", "2 BHK", "3 BHK", "4+ BHK"] },
        { q: "Do you need parking, balcony, or garden?", type: "multi", options: ["Parking", "Balcony", "Garden"] },
        { q: "Ready to move in or okay with under-construction?", type: "choice", options: ["Ready to move", "Under-construction"] },
        { q: "When do you need to move in?", type: "text", placeholder: "e.g. Within 3 months" },
        { q: "Is this for personal use or investment?", type: "choice", options: ["Personal Use", "Investment"] },
        { q: "Are you open to seeing properties online or only in-person?", type: "choice", options: ["Online & In-person", "In-person Only"] },
        { q: "What is your email address?", type: "text", inputType: "email", placeholder: "Email Address" },
        { q: "What is your phone number?", type: "text", inputType: "tel", placeholder: "Phone Number" }
    ],
    sell: [
        { q: "What type of property are you selling?", type: "choice", options: ["Apartment", "House", "Plot", "Commercial"] },
        { q: "Where is the property located?", type: "text", placeholder: "Area / City" },
        { q: "How many bedrooms and bathrooms does it have?", type: "text", placeholder: "e.g. 3BHK, 2 Bath" },
        { q: "What's the total area in sq ft / sq yards?", type: "text", placeholder: "sq ft / sq yards" },
        { q: "What price are you expecting?", type: "text", placeholder: "Expected Price" },
        { q: "Is the property fully owned by you (no loans or disputes)?", type: "choice", options: ["Fully Owned", "No, has Loan/Dispute"] },
        { q: "Are all documents (title deed, NOC, tax receipts) ready?", type: "choice", options: ["Yes, Ready", "No, In Process"] },
        { q: "Is it currently occupied or vacant?", type: "choice", options: ["Occupied", "Vacant"] },
        { q: "How old is the property?", type: "text", placeholder: "Enter Age" },
        { q: "Has the property been recently renovated?", type: "choice", options: ["Recently Renovated", "No Recent Reno"] },
        { q: "How urgently do you need to sell?", type: "choice", options: ["Urgent", "Flexible"] },
        { q: "Are you open to negotiation on price?", type: "choice", options: ["Yes, Open", "No, Fixed"] },
        { q: "What is your email address?", type: "text", inputType: "email", placeholder: "Email Address" },
        { q: "What is your phone number?", type: "text", inputType: "tel", placeholder: "Phone Number" }
    ]
};

let currentStep = { buy: 0, sell: 0 };
let answers = { buy: {}, sell: {} };

function startFlow(type) {
    const otherType = type === 'buy' ? 'sell' : 'buy';

    // Reset the other side to intro state
    document.getElementById(`${otherType}-questions`).classList.add('hidden');
    document.getElementById(`${otherType}-intro`).classList.remove('hidden');
    currentStep[otherType] = 0;

    // Show active side
    document.getElementById(`${type}-intro`).classList.add('hidden');
    const questionsContainer = document.getElementById(`${type}-questions`);
    questionsContainer.classList.remove('hidden');
    questionsContainer.classList.add('flex');

    // Expand the section to take more space
    document.getElementById(`${type}-section`).style.flex = '3';
    document.getElementById(`${otherType}-section`).style.flex = '1';

    renderQuestion(type);
}

function renderQuestion(type) {
    const step = currentStep[type];
    const flowData = flows[type][step];
    const content = document.getElementById(`${type}-question-content`);
    const progress = document.getElementById(`${type}-progress`);

    progress.style.width = `${((step) / flows[type].length) * 100}%`;

    let html = `<p class="text-white font-headline text-xl md:text-2xl lg:text-3xl font-bold tracking-tight text-shadow-premium mb-6 md:mb-8">${step + 1}. ${flowData.q}</p>`;

    if (flowData.type === 'choice') {
        html += `<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">`;
        flowData.options.forEach(opt => {
            html += `<button onclick="saveAnswer('${type}', '${opt}')" class="px-5 md:px-8 py-3 md:py-4 bg-surface-container-lowest text-primary font-bold text-base md:text-lg rounded-none hover:bg-primary hover:text-white transition-all duration-300 shadow-xl text-left">${opt}</button>`;
        });
        html += `</div>`;
    } else if (flowData.type === 'multi') {
        html += `<div class="grid grid-cols-2 gap-4 mb-8">`;
        flowData.options.forEach(opt => {
            html += `<button onclick="this.classList.toggle('bg-tertiary-fixed'); this.classList.toggle('text-on-tertiary-fixed'); this.classList.toggle('border-tertiary-fixed')" class="feature-btn px-6 py-4 bg-black/40 backdrop-blur-md border-2 border-white/30 text-white font-bold text-lg rounded-none hover:bg-black/60 transition-all">${opt}</button>`;
        });
        html += `</div>`;
        html += `<button onclick="saveMultiAnswer('${type}')" class="w-full py-4 md:py-5 bg-tertiary-fixed text-on-tertiary-fixed font-bold text-lg md:text-xl rounded-none hover:bg-white transition-all">Next</button>`;
    } else if (flowData.type === 'text') {
        const isAgeQuestion = flowData.q.includes('How old is the property?');
        html += `<div class="space-y-4">
                    <div class="relative flex items-center">
                        <input type="${flowData.inputType || 'text'}" 
                            id="${type}-input-${step}" 
                            onkeydown="handleEnter(event, '${type}')" 
                            ${flowData.inputType === 'tel' ? `oninput="this.value = this.value.replace(/[^0-9]/g, ''); clearError('${type}', ${step}, this)"` : `oninput="clearError('${type}', ${step}, this)"`}
                            placeholder="${flowData.placeholder}"
                            class="w-full px-6 py-5 bg-black/40 backdrop-blur-md border-2 border-white/50 text-white placeholder-white/60 font-bold text-xl focus:outline-none focus:bg-white focus:text-primary focus:border-white transition-all duration-300 ${isAgeQuestion ? 'pr-32' : ''}">
                        ${isAgeQuestion ? `<button id="age-unit-btn" onclick="toggleAgeUnit()" class="absolute right-3 px-4 py-2 bg-tertiary-fixed text-on-tertiary-fixed font-bold text-sm rounded-none hover:bg-white transition-all shadow-md">Years</button>` : ''}
                    </div>
                    <p id="${type}-error-${step}" class="text-error font-medium text-sm hidden mt-2 m-0 bg-black/50 p-2 rounded"></p>
                    <button onclick="${isAgeQuestion ? `saveAgeAnswer('${type}')` : `saveTextAnswer('${type}')`}" class="w-full py-4 md:py-5 bg-surface-container-lowest text-primary font-bold text-lg md:text-xl rounded-none hover:bg-primary hover:text-white transition-all duration-300 shadow-xl">Next</button>
                </div>`;
    }

    content.innerHTML = html;

    // Auto-focus text input
    setTimeout(() => {
        const input = document.getElementById(`${type}-input-${step}`);
        if (input) input.focus();
    }, 100);
}

function saveAnswer(type, val) {
    answers[type][flows[type][currentStep[type]].q] = val;
    nextStep(type);
}

function showError(type, step, input, message) {
    const errorEl = document.getElementById(`${type}-error-${step}`);
    if (errorEl) {
        errorEl.innerText = message;
        errorEl.classList.remove('hidden');
    }
    
    // Add shake animation and error styling
    input.classList.remove('border-white/50', 'text-white', 'focus:border-white');
    input.classList.add('shake', 'border-error', 'text-error', 'focus:border-error');
    
    // Remove shake class after animation so it can be triggered again
    setTimeout(() => {
        input.classList.remove('shake');
    }, 500);
}

function clearError(type, step, input) {
    const errorEl = document.getElementById(`${type}-error-${step}`);
    if (errorEl) {
        errorEl.classList.add('hidden');
        errorEl.innerText = '';
    }
    
    // Restore default styling
    input.classList.remove('border-error', 'text-error', 'focus:border-error');
    input.classList.add('border-white/50', 'text-white', 'focus:border-white');
}

function saveTextAnswer(type) {
    const step = currentStep[type];
    const flowData = flows[type][step];
    const input = document.getElementById(`${type}-input-${step}`);
    let val = input.value.trim();

    clearError(type, step, input);

    if (val === '') {
        showError(type, step, input, 'This field is required');
        return;
    }

    if (flowData.inputType === 'email') {
        if (!val.toLowerCase().endsWith('@gmail.com')) {
            showError(type, step, input, 'Please enter a valid Gmail address ending with @gmail.com');
            return;
        }
    }

    if (flowData.inputType === 'tel') {
        if (!/^\d{10}$/.test(val)) {
            showError(type, step, input, 'Phone number must be exactly 10 digits');
            return;
        }
    }

    saveAnswer(type, val);
}

function saveMultiAnswer(type) {
    const selected = Array.from(document.querySelectorAll('.feature-btn.bg-tertiary-fixed')).map(btn => btn.innerText);
    saveAnswer(type, selected.join(', '));
}

function toggleAgeUnit() {
    const btn = document.getElementById('age-unit-btn');
    if (btn) {
        btn.innerText = btn.innerText === 'Years' ? 'Months' : 'Years';
    }
}

function saveAgeAnswer(type) {
    const input = document.getElementById(`${type}-input-${currentStep[type]}`);
    const btn = document.getElementById('age-unit-btn');
    if (input && input.value.trim() === '') return;
    const unit = btn ? btn.innerText : 'Years';
    saveAnswer(type, `${input.value} ${unit}`);
}

function handleEnter(event, type) {
    if (event.key === 'Enter') {
        const isAgeQuestion = flows[type][currentStep[type]].q.includes('How old is the property?');
        if (isAgeQuestion) {
            saveAgeAnswer(type);
        } else {
            saveTextAnswer(type);
        }
    }
}

function nextStep(type) {
    currentStep[type]++;
    if (currentStep[type] < flows[type].length) {
        renderQuestion(type);
    } else {
        showSuccess(type);
    }
}

function showSuccess(type) {
    const content = document.getElementById(`${type}-question-content`);
    const progress = document.getElementById(`${type}-progress`);
    progress.style.width = '100%';

    content.innerHTML = `
        <div class="text-center space-y-8 py-12 px-8 bg-black/60 backdrop-blur-lg border border-white/20 rounded-xl shadow-2xl transform transition-all duration-500">
            <span class="material-symbols-outlined text-8xl text-tertiary-fixed drop-shadow-xl animate-bounce">verified</span>
            <h3 class="text-4xl md:text-5xl font-headline font-extrabold text-white tracking-tighter text-shadow-premium">Requirements Submitted</h3>
            <p class="text-white/90 text-xl font-medium leading-relaxed max-w-md mx-auto">Our premium advisors will review your details and contact you within 24 hours.</p>
            <div class="pt-6">
                <a href="index.html" class="inline-block px-10 py-5 bg-white text-primary font-bold text-lg rounded-none hover:bg-tertiary-fixed transition-all shadow-xl">Return Home</a>
            </div>
        </div>
    `;
}
