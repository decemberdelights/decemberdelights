import os
import time
import json
import sqlite3
import threading
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)

_DB_PATH = os.path.join(os.path.dirname(__file__), "..", ".data", "app.db")
os.makedirs(os.path.dirname(_DB_PATH), exist_ok=True)

_local = threading.local()


def _seed_terms_if_empty(conn: sqlite3.Connection):
    """Insert default terms & conditions if the table is empty."""
    count = conn.execute("SELECT COUNT(*) FROM terms_conditions").fetchone()[0]
    if count > 0:
        return

    terms = [
        ("Acceptance of Terms", "దరఖాస్తు & రుసుము", "आवेदन & शुल्क",
         "By submitting a Franchise Application and paying the prescribed Application Fee, the Applicant confirms that they have carefully read, understood, and voluntarily accepted these Terms & Conditions.",
         "ఫ్రాంచైజీ దరఖాస్తు సమర్పించి, నిర్ణీత దరఖాస్తు రుసుము చెల్లించడం ద్వారా, దరఖాస్తుదారుడు ఈ నిబంధనలు మరియు షరతులను జాగ్రత్తగా చదివి, అర్థం చేసుకుని, స్వచ్ఛందంగా అంగీకరించారని ధృవీకరిస్తారు.",
         "फ्रैंचाइज़ी आवेदन जमा करके और निर्धारित आवेदन शुल्क का भुगतान करके, आवेदक पुष्टि करता है कि उसने इन नियमों एवं शर्तों को ध्यान से पढ़ा, समझा और स्वेच्छा से स्वीकार किया है।"),
        ("Purpose of the Application Fee", "రుసుము వివరాలు", "शुल्क विवरण",
         "The Application Fee of ₹9,999/- plus 18% GST (₹11,799/- total) is collected solely for: Initial screening of the applicant, Verification of submitted information, Financial assessment, Background verification, Business suitability review, Market feasibility analysis, Administrative processing. This fee is strictly an Application Processing Fee and shall not be treated as: Franchise Fee, Security Deposit, Booking Amount, Refundable Deposit, Advance towards Franchise.",
         "దరఖాస్తుదారుడి ప్రాథమిక స్క్రీనింగ్, సమర్పించిన సమాచారం ధృవీకరణ, ఆర్థిక అంచనా, బ్యాక్గ్రౌండ్ ధృవీకరణ, వ్యాపార అనుకూలత సమీక్ష, మార్కెట్ సాధ్యతా విశ్లేషణ, పరిపాలనా ప్రాసెసింగ్ కోసం మాత్రమే ₹9,999/- ప్లస్ 18% GST (₹11,799/- మొత్తం) దరఖాస్తు రుసుము సేకరించబడుతుంది. ఈ రుసుము ఖచ్చితంగా దరఖాస్తు ప్రాసెసింగ్ రుసుము మాత్రమే, దీనిని: ఫ్రాంచైజీ రుసుము, సెక్యూరిటీ డిపాజిట్, బుకింగ్ అమౌంట్, రిఫండబల్ డిపాజిట్, ఫ్రాంచైజీకి అడ్వాన్స్ గా పరిగణించరాదు.",
         "<strong>₹9,999/-</strong> प्लस <strong>18% GST</strong> (<strong>₹11,799/- कुल</strong>) का आवेदन शुल्क केवल: आवेदक की प्रारंभिक स्क्रीनिंग, प्रस्तुत जानकारी का सत्यापन, वित्तीय मूल्यांकन, पृष्ठभूमि सत्यापन, व्यापार उपयुक्तता समीक्षा, बाजार व्यवहार्यता विश्लेषण, प्रशासनिक प्रसंस्करण के लिए एकत्र किया जाता है। यह शुल्क पूरी तरह से आवेदन प्रसंस्करण शुल्क है और इसे: फ्रैंचाइज़ी शुल्क, सुरक्षा जमा, बुकिंग राशि, वापसी योग्य जमा, फ्रैंचाइज़ी की ओर अग्रिम के रूप में नहीं माना जाएगा।"),
        ("Non-Refundable Fee", "రిఫండ్ చేయబడదు", "गैर-वापसी",
         "The Application Fee is strictly non-refundable under all circumstances, including but not limited to: Application rejection, Withdrawal by applicant, Failure to submit documents, Delay in review, Non-selection, Business policy changes, Applicant becoming ineligible, Expiry of application. No request for refund shall be entertained.",
         "అప్లికేషన్ తిరస్కరణ, దరఖాస్తుదారుడి ఉపసంహరణ, పత్రాలు సమర్పించడంలో విఫలం, సమీక్షలో ఆలస్యం, ఎంపిక కాకపోవడం, వ్యాపార విధాన మార్పులు, దరఖాస్తుదారుడు అనర్హుడు కావడం, దరఖాస్తు గడువు ముగియడం వంటి అన్ని పరిస్థితుల్లో దరఖాస్తు రుసుము ఖచ్చితంగా రిఫండ్ చేయబడదు. రిఫండ్ అభ్యర్థన పరిగణించబడదు.",
         "आवेदन अस्वीकृति, आवेदक द्वारा वापसी, दस्तावेज जमा करने में विफलता, समीक्षा में विलंब, गैर-चयन, व्यापार नीति में बदलाव, आवेदक अयोग्य होने, आवेदन की समय सीमा समाप्त होने सहित सभी परिस्थितियों में आवेदन शुल्क सख्ती से गैर-वापसी योग्य है। रिफंड के लिए कोई अनुरोध स्वीकार नहीं किया जाएगा।"),
        ("No Guarantee of Franchise", "గ్యారంటీ లేదు", "कोई गारंटी नहीं",
         "Submission of an application or payment of the Application Fee does not guarantee: Franchise approval, Interview, Site inspection, Reservation of territory, Future partnership, Execution of Franchise Agreement. Only applicants approved by December Delights shall be invited for further discussions.",
         "దరఖాస్తు సమర్పించడం లేదా దరఖాస్తు రుసుము చెల్లించడం: ఫ్రాంచైజీ ఆమోదం, ఇంటర్వ్యూ, సైట్ ఇన్స్పెక్షన్, టెరిటరీ రిజర్వేషన్, భవిష్యత్ భాగస్వామ్యం, ఫ్రాంచైజీ ఒప్పందం కుదుర్చుకోవడం నిశ్చయించదు. డిసెంబర్ డిలైట్స్ చేత ఆమోదించబడిన దరఖాస్తుదారులకు మాత్రమే మరింత చర్చలకు ఆహ్వానించబడతారు.",
         "आवेदन जमा करने या आवेदन शुल्क का भुगतान करने से: फ्रैंचाइज़ी अनुमोदन, साक्षात्कार, साइट निरीक्षण, क्षेत्र आरक्षण, भविष्य साझेदारी, फ्रैंचाइज़ी समझौते का निष्पादन की गारंटी नहीं होती है। केवल डिसेंबर डिलाइट्स द्वारा अनुमोदित आवेदकों को आगे की चर्चा के लिए आमंत्रित किया जाएगा।"),
        ("Evaluation Process", "మూల్యాంకనం", "मूल्यांकन",
         "Applications are evaluated based on several commercial and operational factors, including but not limited to: Business experience, Entrepreneurial capability, Financial strength, Creditworthiness, Background verification, Character and reputation, Business vision, Location feasibility, Population density, Local demand, Market competition, Internal expansion strategy, Long-term sustainability. The decision of December Delights shall be final and binding.",
         "దరఖాస్తులు వ్యాపార అనుభవం, వ్యవసాయ సామర్థ్యం, ఆర్థిక బలం, క్రెడిట్వర్త్, బ్యాక్గ్రౌండ్ ధృవీకరణ, పాత్ర మరియు ప్రతిష్ఠ, వ్యాపార దృష్టి, స్థానం అనుకూలత, జనాభా సాంద్రత, స్థానిక డిమాండ్, మార్కెట్ పోటీ, అంతర్గత విస్తరణ వ్యూహం, దీర్ఘకాలిక సుస్థిరత వంటి అనేక వాణిజ్య మరియు పనితీరు కారకాల ఆధారంగా మూల్యాంకనం చేయబడతాయి. డిసెంబర్ డిలైట్స్ నిర్ణయం తుదిది మరియు బంధనం.",
         "आवेदन व्यापार अनुभव, उद्यमशीलता क्षमता, वित्तीय मजबूती, ऋण योग्यता, पृष्ठभूमि सत्यापन, चरित्र और प्रतिष्ठा, व्यापार दृष्टि, स्थान व्यवहार्यता, जनसंख्या घनत्व, स्थानीय मांग, बाजार प्रतिस्पर्धा, आंतरिक विस्तार रणनीति, दीर्घकालिक स्थिरता सहित कई वाणिज्यिक और परिचालन कारकों के आधार पर मूल्यांकन किया जाता है। डिसेंबर डिलाइट्स का निर्णय अंतिम और बाध्यकारी होगा।"),
        ("Tier-3 & Emerging Markets", "మార్కెట్ కవరేజ్", "बाजार कवरेज",
         "December Delights does not guarantee franchise opportunities in every city. Applications from Tier-3 or emerging markets are evaluated based on: Population, Purchasing power, Commercial activity, Market demand, Future scalability, Investment potential, Brand suitability. Approval shall solely depend upon the Company's commercial assessment.",
         "డిసెంబర్ డిలైట్స్ ప్రతి నగరంలో ఫ్రాంచైజీ అవకాశాలు హామీ ఇవ్వదు. టైర్-3 లేదా అభివృద్ధి చెందుతున్న మార్కెట్ల నుండి దరఖాస్తులు: జనాభా, కొనుగోలు శక్తి, వాణిజ్య కార్యకలాపం, మార్కెట్ డిమాండ్, భవిష్యత్ స్కేలబిలిటీ, పెట్టుబడి సామర్థ్యం, బ్రాండ్ అనుకూలత ఆధారంగా మూల్యాంకనం చేయబడతాయి. ఆమోదం పూర్తిగా కంపెనీ యొక్క వాణిజ్య అంచనాపై ఆధారపడి ఉంటుంది.",
         "डिसेंबर डिलाइट्स हर शहर में फ्रैंचाइज़ी अवसरों की गारंटी नहीं देता है। टियर-3 या उभरते बाजारों से आवेदन: जनसंख्या, क्रय शक्ति, वाणिज्यिक गतिविधि, बाजार की मांग, भविष्य की स्केलेबिलिटी, निवेश क्षमता, ब्रांड उपयुक्तता के आधार पर मूल्यांकन किया जाता है। अनुमोदन पूरी तरह से कंपनी के वाणिज्यिक मूल्यांकन पर निर्भर होगा।"),
        ("Business Experience", "అనుభవం", "अनुभव",
         "Applicants having prior experience in hospitality, food service, retail, management, or entrepreneurship may receive preference. However, previous experience alone shall not guarantee approval.",
         "హాస్పిటాలిటీ, ఫుడ్ సర్వీస్, రిటైల్, నిర్వహణ లేదా వ్యవసాయంలో ముందస్తు అనుభవం ఉన్న దరఖాస్తుదారులకు ప్రాధాన్యత లభించవచ్చు. అయితే, ముందస్తు అనుభవం మాత్రమే ఆమోదాన్ని హామీ ఇవ్వదు.",
         "आतिथ्य, खाद्य सेवा, खुदरा, प्रबंधन या उद्यमशीलता में पूर्व अनुभव वाले आवेदकों को प्राथमिकता मिल सकती है। हालांकि, केवल पूर्व अनुभव अनुमोदन की गारंटी नहीं देगा।"),
        ("Proof of Funds", "ఆర్థిక పత్రాలు", "वित्तीय दस्तावेज",
         "Applicants must demonstrate adequate financial capability. December Delights may request: Bank Statements, Income Tax Returns, Loan Sanction Letters, Net Worth Certificates, CA Certificate, Investment Proof, Property Documents, Any additional financial documents. Failure to furnish satisfactory documents may result in rejection.",
         "దరఖాస్తుదారులు తగినంత ఆర్థిక సామర్థ్యాన్ని నిరూపించాలి. డిసెంబర్ డిలైట్స్ ఇవి అభ్యర్థించవచ్చు: బ్యాంక్ స్టేట్‌మెంట్లు, ఆదాయపు పన్ను రిటర్నులు, రుణ మంజూరు లేఖలు, నెట్ వర్త్ సర్టిఫికేట్లు, CA సర్టిఫికేట్, పెట్టుబడి రుజువు, ఆస్తి పత్రాలు, ఏవైనా అదనపు ఆర్థిక పత్రాలు. సంతృప్తికరమైన పత్రాలు సమర్పించడంలో విఫలమైతే తిరస్కరణ జరగవచ్చు.",
         "आवेदकों को पर्याप्त वित्तीय क्षमता प्रदर्शित करनी होगी। डिसेंबर डिलाइट्स ये मांग सकता है: बैंक विवरण, आयकर रिटर्न, ऋण स्वीकृति पत्र, शुद्ध मूल्य प्रमाणपत्र, CA प्रमाणपत्र, निवेश प्रमाण, संपत्ति दस्तावेज, कोई अतिरिक्त वित्तीय दस्तावेज। संतोषजनक दस्तावेज प्रस्तुत करने में विफलता के परिणामस्वरूप अस्वीकृति हो सकती है।"),
        ("Review Timeline", "సమీక్ష సమయం", "समीक्षा समय",
         "There is no fixed timeline for reviewing franchise applications. The Company reserves the exclusive right to determine the order and duration of review depending upon: Number of applications, Internal verification, Business priorities, Expansion plans, Operational requirements. Applicants shall not claim any right based upon delay.",
         "ఫ్రాంచైజీ దరఖాస్తుల సమీక్షకు నిర్ణీత సమయపరిమితి లేదు. సంస్థ దరఖాస్తుల సంఖ్య, అంతర్గత ధృవీకరణ, వ్యాపార ప్రాధాన్యతలు, విస్తరణ ప్రణాళికలు, పనితీరు అవసరాలపై ఆధారపడి సమీక్ష క్రమం మరియు వ్యవధిని నిర్ణయించే ప్రత్యేక హక్కును కలిగి ఉంటుంది. ఆలస్యం ఆధారంగా ఎటువంటి హక్కును దరఖాస్తుదారులు కోరరాదు.",
         "फ्रैंचाइज़ी आवेदनों की समीक्षा के लिए कोई निश्चित समयसीमा नहीं है। कंपनी आवेदनों की संख्या, आंतरिक सत्यापन, व्यापार प्राथमिकताएं, विस्तार योजनाएं, परिचालन आवश्यकताओं के आधार पर समीक्षा के क्रम और अवधि निर्धारित करने का विशेष अधिकार रखती है। विलंब के आधार पर आवेदक कोई अधिकार का दावा नहीं कर सकते।"),
        ("Territorial Policy", "భూభాగం", "क्षेत्र",
         "December Delights generally avoids approving multiple franchise outlets within approximately 5 to 10 kilometres of an existing operational franchise. However, the Company reserves the exclusive right to determine territorial boundaries based upon: Population, Market demand, Future expansion, Commercial viability, Brand strategy. No applicant shall claim exclusive territorial rights unless expressly granted through a written Franchise Agreement.",
         "డిసెంబర్ డిలైట్స్ సాధారణంగా ఇప్పటికే పనిచేస్తున్న ఫ్రాంచైజీకి సుమారు 5 నుండి 10 కిలోమీటర్ల పరిధిలో బహుళ ఫ్రాంచైజీ ఔట్‌లెట్లను ఆమోదించడం మానుకుంటుంది. అయితే, జనాభా, మార్కెట్ డిమాండ్, భవిష్యత్ విస్తరణ, వాణిజ్య సాధ్యత, బ్రాండ్ వ్యూహం ఆధారంగా భూభాగ హద్దులను నిర్ణయించే ప్రత్యేక హక్కును కంపెనీ కలిగి ఉంటుంది. వ్రాతపూర్వక ఫ్రాంచైజీ ఒప్పందం ద్వారా స్పష్టంగా మంజూరు చేయనంత వరకు ఏ దరఖాస్తుదారుడూ ప్రత్యేక భూభాగ హక్కులను కోరరాదు.",
         "डिसेंबर डिलाइट्स आम तौर पर मौजूदा परिचालित फ्रैंचाइज़ी के लगभग 5 से 10 किलोमीटर के भीतर कई फ्रैंचाइज़ी आउटलेट्स को मंजूरी देने से बचता है। हालांकि, कंपनी जनसंख्या, बाजार की मांग, भविष्य के विस्तार, वाणिज्यिक व्यवहार्यता, ब्रांड रणनीति के आधार पर क्षेत्रीय सीमाएं निर्धारित करने का विशेष अधिकार रखती है। जब तक लिखित फ्रैंचाइज़ी समझौते के माध्यम से स्पष्ट रूप से अनुमोदित नहीं किया जाता, कोई भी आवेदक विशेष क्षेत्रीय अधिकारों का दावा नहीं कर सकता।"),
        ("Official Communication", "సంప్రదింపు", "संचार",
         "All official communication shall be made only through: info@decemberdelights.in. Applicants are advised not to rely upon: Phone Calls, WhatsApp Messages, Social Media Messages, Third Parties, Brokers, Consultants, Unauthorised Representatives. Unless specifically authorised by December Delights in writing.",
         "అధికారిక సంప్రదింపులు info@decemberdelights.in ద్వారా మాత్రమే జరుగుతాయి. ఫోన్ కాల్స్, WhatsApp సందేశాలు, సోషల్ మీడియా సందేశాలు, తృతీయ పక్షాలు, బ్రోకర్లు, సలహాదారులు, అనధికార ప్రతినిధులపై దరఖాస్తుదారులు ఆధారపడరాదని సలహా ఇవ్వబడుతుంది. డిసెంబర్ డిలైట్స్ వ్రాతపూర్వకంగా ప్రత్యేకంగా అనుమతించినట్లయితే తప్ప.",
         "सभी आधिकारिक संचार केवल info@decemberdelights.in के माध्यम से किया जाएगा। आवेदकों को: फोन कॉल, WhatsApp संदेश, सोशल मीडिया संदेश, तृतीय पक्ष, दलाल, सलाहकार, अनधिकृत प्रतिनिधियों पर भरोसा नहीं करने की सलाह दी जाती है। जब तक डिसेंबर डिलाइट्स विशेष रूप से लिखित में अनुमति न दे।"),
        ("Fraud & Impersonation", "మోసం రక్షణ", "धोखाधड़ी सुरक्षा",
         "December Delights shall not be responsible for any fraud, financial loss, misrepresentation or damages caused by persons falsely claiming to represent the Company. Applicants are solely responsible for verifying the authenticity of communications before making any payment.",
         "వ్యక్తులు కంపెనీని తప్పుగా ప్రతినిధించడం వల్ల కలిగే మోసం, ఆర్థిక నష్టం, తప్పుడు ప్రాతినిధ్యం లేదా నష్టాలకు డిసెంబర్ డిలైట్స్ బాధ్యత వహించదు. చెల్లింపు చేయడానికి ముందు సంప్రదింపుల ప్రామాణికతను ధృవీకరించడం దరఖాస్తుదారుల స్వంత బాధ్యత.",
         "कंपनी का गलत प्रतिरूपण करने वाले व्यक्तियों द्वारा किसी भी धोखाधड़ी, वित्तीय नुकसान, गलत प्रतिनिधित्व या नुकसान के लिए डिसेंबर डिलाइट्स जिम्मेदार नहीं होगा। भुगतान करने से पहले संचार की प्रामाणिकता सत्यापित करना आवेदकों की अपनी जिम्मेदारी है।"),
        ("Confidential Review Process", "గోపనీయత", "गोपनीयता",
         "The internal review methodology, scoring parameters, approval criteria, expansion strategy and commercial evaluation process are confidential proprietary information belonging exclusively to December Delights. The Company is under no obligation to disclose the reasons for approval, rejection or deferment except where required under applicable law.",
         "అంతర్గత సమీక్ష పద్ధతి, స్కోరింగ్ పారామితులు, ఆమోద మానదండాలు, విస్తరణ వ్యూహం మరియు వాణిజ్య మూల్యాంకన ప్రక్రియ డిసెంబర్ డిలైట్స్‌కు ప్రత్యేకంగా చెందిన రహస్య స్వంత సమాచారం. వర్తించే చట్టం ప్రకారం అవసరమైనప్పుడు తప్ప, ఆమోదం, తిరస్కరణ లేదా వాయిదాకు కారణాలను బహిర్గతం చేయడానికి కంపెనీ బాధ్యత లేదు.",
         "आंतरिक समीक्षा पद्धति, स्कोरिंग मानदंड, अनुमोदन मानदंड, विस्तार रणनीति और वाणिज्यिक मूल्यांकन प्रक्रिया डिसेंबर डिलाइट्स की विशेष स्वामित्व वाली गोपनीय स्वामित्व जानकारी है। लागू कानून के तहत आवश्यक को छोड़कर, अनुमोदन, अस्वीकृति या स्थगन के कारणों का खुलासा करने के लिए कंपनी बाध्य नहीं है।"),
        ("Intellectual Property", "బౌద్ధిక సంపత్తి", "बौद्धिक संपदा",
         "The following are the exclusive intellectual property of December Delights: December Delights(R), NOT JUST A CAFE(R), Logos, Designs, Menu Concepts, Recipes, Brand Identity, Marketing Material, Trade Dress, Business Systems. Applicants acquire no ownership, licence or usage rights merely by applying for a franchise. Unauthorised use may invite appropriate legal action under applicable intellectual property laws.",
         "డిసెంబర్ డిలైట్స్ స్వంత బౌద్ధిక సంపత్తి: December Delights(R), NOT JUST A CAFE(R), లోగోలు, రూపకల్పనలు, మెనూ కాన్సెప్ట్‌లు, రెసిపీలు, బ్రాండ్ ఐడెంటిటీ, మార్కెటింగ్ మెటీరియల్, ట్రేడ్ డ్రెస్, వ్యాపార వ్యవస్థలు. ఫ్రాంచైజీ కోసం దరఖాస్తు చేయడం ద్వారా మాత్రమే దరఖాస్తుదారులు ఏ యాజమాన్యం, లైసెన్స్ లేదా వినియోగ హక్కులను పొందరు. అనధికార వినియోగం వర్తించే బౌద్ధిక సంపత్తి చట్టాల కింద తగిన చట్టపరమైన చర్యను ఆకర్షించవచ్చు.",
         "डिसेंबर डिलाइट्स की विशेष बौद्धिक संपदा: December Delights(R), NOT JUST A CAFE(R), लोगो, डिजाइन, मेनू कॉन्सेप्ट, रेसिपी, ब्रांड पहचान, विपणन सामग्री, ट्रेड ड्रेस, व्यापार प्रणालियां। फ्रैंचाइज़ी के लिए आवेदन करने मात्र से आवेदक को कोई स्वामित्व, लाइसेंस या उपयोग अधिकार प्राप्त नहीं होते हैं। अनधिकृत उपयोग लागू बौद्धिक संपदा कानूनों के तहत उचित कानूनी कार्रवाई को आकर्षित कर सकता है।"),
        ("Defamatory Statements", "పరువు నష్టం", "मानहानि",
         "Applicants agree not to knowingly publish or circulate any false, misleading or defamatory statement concerning December Delights, its promoters, directors, employees, franchisees or business operations. Any unlawful defamatory act may attract appropriate civil and/or criminal remedies available under the laws of India, including the Bharatiya Nyaya Sanhita, 2023, where applicable.",
         "డిసెంబర్ డిలైట్స్, దాని ప్రమోటర్లు, డైరెక్టర్లు, ఉద్యోగులు, ఫ్రాంచైజీలు లేదా వ్యాపార కార్యకలాపాల గురించి ఏవైనా తప్పు, తప్పుదారి పట్టించే లేదా పరువు నష్టం కలిగించే ప్రకటనలను తెలిసి ప్రచురించడానికి లేదా పంపిణీ చేయడానికి దరఖాస్తుదారులు అంగీకరిస్తారు. ఏదైనా చట్టవిరుద్ధ పరువు నష్టం చర్య భారతదేశం చట్టాల కింద సివిల్ మరియు/లేదా క్రిమినల్ నివారణలను ఆకర్షించవచ్చు, 2023 భారతీయ న్యాయ సంహిత వర్తించినట్లయితే.",
         "डिसेंबर डिलाइट्स, इसके प्रवर्तकों, निदेशकों, कर्मचारियों, फ्रैंचाइजी या व्यापार संचालन के बारे में कोई भी झूठी, भ्रामक या बदनाम करने वाली टिप्पणी जानबूझकर प्रकाशित या प्रसारित नहीं करने पर आवेदक सहमत हैं। कोई भी गैरकानूनी बदनामी कृत्य भारत के कानूनों के तहत उपयुक्त दीवानी और/या आपराधिक उपायों को आकर्षित कर सकता है, जहां लागू हो वहां भारतीय न्याय संहिता, 2023।"),
        ("Reservation of Rights", "కంపెనీ హక్కులు", "कंपनी अधिकार",
         "December Delights reserves the absolute right to: Accept or reject any application, Seek additional documents, Suspend the review process, Modify eligibility criteria, Change expansion strategy, Discontinue franchise opportunities in any region, Amend these Terms & Conditions at any time. Such decisions shall be made solely at the Company's discretion.",
         "ఏ దరఖాస్తునైనా ఆమోదించడం లేదా తిరస్కరించడం, అదనపు పత్రాలు అడగడం, సమీక్ష ప్రక్రియను సస్పెండ్ చేయడం, అర్హత మానదండాలను సవరించడం, విస్తరణ వ్యూహాన్ని మార్చడం, ఏదైనా ప్రాంతంలో ఫ్రాంచైజీ అవకాశాలను నిలిపివేయడం, ఈ నిబంధనలు & షరతులను ఎప్పుడైనా సవరించడం డిసెంబర్ డిలైట్స్ సంపూర్ణ హక్కును కలిగి ఉంటుంది. అటువంటి నిర్ణయాలు పూర్తిగా కంపెనీ స్వవివేకంలో మాత్రమే చేయబడతాయి.",
         "डिसेंबर डिलाइट्स अनुपात में किसी भी आवेदन को स्वीकार या अस्वीकार करने, अतिरिक्त दस्तावेज मांगने, समीक्षा प्रक्रिया को निलंबित करने, पात्रता मानदंड को संशोधित करने, विस्तार रणनीति बदलने, किसी भी क्षेत्र में फ्रैंचाइज़ी अवसरों को बंद करने, इन नियमों एवं शर्तों को किसी भी समय संशोधित करने का संपूर्ण अधिकार सुरक्षित रखता है। ऐसे निर्णय पूरी तरह से कंपनी के विवेक पर किए जाएंगे।"),
        ("Privacy", "డేటా వినియోగం", "डेटा उपयोग",
         "All information submitted by applicants shall be used exclusively for franchise evaluation and related business purposes. Applicants consent to verification of submitted information from banks, financial institutions, government records or other lawful sources whenever considered necessary.",
         "దరఖాస్తుదారులు సమర్పించిన సమాచారం ప్రాథమికంగా ఫ్రాంచైజీ మూల్యాంకనం మరియు సంబంధిత వ్యాపార ప్రయోజనాల కోసం మాత్రమే ఉపయోగించబడుతుంది. దరఖాస్తుదారులు అవసరమైనప్పుడు బ్యాంకులు, ఆర్థిక సంస్థలు, ప్రభుత్వ రికార్డులు లేదా ఇతర చట్టబద్ధమైన మూలాల నుండి సమర్పించిన సమాచారం ధృవీకరణకు అంగీకరిస్తారు.",
         "आवेदकों द्वारा प्रस्तुत सभी जानकारी का उपयोग विशेष रूप से फ्रैंचाइज़ी मूल्यांकन और संबंधित व्यापार उद्देश्यों के लिए किया जाएगा। आवेदक बैंकों, वित्तीय संस्थानों, सरकारी रिकॉर्ड या अन्य वैध स्रोतों से प्रस्तुत जानकारी के सत्यापन के लिए सहमत हैं।"),
        ("Governing Law & Jurisdiction", "చట్టం", "शासी कानून",
         "These Terms & Conditions shall be governed by the laws of India. Any dispute arising from or relating to the Franchise Application shall be subject to the exclusive jurisdiction of the competent courts having jurisdiction over the registered office of December Delights.",
         "ఈ నిబంధనలు & షరతులు భారతదేశం చట్టాల ద్వారా పరిపాలించబడతాయి. ఫ్రాంచైజీ దరఖాస్తు నుండి లేదా దానికి సంబంధించి తలెత్తే ఏదైనా వివాదం డిసెంబర్ డిలైట్స్ నమోదు కార్యాలయంపై అధికారం కలిగిన న్యాయస్థానాల ప్రత్యేక న్యాయ పరిధికి లోబడి ఉంటుంది.",
         "इन नियमों एवं शर्तों का शासन भारत के कानूनों द्वारा किया जाएगा। फ्रैंचाइज़ी आवेदन से उत्पन्न या उससे संबंधित कोई भी विवाद डिसेंबर डिलाइट्स के पंजीकृत कार्यालय पर अधिकार क्षेत्र वाली न्यायालयों के विशेष अधिकार क्षेत्र के अधीन होगा।"),
        ("Force Majeure", "ఫోర్స్ మేజర్", "बल मेजेय",
         "December Delights shall not be liable for delays or inability to process applications resulting from circumstances beyond its reasonable control, including but not limited to natural disasters, pandemics, government actions, strikes, technical failures, cyber incidents, or other force majeure events.",
         "సహజ విపత్తులు, మహమ్మారాలు, ప్రభుత్వ చర్యలు, సమ్మెలు, సాంకేతిక వైఫల్యాలు, సైబర్ సంఘటనలు లేదా ఇతర ఫోర్స్ మేజర్ సంఘటనలు వంటి దాని సహేతుక నియంత్రణ పరిధిలో లేని పరిస్థితుల వల్ల కలిగే ఆలస్యం లేదా దరఖాస్తులను ప్రాసెస్ చేయలేకపోవడానికి డిసెంబర్ డిలైట్స్ బాధ్యత వహించదు.",
         "प्राकृतिक आपदाएं, महामारी, सरकारी कार्रवाई, हड़तालें, तकनीकी विफलताएं, साइबर घटनाएं या अन्य बल मेजेय घटनाओं सहित अपने उचित नियंत्रण से परिस्थितियों के कारण देरी या आवेदनों को संसाधित करने में असमर्थता के लिए डिसेंबर डिलाइट्स जिम्मेदार नहीं होगा।"),
        ("Entire Understanding", "సంపూర్ణ ఒప్పందం", "संपूर्ण समझौता",
         "These Terms & Conditions constitute the entire understanding relating to the Franchise Application process and supersede any prior verbal discussions, emails, representations or promotional material regarding the application process.",
         "ఈ నిబంధనలు & షరతులు ఫ్రాంచైజీ దరఖాస్తు ప్రక్రియకు సంబంధించిన సంపూర్ణ అవగాహనను ఏర్పరుస్తాయి మరియు అప్లికేషన్ ప్రక్రియకు సంబంధించిన ముందస్తు మౌఖిక చర్చలు, ఇమెయిల్‌లు, ప్రాతినిధ్యాలు లేదా ప్రచార సామగ్రిని భర్తీ చేస్తాయి.",
         "इन नियमों एवं शर्तों में फ्रैंचाइज़ी आवेदन प्रक्रिया से संबंधित संपूर्ण समझ शामिल है और यह आवेदन प्रक्रिया के संबंध में किसी भी पूर्ण मौखिक चर्चाओं, ईमेल, प्रतिनिधित्वों या प्रचार सामग्री को प्रतिस्थापित करता है।"),
        ("Declaration by Applicant", "ప్రకటన", "घोषणा",
         "By submitting this application and paying the prescribed Application Fee, I hereby declare that: I have read and understood these Terms & Conditions, All information submitted by me is true and accurate, I understand that payment of the Application Fee does not guarantee franchise approval, I understand that the Application Fee is non-refundable, I agree to comply with all policies of December Delights.",
         "ఈ దరఖాస్తు సమర్పించి, నిర్ణీత దరఖాస్తు రుసుము చెల్లించడం ద్వారా, నేను ఇక్కడ ప్రకటిస్తున్నాను: నేను ఈ నిబంధనలు & షరతులను చదివి, అర్థం చేసుకున్నాను, నేను సమర్పించిన సమాచారం మొత్తం నిజమైనది మరియు ఖచ్చితమైనది, దరఖాస్తు రుసుము చెల్లింపు ఫ్రాంచైజీ ఆమోదాన్ని హామీ ఇవ్వదని నేను అర్థం చేసుకున్నాను, దరఖాస్తు రుసుము రిఫండ్ చేయబడదని నేను అర్థం చేసుకున్నాను, డిసెంబర్ డిలైట్స్ విధానాలన్నింటికీ కట్టుబడటానికి నేను అంగీకరిస్తున్నాను.",
         "इस आवेदन को जमा करके और निर्धारित आवेदन शुल्क का भुगतान करके, मैं यहां घोषणा करता हूं: मैंने इन नियमों एवं शर्तों को पढ़ लिया है और समझ लिया है, मेरे द्वारा प्रस्तुत सभी जानकारी सत्य और सटीक है, मैं समझता हूं कि आवेदन शुल्क का भुगतान फ्रैंचाइज़ी अनुमोदन की गारंटी नहीं देता है, मैं समझता हूं कि आवेदन शुल्क गैर-वापसी योग्य है, मैं डिसेंबर डिलाइट्स की सभी नीतियों का पालन करने के लिए सहमत हूं।"),
    ]

    conn.executemany(
        """INSERT INTO terms_conditions (title_en, title_te, title_hi, text_en, text_te, text_hi, sort_order, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1)""",
        [(t[0], t[1], t[2], t[3], t[4], t[5], i) for i, t in enumerate(terms)],
    )
    conn.commit()
    logger.info(f"Seeded {len(terms)} default terms & conditions into SQLite")


def _get_conn() -> sqlite3.Connection:
    if not hasattr(_local, "conn") or _local.conn is None:
        _local.conn = sqlite3.connect(_DB_PATH, timeout=5)
        _local.conn.execute("PRAGMA journal_mode=WAL")
        _local.conn.execute("PRAGMA synchronous=NORMAL")
        _local.conn.execute("""
            CREATE TABLE IF NOT EXISTS kv_store (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                expires_at REAL NOT NULL
            )
        """)
        _local.conn.execute("""
            CREATE TABLE IF NOT EXISTS rate_limits (
                key TEXT PRIMARY KEY,
                timestamps TEXT NOT NULL,
                window_seconds INTEGER NOT NULL
            )
        """)
        _local.conn.execute("CREATE INDEX IF NOT EXISTS idx_kv_expires ON kv_store(expires_at)")
        _local.conn.execute("""
            CREATE TABLE IF NOT EXISTS terms_conditions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title_en TEXT NOT NULL DEFAULT '',
                title_te TEXT NOT NULL DEFAULT '',
                title_hi TEXT NOT NULL DEFAULT '',
                text_en TEXT NOT NULL DEFAULT '',
                text_te TEXT NOT NULL DEFAULT '',
                text_hi TEXT NOT NULL DEFAULT '',
                sort_order INTEGER NOT NULL DEFAULT 0,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
        """)
        _local.conn.commit()
        _seed_terms_if_empty(_local.conn)
    return _local.conn


def _cleanup_expired():
    conn = _get_conn()
    now = time.time()
    conn.execute("DELETE FROM kv_store WHERE expires_at < ?", (now,))
    conn.execute("DELETE FROM rate_limits WHERE key NOT IN (SELECT key FROM rate_limits WHERE 1=1)")
    conn.commit()


class KVStore:
    def __init__(self, namespace: str = "kv", default_ttl: int = 60):
        self._ns = namespace
        self._default_ttl = default_ttl
        self._last_cleanup = time.time()

    def _key(self, key: str) -> str:
        return f"{self._ns}:{key}"

    def get(self, key: str) -> Optional[Any]:
        conn = _get_conn()
        now = time.time()
        if now - self._last_cleanup > 300:
            self._last_cleanup = now
            conn.execute("DELETE FROM kv_store WHERE expires_at < ?", (now,))
            conn.commit()
        row = conn.execute(
            "SELECT value, expires_at FROM kv_store WHERE key = ?", (self._key(key),)
        ).fetchone()
        if not row:
            return None
        value_str, expires_at = row
        if now >= expires_at:
            conn.execute("DELETE FROM kv_store WHERE key = ?", (self._key(key),))
            conn.commit()
            return None
        try:
            return json.loads(value_str)
        except (json.JSONDecodeError, TypeError):
            return value_str

    def set(self, key: str, value: Any, ttl: Optional[int] = None):
        ttl = ttl or self._default_ttl
        expires_at = time.time() + ttl
        value_str = json.dumps(value) if not isinstance(value, str) else value
        conn = _get_conn()
        conn.execute(
            "INSERT OR REPLACE INTO kv_store (key, value, expires_at) VALUES (?, ?, ?)",
            (self._key(key), value_str, expires_at),
        )
        conn.commit()

    def invalidate(self, key: str = None):
        conn = _get_conn()
        if key:
            conn.execute("DELETE FROM kv_store WHERE key = ?", (self._key(key),))
        else:
            conn.execute("DELETE FROM kv_store WHERE key LIKE ?", (f"{self._ns}:%",))
        conn.commit()


class RateLimiter:
    """SQLite-backed rate limiter that persists across restarts."""

    def __init__(self, max_attempts: int = 5, window_seconds: int = 300):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self._last_cleanup = time.time()

    def _cleanup(self):
        now = time.time()
        if now - self._last_cleanup < 60:
            return
        self._last_cleanup = now
        conn = _get_conn()
        rows = conn.execute("SELECT key, timestamps FROM rate_limits").fetchall()
        for key, ts_json in rows:
            try:
                timestamps = json.loads(ts_json)
                timestamps = [t for t in timestamps if now - t < self.window_seconds * 2]
                if not timestamps:
                    conn.execute("DELETE FROM rate_limits WHERE key = ?", (key,))
                else:
                    conn.execute(
                        "UPDATE rate_limits SET timestamps = ? WHERE key = ?",
                        (json.dumps(timestamps), key),
                    )
            except (json.JSONDecodeError, TypeError):
                conn.execute("DELETE FROM rate_limits WHERE key = ?", (key,))
        conn.commit()

    def check(self, key: str) -> None:
        self._cleanup()
        now = time.time()
        conn = _get_conn()
        row = conn.execute(
            "SELECT timestamps FROM rate_limits WHERE key = ?", (key,)
        ).fetchone()
        if row:
            try:
                timestamps = json.loads(row[0])
            except (json.JSONDecodeError, TypeError):
                timestamps = []
            timestamps = [t for t in timestamps if now - t < self.window_seconds]
            if len(timestamps) >= self.max_attempts:
                remaining = int(self.window_seconds - (now - timestamps[0]))
                from fastapi import HTTPException
                raise HTTPException(
                    status_code=429,
                    detail=f"Too many attempts. Try again in {remaining} seconds.",
                )
            timestamps.append(now)
            conn.execute(
                "INSERT OR REPLACE INTO rate_limits (key, timestamps, window_seconds) VALUES (?, ?, ?)",
                (key, json.dumps(timestamps), self.window_seconds),
            )
        else:
            conn.execute(
                "INSERT INTO rate_limits (key, timestamps, window_seconds) VALUES (?, ?, ?)",
                (key, json.dumps([now]), self.window_seconds),
            )
        conn.commit()

    def record(self, key: str) -> None:
        now = time.time()
        conn = _get_conn()
        row = conn.execute(
            "SELECT timestamps FROM rate_limits WHERE key = ?", (key,)
        ).fetchone()
        if row:
            try:
                timestamps = json.loads(row[0])
            except (json.JSONDecodeError, TypeError):
                timestamps = []
            timestamps = [t for t in timestamps if now - t < self.window_seconds]
            timestamps.append(now)
            conn.execute(
                "INSERT OR REPLACE INTO rate_limits (key, timestamps, window_seconds) VALUES (?, ?, ?)",
                (key, json.dumps(timestamps), self.window_seconds),
            )
        else:
            conn.execute(
                "INSERT INTO rate_limits (key, timestamps, window_seconds) VALUES (?, ?, ?)",
                (key, json.dumps([now]), self.window_seconds),
            )
        conn.commit()

    def reset(self, key: str) -> None:
        conn = _get_conn()
        conn.execute("DELETE FROM rate_limits WHERE key = ?", (key,))
        conn.commit()
