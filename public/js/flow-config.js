// ============================================================
// Solid Roots — Flow Configuration
// Constants and question data for Buy / Sell inquiry flows.
// ============================================================

const FLOW_TYPE = {
    BUY: "buy",
    SELL: "sell",
};

const AGE_UNIT_LABELS = {
    YEARS: "Years",
    MONTHS: "Months",
};

const SUBMIT_ENDPOINT = "/api/submit";

const ERROR_MESSAGES = {
    REQUIRED: "This field is required",
    INVALID_EMAIL: "Please enter a valid Gmail address ending with @gmail.com",
    INVALID_PHONE: "Phone number must be exactly 10 digits",
};

const PHONE_REGEX = /^\d{10}$/;
const GMAIL_SUFFIX = "@gmail.com";

const BUY_QUESTIONS = [
    { q: "Are you looking to buy or rent?", type: "choice", options: ["Buy", "Rent"] },
    { q: "What type of property do you want?", type: "choice", options: ["Apartment", "House", "Villa", "Plot"] },
    { q: "Which city or area are you looking in?", type: "text", placeholder: "e.g. South Kensington, London" },
    { q: "What's your budget range?", type: "text", placeholder: "Budget Range (Financial)" },
    { q: "Will you be paying via home loan or cash?", type: "choice", options: ["Home Loan", "Cash"] },
    { q: "Are you pre-approved for a loan already?", type: "choice", options: ["Yes", "No", "In Process"] },
    { q: "How many bedrooms do you need?", type: "choice", options: ["1 BHK", "2 BHK", "3 BHK", "4+ BHK"] },
    { q: "Do you need parking, balcony, or garden?", type: "multi", options: ["Parking", "Balcony", "Garden"] },
    { q: "Ready to move in or okay with under-construction?", type: "choice", options: ["Ready to move", "Under-construction"] },
    { q: "When do you need to move in?", type: "text", placeholder: "e.g. Within 3 months" },
    { q: "Is this for personal use or investment?", type: "choice", options: ["Personal Use", "Investment"] },
    { q: "Are you open to seeing properties online or only in-person?", type: "choice", options: ["Online & In-person", "In-person Only"] },
    { q: "What is your email address?", type: "text", inputType: "email", placeholder: "Email Address" },
    { q: "What is your phone number?", type: "text", inputType: "tel", placeholder: "Phone Number" },
];

const SELL_QUESTIONS = [
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
    { q: "What is your phone number?", type: "text", inputType: "tel", placeholder: "Phone Number" },
];

const FLOWS = {
    [FLOW_TYPE.BUY]: BUY_QUESTIONS,
    [FLOW_TYPE.SELL]: SELL_QUESTIONS,
};
