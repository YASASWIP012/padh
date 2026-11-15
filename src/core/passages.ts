// Original reading passages for oral reading fluency checks, Classes 1 to 5.
// Forms A, B and C of each language and level are equated so they can be used
// as pre and post tests. Within a language and level the forms match on
// aksharas (grapheme clusters, within 5%), conjuncts (within 1), words
// (within 2) and sentence count (equal). passages.test.ts checks all of this.
//
// Calibration: the paragraph is Class 1 level (short common words, at most a
// few very common conjuncts). The story is Class 2 level.

export type Lang = 'te' | 'hi' | 'en';
export type Level = 'letter' | 'word' | 'para' | 'story';
export type Form = 'A' | 'B' | 'C';
export interface Question { q: string; accept: string[] }
export interface Passage { id: string; lang: Lang; level: Level; form: Form; title?: string; text: string; questions?: Question[] }

function p(lang: Lang, level: Level, form: Form, text: string, title?: string, questions?: Question[]): Passage {
  const out: Passage = { id: `${lang}-${level}-${form}`, lang, level, form, text };
  if (title) out.title = title;
  if (questions) out.questions = questions;
  return out;
}

export const PASSAGES: Passage[] = [
  // Telugu
  p('te', 'letter', 'A', 'అ క మ ఇ ల ర కా స పు న'),
  p('te', 'letter', 'B', 'ఆ ప త ఉ గ వ మి ద లు చ'),
  p('te', 'letter', 'C', 'ఎ బ య ఒ జ ట రా డ కి హ'),

  p('te', 'word', 'A', 'పాలు మేక కోడి నీరు బడి పలక ఆవు చేప అమ్మ అక్క'),
  p('te', 'word', 'B', 'తల కాలు కోతి వాన పులి అరటి జడ ఊరు పిల్లి కుక్క'),
  p('te', 'word', 'C', 'ఎలుక గాలి పాట కోట చీమ తోట ఆట దూడ అన్న చెట్టు'),

  p('te', 'para', 'A',
    'కమల ఇంట్లో ఒక ఆవు ఉంది. ఆవు రంగు తెలుపు. కమల రోజూ ఆవుకు గడ్డి వేస్తుంది. ఆవు కడుపు నిండా తిని నీరు తాగుతుంది. అమ్మ ఆవు పాలు పితుకుతుంది.',
    'కమల ఆవు'),
  p('te', 'para', 'B',
    'గోపికి ఒక గాలిపటం ఉంది. దాని రంగు ఎరుపు. గోపి రోజూ డాబా మీద గాలిపటం ఎగరేస్తాడు. గాలిపటం పైకి పైకి ఎగురుతుంది. అక్క, అమ్మ చూసి నవ్వుతారు.',
    'గోపి గాలిపటం'),
  p('te', 'para', 'C',
    'లతకు ఒక చిలుక ఉంది. చిలుక రంగు ఆకుపచ్చ. లత రోజూ చిలుకకు జామపండు పెడుతుంది. చిలుక పండు తిని "లతా" అని పిలుస్తుంది. అమ్మ విని నవ్వుతుంది.',
    'లత చిలుక'),

  p('te', 'story', 'A',
    'ఆ రోజు ఉదయం చాలా ఎండగా ఉంది. సీత నాన్నతో కలిసి పొలానికి వెళ్ళింది. పొలంలో మట్టి బాగా ఎండిపోయింది. అంతలో ఆకాశంలో నల్లని మేఘాలు వచ్చాయి. చల్లని గాలి గట్టిగా వీచింది. వెంటనే పెద్ద వాన మొదలైంది. సీత, నాన్న పరుగెత్తి ఒక గుడిసెలో కూర్చున్నారు. వాన నీళ్ళతో పొలం అంతా తడిసింది. నాన్న నవ్వి, "ఈసారి మన పంట బాగా పండుతుంది" అన్నాడు.',
    'వాన వచ్చింది',
    [
      { q: 'సీత ఎవరితో కలిసి పొలానికి వెళ్ళింది?', accept: ['నాన్న', 'నాన్నతో', 'తండ్రి', 'నాన్నగారు'] },
      { q: 'వాన వచ్చినప్పుడు వాళ్ళు ఎక్కడ కూర్చున్నారు?', accept: ['గుడిసె', 'గుడిసెలో', 'పాక'] },
    ]),
  p('te', 'story', 'B',
    'గోపికి ఒక చిన్న మేకపిల్ల ఉండేది. దాని రంగు తెలుపు. గోపి రోజూ దానితో మైదానంలో ఆడేవాడు. ఒక రోజు సాయంత్రం మేకపిల్ల అక్కడ లేదు. గోపి చెట్ల కింద, బావి దగ్గర వెతికాడు. మేకపిల్ల దొరకక గోపి ఏడ్చాడు. అంతలో దారి పక్కన "మే మే" అని అరుపు వినబడింది. మేకపిల్ల ఒక బండి దగ్గర ఉంది. గోపి సంతోషంగా దాన్ని ఎత్తుకుని ఇంటికి వెళ్ళాడు.',
    'తప్పిపోయిన మేకపిల్ల',
    [
      { q: 'మేకపిల్ల ఏ రంగులో ఉంది?', accept: ['తెలుపు', 'తెల్లని', 'తెల్లగా', 'తెల్ల'] },
      { q: 'మేకపిల్ల ఎక్కడ దొరికింది?', accept: ['బండి', 'బండి దగ్గర', 'దారి పక్కన', 'దారి'] },
    ]),
  p('te', 'story', 'C',
    'ఆదివారం లత అమ్మతో సంతకు వెళ్ళింది. సంతలో చాలా జనం ఉన్నారు. అంతా సందడిగా ఉంది. లత టమాటాలు, బెండకాయలు, వంకాయలు చూసింది. అమ్మ బియ్యం, పప్పు, అరటిపండ్లు కొన్నది. ఒక తాత దగ్గర మట్టి కుండీలు ఉన్నాయి. లత తన మొక్క కోసం ఒక కుండీ అడిగింది. అమ్మ పది రూపాయలు ఇచ్చి ఆ కుండీ కొన్నది. లత సంతోషంగా కుండీతో ఇంటికి వచ్చింది.',
    'సంత రోజు',
    [
      { q: 'లత ఏమి అడిగింది?', accept: ['కుండీ', 'మట్టి కుండీ', 'కుండీని'] },
      { q: 'అమ్మ కుండీకి ఎన్ని రూపాయలు ఇచ్చింది?', accept: ['పది', '10', 'పది రూపాయలు', '10 రూపాయలు'] },
    ]),

  // Hindi
  p('hi', 'letter', 'A', 'क म अ ल र इ स की न बु'),
  p('hi', 'letter', 'B', 'प त आ ग ह उ द मे ज सो'),
  p('hi', 'letter', 'C', 'ब य ए ट च ओ व रा ख दि'),

  p('hi', 'word', 'A', 'घर कमल जल फल बस आम मोर गाय बच्चा अच्छा'),
  p('hi', 'word', 'B', 'नल कलम मन रथ सब आग दूध केला कुत्ता पत्ता'),
  p('hi', 'word', 'C', 'हल नमक वन घास तोता सेब मामा दाल बिल्ली मिट्टी'),

  p('hi', 'para', 'A',
    'रानी के घर में एक बड़ी गाय है। गाय का रंग सफ़ेद है। रानी रोज़ सुबह गाय को हरी घास देती है। गाय बहुत अच्छा दूध देती है। घर के सब बच्चे मीठा दूध पीते हैं।',
    'रानी की गाय'),
  p('hi', 'para', 'B',
    'मोहन के पास एक लाल पतंग है। वह रोज़ छत पर पतंग उड़ाता है। पतंग हवा में ऊपर तक जाती है। गली के बच्चे भी आ जाते हैं। सब बच्चे खुश होकर ताली बजाते हैं।',
    'लाल पतंग'),
  p('hi', 'para', 'C',
    'आज सुबह से बारिश हो रही है। सोनू और मीना घर में बैठे हैं। माँ उन्हें रोटी और दाल परोस रही है। दोनों बच्चे मज़े से खाना खा रहे हैं। वे खिड़की से बारिश देख रहे हैं।',
    'बारिश का दिन'),

  p('hi', 'story', 'A',
    'गाँव में बहुत धूप थी और खेत सूखे थे। सीता अपने पापा के साथ सुबह खेत पर गई। तभी आसमान में काले बादल छा गए। ठंडी हवा ज़ोर से चलने लगी। फिर तेज़ बारिश होने लगी। सीता और पापा भागकर पास की झोपड़ी में बैठ गए। बारिश से सूखे खेत गीले हो गए। पापा ने हँसकर कहा, "अब हमारी फ़सल अच्छी होगी।"',
    'बारिश आई',
    [
      { q: 'सीता किसके साथ खेत पर गई?', accept: ['पापा', 'पापा के साथ', 'पिता', 'पिताजी'] },
      { q: 'बारिश में सीता और पापा कहाँ बैठे?', accept: ['झोपड़ी', 'झोपड़ी में', 'झोंपड़ी'] },
    ]),
  p('hi', 'story', 'B',
    'गोपू के पास एक छोटी सफ़ेद बकरी थी। वह रोज़ उसे स्कूल के मैदान में ले जाता था। एक शाम बकरी वहाँ नहीं थी। गोपू ने उसे पेड़ों के नीचे और कुएँ के पास ढूँढा। वह उदास होकर रोने लगा। तभी सड़क की ओर से "मैं-मैं" की आवाज़ आई। बकरी सड़क के किनारे घास खा रही थी। गोपू उसे गले लगाकर घर ले आया।',
    'खोई हुई बकरी',
    [
      { q: 'बकरी का रंग कैसा था?', accept: ['सफ़ेद', 'सफेद', 'सफ़ेद रंग', 'सफेद रंग'] },
      { q: 'बकरी कहाँ घास खा रही थी?', accept: ['सड़क', 'सड़क के किनारे', 'किनारे'] },
    ]),
  p('hi', 'story', 'C',
    'रविवार को लता माँ के साथ बाज़ार गई। बाज़ार में बहुत भीड़ और शोर था। लता ने लाल टमाटर और बड़े आलू देखे। माँ ने चावल, दाल और कुछ केले खरीदे। एक आदमी मिट्टी के गमले बेच रहा था। लता को अपने पौधे के लिए गमला चाहिए था। माँ ने दस रुपये देकर गमला ले लिया। लता गमला लेकर खुशी से घर लौटी।',
    'बाज़ार का दिन',
    [
      { q: 'लता को क्या चाहिए था?', accept: ['गमला', 'एक गमला', 'गमले'] },
      { q: 'माँ ने गमले के लिए कितने रुपये दिए?', accept: ['दस', '10', 'दस रुपये', '10 रुपये'] },
    ]),

  // English
  p('en', 'letter', 'A', 'a m s t i p n o d g'),
  p('en', 'letter', 'B', 'e r c h u b l f k n'),
  p('en', 'letter', 'C', 'o l b r a k s e m t'),

  p('en', 'word', 'A', 'cat sun map hen pot cup leg bus fan box'),
  p('en', 'word', 'B', 'dog bed hat pen jug net top mud bag fox'),
  p('en', 'word', 'C', 'pig hut log van web cap rod tub kid jam'),

  p('en', 'para', 'A',
    'Ravi has a red ball. He plays with his dog in the yard. The dog runs fast and gets the ball. Ravi and his dog are happy.',
    'Ravi and His Dog'),
  p('en', 'para', 'B',
    'Meena has a big hen. The hen sits on a nest in the shed. Meena gives the hen some rice to eat. The hen likes Meena a lot.',
    'The Big Hen'),
  p('en', 'para', 'C',
    'Amma has a cow. The cow eats green grass near the pond. Amma gets milk from the cow each day. We drink the milk at home.',
    'Our Cow'),

  p('en', 'story', 'A',
    'It was a hot day in the village. Sita and her brother Raju were in the field with Appa. Then the sky turned dark and the wind blew. Big drops of rain started to fall. Appa said, "Run to the hut!" They ran quickly and sat under the roof. The rain made the field wet and green. Appa smiled and said, "Now the plants will grow."',
    'The Rain Came',
    [
      { q: 'Who was in the field with Sita?', accept: ['Raju', 'Appa', 'brother', 'father'] },
      { q: 'Where did they sit in the rain?', accept: ['hut', 'roof', 'under the roof', 'in the hut'] },
    ]),
  p('en', 'story', 'B',
    'Gopi had a little white goat. Every day he took it to the field near the school. One evening the goat was not there. Gopi looked under the trees and near the well. He felt sad and began to cry. Then he heard a small sound from the market road. The goat was eating leaves near a cart. Gopi hugged his goat and took it home.',
    'The Lost Goat',
    [
      { q: 'How did Gopi feel when the goat was lost?', accept: ['sad', 'cry', 'unhappy', 'upset'] },
      { q: 'Where was the goat eating leaves?', accept: ['cart', 'near a cart', 'market road', 'road'] },
    ]),
  p('en', 'story', 'C',
    'On Sunday morning Amma took Lata to the market. The market was very busy and full of noise. Lata saw red tomatoes, green beans and big onions. Amma bought rice, dal and some bananas. A man was selling clay pots. Lata wanted a pot for her new plant. Amma gave the man ten rupees for it. Lata took the pot home with a smile.',
    'Market Day',
    [
      { q: 'What did Lata want?', accept: ['pot', 'clay pot', 'a pot'] },
      { q: 'How much did Amma pay for the pot?', accept: ['ten', '10', 'ten rupees', '10 rupees'] },
    ]),
];

function words(s: string): string[] {
  return s.split(/\s+/).filter(Boolean);
}

// Common, easy-to-decode words, including inflected forms children meet in
// school readers (ఇంట్లో, బడికి, ఆవుకు). Long or conjunct-heavy words are left out.
const TE_WORDS = `
అమ్మ నాన్న అక్క అన్న తమ్ముడు చెల్లి తాత అవ్వ మామయ్య అత్త బాబాయి పిన్ని పాప బాబు
తల కాలు చేయి కన్ను ముక్కు చెవి నోరు పన్ను వేలు జుట్టు మెడ గోరు పొట్ట వీపు
ఆవు మేక కోడి కుక్క పిల్లి ఎలుక కోతి పులి ఏనుగు గుర్రం గాడిద చిలుక నెమలి కాకి
పాము చేప కప్ప దూడ ఎద్దు గేదె చీమ ఈగ దోమ బాతు పావురం జింక ఒంటె నక్క ఉడుత మేకపిల్ల
అన్నం పప్పు కూర పాలు పెరుగు నెయ్యి రొట్టె అరటి మామిడి జామ నిమ్మ ఉప్పు బెల్లం కారం
దోసె ఉల్లి టమాటా బియ్యం గుడ్డు నీరు నీళ్ళు చారు మజ్జిగ
ఇల్లు గది తలుపు కిటికీ మంచం కుర్చీ బల్ల చాప కుండ గిన్నె చెంబు గొడుగు బట్ట చీర చొక్కా
లంగా టోపీ చెప్పులు పలక బలపం పుస్తకం బడి గంట బొమ్మ బంతి గాలిపటం బండి సైకిలు
బస్సు పడవ రైలు కుండీ డాబా గుడిసె
చెట్టు ఆకు పువ్వు పూలు పండు కాయ గడ్డి మట్టి రాయి నది చెరువు బావి కొండ వాన ఎండ
గాలి మేఘం ఆకాశం చుక్క నీడ పొలం తోట అడవి ఊరు దారి రోడ్డు ఇసుక
ఎరుపు తెలుపు నలుపు పసుపు పచ్చ నీలం
ఒకటి రెండు మూడు నాలుగు ఐదు ఆరు ఏడు ఎనిమిది తొమ్మిది పది
రా పో తిను తాగు ఆడు పాడు చదువు నడువు పరుగు కూర్చో చూడు విను చెప్పు నవ్వు
పడుకో లే ఇవ్వు కడుగు
పెద్ద చిన్న మంచి కొత్త పాత వేడి చల్లని తీపి పొడవు పొట్టి
రోజు ఉదయం సాయంత్రం రాత్రి పగలు ఆట పాట మాట కథ అక్కడ ఇక్కడ పైన కింద లోపల బయట
అవును కాదు ఏమి ఎవరు ఎక్కడ ఎప్పుడు ఎందుకు ఎలా నేను నువ్వు మేము మనం అతను ఆమె అది ఇది వాళ్ళు
సంత మొక్క పంట రైతు డబ్బు రూపాయి పండుగ ముగ్గు గాజులు జడ కోట
కల వల మేడ గంప బుట్ట తాడు సంచి అద్దం సబ్బు
బెండ వంకాయ దొండ బీర సొర గుమ్మడి కొబ్బరి చింత వేప
ముద్ద పాయసం లడ్డు వడ ఇడ్లీ
మీసం గడ్డం కాలువ
పిల్లలు అల ఓడ మెట్టు గోడ గడప
ఇంట్లో ఇంటికి బడికి బడిలో ఆవుకు అమ్మకు నాన్నకు అక్కకు గదిలో తోటలో పొలంలో పొలానికి
ఊరికి నీటిలో చెట్టుకు ఆకులు పండ్లు కాయలు పాటలు బొమ్మలు
ఉంది ఉన్నాడు వచ్చాడు వచ్చింది వెళ్ళాడు వెళ్ళింది తిన్నాడు తాగింది చూసింది ఆడాడు
`;

// Hindi spellings use the nukta consistently (सफ़ेद, बाज़ार, रोज़).
const HI_WORDS = `
माँ पापा दादा दादी नाना नानी मामा मामी चाचा चाची भाई बहन बेटा बेटी दीदी भैया बच्चा
सिर बाल आँख नाक कान मुँह दाँत हाथ पैर उँगली गला पेट कमर घुटना जीभ होंठ
गाय भैंस बकरी भेड़ कुत्ता बिल्ली चूहा बंदर हाथी घोड़ा गधा ऊँट शेर भालू हिरन खरगोश
तोता मोर कौआ चिड़िया मुर्गा मुर्गी बतख मछली मेंढक साँप चींटी मक्खी तितली गिलहरी कोयल बैल बछड़ा
रोटी दाल चावल सब्ज़ी दूध दही घी मक्खन गुड़ नमक चीनी आम केला सेब अमरूद पपीता नींबू
आलू प्याज़ टमाटर मटर गाजर मूली भिंडी लौकी अंडा पानी चाय खीर हलवा लड्डू
घर कमरा छत दरवाज़ा खिड़की खाट पलंग कुर्सी मेज़ चटाई घड़ा मटका लोटा थाली कटोरी चम्मच
गिलास बाल्टी झाड़ू कपड़ा कुरता साड़ी टोपी जूता चप्पल छाता बस्ता किताब कलम पेंसिल कॉपी
स्कूल गेंद पतंग गुड़िया खिलौना साइकिल नाव रेल
पेड़ पत्ता फूल फल डाल जड़ बीज घास मिट्टी पत्थर नदी तालाब कुआँ पहाड़ बारिश बादल
धूप हवा सूरज चाँद तारा आसमान खेत बाग गाँव शहर सड़क रास्ता पुल रेत जंगल
लाल पीला हरा नीला काला सफ़ेद भूरा गुलाबी
एक दो तीन चार पाँच छह सात आठ नौ दस
आना जाना खाना पीना खेलना पढ़ना लिखना सोना उठना बैठना चलना दौड़ना हँसना रोना देखना
सुनना बोलना नाचना गाना कूदना
बड़ा छोटा अच्छा नया पुराना ठंडा मीठा खट्टा लंबा मोटा पतला तेज़ सुंदर
दिन रात सुबह शाम आज कल अभी यहाँ वहाँ ऊपर नीचे अंदर बाहर हाँ नहीं क्या कौन कहाँ
कब क्यों कैसे मैं तुम हम वह यह वे सब बहुत थोड़ा और
बाज़ार दुकान पैसा रुपया मेला त्योहार किसान हल फ़सल गमला पौधा झोपड़ी ठेला
जल नल कमल मन बस रथ वन अब जब तब पर हर महल मगर
नाम काम धान थैला झूला ताला चाबी रस्सी डिब्बा बोतल आग
घर में बच्चे खेत पर गई गया आया आई खाता खाती पीता पीती देखा देखी
`;

const EN_WORDS = `
cat bat hat mat rat sat fat pat van man can fan pan ran tan jam ham ram bag rag tag wag
gap cap map tap lap nap dad pad sad mad bad had cab tab
bed red fed led hen pen ten men den net pet wet get jet let met set vet leg peg beg web yes egg end
pig dig big fig wig bin pin tin win fin kit hit sit fit bit pit lit lip hip dip tip zip six mix fix kid lid hid him his ink
dog log fog hog jog cot dot hot lot not pot got box fox top mop hop pop rod nod on off mom job
bug hug jug mug rug tug bun fun run sun nut cut hut but bud mud cup pup bus up us tub rub cub gum hum
frog drum milk hand sand band lamp camp jump stop step flag clap crab grab drip trip ship shop fish dish wish
rich much such chin chip chop that this them then with bath path moth sing ring king wing song long
hill fill will bell tell well doll ball tall wall call fall sell kiss less duck luck back pack sack neck
rock sock lock kick pick sick rest nest best test west vest fast last list gift lift soft left belt
help tent went sent hunt plum plan spot spin swim snap skip skin desk mask
the and is it in a I to go no so he we me be she see play look come here said like you was are for one two
tree seed rain cow goat rice farm road home baby food
`;

function uniq(list: string): string[] {
  return Array.from(new Set(words(list)));
}

export const WORD_BANK: Record<Lang, string[]> = {
  te: uniq(TE_WORDS),
  hi: uniq(HI_WORDS),
  en: uniq(EN_WORDS),
};

export function getPassage(lang: Lang, level: Level, form: Form): Passage {
  const found = PASSAGES.find((x) => x.lang === lang && x.level === level && x.form === form);
  if (!found) throw new Error(`No passage for ${lang}-${level}-${form}`);
  return found;
}
