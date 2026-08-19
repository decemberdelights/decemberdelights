import type { Metadata } from "next";
import Link from "next/link";
import ScrollProgress from "@/components/ScrollProgress";

export const metadata: Metadata = {
  title: "Terms & Conditions | December Delights",
  description: "Read the full Terms and Conditions for December Delights franchise application.",
};

const ALL_TERMS = [
  { title: "Acceptance of Terms", text: "By submitting a Franchise Application and paying the prescribed Application Fee, the Applicant confirms that they have carefully read, understood, and voluntarily accepted these Terms & Conditions." },
  { title: "Purpose of the Application Fee", text: "The Application Fee of ₹9,999/- plus 18% GST (₹11,799/- total) is collected solely for: Initial screening of the applicant, Verification of submitted information, Financial assessment, Background verification, Business suitability review, Market feasibility analysis, Administrative processing. This fee is strictly an Application Processing Fee and shall not be treated as: Franchise Fee, Security Deposit, Booking Amount, Refundable Deposit, Advance towards Franchise." },
  { title: "Non-Refundable Fee", text: "The Application Fee is strictly non-refundable under all circumstances, including but not limited to: Application rejection, Withdrawal by applicant, Failure to submit documents, Delay in review, Non-selection, Business policy changes, Applicant becoming ineligible, Expiry of application. No request for refund shall be entertained." },
  { title: "No Guarantee of Franchise", text: "Submission of an application or payment of the Application Fee does not guarantee: Franchise approval, Interview, Site inspection, Reservation of territory, Future partnership, Execution of Franchise Agreement. Only applicants approved by December Delights shall be invited for further discussions." },
  { title: "Evaluation Process", text: "Applications are evaluated based on several commercial and operational factors, including but not limited to: Business experience, Entrepreneurial capability, Financial strength, Creditworthiness, Background verification, Character and reputation, Business vision, Location feasibility, Population density, Local demand, Market competition, Internal expansion strategy, Long-term sustainability. The decision of December Delights shall be final and binding." },
  { title: "Tier-3 & Emerging Markets", text: "December Delights does not guarantee franchise opportunities in every city. Applications from Tier-3 or emerging markets are evaluated based on: Population, Purchasing power, Commercial activity, Market demand, Future scalability, Investment potential, Brand suitability. Approval shall solely depend upon the Company's commercial assessment." },
  { title: "Business Experience", text: "Applicants having prior experience in hospitality, food service, retail, management, or entrepreneurship may receive preference. However, previous experience alone shall not guarantee approval." },
  { title: "Proof of Funds", text: "Applicants must demonstrate adequate financial capability. December Delights may request: Bank Statements, Income Tax Returns, Loan Sanction Letters, Net Worth Certificates, CA Certificate, Investment Proof, Property Documents, Any additional financial documents. Failure to furnish satisfactory documents may result in rejection." },
  { title: "Review Timeline", text: "There is no fixed timeline for reviewing franchise applications. The Company reserves the exclusive right to determine the order and duration of review depending upon: Number of applications, Internal verification, Business priorities, Expansion plans, Operational requirements. Applicants shall not claim any right based upon delay." },
  { title: "Territorial Policy", text: "December Delights generally avoids approving multiple franchise outlets within approximately 5 to 10 kilometres of an existing operational franchise. However, the Company reserves the exclusive right to determine territorial boundaries based upon: Population, Market demand, Future expansion, Commercial viability, Brand strategy. No applicant shall claim exclusive territorial rights unless expressly granted through a written Franchise Agreement." },
  { title: "Official Communication", text: "All official communication shall be made only through: info@decemberdelights.in. Applicants are advised not to rely upon: Phone Calls, WhatsApp Messages, Social Media Messages, Third Parties, Brokers, Consultants, Unauthorised Representatives. Unless specifically authorised by December Delights in writing." },
  { title: "Fraud & Impersonation", text: "December Delights shall not be responsible for any fraud, financial loss, misrepresentation or damages caused by persons falsely claiming to represent the Company. Applicants are solely responsible for verifying the authenticity of communications before making any payment." },
  { title: "Confidential Review Process", text: "The internal review methodology, scoring parameters, approval criteria, expansion strategy and commercial evaluation process are confidential proprietary information belonging exclusively to December Delights. The Company is under no obligation to disclose the reasons for approval, rejection or deferment except where required under applicable law." },
  { title: "Intellectual Property", text: "The following are the exclusive intellectual property of December Delights: December Delights®, NOT JUST A CAFE®, Logos, Designs, Menu Concepts, Recipes, Brand Identity, Marketing Material, Trade Dress, Business Systems. Applicants acquire no ownership, licence or usage rights merely by applying for a franchise. Unauthorised use may invite appropriate legal action under applicable intellectual property laws." },
  { title: "Defamatory Statements", text: "Applicants agree not to knowingly publish or circulate any false, misleading or defamatory statement concerning December Delights, its promoters, directors, employees, franchisees or business operations. Any unlawful defamatory act may attract appropriate civil and/or criminal remedies available under the laws of India, including the Bharatiya Nyaya Sanhita, 2023, where applicable." },
  { title: "Reservation of Rights", text: "December Delights reserves the absolute right to: Accept or reject any application, Seek additional documents, Suspend the review process, Modify eligibility criteria, Change expansion strategy, Discontinue franchise opportunities in any region, Amend these Terms & Conditions at any time. Such decisions shall be made solely at the Company's discretion." },
  { title: "Privacy", text: "All information submitted by applicants shall be used exclusively for franchise evaluation and related business purposes. Applicants consent to verification of submitted information from banks, financial institutions, government records or other lawful sources whenever considered necessary." },
  { title: "Governing Law & Jurisdiction", text: "These Terms & Conditions shall be governed by the laws of India. Any dispute arising from or relating to the Franchise Application shall be subject to the exclusive jurisdiction of the competent courts having jurisdiction over the registered office of December Delights." },
  { title: "Force Majeure", text: "December Delights shall not be liable for delays or inability to process applications resulting from circumstances beyond its reasonable control, including but not limited to natural disasters, pandemics, government actions, strikes, technical failures, cyber incidents, or other force majeure events." },
  { title: "Entire Understanding", text: "These Terms & Conditions constitute the entire understanding relating to the Franchise Application process and supersede any prior verbal discussions, emails, representations or promotional material regarding the application process." },
  { title: "Declaration by Applicant", text: "By submitting this application and paying the prescribed Application Fee, I hereby declare that: I have read and understood these Terms & Conditions, All information submitted by me is true and accurate, I understand that payment of the Application Fee does not guarantee franchise approval, I understand that the Application Fee is non-refundable, I agree to comply with all policies of December Delights." },
];

export default function TermsPage() {
  return (
    <>
      <style>{`
        .terms-page { background: #fdf9f4; min-height: 100vh; }
        .terms-hero { background: #074134; padding: 5rem 5% 3rem; text-align: center; }
        .terms-body { max-width: 820px; margin: 0 auto; padding: 4rem 5% 6rem; }
        .term-card { display: flex; gap: 1rem; padding: 1.25rem 1.5rem; border-radius: 14px; background: #fff; border: 1px solid rgba(27,60,51,0.06); margin-bottom: 0.75rem; transition: box-shadow 0.2s, transform 0.2s; }
        .term-card:hover { box-shadow: 0 4px 20px rgba(27,60,51,0.06); transform: translateY(-1px); }
        .term-num { font-family: var(--font-bebas-neue), sans-serif; font-size: 1.1rem; color: #c8a97e; flex-shrink: 0; min-width: 2rem; text-align: right; line-height: 1.7; }
        .term-content h4 { font-family: var(--font-outfit), sans-serif; font-size: 0.95rem; color: #1b3c33; margin: 0 0 0.3rem; font-weight: 600; }
        .term-content p { font-family: var(--font-outfit), sans-serif; font-size: 0.88rem; color: rgba(27,60,51,0.6); line-height: 1.7; margin: 0; }
        .terms-back { display: inline-flex; align-items: center; gap: 0.5rem; font-family: var(--font-outfit), sans-serif; font-size: 0.9rem; color: rgba(253,249,244,0.6); text-decoration: none; transition: color 0.2s; }
        .terms-back:hover { color: #c8a97e; }
        @media (max-width: 640px) {
          .terms-hero { padding: 4rem 5% 2.5rem; }
          .terms-body { padding: 2.5rem 5% 4rem; }
          .term-card { padding: 1rem 1.15rem; }
          .term-content h4 { font-size: 0.9rem; }
          .term-content p { font-size: 0.82rem; }
        }
      `}</style>

      <div className="terms-page">
        <ScrollProgress />
        {/* Hero */}
        <section className="terms-hero" data-bg="dark">
          <Link href="/" className="terms-back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            Back to Home
          </Link>
          <h1 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", fontSize: "clamp(2.5rem, 5vw, 4rem)", color: "#fdf9f4", letterSpacing: "0.04em", margin: "1.5rem 0 0.75rem" }}>Terms & Conditions</h1>
          <p style={{ fontFamily: "var(--font-outfit), sans-serif", fontSize: "1rem", color: "rgba(253,249,244,0.5)", maxWidth: "520px", margin: "0 auto", lineHeight: 1.6 }}>
            Please read all terms carefully before submitting your franchise application.
          </p>
        </section>

        {/* Terms list */}
        <section className="terms-body">
          <p style={{ fontFamily: "var(--font-outfit), sans-serif", fontSize: "0.85rem", color: "rgba(27,60,51,0.4)", marginBottom: "2rem", textAlign: "center" }}>
            Last updated: August 2026 &middot; {ALL_TERMS.length} clauses
          </p>

          {ALL_TERMS.map((term, i) => (
            <div key={i} className="term-card">
              <span className="term-num">{String(i + 1).padStart(2, "0")}</span>
              <div className="term-content">
                <h4>{term.title}</h4>
                <p>{term.text}</p>
              </div>
            </div>
          ))}

          {/* Footer note */}
          <div style={{ textAlign: "center", marginTop: "3rem", padding: "2rem", borderRadius: "14px", background: "rgba(27,60,51,0.03)", border: "1px solid rgba(27,60,51,0.06)" }}>
            <p style={{ fontFamily: "var(--font-outfit), sans-serif", fontSize: "0.85rem", color: "rgba(27,60,51,0.5)", lineHeight: 1.7, margin: 0 }}>
              By submitting your franchise application and paying the application fee, you confirm that you have read, understood, and agree to be bound by all the terms and conditions set forth above.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
