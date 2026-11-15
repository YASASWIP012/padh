/** A one-page consent form to print, in English, Telugu and Hindi. */
const FORM = {
  en: {
    title: 'Parent consent: reading check (form v1)',
    body: [
      'Your child\'s teacher would like to use a free app called Padh to check how well your child reads, and to give short daily practice.',
      'Your child reads a short passage aloud into a phone. The app listens, shows which words were read well, and suggests 10 minutes of practice.',
      'We only use a nickname. We do not take your child\'s full name, photo, phone number or Aadhaar.',
      'The recording is sent to ElevenLabs, a speech company, to turn it into text, and and Padh deletes its copy. ElevenLabs handles it under its own data terms. Padh keeps the text and the scores, without your child\'s name, for the length of the pilot and at most 90 days for the text. To write practice passages, Cloudflare Workers AI, a language-model service, receives only a few practice words, never your child\'s voice or nickname.',
      'If you tick the second box, a few recordings may be kept for up to 14 days so a second adult can check that the app scored correctly. Then they are deleted.',
      'Your child will be placed by chance in one of two groups. One group practises with the app for ten minutes a day. The other group reads storybooks aloud with an adult for the same time and starts the app practice a week later.',
      'You can say no, or stop at any time, by telling the teacher. The teacher will then delete everything about your child from the app. Saying no changes nothing for your child at school.',
    ],
    yes1: 'I agree that my child can use the reading check and practice.',
    yes2: 'I also agree that a few recordings may be kept for up to 14 days for a second adult to check, then deleted.',
    sign: 'Parent or guardian signature',
    child: 'Child\'s nickname',
    date: 'Date',
  },
  te: {
    title: 'తల్లిదండ్రుల అనుమతి: చదువు పరీక్ష (ఫారం v1)',
    body: [
      'మీ పిల్లల టీచర్ "పఢ్" అనే ఉచిత యాప్‌తో మీ పిల్లలు ఎంత బాగా చదువుతున్నారో చూసి, రోజూ కొంచెం సాధన ఇవ్వాలనుకుంటున్నారు.',
      'మీ పిల్లలు ఒక చిన్న పాఠాన్ని ఫోన్ దగ్గర గట్టిగా చదువుతారు. యాప్ విని, ఏ పదాలు బాగా చదివారో చూపి, 10 నిమిషాల సాధన చెబుతుంది.',
      'మేము ఒక ముద్దుపేరు మాత్రమే వాడతాం. పూర్తి పేరు, ఫోటో, ఫోన్ నంబర్, ఆధార్ తీసుకోము.',
      'రికార్డింగ్‌ను మాటలుగా మార్చడానికి ElevenLabs అనే సంస్థకు పంపి, తర్వాత తొలగిస్తాం. మార్కులు, మాటలు పేరు లేకుండా పైలట్ ముగిసేవరకు ఉంటాయి, మాటలు 90 రోజులకు మించి ఉండవు. సాధన పాఠాలు రాయడానికి Cloudflare Workers AI అనే భాషా-మోడల్ సేవకు కొన్ని సాధన పదాలు మాత్రమే వెళ్తాయి. మీ పిల్లల గొంతు, పేరు వెళ్ళవు.',
      'రెండో పెట్టెలో టిక్ పెడితే, యాప్ సరిగా లెక్కించిందో మరో పెద్దవారు చూడటానికి కొన్ని రికార్డింగ్‌లు 14 రోజుల వరకు ఉంచి, తర్వాత తొలగిస్తాం.',
      'పిల్లలను అదృష్టం ప్రకారం రెండు గుంపులుగా చేస్తాం. ఒక గుంపు రోజూ పది నిమిషాలు యాప్‌తో సాధన చేస్తుంది. రెండో గుంపు అదే సమయం పెద్దవారితో కథల పుస్తకం చదువుతుంది, వారం తర్వాత యాప్ సాధన మొదలుపెడుతుంది.',
      'మీరు ఎప్పుడైనా వద్దు అనవచ్చు. టీచర్‌కి చెబితే, యాప్‌లో మీ పిల్లల వివరాలన్నీ తొలగిస్తారు. దాని వల్ల బడిలో మీ పిల్లలకు ఏ మార్పూ ఉండదు.',
    ],
    yes1: 'నా పిల్లలు చదువు పరీక్ష, సాధన చేయడానికి నేను ఒప్పుకుంటున్నాను.',
    yes2: 'టీచర్ చూడటానికి కొన్ని రికార్డింగ్‌లు 14 రోజుల వరకు ఉంచి, తర్వాత తొలగించడానికి కూడా ఒప్పుకుంటున్నాను.',
    sign: 'తల్లి / తండ్రి / సంరక్షకుల సంతకం',
    child: 'పిల్లల ముద్దుపేరు',
    date: 'తేదీ',
  },
  hi: {
    title: 'माता-पिता की सहमति: पढ़ने की जाँच (फ़ॉर्म v1)',
    body: [
      'आपके बच्चे के शिक्षक "पढ़" नाम के मुफ़्त ऐप से देखना चाहते हैं कि आपका बच्चा कितना अच्छा पढ़ता है, और रोज़ थोड़ा अभ्यास देना चाहते हैं।',
      'बच्चा एक छोटा पाठ फ़ोन के पास ज़ोर से पढ़ता है। ऐप सुनकर बताता है कि कौन से शब्द ठीक पढ़े गए, और 10 मिनट का अभ्यास सुझाता है।',
      'हम सिर्फ़ एक प्यार का नाम लेते हैं। पूरा नाम, फ़ोटो, फ़ोन नंबर या आधार नहीं लेते।',
      'रिकॉर्डिंग को लिखे शब्दों में बदलने के लिए ElevenLabs नाम की कंपनी को भेजा जाता है, फिर मिटा दिया जाता है। अंक और लिखे शब्द बिना नाम के पायलट चलने तक रहते हैं, लिखे शब्द 90 दिन से ज़्यादा नहीं। अभ्यास पाठ लिखने के लिए Cloudflare Workers AI नाम की भाषा-मॉडल सेवा को सिर्फ़ कुछ अभ्यास शब्द जाते हैं, बच्चे की आवाज़ या नाम नहीं।',
      'दूसरे खाने में निशान लगाने पर कुछ रिकॉर्डिंग 14 दिन तक रखी जा सकती हैं ताकि कोई दूसरा बड़ा व्यक्ति जाँच सके कि ऐप ने सही अंक दिए, फिर मिटा दी जाती हैं।',
      'बच्चों को संयोग से दो समूहों में रखा जाएगा। एक समूह रोज़ दस मिनट ऐप से अभ्यास करेगा। दूसरा समूह उतना ही समय किसी बड़े के साथ कहानी की किताब पढ़ेगा और एक हफ़्ते बाद ऐप से अभ्यास शुरू करेगा।',
      'आप कभी भी मना कर सकते हैं, बस शिक्षक को बता दें। तब शिक्षक ऐप से आपके बच्चे की सारी जानकारी मिटा देंगे। मना करने से स्कूल में आपके बच्चे के लिए कुछ नहीं बदलेगा।',
    ],
    yes1: 'मैं सहमत हूँ कि मेरा बच्चा पढ़ने की जाँच और अभ्यास कर सकता है।',
    yes2: 'मैं यह भी सहमत हूँ कि कुछ रिकॉर्डिंग शिक्षक की जाँच के लिए 14 दिन तक रखी जाएँ, फिर मिटा दी जाएँ।',
    sign: 'माता / पिता / अभिभावक के हस्ताक्षर',
    child: 'बच्चे का प्यार का नाम',
    date: 'तारीख़',
  },
};

export function ConsentPage() {
  return (
    <div class="col" style="gap:20px">
      <div class="row no-print" style="justify-content:space-between">
        <p class="t-small">Print this page, one copy per child. A teacher keeps the signed copy.</p>
        <button class="btn btn-ink btn-sm" onClick={() => window.print()}>Print</button>
      </div>
      {(['en', 'te', 'hi'] as const).map((l) => {
        const f = FORM[l];
        return (
          <section class="reader col consent" lang={l} key={l} style="gap:12px">
            <h3 class={l !== 'en' ? 'indic' : ''}>{f.title}</h3>
            {f.body.map((p, i) => <p key={i} class={l !== 'en' ? 'indic' : ''}>{p}</p>)}
            <p class={l !== 'en' ? 'indic' : ''}>☐ {f.yes1}</p>
            <p class={l !== 'en' ? 'indic' : ''}>☐ {f.yes2}</p>
            <div class="grid grid-2" style="margin-top:20px">
              {['Form no. ________', f.child, f.sign, f.date].map((x) => <div key={x} style="border-top:1px solid var(--line-2);padding-top:6px" class={`t-small ${l !== 'en' ? 'indic' : ''}`}>{x}</div>)}
            </div>
          </section>
        );
      })}
    </div>
  );
}
