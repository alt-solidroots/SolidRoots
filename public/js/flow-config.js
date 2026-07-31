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

const CONTACT_QUESTIONS = [
    { q: "What is your email address?", type: "text", inputType: "email", placeholder: "Email Address" },
    { q: "What is your phone number?", type: "text", inputType: "tel", placeholder: "Phone Number" },
];

// Full question list to use (after the property-type question) once a specific
// type is chosen. Add an entry per option as they're defined; types without an
// entry here fall back to the generic BUY_QUESTIONS tail.
const BUY_TYPE_QUESTIONS = {
    "Residential Plot": [
        { q: "Tell us about your requirement", type: "form", fields: [
            { key: "Name", placeholder: "Full Name" },
            { key: "Preferred Size", placeholder: "e.g. 200 sq yards" },
            { key: "Society Name / City", placeholder: "e.g. Sector 21, Sonipat" },
            { key: "Budget (approx)", placeholder: "e.g. 50 Lakhs" },
            { key: "Phone Number", type: "tel", placeholder: "10-digit Phone Number" },
        ] },
    ],
    "Industrial Plot": [
        { q: "Tell us about your requirement", type: "form", fields: [
            { key: "Name", placeholder: "Full Name" },
            { key: "Contact", type: "tel", placeholder: "10-digit Phone Number" },
            { key: "Preferred Size of Plot", placeholder: "e.g. 500 sq yards" },
            { key: "Zone", type: "select", options: ["Free", "CLU", "Hrera approved"] },
            { key: "City", placeholder: "e.g. Sonipat" },
            { key: "Budget (approx)", placeholder: "e.g. 1 Crore" },
        ] },
    ],
    "Land": [
        { q: "Tell us about your requirement", type: "form", fields: [
            { key: "Name", placeholder: "Full Name" },
            { key: "Contact", type: "tel", placeholder: "10-digit Phone Number" },
            { key: "Looking For", type: "select", options: ["Industrial Land", "Agricultural Land", "Commercial Land", "Residential"] },
            { key: "Preferred Area in Acre", placeholder: "e.g. 2 Acres" },
            { key: "City", placeholder: "e.g. Sonipat" },
            { key: "Budget (approx)", placeholder: "e.g. 1 Crore" },
        ] },
    ],
    "Floor / Flat": [
        { q: "Tell us about your requirement", type: "form", fields: [
            { key: "Name", placeholder: "Full Name" },
            { key: "Contact", type: "tel", placeholder: "10-digit Phone Number" },
            { key: "Preferred Size", type: "select", options: ["2 BHK", "3 BHK", "4 BHK"] },
            { key: "City", placeholder: "e.g. Sonipat" },
            { key: "Budget (approx)", placeholder: "e.g. 1 Crore" },
        ] },
    ],
};

const BUY_QUESTIONS = [
    { q: "What are you looking to buy?", type: "choice", options: ["Residential Plot", "Industrial Plot", "Land", "Floor / Flat"] },
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
    ...CONTACT_QUESTIONS,
];

const SELL_QUESTIONS = [
    { q: "What are you looking to sell?", type: "choice", options: ["Residential Plot", "Industrial Plot", "Land", "Floor / Flat"] },
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
