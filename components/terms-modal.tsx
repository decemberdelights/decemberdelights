"use client";

import { useState, useRef, useCallback } from "react";

const TERMS = {
  en: [
    "The application fee is strictly non-refundable under any circumstances.",
    "This fee is for filtration only — not a franchise fee.",
    "Approval depends on profile, background check, and credit report. No guarantees are made.",
    "Non-approval does not entitle any refund, explanation, or legal recourse.",
    "Defamation: Any defamatory, disparaging, or false statement made against December Delights — online or offline — in connection with any application decision constitutes criminal defamation under Section 356 of the Bharatiya Nyaya Sanhita (BNS), 2023. Punishment includes imprisonment up to 2 years, fine, or both.",
    "All communication is via official domain email only. We never call or WhatsApp applicants for approvals.",
    "We are not liable for any loss from unauthorized impersonation of our brand.",
    "The review timeline is at the discretion of December Delights.",
    "By submitting, you confirm you have read and agree to all terms above.",
  ],
  te: [
    "అప్లికేషన్ ఫీజు ఎట్టి పరిస్థితుల్లోనూ తిరిగి ఇవ్వబడదు.",
    "ఈ ఫీజు కేవలం వడపోత (Filtration) కోసం మాత్రమే — ఇది ఫ్రాంచైజీ ఫీజు కాదు.",
    "ఆమోదం అనేది మీ ప్రొఫైల్, బ్యాక్‌గ్రౌండ్ వెరిఫికేషన్ మరియు క్రెడిట్ రిపోర్ట్‌పై ఆధారపడి ఉంటుంది.",
    "తిరస్కరణకు గురైన అప్లికేషన్లకు ఎటువంటి రీఫండ్ లేదా వివరణ ఇవ్వబడదు.",
    "పరువు నష్టం: అప్లికేషన్ నిర్ణయానికి సంబంధించి ఆన్‌లైన్ లేదా ఆఫ్‌లైన్లో డిసెంబర్ డిలైట్స్పై ఎటువంటి తప్పుడు లేదా అపవాదు స్టేట్‌మెంట్స్ చేసినా భారతీయ న్యాయ సంహిత (BNS) 2023 లోని సెక్షన్ 356 ప్రకారం నేరపూరిత పరువు నష్టం అవుతుంది. దీనికి 2 ఏళ్ల వరకు జైలు శిక్ష లేదా జరిమానా ఉండవచ్చు.",
    "కమ్యూనికేషన్ కేవలం అధికారిక ఈమెయిల్ ద్వారా మాత్రమే జరుగుతుంది. మేము ఫోన్ లేదా వాట్సాప్ ద్వారా ఆమోదాలను పంపము.",
    "మా బ్రాండ్ పేరుతో జరిగే మోసాలకు మేము బాధ్యత వహించము.",
    "రివ్యూ సమయం డిసెంబర్ డిలైట్స్ నిర్ణయంపై ఆధారపడి ఉంటుంది.",
    "సబ్మిట్ చేయడం ద్వారా, మీరు పైన పేర్కొన్న అన్ని నిబంధనలను అంగీకరిస్తున్నారని ధృవీకరిస్తున్నారు.",
  ],
  hi: [
    "आवेदन शुल्क किसी भी परिस्थिति में वापस नहीं किया जाएगा।",
    "यह शुल्क केवल फिल्ट्रेशन के लिए है — यह फ्रैंचाइज़ी शुल्क नहीं है।",
    "अनुमोदन प्रोफ़ाइल, पृष्ठभूमि जांच और क्रेडिट रिपोर्ट पर निर्भर करता है। कोई गारंटी नहीं दी जाती है।",
    "अनुमोदन न मिलने पर किसी भी प्रकार की धनवापसी (refund) या स्पष्टीकरण का अधिकार नहीं होगा।",
    "मानहानि: आवेदन निर्णय के संबंध में दिसंबर डिलाइट्स के खिलाफ ऑनलाइन या ऑफलाइन कोई भी अपमानजनक या झूठा बयान देना भारतीय न्याय संहिता (BNS), 2023 की धारा 356 के तहत आपराधिक मानहानि माना जाएगा। सजा में 2 साल तक की जेल, जुर्माना या दोनों शामिल हैं।",
    "सभी संचार केवल आधिकारिक ईमेल के माध्यम से होते हैं। हम कभी भी अनुमोदन के लिए कॉल या व्हाट्सएप नहीं करते।",
    "हमारे ब्रांड के नाम पर होने वाले किसी भी धोखाधड़ी के लिए हम जिम्मेदार नहीं हैं।",
    "समीक्षा की समयसीमा दिसंबर डिलाइट्स के विवेक पर निर्भर करती है।",
    "सबमिट करके, आप पुष्टि करते हैं कि आपने उपरोक्त सभी शर्तों को पढ़ लिया है और उनसे सहमत हैं।",
  ],
};

const LANG_LABELS: Record<string, string> = { en: "English", te: "తెలుగు", hi: "हिन्दी" };
const LANG_FLAGS: Record<string, string> = { en: "🇬🇧", te: "🇮🇳", hi: "🇮🇳" };

export default function TermsModal({ open = true, onClose, onAccept }: { open?: boolean; onClose: () => void; onAccept?: (language: string) => void }) {
  const [accepted, setAccepted] = useState(false);
  const [lang, setLang] = useState<"en" | "te" | "hi">("en");
  const [speaking, setSpeaking] = useState(false);
  const [voiceWarning, setVoiceWarning] = useState("");
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const checkVoiceSupport = useCallback((language: string): boolean => {
    if (typeof window === "undefined" || !window.speechSynthesis) return false;
    const voices = window.speechSynthesis.getVoices();
    const langPrefix = language === "te" ? "te" : language === "hi" ? "hi" : "en";
    return voices.some(v => v.lang.startsWith(langPrefix));
  }, []);

  const stopSpeech = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      utteranceRef.current = null;
    }
  }, []);

  const speak = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    stopSpeech();
    if (!checkVoiceSupport(lang)) {
      setVoiceWarning(lang === "hi" ? "Hindi voice not available on this device. Please read the terms manually." : lang === "te" ? "Telugu voice not available on this device. Please read the terms manually." : "Voice not available on this device.");
      return;
    }
    setVoiceWarning("");
    const text = TERMS[lang].join(". ");
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === "te" ? "te-IN" : lang === "hi" ? "hi-IN" : "en-US";
    u.rate = 0.85; u.pitch = 1;
    u.onend = () => { setSpeaking(false); utteranceRef.current = null; };
    u.onerror = () => { setSpeaking(false); utteranceRef.current = null; };
    utteranceRef.current = u;
    window.speechSynthesis.speak(u);
    setSpeaking(true);
  }, [lang, stopSpeech, checkVoiceSupport]);

  if (!open) return null;

  return (
    <>
      <style>{`
        .terms-modal-inner {
          background: #1a1a1a;
          border-radius: 20px;
          padding: 2.5rem;
          max-width: 560px;
          width: 100%;
          max-height: 85vh;
          overflow: auto;
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 25px 60px rgba(0,0,0,0.5);
        }
        .terms-lang-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }
        .terms-action-row {
          display: flex;
          gap: 1rem;
        }
        @media (max-width: 480px) {
          .terms-modal-inner {
            padding: 1.5rem 1.25rem;
            border-radius: 16px;
            max-height: 92vh;
          }
          .terms-action-row {
            flex-direction: column;
            gap: 0.75rem;
          }
          .terms-action-row button {
            width: 100%;
          }
          .terms-lang-row {
            gap: 0.4rem;
          }
        }
      `}</style>
      <div
        style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
        onClick={onClose}
      >
        <div className="terms-modal-inner" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
            <h3 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", fontSize: "1.6rem", color: "#f5f0eb", letterSpacing: "0.04em", margin: 0 }}>Terms & Conditions</h3>
            <button onClick={() => { stopSpeech(); onClose(); }} style={{ background: "none", border: "none", color: "rgba(245,240,235,0.4)", cursor: "pointer", padding: "0.25rem", flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>

          {/* Language + TTS */}
          <div className="terms-lang-row">
            {(["en", "te", "hi"] as const).map((l) => (
              <button key={l} onClick={() => { stopSpeech(); setLang(l); setVoiceWarning(""); }}
                style={{ padding: "0.45rem 1rem", borderRadius: "100px", border: lang === l ? "1.5px solid #c8a97e" : "1.5px solid rgba(255,255,255,0.1)", background: lang === l ? "rgba(200,169,126,0.15)" : "transparent", color: lang === l ? "#c8a97e" : "rgba(245,240,235,0.4)", fontFamily: "var(--font-outfit), sans-serif", fontSize: "0.8rem", fontWeight: lang === l ? 700 : 500, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <span>{LANG_FLAGS[l]}</span> {LANG_LABELS[l]}
              </button>
            ))}
            <button onClick={speaking ? stopSpeech : speak}
              style={{ marginLeft: "auto", padding: "0.45rem 1rem", borderRadius: "100px", border: "1.5px solid rgba(200,169,126,0.4)", background: speaking ? "rgba(200,169,126,0.15)" : "transparent", color: "#c8a97e", fontFamily: "var(--font-outfit), sans-serif", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              {speaking ? (
                <><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg> Stop</>
              ) : (
                <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></svg> Speak</>
              )}
            </button>
          </div>
          {voiceWarning && (
            <div style={{ marginBottom: "1rem", padding: "0.6rem 1rem", borderRadius: "10px", background: "rgba(200,169,126,0.1)", border: "1px solid rgba(200,169,126,0.25)", fontFamily: "var(--font-outfit), sans-serif", fontSize: "0.78rem", color: "#c8a97e" }}>
              {voiceWarning}
            </div>
          )}

          {/* Terms */}
          <div style={{ marginBottom: "1.5rem" }}>
            {TERMS[lang].map((term, i) => (
              <div key={i} style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", padding: "0.75rem 1rem", borderRadius: "12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ fontFamily: "var(--font-bebas-neue), sans-serif", fontSize: "1rem", color: "#c8a97e", flexShrink: 0, minWidth: "1.5rem", textAlign: "right" }}>{String(i + 1).padStart(2, "0")}</span>
                <p style={{ fontFamily: "var(--font-outfit), sans-serif", fontSize: "0.82rem", color: "rgba(245,240,235,0.65)", lineHeight: 1.7, margin: 0 }}>{term}</p>
              </div>
            ))}
          </div>

          {/* Accept checkbox */}
          <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", marginBottom: "1.25rem", padding: "0.75rem 1rem", borderRadius: "12px", background: accepted ? "rgba(200,169,126,0.1)" : "transparent", border: accepted ? "1px solid rgba(200,169,126,0.3)" : "1px solid transparent", transition: "all 0.2s" }}>
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} style={{ accentColor: "#c8a97e", width: "18px", height: "18px", flexShrink: 0 }} />
            <span style={{ fontFamily: "var(--font-outfit), sans-serif", fontSize: "0.85rem", color: "rgba(245,240,235,0.6)" }}>I have read and agree to all terms above</span>
          </label>

          {/* Buttons */}
          <div className="terms-action-row">
            <button
              onClick={() => { stopSpeech(); onClose(); }}
              style={{ flex: 1, padding: "0.85rem", borderRadius: "100px", border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "#f5f0eb", fontFamily: "var(--font-outfit), sans-serif", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }}>
              Cancel
            </button>
            <button
              onClick={() => { if (accepted) { stopSpeech(); onAccept?.(lang); } }}
              disabled={!accepted}
              style={{ flex: 1, padding: "0.85rem", borderRadius: "100px", border: "none", background: accepted ? "#c8a97e" : "#333", color: accepted ? "#0a0a0a" : "#666", fontFamily: "var(--font-outfit), sans-serif", fontSize: "0.85rem", fontWeight: 700, cursor: accepted ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
              onMouseEnter={(e) => { if (accepted) e.currentTarget.style.background = "#b89a6e"; }}
              onMouseLeave={(e) => { if (accepted) e.currentTarget.style.background = "#c8a97e"; }}>
              Accept & Submit
            </button>
          </div>
        </div>
      </div>
    </>
  );
}