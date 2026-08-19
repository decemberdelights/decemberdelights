"use client";

import { useState, useRef, useCallback, useEffect } from "react";

const TERMS_EN = [
  "By submitting a Franchise Application and paying the prescribed Application Fee, the Applicant confirms that they have carefully read, understood, and voluntarily accepted these Terms & Conditions.",
  "The Application Fee of <strong>₹9,999/-</strong> plus <strong>18% GST</strong> (<strong>₹11,799/- total</strong>) is collected solely for: Initial screening of the applicant, Verification of submitted information, Financial assessment, Background verification, Business suitability review, Market feasibility analysis, Administrative processing. This fee is strictly an Application Processing Fee and shall not be treated as: Franchise Fee, Security Deposit, Booking Amount, Refundable Deposit, Advance towards Franchise.",
  "The Application Fee is strictly non-refundable under all circumstances, including but not limited to: Application rejection, Withdrawal by applicant, Failure to submit documents, Delay in review, Non-selection, Business policy changes, Applicant becoming ineligible, Expiry of application. No request for refund shall be entertained.",
  "Submission of an application or payment of the Application Fee does not guarantee: Franchise approval, Interview, Site inspection, Reservation of territory, Future partnership, Execution of Franchise Agreement. Only applicants approved by December Delights shall be invited for further discussions.",
  "Applications are evaluated based on several commercial and operational factors, including but not limited to: Business experience, Entrepreneurial capability, Financial strength, Creditworthiness, Background verification, Character and reputation, Business vision, Location feasibility, Population density, Local demand, Market competition, Internal expansion strategy, Long-term sustainability. The decision of December Delights shall be final and binding.",
  "December Delights does not guarantee franchise opportunities in every city. Applications from Tier-3 or emerging markets are evaluated based on: Population, Purchasing power, Commercial activity, Market demand, Future scalability, Investment potential, Brand suitability. Approval shall solely depend upon the Company's commercial assessment.",
  "Applicants having prior experience in hospitality, food service, retail, management, or entrepreneurship may receive preference. However, previous experience alone shall not guarantee approval.",
  "Applicants must demonstrate adequate financial capability. December Delights may request: Bank Statements, Income Tax Returns, Loan Sanction Letters, Net Worth Certificates, CA Certificate, Investment Proof, Property Documents, Any additional financial documents. Failure to furnish satisfactory documents may result in rejection.",
  "There is no fixed timeline for reviewing franchise applications. The Company reserves the exclusive right to determine the order and duration of review depending upon: Number of applications, Internal verification, Business priorities, Expansion plans, Operational requirements. Applicants shall not claim any right based upon delay.",
  "December Delights generally avoids approving multiple franchise outlets within approximately 5 to 10 kilometres of an existing operational franchise. However, the Company reserves the exclusive right to determine territorial boundaries based upon: Population, Market demand, Future expansion, Commercial viability, Brand strategy. No applicant shall claim exclusive territorial rights unless expressly granted through a written Franchise Agreement.",
  "All official communication shall be made only through: info@decemberdelights.in. Applicants are advised not to rely upon: Phone Calls, WhatsApp Messages, Social Media Messages, Third Parties, Brokers, Consultants, Unauthorised Representatives. Unless specifically authorised by December Delights in writing.",
  "December Delights shall not be responsible for any fraud, financial loss, misrepresentation or damages caused by persons falsely claiming to represent the Company. Applicants are solely responsible for verifying the authenticity of communications before making any payment.",
  "The internal review methodology, scoring parameters, approval criteria, expansion strategy and commercial evaluation process are confidential proprietary information belonging exclusively to December Delights. The Company is under no obligation to disclose the reasons for approval, rejection or deferment except where required under applicable law.",
  "The following are the exclusive intellectual property of December Delights: December Delights®, NOT JUST A CAFE®, Logos, Designs, Menu Concepts, Recipes, Brand Identity, Marketing Material, Trade Dress, Business Systems. Applicants acquire no ownership, licence or usage rights merely by applying for a franchise. Unauthorised use may invite appropriate legal action under applicable intellectual property laws.",
  "Applicants agree not to knowingly publish or circulate any false, misleading or defamatory statement concerning December Delights, its promoters, directors, employees, franchisees or business operations. Any unlawful defamatory act may attract appropriate civil and/or criminal remedies available under the laws of India, including the Bharatiya Nyaya Sanhita, 2023, where applicable.",
  "December Delights reserves the absolute right to: Accept or reject any application, Seek additional documents, Suspend the review process, Modify eligibility criteria, Change expansion strategy, Discontinue franchise opportunities in any region, Amend these Terms & Conditions at any time. Such decisions shall be made solely at the Company's discretion.",
  "All information submitted by applicants shall be used exclusively for franchise evaluation and related business purposes. Applicants consent to verification of submitted information from banks, financial institutions, government records or other lawful sources whenever considered necessary.",
  "These Terms & Conditions shall be governed by the laws of India. Any dispute arising from or relating to the Franchise Application shall be subject to the exclusive jurisdiction of the competent courts having jurisdiction over the registered office of December Delights.",
  "December Delights shall not be liable for delays or inability to process applications resulting from circumstances beyond its reasonable control, including but not limited to natural disasters, pandemics, government actions, strikes, technical failures, cyber incidents, or other force majeure events.",
  "These Terms & Conditions constitute the entire understanding relating to the Franchise Application process and supersede any prior verbal discussions, emails, representations or promotional material regarding the application process.",
  "By submitting this application and paying the prescribed Application Fee, I hereby declare that: I have read and understood these Terms & Conditions, All information submitted by me is true and accurate, I understand that payment of the Application Fee does not guarantee franchise approval, I understand that the Application Fee is non-refundable, I agree to comply with all policies of December Delights.",
];

const TERMS_TE = [
  "ఫ్రాంచైజీ దరఖాస్తు సమర్పించి, నిర్ణీత దరఖాస్తు రుసుము చెల్లించడం ద్వారా, దరఖాస్తుదారుడు ఈ నిబంధనలు మరియు షరతులను జాగ్రత్తగా చదివి, అర్థం చేసుకుని, స్వచ్ఛందంగా అంగీకరించారని ధృవీకరిస్తారు.",
  "దరఖాస్తుదారుడి ప్రాథమిక స్క్రీనింగ్, సమర్పించిన సమాచారం ధృవీకరణ, ఆర్థిక అంచనా, బ్యాక్గ్రౌండ్ ధృవీకరణ, వ్యాపార అనుకూలత సమీక్ష, మార్కెట్ సాధ్యతా విశ్లేషణ, పరిపాలనా ప్రాసెసింగ్ కోసం మాత్రమే <strong>₹9,999/-</strong> ప్లస్ <strong>18% GST</strong> (<strong>₹11,799/- మొత్తం</strong>) దరఖాస్తు రుసుము సేకరించబడుతుంది. ఈ రుసుము ఖచ్చితంగా దరఖాస్తు ప్రాసెసింగ్ రుసుము మాత్రమే, దీనిని: ఫ్రాంచైజీ రుసుము, సెక్యూరిటీ డిపాజిట్, బుకింగ్ అమౌంట్, రిఫండబల్ డిపాజిట్, ఫ్రాంచైజీకి అడ్వాన్స్ గా పరిగణించరాదు.",
  "అప్లికేషన్ తిరస్కరణ, దరఖాస్తుదారుడి ఉపసంహరణ, పత్రాలు సమర్పించడంలో విఫలం, సమీక్షలో ఆలస్యం, ఎంపిక కాకపోవడం, వ్యాపార విధాన మార్పులు, దరఖాస్తుదారుడు అనర్హుడు కావడం, దరఖాస్తు గడువు ముగియడం వంటి అన్ని పరిస్థితుల్లో దరఖాస్తు రుసుము ఖచ్చితంగా రిఫండ్ చేయబడదు. రిఫండ్ అభ్యర్థన పరిగణించబడదు.",
  "దరఖాస్తు సమర్పించడం లేదా దరఖాస్తు రుసుము చెల్లించడం: ఫ్రాంచైజీ ఆమోదం, ఇంటర్వ్యూ, సైట్ ఇన్స్పెక్షన్, టెరిటరీ రిజర్వేషన్, భవిష్యత్ భాగస్వామ్యం, ఫ్రాంచైజీ ఒప్పందం కుదుర్చుకోవడం నిశ్చయించదు. డిసెంబర్ డిలైట్స్ చేత ఆమోదించబడిన దరఖాస్తుదారులకు మాత్రమే మరింత చర్చలకు ఆహ్వానించబడతారు.",
  "దరఖాస్తులు వ్యాపార అనుభవం, వ్యవసాయ సామర్థ్యం, ఆర్థిక బలం, క్రెడిట్వర్త్, బ్యాక్గ్రౌండ్ ధృవీకరణ, పాత్ర మరియు ప్రతిష్ఠ, వ్యాపార దృష్టి, స్థానం అనుకూలత, జనాభా సాంద్రత, స్థానిక డిమాండ్, మార్కెట్ పోటీ, అంతర్గత విస్తరణ వ్యూహం, దీర్ఘకాలిక సుస్థిరత వంటి అనేక వాణిజ్య మరియు పనితీరు కారకాల ఆధారంగా మూల్యాంకనం చేయబడతాయి. డిసెంబర్ డిలైట్స్ నిర్ణయం తుదిది మరియు బంధనం.",
  "డిసెంబర్ డిలైట్స్ ప్రతి నగరంలో ఫ్రాంచైజీ అవకాశాలు హామీ ఇవ్వదు. టైర్-3 లేదా అభివృద్ధి చెందుతున్న మార్కెట్ల నుండి దరఖాస్తులు: జనాభా, కొనుగోలు శక్తి, వాణిజ్య కార్యకలాపం, మార్కెట్ డిమాండ్, భవిష్యత్ స్కేలబిలిటీ, పెట్టుబడి సామర్థ్యం, బ్రాండ్ అనుకూలత ఆధారంగా మూల్యాంకనం చేయబడతాయి. ఆమోదం పూర్తిగా కంపెనీ యొక్క వాణిజ్య అంచనాపై ఆధారపడి ఉంటుంది.",
  "హాస్పిటాలిటీ, ఫుడ్ సర్వీస్, రిటైల్, నిర్వహణ లేదా వ్యవసాయంలో ముందస్తు అనుభవం ఉన్న దరఖాస్తుదారులకు ప్రాధాన్యత లభించవచ్చు. అయితే, ముందస్తు అనుభవం మాత్రమే ఆమోదాన్ని హామీ ఇవ్వదు.",
  "దరఖాస్తుదారులు తగినంత ఆర్థిక సామర్థ్యాన్ని నిరూపించాలి. డిసెంబర్ డిలైట్స్ ఇవి అభ్యర్థించవచ్చు: బ్యాంక్ స్టేట్‌మెంట్లు, ఆదాయపు పన్ను రిటర్నులు, రుణ మంజూరు లేఖలు, నెట్ వర్త్ సర్టిఫికేట్లు, CA సర్టిఫికేట్, పెట్టుబడి రుజువు, ఆస్తి పత్రాలు, ఏవైనా అదనపు ఆర్థిక పత్రాలు. సంతృప్తికరమైన పత్రాలు సమర్పించడంలో విఫలమైతే తిరస్కరణ జరగవచ్చు.",
  "ఫ్రాంచైజీ దరఖాస్తుల సమీక్షకు నిర్ణీత సమయపరిమితి లేదు. సంస్థ దరఖాస్తుల సంఖ్య, అంతర్గత ధృవీకరణ, వ్యాపార ప్రాధాన్యతలు, విస్తరణ ప్రణాళికలు, పనితీరు అవసరాలపై ఆధారపడి సమీక్ష క్రమం మరియు వ్యవధిని నిర్ణయించే ప్రత్యేక హక్కును కలిగి ఉంటుంది. ఆలస్యం ఆధారంగా ఎటువంటి హక్కును దరఖాస్తుదారులు కోరరాదు.",
  "డిసెంబర్ డిలైట్స్ సాధారణంగా ఇప్పటికే పనిచేస్తున్న ఫ్రాంచైజీకి సుమారు 5 నుండి 10 కిలోమీటర్ల పరిధిలో బహుళ ఫ్రాంచైజీ ఔట్‌లెట్లను ఆమోదించడం మానుకుంటుంది. అయితే, జనాభా, మార్కెట్ డిమాండ్, భవిష్యత్ విస్తరణ, వాణిజ్య సాధ్యత, బ్రాండ్ వ్యూహం ఆధారంగా భూభాగ హద్దులను నిర్ణయించే ప్రత్యేక హక్కును కంపెనీ కలిగి ఉంటుంది. వ్రాతపూర్వక ఫ్రాంచైజీ ఒప్పందం ద్వారా స్పష్టంగా మంజూరు చేయనంత వరకు ఏ దరఖాస్తుదారుడూ ప్రత్యేక భూభాగ హక్కులను కోరరాదు.",
  "అధికారిక సంప్రదింపులు info@decemberdelights.in ద్వారా మాత్రమే జరుగుతాయి. ఫోన్ కాల్స్, WhatsApp సందేశాలు, సోషల్ మీడియా సందేశాలు, తృతీయ పక్షాలు, బ్రోకర్లు, సలహాదారులు, అనధికార ప్రతినిధులపై దరఖాస్తుదారులు ఆధారపడరాదని సలహా ఇవ్వబడుతుంది. డిసెంబర్ డిలైట్స్ వ్రాతపూర్వకంగా ప్రత్యేకంగా అనుమతించినట్లయితే తప్ప.",
  "వ్యక్తులు కంపెనీని తప్పుగా ప్రతినిధించడం వల్ల కలిగే మోసం, ఆర్థిక నష్టం, తప్పుడు ప్రాతినిధ్యం లేదా నష్టాలకు డిసెంబర్ డిలైట్స్ బాధ్యత వహించదు. చెల్లింపు చేయడానికి ముందు సంప్రదింపుల ప్రామాణికతను ధృవీకరించడం దరఖాస్తుదారుల స్వంత బాధ్యత.",
  "అంతర్గత సమీక్ష పద్ధతి, స్కోరింగ్ పారామితులు, ఆమోద మానదండాలు, విస్తరణ వ్యూహం మరియు వాణిజ్య మూల్యాంకన ప్రక్రియ డిసెంబర్ డిలైట్స్‌కు ప్రత్యేకంగా చెందిన రహస్య స్వంత సమాచారం. వర్తించే చట్టం ప్రకారం అవసరమైనప్పుడు తప్ప, ఆమోదం, తిరస్కరణ లేదా వాయిదాకు కారణాలను బహిర్గతం చేయడానికి కంపెనీ బాధ్యత లేదు.",
  "డిసెంబర్ డిలైట్స్ స్వంత బౌద్ధిక సంపత్తి: December Delights®, NOT JUST A CAFE®, లోగోలు, రూపకల్పనలు, మెనూ కాన్సెప్ట్‌లు, రెసిపీలు, బ్రాండ్ ఐడెంటిటీ, మార్కెటింగ్ మెటీరియల్, ట్రేడ్ డ్రెస్, వ్యాపార వ్యవస్థలు. ఫ్రాంచైజీ కోసం దరఖాస్తు చేయడం ద్వారా మాత్రమే దరఖాస్తుదారులు ఏ యాజమాన్యం, లైసెన్స్ లేదా వినియోగ హక్కులను పొందరు. అనధికార వినియోగం వర్తించే బౌద్ధిక సంపత్తి చట్టాల కింద తగిన చట్టపరమైన చర్యను ఆకర్షించవచ్చు.",
  "డిసెంబర్ డిలైట్స్, దాని ప్రమోటర్లు, డైరెక్టర్లు, ఉద్యోగులు, ఫ్రాంచైజీలు లేదా వ్యాపార కార్యకలాపాల గురించి ఏవైనా తప్పు, తప్పుదారి పట్టించే లేదా పరువు నష్టం కలిగించే ప్రకటనలను తెలిసి ప్రచురించడానికి లేదా పంపిణీ చేయడానికి దరఖాస్తుదారులు అంగీకరిస్తారు. ఏదైనా చట్టవిరుద్ధ పరువు నష్టం చర్య భారతదేశం చట్టాల కింద సివిల్ మరియు/లేదా క్రిమినల్ నివారణలను ఆకర్షించవచ్చు, 2023 భారతీయ న్యాయ సంహిత వర్తించినట్లయితే.",
  "ఏ దరఖాస్తునైనా ఆమోదించడం లేదా తిరస్కరించడం, అదనపు పత్రాలు అడగడం, సమీక్ష ప్రక్రియను సస్పెండ్ చేయడం, అర్హత మానదండాలను సవరించడం, విస్తరణ వ్యూహాన్ని మార్చడం, ఏదైనా ప్రాంతంలో ఫ్రాంచైజీ అవకాశాలను నిలిపివేయడం, ఈ నిబంధనలు & షరతులను ఎప్పుడైనా సవరించడం డిసెంబర్ డిలైట్స్ సంపూర్ణ హక్కును కలిగి ఉంటుంది. అటువంటి నిర్ణయాలు పూర్తిగా కంపెనీ స్వవివేకంలో మాత్రమే చేయబడతాయి.",
  "దరఖాస్తుదారులు సమర్పించిన సమాచారం ప్రాథమికంగా ఫ్రాంచైజీ మూల్యాంకనం మరియు సంబంధిత వ్యాపార ప్రయోజనాల కోసం మాత్రమే ఉపయోగించబడుతుంది. దరఖాస్తుదారులు అవసరమైనప్పుడు బ్యాంకులు, ఆర్థిక సంస్థలు, ప్రభుత్వ రికార్డులు లేదా ఇతర చట్టబద్ధమైన మూలాల నుండి సమర్పించిన సమాచారం ధృవీకరణకు అంగీకరిస్తారు.",
  "ఈ నిబంధనలు & షరతులు భారతదేశం చట్టాల ద్వారా పరిపాలించబడతాయి. ఫ్రాంచైజీ దరఖాస్తు నుండి లేదా దానికి సంబంధించి తలెత్తే ఏదైనా వివాదం డిసెంబర్ డిలైట్స్ నమోదు కార్యాలయంపై అధికారం కలిగిన న్యాయస్థానాల ప్రత్యేక న్యాయ పరిధికి లోబడి ఉంటుంది.",
  "సహజ విపత్తులు, మహమ్మారాలు, ప్రభుత్వ చర్యలు, సమ్మెలు, సాంకేతిక వైఫల్యాలు, సైబర్ సంఘటనలు లేదా ఇతర ఫోర్స్ మేజర్ సంఘటనలు వంటి దాని సహేతుక నియంత్రణ పరిధిలో లేని పరిస్థితుల వల్ల కలిగే ఆలస్యం లేదా దరఖాస్తులను ప్రాసెస్ చేయలేకపోవడానికి డిసెంబర్ డిలైట్స్ బాధ్యత వహించదు.",
  "ఈ నిబంధనలు & షరతులు ఫ్రాంచైజీ దరఖాస్తు ప్రక్రియకు సంబంధించిన సంపూర్ణ అవగాహనను ఏర్పరుస్తాయి మరియు అప్లికేషన్ ప్రక్రియకు సంబంధించిన ముందస్తు మౌఖిక చర్చలు, ఇమెయిల్‌లు, ప్రాతినిధ్యాలు లేదా ప్రచార సామగ్రిని భర్తీ చేస్తాయి.",
  "ఈ దరఖాస్తు సమర్పించి, నిర్ణీత దరఖాస్తు రుసుము చెల్లించడం ద్వారా, నేను ఇక్కడ ప్రకటిస్తున్నాను: నేను ఈ నిబంధనలు & షరతులను చదివి, అర్థం చేసుకున్నాను, నేను సమర్పించిన సమాచారం మొత్తం నిజమైనది మరియు ఖచ్చితమైనది, దరఖాస్తు రుసుము చెల్లింపు ఫ్రాంచైజీ ఆమోదాన్ని హామీ ఇవ్వదని నేను అర్థం చేసుకున్నాను, దరఖాస్తు రుసుము రిఫండ్ చేయబడదని నేను అర్థం చేసుకున్నాను, డిసెంబర్ డిలైట్స్ విధానాలన్నింటికీ కట్టుబడటానికి నేను అంగీకరిస్తున్నాను.",
];

const TERMS_HI = [
  "फ्रैंचाइज़ी आवेदन जमा करके और निर्धारित आवेदन शुल्क का भुगतान करके, आवेदक पुष्टि करता है कि उसने इन नियमों एवं शर्तों को ध्यान से पढ़ा, समझा और स्वेच्छा से स्वीकार किया है।",
  "<strong>₹9,999/-</strong> प्लस <strong>18% GST</strong> (<strong>₹11,799/- कुल</strong>) का आवेदन शुल्क केवल: आवेदक की प्रारंभिक स्क्रीनिंग, प्रस्तुत जानकारी का सत्यापन, वित्तीय मूल्यांकन, पृष्ठभूमि सत्यापन, व्यापार उपयुक्तता समीक्षा, बाजार व्यवहार्यता विश्लेषण, प्रशासनिक प्रसंस्करण के लिए एकत्र किया जाता है। यह शुल्क पूरी तरह से आवेदन प्रसंस्करण शुल्क है और इसे: फ्रैंचाइज़ी शुल्क, सुरक्षा जमा, बुकिंग राशि, वापसी योग्य जमा, फ्रैंचाइज़ी की ओर अग्रिम के रूप में नहीं माना जाएगा।",
  "आवेदन अस्वीकृति, आवेदक द्वारा वापसी, दस्तावेज जमा करने में विफलता, समीक्षा में विलंब, गैर-चयन, व्यापार नीति में बदलाव, आवेदक अयोग्य होने, आवेदन की समय सीमा समाप्त होने सहित सभी परिस्थितियों में आवेदन शुल्क सख्ती से गैर-वापसी योग्य है। रिफंड के लिए कोई अनुरोध स्वीकार नहीं किया जाएगा।",
  "आवेदन जमा करने या आवेदन शुल्क का भुगतान करने से: फ्रैंचाइज़ी अनुमोदन, साक्षात्कार, साइट निरीक्षण, क्षेत्र आरक्षण, भविष्य साझेदारी, फ्रैंचाइज़ी समझौते का निष्पादन की गारंटी नहीं होती है। केवल डिसेंबर डिलाइट्स द्वारा अनुमोदित आवेदकों को आगे की चर्चा के लिए आमंत्रित किया जाएगा।",
  "आवेदन व्यापार अनुभव, उद्यमशीलता क्षमता, वित्तीय मजबूती, ऋण योग्यता, पृष्ठभूमि सत्यापन, चरित्र और प्रतिष्ठा, व्यापार दृष्टि, स्थान व्यवहार्यता, जनसंख्या घनत्व, स्थानीय मांग, बाजार प्रतिस्पर्धा, आंतरिक विस्तार रणनीति, दीर्घकालिक स्थिरता सहित कई वाणिज्यिक और परिचालन कारकों के आधार पर मूल्यांकन किया जाता है। डिसेंबर डिलाइट्स का निर्णय अंतिम और बाध्यकारी होगा।",
  "डिसेंबर डिलाइट्स हर शहर में फ्रैंचाइज़ी अवसरों की गारंटी नहीं देता है। टियर-3 या उभरते बाजारों से आवेदन: जनसंख्या, क्रय शक्ति, वाणिज्यिक गतिविधि, बाजार की मांग, भविष्य की स्केलेबिलिटी, निवेश क्षमता, ब्रांड उपयुक्तता के आधार पर मूल्यांकन किया जाता है। अनुमोदन पूरी तरह से कंपनी के वाणिज्यिक मूल्यांकन पर निर्भर होगा।",
  "आतिथ्य, खाद्य सेवा, खुदरा, प्रबंधन या उद्यमशीलता में पूर्व अनुभव वाले आवेदकों को प्राथमिकता मिल सकती है। हालांकि, केवल पूर्व अनुभव अनुमोदन की गारंटी नहीं देगा।",
  "आवेदकों को पर्याप्त वित्तीय क्षमता प्रदर्शित करनी होगी। डिसेंबर डिलाइट्स ये मांग सकता है: बैंक विवरण, आयकर रिटर्न, ऋण स्वीकृति पत्र, शुद्ध मूल्य प्रमाणपत्र, CA प्रमाणपत्र, निवेश प्रमाण, संपत्ति दस्तावेज, कोई अतिरिक्त वित्तीय दस्तावेज। संतोषजनक दस्तावेज प्रस्तुत करने में विफलता के परिणामस्वरूप अस्वीकृति हो सकती है।",
  "फ्रैंचाइज़ी आवेदनों की समीक्षा के लिए कोई निश्चित समयसीमा नहीं है। कंपनी आवेदनों की संख्या, आंतरिक सत्यापन, व्यापार प्राथमिकताएं, विस्तार योजनाएं, परिचालन आवश्यकताओं के आधार पर समीक्षा के क्रम और अवधि निर्धारित करने का विशेष अधिकार रखती है। विलंब के आधार पर आवेदक कोई अधिकार का दावा नहीं कर सकते।",
  "डिसेंबर डिलाइट्स आम तौर पर मौजूदा परिचालित फ्रैंचाइज़ी के लगभग 5 से 10 किलोमीटर के भीतर कई फ्रैंचाइज़ी आउटलेट्स को मंजूरी देने से बचता है। हालांकि, कंपनी जनसंख्या, बाजार की मांग, भविष्य के विस्तार, वाणिज्यिक व्यवहार्यता, ब्रांड रणनीति के आधार पर क्षेत्रीय सीमाएं निर्धारित करने का विशेष अधिकार रखती है। जब तक लिखित फ्रैंचाइज़ी समझौते के माध्यम से स्पष्ट रूप से अनुमोदित नहीं किया जाता, कोई भी आवेदक विशेष क्षेत्रीय अधिकारों का दावा नहीं कर सकता।",
  "सभी आधिकारिक संचार केवल info@decemberdelights.in के माध्यम से किया जाएगा। आवेदकों को: फोन कॉल, WhatsApp संदेश, सोशल मीडिया संदेश, तृतीय पक्ष, दलाल, सलाहकार, अनधिकृत प्रतिनिधियों पर भरोसा नहीं करने की सलाह दी जाती है। जब तक डिसेंबर डिलाइट्स विशेष रूप से लिखित में अनुमति न दे।",
  "कंपनी का गलत प्रतिरूपण करने वाले व्यक्तियों द्वारा किसी भी धोखाधड़ी, वित्तीय नुकसान, गलत प्रतिनिधित्व या नुकसान के लिए डिसेंबर डिलाइट्स जिम्मेदार नहीं होगा। भुगतान करने से पहले संचार की प्रामाणिकता सत्यापित करना आवेदकों की अपनी जिम्मेदारी है।",
  "आंतरिक समीक्षा पद्धति, स्कोरिंग मानदंड, अनुमोदन मानदंड, विस्तार रणनीति और वाणिज्यिक मूल्यांकन प्रक्रिया डिसेंबर डिलाइट्स की विशेष स्वामित्व वाली गोपनीय स्वामित्व जानकारी है। लागू कानून के तहत आवश्यक को छोड़कर, अनुमोदन, अस्वीकृति या स्थगन के कारणों का खुलासा करने के लिए कंपनी बाध्य नहीं है।",
  "डिसेंबर डिलाइट्स की विशेष बौद्धिक संपदा: December Delights®, NOT JUST A CAFE®, लोगो, डिजाइन, मेनू कॉन्सेप्ट, रेसिपी, ब्रांड पहचान, विपणन सामग्री, ट्रेड ड्रेस, व्यापार प्रणालियां। फ्रैंचाइज़ी के लिए आवेदन करने मात्र से आवेदक को कोई स्वामित्व, लाइसेंस या उपयोग अधिकार प्राप्त नहीं होते हैं। अनधिकृत उपयोग लागू बौद्धिक संपदा कानूनों के तहत उचित कानूनी कार्रवाई को आकर्षित कर सकता है।",
  "डिसेंबर डिलाइट्स, इसके प्रवर्तकों, निदेशकों, कर्मचारियों, फ्रैंचाइजी या व्यापार संचालन के बारे में कोई भी झूठी, भ्रामक या बदनाम करने वाली टिप्पणी जानबूझकर प्रकाशित या प्रसारित नहीं करने पर आवेदक सहमत हैं। कोई भी गैरकानूनी बदनामी कृत्य भारत के कानूनों के तहत उपयुक्त दीवानी और/या आपराधिक उपायों को आकर्षित कर सकता है, जहां लागू हो वहां भारतीय न्याय संहिता, 2023।",
  "डिसेंबर डिलाइट्स अनुपात में किसी भी आवेदन को स्वीकार या अस्वीकार करने, अतिरिक्त दस्तावेज मांगने, समीक्षा प्रक्रिया को निलंबित करने, पात्रता मानदंड को संशोधित करने, विस्तार रणनीति बदलने, किसी भी क्षेत्र में फ्रैंचाइज़ी अवसरों को बंद करने, इन नियमों एवं शर्तों को किसी भी समय संशोधित करने का संपूर्ण अधिकार सुरक्षित रखता है। ऐसे निर्णय पूरी तरह से कंपनी के विवेक पर किए जाएंगे।",
  "आवेदकों द्वारा प्रस्तुत सभी जानकारी का उपयोग विशेष रूप से फ्रैंचाइज़ी मूल्यांकन और संबंधित व्यापार उद्देश्यों के लिए किया जाएगा। आवेदक बैंकों, वित्तीय संस्थानों, सरकारी रिकॉर्ड या अन्य वैध स्रोतों से प्रस्तुत जानकारी के सत्यापन के लिए सहमत हैं।",
  "इन नियमों एवं शर्तों का शासन भारत के कानूनों द्वारा किया जाएगा। फ्रैंचाइज़ी आवेदन से उत्पन्न या उससे संबंधित कोई भी विवाद डिसेंबर डिलाइट्स के पंजीकृत कार्यालय पर अधिकार क्षेत्र वाली न्यायालयों के विशेष अधिकार क्षेत्र के अधीन होगा।",
  "प्राकृतिक आपदाएं, महामारी, सरकारी कार्रवाई, हड़तालें, तकनीकी विफलताएं, साइबर घटनाएं या अन्य बल मेजेय घटनाओं सहित अपने उचित नियंत्रण से परिस्थितियों के कारण देरी या आवेदनों को संसाधित करने में असमर्थता के लिए डिसेंबर डिलाइट्स जिम्मेदार नहीं होगा।",
  "इन नियमों एवं शर्तों में फ्रैंचाइज़ी आवेदन प्रक्रिया से संबंधित संपूर्ण समझ शामिल है और यह आवेदन प्रक्रिया के संबंध में किसी भी पूर्ण मौखिक चर्चाओं, ईमेल, प्रतिनिधित्वों या प्रचार सामग्री को प्रतिस्थापित करता है।",
  "इस आवेदन को जमा करके और निर्धारित आवेदन शुल्क का भुगतान करके, मैं यहां घोषणा करता हूं: मैंने इन नियमों एवं शर्तों को पढ़ लिया है और समझ लिया है, मेरे द्वारा प्रस्तुत सभी जानकारी सत्य और सटीक है, मैं समझता हूं कि आवेदन शुल्क का भुगतान फ्रैंचाइज़ी अनुमोदन की गारंटी नहीं देता है, मैं समझता हूं कि आवेदन शुल्क गैर-वापसी योग्य है, मैं डिसेंबर डिलाइट्स की सभी नीतियों का पालन करने के लिए सहमत हूं।",
];

const TERMS = { en: TERMS_EN, te: TERMS_TE, hi: TERMS_HI };

const SECTION_LABELS: Record<string, { sections: string[] }> = {
  en: {
    sections: ["Application & Fee", "Fee Details", "Non-Refundable", "No Guarantee", "Evaluation", "Market Coverage", "Experience", "Financial Documents", "Review Timeline", "Territory", "Communication", "Fraud Protection", "Confidentiality", "Intellectual Property", "Defamation", "Company Rights", "Data Usage", "Governing Law", "Force Majeure", "Entire Agreement", "Declaration"],
  },
  te: {
    sections: ["దరఖాస్తు & రుసుము", "రుసుము వివరాలు", "రిఫండ్ చేయబడదు", "గ్యారంటీ లేదు", "మూల్యాంకనం", "మార్కెట్ కవరేజ్", "అనుభవం", "ఆర్థిక పత్రాలు", "సమీక్ష సమయం", "భూభాగం", "సంప్రదింపు", "మోసం రక్షణ", "గోపనీయత", "బౌద్ధిక సంపత్తి", "పరువు నష్టం", "కంపెనీ హక్కులు", "డేటా వినియోగం", "చట్టం", "ఫోర్స్ మేజర్", "సంపూర్ణ ఒప్పందం", "ప్రకటన"],
  },
  hi: {
    sections: ["आवेदन & शुल्क", "शुल्क विवरण", "गैर-वापसी", "कोई गारंटी नहीं", "मूल्यांकन", "बाजार कवरेज", "अनुभव", "वित्तीय दस्तावेज", "समीक्षा समय", "क्षेत्र", "संचार", "धोखाधड़ी सुरक्षा", "गोपनीयता", "बौद्धिक संपदा", "मानहानि", "कंपनी अधिकार", "डेटा उपयोग", "शासी कानून", "बल मेजेय", "संपूर्ण समझौता", "घोषणा"],
  },
};

export default function TermsModal({ open = true, onClose, onAccept }: { open?: boolean; onClose: () => void; onAccept?: (language: string) => void }) {
  const [lang, setLang] = useState<"en" | "te" | "hi">("en");
  const [accepted, setAccepted] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const terms = TERMS[lang];

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
  }, [stopSpeech, lang]);

  const switchLang = (newLang: "en" | "te" | "hi") => {
    stopSpeech();
    setLang(newLang);
    setAccepted(false);
    setScrollProgress(0);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const progress = scrollHeight <= clientHeight ? 1 : scrollTop / (scrollHeight - clientHeight);
      setScrollProgress(Math.min(1, progress));
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    setScrollProgress(0);
    setAccepted(false);
    stopSpeech();
  }, [open, stopSpeech]);

  if (!open) return null;

  return (
    <>
      <style>{`
        @keyframes tcFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes tcSlideUp { from { opacity: 0; transform: translateY(20px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes tcCheckPop { 0% { transform: scale(0.8); } 50% { transform: scale(1.15); } 100% { transform: scale(1); } }

        .tc-overlay {
          position: fixed; inset: 0; z-index: 10000;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center;
          padding: 1rem;
          animation: tcFadeIn 0.25s ease-out;
        }
        .tc-modal {
          background: #fff;
          border-radius: 20px;
          max-width: 900px; width: 95%;
          max-height: 92vh;
          display: flex; flex-direction: column;
          box-shadow: 0 25px 60px rgba(0,0,0,0.3);
          animation: tcSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          overflow: hidden;
          position: relative;
        }

        .tc-header {
          padding: 1.5rem 1.75rem 1rem;
          flex-shrink: 0;
          border-bottom: 1px solid #f0ede8;
        }
        .tc-header-top {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 0.75rem;
        }
        .tc-header h2 {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.65rem; font-weight: 700; color: #1b3c33;
          margin: 0; line-height: 1.2;
        }
        .tc-header p {
          font-family: 'Outfit', sans-serif;
          font-size: 0.82rem; color: #999;
          margin: 0.3rem 0 0;
        }

        .tc-lang-row {
          display: flex; gap: 0.35rem;
        }
        .tc-lang-btn {
          padding: 0.3rem 0.75rem;
          border-radius: 100px;
          border: 1.5px solid #e8e5e0;
          background: transparent;
          color: #999;
          font-family: 'Outfit', sans-serif;
          font-size: 0.7rem; font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .tc-lang-btn:hover { border-color: #c8a97e; color: #1b3c33; }
        .tc-lang-btn.active {
          background: #1b3c33;
          border-color: #1b3c33;
          color: #fff;
        }

        .tc-close-btn {
          background: none; border: none;
          color: #ccc; cursor: pointer;
          padding: 0.4rem; border-radius: 8px;
          transition: all 0.2s;
          display: flex; align-items: center; justify-content: center;
        }
        .tc-close-btn:hover { background: #f5f5f5; color: #666; }

        .tc-progress-wrap {
          height: 3px; background: #f0ede8;
        }
        .tc-progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #1b3c33, #c8a97e);
          transition: width 0.2s ease-out;
        }

        .tc-scroll {
          flex: 1; overflow-y: auto;
          padding: 1.5rem 2rem;
          scrollbar-width: thin;
          scrollbar-color: #ddd transparent;
          overscroll-behavior: contain;
          min-height: 0;
        }
        .tc-scroll::-webkit-scrollbar { width: 4px; }
        .tc-scroll::-webkit-scrollbar-track { background: transparent; }
        .tc-scroll::-webkit-scrollbar-thumb { background: #ddd; border-radius: 10px; }

        .tc-item {
          display: flex; gap: 0.75rem;
          margin-bottom: 0.5rem;
          padding: 0.85rem 1rem;
          border-radius: 12px;
          transition: background 0.15s;
        }
        .tc-item:hover { background: #faf9f7; }

        .tc-num {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 1rem; color: #c8a97e;
          flex-shrink: 0; min-width: 1.6rem;
          text-align: right; padding-top: 2px;
          opacity: 0.85;
        }
        .tc-text {
          font-family: 'Outfit', sans-serif;
          font-size: 0.92rem; color: #333;
          line-height: 1.7; margin: 0;
        }
        .tc-text strong {
          color: #1b3c33;
          font-weight: 700;
          background: linear-gradient(180deg, transparent 60%, rgba(200,169,126,0.2) 60%);
          padding: 0 2px;
        }
        .tc-section-label {
          font-family: 'Montserrat', sans-serif;
          font-size: 0.7rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 2.5px;
          color: #1b3c33; margin: 1.25rem 0 0.5rem;
          padding-left: 0.2rem;
          display: flex; align-items: center; gap: 0.6rem;
        }
        .tc-section-label::after {
          content: '';
          flex: 1; height: 1px;
          background: linear-gradient(90deg, #e0ddd8, transparent);
        }
        .tc-section-label:first-child { margin-top: 0; }

        .tc-footer {
          padding: 1.25rem 2rem 1.5rem;
          flex-shrink: 0;
          border-top: 1px solid #f0ede8;
          max-height: 50vh;
          overflow-y: auto;
          overscroll-behavior: contain;
          scrollbar-width: thin;
          scrollbar-color: #ddd transparent;
          display: flex;
          flex-direction: column;
        }

        .tc-checkbox {
          display: flex; align-items: center; gap: 0.85rem;
          cursor: pointer;
          padding: 0.85rem 1.1rem;
          border-radius: 12px;
          border: 1.5px solid #e8e5e0;
          transition: all 0.2s;
          margin-bottom: 0.75rem;
        }
        .tc-checkbox:hover { border-color: #c8a97e; }
        .tc-checkbox.checked {
          background: #f7f5f2;
          border-color: #1b3c33;
        }
        .tc-checkbox-box {
          width: 22px; height: 22px; flex-shrink: 0;
          border-radius: 6px;
          border: 2px solid #ddd;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
        }
        .tc-checkbox.checked .tc-checkbox-box {
          background: #1b3c33;
          border-color: #1b3c33;
          animation: tcCheckPop 0.3s ease;
        }
        .tc-checkbox-text {
          font-family: 'Outfit', sans-serif;
          font-size: 0.88rem; font-weight: 500;
          color: #999; transition: color 0.2s;
          line-height: 1.4;
        }
        .tc-checkbox.checked .tc-checkbox-text { color: #1b3c33; }

        .tc-full-link {
          display: inline-flex; align-items: center; gap: 0.3rem;
          margin-left: 2.85rem; margin-bottom: 0.75rem;
          font-family: 'Outfit', sans-serif;
          font-size: 0.75rem; color: #999;
          text-decoration: none; transition: color 0.2s;
        }
        .tc-full-link:hover { color: #1b3c33; }

        .tc-btn-row {
          display: flex; gap: 0.75rem;
          flex-shrink: 0;
          padding-top: 0.75rem;
          border-top: 1px solid #f0ede8;
          margin-top: auto;
          background: #fff;
          position: sticky;
          bottom: 0;
        }
        .tc-btn {
          flex: 1; padding: 0.9rem;
          border-radius: 100px;
          font-family: 'Outfit', sans-serif;
          font-size: 0.88rem; font-weight: 600;
          cursor: pointer; border: none;
          transition: all 0.2s;
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
        }
        .tc-btn-cancel {
          border: 1.5px solid #e0ddd8;
          background: #fff;
          color: #888;
        }
        .tc-btn-cancel:hover { border-color: #ccc; color: #555; }
        .tc-btn-submit {
          background: #1b3c33;
          color: #fff;
          box-shadow: 0 4px 16px rgba(27,60,51,0.2);
        }
        .tc-btn-submit:hover { background: #153028; box-shadow: 0 6px 20px rgba(27,60,51,0.3); }
        .tc-btn-submit:disabled {
          background: #e0ddd8;
          color: #aaa;
          box-shadow: none; cursor: not-allowed;
        }

        @media (max-width: 480px) {
          .tc-modal { max-height: 95vh; border-radius: 16px; }
          .tc-header { padding: 1.25rem 1.25rem 0.75rem; }
          .tc-scroll { padding: 1rem 1.25rem; }
          .tc-footer { padding: 0.75rem 1.25rem 1.25rem; }
          .tc-btn-row { flex-direction: column; gap: 0.5rem; }
          .tc-btn { width: 100%; }
          .tc-text { font-size: 0.85rem; }
          .tc-num { font-size: 0.9rem; }
          .tc-section-label { font-size: 0.62rem; }
        }
      `}</style>

      <div className="tc-overlay" onClick={onClose}>
        <div className="tc-modal" onClick={(e) => e.stopPropagation()}>
          <div className="tc-header">
            <div className="tc-header-top">
              <div>
                <h2>{lang === "en" ? "Terms & Conditions" : lang === "te" ? "నిబంధనలు & షరతులు" : "नियम एवं शर्तें"}</h2>
                <p>{lang === "en" ? "Franchise Application" : lang === "te" ? "ఫ్రాంచైజీ దరఖాస్తు" : "फ्रैंचाइज़ी आवेदन"}</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div className="tc-lang-row">
                  <button className={`tc-lang-btn ${lang === "en" ? "active" : ""}`} onClick={() => switchLang("en")}>EN</button>
                  <button className={`tc-lang-btn ${lang === "te" ? "active" : ""}`} onClick={() => switchLang("te")}>TE</button>
                  <button className={`tc-lang-btn ${lang === "hi" ? "active" : ""}`} onClick={() => switchLang("hi")}>HI</button>
                </div>
                <button className="tc-close-btn" onClick={() => { stopSpeech(); onClose(); }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: "0.78rem", color: "#999", margin: 0 }}>
                {terms.length} clauses
              </p>
              <button onClick={speaking ? stopSpeech : speak}
                style={{ padding: "0.35rem 0.8rem", borderRadius: "100px", border: "1.5px solid #e8e5e0", background: speaking ? "#f7f5f2" : "transparent", color: speaking ? "#1b3c33" : "#999", fontFamily: "'Outfit', sans-serif", fontSize: "0.7rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.35rem", transition: "all 0.2s" }}
                onMouseEnter={(e) => { if (!speaking) { e.currentTarget.style.borderColor = "#c8a97e"; e.currentTarget.style.color = "#1b3c33"; } }}
                onMouseLeave={(e) => { if (!speaking) { e.currentTarget.style.borderColor = "#e8e5e0"; e.currentTarget.style.color = "#999"; } }}>
                {speaking ? (
                  <><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg> Stop</>
                ) : (
                  <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></svg> Listen</>
                )}
              </button>
            </div>
          </div>

          <div className="tc-progress-wrap">
            <div className="tc-progress-bar" style={{ width: `${scrollProgress * 100}%` }} />
          </div>

          <div className="tc-scroll" ref={scrollRef} data-lenis-prevent>
            {terms.map((term, i) => {
              const sections = SECTION_LABELS[lang]?.sections || [];
              const showLabel = i < sections.length;
              return (
                <div key={i}>
                  {showLabel && <div className="tc-section-label">{sections[i]}</div>}
                  <div className="tc-item">
                    <span className="tc-num">{String(i + 1).padStart(2, "0")}</span>
                    <p className="tc-text" dangerouslySetInnerHTML={{ __html: term }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="tc-footer">
            <div className={`tc-checkbox ${accepted ? "checked" : ""}`} onClick={() => setAccepted(!accepted)}>
              <div className="tc-checkbox-box">
                {accepted && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                )}
              </div>
              <span className="tc-checkbox-text">
                {lang === "en" ? "I have read and accept all terms & conditions" : lang === "te" ? "నేను అన్ని నిబంధనలు & షరతులను చదివి, అంగీకరిస్తున్నాను" : "मैंने सभी नियम एवं शर्तें पढ़ ली हैं और स्वीकार करता हूं"}
              </span>
            </div>

            <a href="/terms" target="_blank" rel="noopener noreferrer" className="tc-full-link">
              {lang === "en" ? "Read full terms on website" : lang === "te" ? "వెబ్‌సైట్‌లో పూర్తి నిబంధనలు చదవండి" : "वेबसाइट पर पूर्ण नियम पढ़ें"}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
            </a>

            <div className="tc-btn-row">
              <button className="tc-btn tc-btn-cancel" onClick={() => { stopSpeech(); onClose(); }}>
                {lang === "en" ? "Cancel" : lang === "te" ? "రద్దు" : "रद्द करें"}
              </button>
              <button className="tc-btn tc-btn-submit"
                onClick={() => { if (accepted) { stopSpeech(); onAccept?.(lang); } }}
                disabled={!accepted}>
                {lang === "en" ? "Accept & Submit" : lang === "te" ? "అంగీకరించి సమర్పించండి" : "स्वीकार करें और जमा करें"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
