"use client";

import { useState, useRef, useCallback } from "react";

const TERMS = {
  en: [
    "The application fee is strictly non-refundable under any circumstances.",
    "This fee is for preliminary application screening only. It is not a franchise fee.",
    "Application approval is entirely based on the applicant's details, background verification, and credit history report. No guarantee of approval is provided.",
    "If the application is not approved, the applicant has no right to a refund, no right to demand an explanation, and no right to take legal action.",
    "Defamation: Any false, defamatory, or disparaging remarks made about December Delights — online or offline — in connection with the application process or decision constitutes criminal defamation under Section 356 of the Bharatiya Nyaya Sanhita (BNS), 2023. This may result in imprisonment up to two years, a fine, or both.",
    "All official communication will be sent only through the official December Delights email. We will not contact applicants by phone or WhatsApp regarding application approval or rejection.",
    "December Delights shall not be held liable for any loss caused by anyone falsely impersonating our brand.",
    "The timeline for application review and decision is entirely at the discretion of December Delights.",
    "By submitting the application, you confirm that you have read, understood, and agree to all the above terms and conditions.",
  ],
  te: [
    "దరఖాస్తు రుసుము ఏ పరిస్థితుల్లోనూ తిరిగి చెల్లించబడదు.",
    "ఈ రుసుము కేవలం దరఖాస్తు ప్రాథమిక పరిశీలన కోసం మాత్రమే. ఇది ఫ్రాంచైజీ రుసుము కాదు.",
    "దరఖాస్తు ఆమోదం పూర్తిగా అభ్యర్థి యొక్క వివరాలు, నేపథ్య ధృవీకరణ మరియు రుణ చరిత్ర నివేదిక ఆధారంగా నిర్ణయించబడుతుంది. ఆమోదానికి ఎలాంటి హామీ ఇవ్వబడదు.",
    "దరఖాస్తు ఆమోదం పొందకపోతే, అభ్యర్థికి రుసుము తిరిగి పొందే హక్కు, కారణం కోరే హక్కు లేదా చట్టపరమైన చర్య తీసుకునే హక్కు ఉండదు.",
    "పరువు నష్టం: దరఖాస్తు ప్రక్రియ లేదా నిర్ణయానికి సంబంధించి December Delights గురించి ఆన్‌లైన్ లేదా ఆఫ్‌లైన్‌లో తప్పుడు, అవమానకరమైన లేదా పరువు నష్టం కలిగించే వ్యాఖ్యలు చేయడం భారతీయ న్యాయ సంహిత (BNS), 2023 లోని సెక్షన్ 356 ప్రకారం నేరంగా పరిగణించబడుతుంది. దీనికి గరిష్టంగా రెండు సంవత్సరాల జైలు శిక్ష, జరిమానా లేదా రెండూ విధించబడవచ్చు.",
    "అన్ని అధికారిక సమాచారాన్ని December Delights అధికారిక ఈమెయిల్ ద్వారా మాత్రమే పంపిస్తాము. దరఖాస్తు ఆమోదం లేదా తిరస్కరణ విషయాల్లో మేము ఫోన్ లేదా వాట్సాప్ ద్వారా సంప్రదించము.",
    "మా సంస్థ పేరుతో ఎవరైనా నకిలీగా వ్యవహరించి మోసం చేసినట్లయితే, దాని వల్ల కలిగే ఏ నష్టానికైనా December Delights బాధ్యత వహించదు.",
    "దరఖాస్తు పరిశీలన మరియు నిర్ణయం తీసుకునే కాలవ్యవధి పూర్తిగా December Delights స్వంత నిర్ణయం పై ఆధారపడి ఉంటుంది.",
    "దరఖాస్తు సమర్పించడం ద్వారా, పై పేర్కొన్న అన్ని నిబంధనలు మరియు షరతులను చదివి, అర్థం చేసుకుని, వాటికి మీరు అంగీకరిస్తున్నట్లు నిర్ధారిస్తున్నారు.",
  ],
  hi: [
    "आवेदन शुल्क किसी भी परिस्थिति में वापस नहीं किया जाएगा।",
    "यह शुल्क केवल प्रारंभिक आवेदन स्क्रीनिंग के लिए है। यह फ्रैंचाइज़ी शुल्क नहीं है।",
    "आवेदन की स्वीकृति पूरी तरह से आवेदक के विवरण, पृष्ठभूमि सत्यापन और क्रेडिट इतिहास रिपोर्ट पर निर्भर करती है। स्वीकृति की कोई गारंटी नहीं दी जाती है।",
    "यदि आवेदन स्वीकृत नहीं होता है, तो आवेदक को शुल्क वापसी का अधिकार, कारण मांगने का अधिकार या कानूनी कार्रवाई करने का अधिकार नहीं होगा।",
    "मानहानि: आवेदन प्रक्रिया या निर्णय के संबंध में December Delights के बारे में ऑनलाइन या ऑफलाइन कोई भी झूठी, मानहानिकारक या निरादरजनक टिप्पणी करना भारतीय न्याय संहिता (BNS), 2023 की धारा 356 के तहत आपराधिक मानहानि माना जाएगा। इसके लिए अधिकतम दो साल की जेल, जुर्माना या दोनों हो सकते हैं।",
    "सभी आधिकारिक संचार केवल December Delights के आधिकारिक ईमेल के माध्यम से भेजे जाएंगे। हम आवेदन स्वीकृति या अस्वीकृति के संबंध में फोन या व्हाट्सएप पर आवेदकों से संपर्क नहीं करेंगे।",
    "हमारे ब्रांड के नाम पर कोई भी अनधिकृत व्यक्ति धोखाधड़ी करता है, तो उसके कारण होने वाले किसी भी नुकसान के लिए December Delights जिम्मेदार नहीं होगा।",
    "आवेदन की समीक्षा और निर्णय की समयसीमा पूरी तरह से December Delights के विवेक पर निर्भर करती है।",
    "आवेदन जमा करके, आप पुष्टि करते हैं कि आपने ऊपर दी गई सभी शर्तों और नियमों को पढ़ा, समझा और उनसे सहमत हैं।",
  ],
};

const LANG_LABELS: Record<string, string> = { en: "English", te: "తెలుగు", hi: "हिन्दी" };
const LANG_FLAGS: Record<string, string> = { en: "🇬🇧", te: "🇮🇳", hi: "🇮🇳" };

export default function TermsModal({ open = true, onClose, onAccept }: { open?: boolean; onClose: () => void; onAccept?: (language: string) => void }) {
  const [accepted, setAccepted] = useState(false);
  const [lang, setLang] = useState<"en" | "te" | "hi">("en");
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopSpeech = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setSpeaking(false);
  }, []);

  const speak = useCallback(() => {
    if (typeof window === "undefined") return;
    stopSpeech();
    const audio = new Audio(`/terms-audio/${lang}.mp3`);
    audioRef.current = audio;
    audio.onended = () => { setSpeaking(false); audioRef.current = null; };
    audio.onerror = () => { setSpeaking(false); audioRef.current = null; };
    audio.play().then(() => setSpeaking(true)).catch(() => { setSpeaking(false); audioRef.current = null; });
  }, [lang, stopSpeech]);

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
              <button key={l} onClick={() => { stopSpeech(); setLang(l); }}
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

          {/* Terms */}
          <div style={{ marginBottom: "1.5rem" }}>
            {TERMS[lang].map((term, i) => (
              <div key={i} style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", padding: "0.75rem 1rem", borderRadius: "12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ fontFamily: "var(--font-bebas-neue), sans-serif", fontSize: "1rem", color: "#c8a97e", flexShrink: 0, minWidth: "1.5rem", textAlign: "right" }}>{String(i + 1).padStart(2, "0")}</span>
                <p style={{ fontFamily: "var(--font-outfit), sans-serif", fontSize: "0.9rem", color: "rgba(245,240,235,0.65)", lineHeight: 1.7, margin: 0 }}>{term}</p>
              </div>
            ))}
          </div>

          {/* Accept checkbox */}
          <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", marginBottom: "1.25rem", padding: "0.75rem 1rem", borderRadius: "12px", background: accepted ? "rgba(200,169,126,0.1)" : "transparent", border: accepted ? "1px solid rgba(200,169,126,0.3)" : "1px solid transparent", transition: "all 0.2s" }}>
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} style={{ accentColor: "#c8a97e", width: "18px", height: "18px", flexShrink: 0 }} />
            <span style={{ fontFamily: "var(--font-outfit), sans-serif", fontSize: "0.9rem", color: "rgba(245,240,235,0.6)" }}>I have read and agree to all terms above</span>
          </label>

          {/* Buttons */}
          <div className="terms-action-row">
            <button
              onClick={() => { stopSpeech(); onClose(); }}
              style={{ flex: 1, padding: "0.85rem", borderRadius: "100px", border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "#f5f0eb", fontFamily: "var(--font-outfit), sans-serif", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }}>
              Cancel
            </button>
            <button
              onClick={() => { if (accepted) { stopSpeech(); onAccept?.(lang); } }}
              disabled={!accepted}
              style={{ flex: 1, padding: "0.85rem", borderRadius: "100px", border: "none", background: accepted ? "#c8a97e" : "#333", color: accepted ? "#0a0a0a" : "#666", fontFamily: "var(--font-outfit), sans-serif", fontSize: "0.9rem", fontWeight: 700, cursor: accepted ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
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