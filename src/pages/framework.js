'use strict';
/** Our Approach, Support & Services, The Journey, About: the original Bloom framework pages, adapted to suicide-loss support. */
const content = require('../content');
const C = require('../components');
const { esc } = require('../util');

const dot = '<span class="w-1.5 h-1.5 rounded-full bg-forest mt-2.5 flex-shrink-0" aria-hidden="true"></span>';

function approach() {
  const rings = [
    ['You', 'You are the foundation.', 'Your grief, in your own words and in your own time, is where everything begins.'],
    ['Wellness', 'Wellness fuels creativity.', 'Small, steady habits around sleep, food, movement and rest can give grief somewhere to rest.'],
    ['Balance', 'Balance enhances productivity.', 'Room for sorrow and for ordinary life, without feeling you must choose one.'],
    ['Energy', 'Energy inspires others.', 'In time, many people find they are able to connect with others again, on their own terms.'],
    ['Living', 'Live with intention.', 'Carrying the person you lost, and building a life that still has meaning.'],
  ];
  const body = `
${C.pageHero({ eyebrow: 'Our Approach', title: 'Where clinical depth meets real life living.', intro: 'To make mental wellbeing a practical, consistent part of how people live, with particular tenderness for those carrying a loss to suicide.', glow: 'bg-sage/40' })}

<section class="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 pb-16 sm:pb-24 md:pb-28">
  <div class="grid md:grid-cols-2 gap-10 sm:gap-14 items-center">
    <div class="reveal flex flex-col items-center order-2 md:order-1">
      <div class="arch-frame w-60 sm:w-80 md:w-full max-w-md"><div class="arch-frame__inner aspect-[3/4]"><img src="/images/mind-body-spirit.jpg" alt="Concentric rings illustrating the Mind, Body, Spirit framework, radiating from You through Wellness, Balance, Energy, to Living" width="736" height="784" loading="lazy" data-fallback></div></div>
      <p class="plaque">Mind &middot; Body &middot; Spirit</p>
    </div>
    <div class="reveal order-1 md:order-2">
      <p class="eyebrow mb-4">Five rings, one foundation</p>
      <h2 class="font-display text-2xl sm:text-3xl text-forest mb-5 sm:mb-6">Everything begins with you.</h2>
      <div class="flex flex-wrap gap-2 mb-6" role="group" aria-label="Explore the five rings">
        ${rings.map(([n], i) => `<button type="button" data-ring="cap-${i}" aria-pressed="${i === 0}" class="ring-stage px-4 py-2 rounded-full text-sm font-utility border transition-colors ${i === 0 ? 'border-forest bg-forest text-sand' : 'border-ink-faint/50 text-ink-soft hover:border-forest'}">${esc(n)}</button>`).join('')}
      </div>
      <div class="min-h-[7rem]" aria-live="polite">
        ${rings.map(([n, line, desc], i) => `<div id="cap-${i}" class="ring-caption ${i ? 'hidden' : ''}"><p class="font-display text-lg sm:text-xl text-forest">${esc(n)} <span class="font-body text-sm sm:text-base text-ink-soft block sm:inline">${esc(line)}</span></p><p class="mt-2 text-sm sm:text-base text-ink-soft leading-relaxed">${esc(desc)}</p></div>`).join('')}
      </div>
    </div>
  </div>
</section>

<section class="scene scene-dark py-16 sm:py-24 md:py-28">
  <div class="glow-blob w-64 h-64 sm:w-96 sm:h-96 bg-clay/30 left-1/2 -translate-x-1/2 -bottom-20" aria-hidden="true"></div>
  <div class="relative z-10 max-w-4xl mx-auto px-5 sm:px-6 md:px-10 text-center">
    <p class="reveal eyebrow-light mb-5 sm:mb-6">In our own words</p>
    <p class="reveal signature-line text-xl sm:text-2xl md:text-3xl leading-relaxed">&ldquo;Mental health care that belongs in everyday life as a lifestyle, not only inside therapy rooms: psychological depth without crisis framing, and wellness designed for lasting change.&rdquo;</p>
  </div>
</section>

<section class="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 py-16 sm:py-24 md:py-28">
  ${C.sectionHeading({ eyebrow: 'What guides our care', title: 'Five principles, adapted for life after suicide loss.' })}
  <div class="grid sm:grid-cols-2 gap-px bg-sand-line">
    ${[
      ['Human-centered care', 'Every person is more than a diagnosis. We listen first to your story, your relationships and what the loss means to you.'],
      ['Mental health as everyday wellbeing', 'Wellbeing is something we nurture gently each day, not only in difficult moments. After a loss, ordinary routines can matter a great deal.'],
      ['Wellness, responsibly integrated', 'Grounding practices, lifestyle reflection and mindful awareness may support therapy. They are complements, never replacements, and always psychologically informed.'],
      ['Respect for individual differences', 'People grieve differently and have different cultures, faiths and families. There is no one correct way to mourn, and no fixed timeline.'],
      ['A gradual, personal journey', 'We value progress that is calm, consistent and enduring over quick fixes or dramatic promises.'],
      ['Honesty about limits', 'Psychological support can help, but it cannot undo a loss or guarantee an outcome. We say so plainly, and refer on when someone needs care beyond our scope.'],
    ].map(([t, d], i) => `<article class="reveal bg-sand p-7 sm:p-10"><span class="font-display italic text-forest-light text-sm">0${i + 1}</span><h3 class="font-display text-lg sm:text-xl text-forest mt-3 mb-3">${esc(t)}</h3><p class="text-sm sm:text-base text-ink-soft leading-relaxed">${esc(d)}</p></article>`).join('')}
  </div>
</section>

<section class="bg-sand-deep/60 border-y border-sand-line py-16 sm:py-24 md:py-28">
  <div class="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 grid sm:grid-cols-3 gap-8 sm:gap-10">
    <div class="reveal"><h3 class="font-utility text-[11px] tracking-eyebrow uppercase text-ink-faint mb-4">Primary qualities</h3><ul class="space-y-2.5 font-display text-lg sm:text-xl text-forest"><li>Calm</li><li>Warm</li><li>Thoughtful</li><li>Grounded</li><li>Reassuring</li></ul></div>
    <div class="reveal"><h3 class="font-utility text-[11px] tracking-eyebrow uppercase text-ink-faint mb-4">Supporting qualities</h3><ul class="space-y-2.5 font-display text-lg sm:text-xl text-forest-light"><li>Modern</li><li>Gentle</li><li>Reflective</li><li>Trustworthy</li></ul></div>
    <div class="reveal"><h3 class="font-utility text-[11px] tracking-eyebrow uppercase text-ink-faint mb-4">We intentionally avoid</h3><ul class="space-y-2.5 font-display text-lg sm:text-xl text-ink-soft italic"><li>Loudness</li><li>Chasing trends</li><li>Overly spiritual language</li><li>Clinical coldness</li><li>Sales pressure</li></ul></div>
  </div>
</section>

<section class="scene scene-dark py-16 sm:py-24 md:py-28">
  <div class="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 md:px-10">
    ${C.sectionHeading({ eyebrow: 'How we sound', title: 'Clear, gentle, and human.', intro: 'Emotionally intelligent yet simple. Reflective rather than instructive. Professional without heaviness or jargon.', dark: true })}
    <div class="grid sm:grid-cols-2 gap-6 sm:gap-10">
      <div class="reveal border border-sage/30 rounded-2xl p-6 sm:p-8 bg-white/5"><p class="eyebrow-light mb-4">Language we lean toward</p><p class="font-display text-xl sm:text-2xl leading-relaxed">Support &middot; Understanding &middot; Care &middot; Connection &middot; Remembering</p></div>
      <div class="reveal border border-clay/40 rounded-2xl p-6 sm:p-8 bg-white/5"><p class="font-utility text-[11px] tracking-eyebrow uppercase text-clay-soft mb-4">Language we avoid</p><p class="font-display text-xl sm:text-2xl leading-relaxed text-sand/75">Fix &middot; Cure &middot; Closure &middot; Guarantee &middot; Move on</p></div>
    </div>
  </div>
</section>

<section class="max-w-4xl mx-auto px-4 sm:px-6 md:px-10 py-16 sm:py-24 text-center">
  <h2 class="reveal font-display text-2xl sm:text-3xl md:text-4xl text-forest mb-6">Curious how this looks in practice?</h2>
  <a href="/services" class="reveal btn-primary">See support &amp; services</a>
</section>`;
  return { title: 'Our Approach', description: 'Bloom\u2019s human-centered approach to grief after suicide: psychological care and wellness woven together, paced around you and honest about its limits.', path: '/approach', active: 'approach', body, scripts: [] };
}

function services() {
  const list = content.services().services.filter((s) => s.status !== 'hidden');
  const available = list.filter((s) => s.status === 'available');
  const planned = list.filter((s) => s.status === 'planned');
  const card = (s, i) => `<article class="reveal bg-sand p-7 sm:p-10 flex flex-col">
    <span class="font-display text-2xl sm:text-3xl text-sage" aria-hidden="true">0${i + 1}</span>
    <h3 class="font-display text-lg sm:text-xl text-forest mt-4 mb-3">${esc(s.title)}</h3>
    <p class="text-sm sm:text-base text-ink-soft leading-relaxed mb-5">${esc(s.summary)}</p>
    ${s.focus?.length ? `<p class="font-utility text-[11px] tracking-eyebrow uppercase text-ink-faint mb-3">Common focus areas</p><ul class="text-sm text-ink-soft space-y-2">${s.focus.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
    ${s.link ? `<a href="${esc(s.link)}" class="mt-5 text-sm text-forest underline underline-offset-4">Go to ${esc(s.title.toLowerCase())}</a>` : ''}
  </article>`;
  const body = `
${C.pageHero({ eyebrow: 'Support & Services', title: 'Psychological care at the center, wellness woven through.', intro: 'We do not offer wellness as an alternative to therapy, but as a complement that deepens and sustains psychological care.', glow: 'bg-clay/35' })}

<section class="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 pb-16 sm:pb-24">
  <p class="reveal eyebrow mb-8 sm:mb-10">Available now</p>
  <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-sand-line">${available.map(card).join('')}</div>
  <div class="reveal mt-8">${C.safetyNotice()}</div>
</section>

${planned.length ? `<section class="bg-sand-deep/60 border-y border-sand-line py-16 sm:py-24" aria-labelledby="planned-title">
  <div class="max-w-6xl mx-auto px-4 sm:px-6 md:px-10">
    <div class="reveal max-w-2xl mb-10"><p class="eyebrow mb-4">Hoped-for, not yet available</p><h2 id="planned-title" class="font-display text-2xl sm:text-3xl text-forest">What we would like to offer in future.</h2><p class="mt-4 text-sm sm:text-base text-ink-soft leading-relaxed">These are not active services yet and we do not want to promise what we cannot deliver. If one of these would help you, tell us. It helps us decide what to build.</p></div>
    <div class="grid sm:grid-cols-2 gap-5">${planned.map((s) => `<article class="reveal card p-6 sm:p-8"><span class="chip mb-4">Planned &middot; not yet available</span><h3 class="font-display text-lg sm:text-xl text-forest mb-2">${esc(s.title)}</h3><p class="text-sm text-ink-soft leading-relaxed">${esc(s.summary)}</p></article>`).join('')}</div>
    <p class="reveal mt-8"><a href="/contact" class="btn-secondary btn-sm">Tell us what would help</a></p>
  </div>
</section>` : ''}

<section class="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 py-16 sm:py-24 md:py-28">
  <div class="grid md:grid-cols-2 gap-10 sm:gap-16">
    <div class="reveal"><p class="eyebrow mb-4">Integrated wellness supports</p><h2 class="font-display text-2xl sm:text-3xl text-forest mb-5">These elements support therapy, they don&rsquo;t replace it.</h2><p class="text-sm sm:text-base text-ink-soft leading-relaxed">All wellness components remain psychologically informed and ethically grounded.</p></div>
    <ul class="reveal space-y-4 sm:space-y-5">
      ${['Practices for managing stress and grounding techniques', 'Lifestyle reflection: sleep, routine, balance, digital habits', 'Mindful awareness and skills for regulating yourself', 'Values clarification and gentle, intentional living'].map((t) => `<li class="flex gap-4 items-start">${dot}<span class="text-sm sm:text-base text-ink-soft">${esc(t)}</span></li>`).join('')}
    </ul>
  </div>
</section>

<section class="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 pb-16 sm:pb-24">
  ${C.sectionHeading({ eyebrow: 'A shared understanding', title: 'What holistic health is, and what it isn\u2019t.' })}
  <div class="reveal flex flex-col items-center">
    <div class="arch-frame w-full max-w-xl"><div class="arch-frame__inner aspect-[6/5] sm:aspect-[4/3]"><img src="/images/holistic-health.jpg" alt="Holistic health is integrative, personalized, proactive, and evidence-based. It isn't one-size-fits-all, just supplements, a quick fix, or a fad." width="736" height="597" loading="lazy" data-fallback></div></div>
    <p class="plaque">Holistic health, defined</p>
  </div>
</section>

<section class="scene scene-dark py-16 sm:py-24">
  <div class="glow-blob w-64 h-64 sm:w-96 sm:h-96 bg-sage/30 right-0 top-0" aria-hidden="true"></div>
  <div class="relative z-10 max-w-4xl mx-auto px-5 sm:px-6 md:px-10 text-center">
    <p class="reveal eyebrow-light mb-6">A standard session</p>
    <div class="reveal grid grid-cols-3 gap-4 sm:gap-10 mt-8">
      <div><p class="font-display text-2xl sm:text-3xl mb-2">45 to 60</p><p class="text-xs sm:text-sm text-sand/75">Minutes per session</p></div>
      <div><p class="font-display text-2xl sm:text-3xl mb-2">In person</p><p class="text-xs sm:text-sm text-sand/75">Or held virtually</p></div>
      <div><p class="font-display text-2xl sm:text-3xl mb-2">Guided</p><p class="text-xs sm:text-sm text-sand/75">Frequency set together</p></div>
    </div>
  </div>
</section>

<section class="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 py-16 sm:py-24 md:py-28">
  ${C.sectionHeading({ eyebrow: 'Scope & ethical boundaries', title: 'Care that is honest about its limits.' })}
  <div class="grid sm:grid-cols-2 gap-8 sm:gap-10">
    <div class="reveal"><p class="font-utility text-[11px] tracking-eyebrow uppercase text-forest mb-5">We provide</p><ul class="space-y-4 text-sm sm:text-base text-ink-soft"><li class="border-b border-sand-line pb-4">Professional mental health support within practitioner competence</li><li class="border-b border-sand-line pb-4">Therapeutic care informed by evidence</li><li class="pb-4">Wellness practices that responsibly support psychological wellbeing</li></ul></div>
    <div class="reveal"><p class="font-utility text-[11px] tracking-eyebrow uppercase text-clay-deep mb-5">We do not provide</p><ul class="space-y-4 text-sm sm:text-base text-ink-soft"><li class="border-b border-sand-line pb-4">Emergency or crisis intervention services beyond defined referral protocols</li><li class="border-b border-sand-line pb-4">Medical or psychiatric treatment outside professional scope</li><li class="pb-4">Quick fixes, guaranteed results, or solutions built around trends</li></ul></div>
  </div>
  <p class="reveal mt-8 text-sm text-ink-soft max-w-2xl">Clients requiring urgent or specialised care are supported with appropriate referrals. Peer support and stories on this site are not a substitute for professional care.</p>
</section>

<section class="max-w-4xl mx-auto px-4 sm:px-6 md:px-10 pb-16 sm:pb-24 text-center">
  <h2 class="reveal font-display text-2xl sm:text-3xl md:text-4xl text-forest mb-6">Ready to see how the journey begins?</h2>
  <a href="/journey" class="reveal btn-primary">Walk through the journey</a>
</section>`;
  return { title: 'Support & Services', description: 'Individual psychological support, assessment and grief psychoeducation for people bereaved by suicide, with clear information about what is available now and what is planned.', path: '/services', active: 'services', body };
}

function journey() {
  const stages = [
    ['Reaching out: a safe first step', 'You can reach out by message, phone or referral. The response is warm, respectful and informative, focused on helping you feel welcomed rather than assessed. There is no pressure to decide anything.', ['Your needs and concerns are briefly understood', 'Services and next steps are clearly explained', 'Urgent risk is screened, and you are referred on appropriately if needed']],
    ['Listening before direction', 'A first conversation focuses on your story: who you lost, what you are carrying, what you hope for. You choose how much to share. Many people leave this stage feeling heard and a little less alone.', ['Emotional, relational and everyday context', 'What has helped and what has not', 'Collaborative identification of what matters most to you']],
    ['Choosing a path together', 'Together we agree a flexible direction. It can change at any time, because grief is not linear.', ['The kind of support that may fit: individual sessions, learning, or reading and stories', 'How often to meet, if at all', 'Useful wellness supports or new skills to explore', 'The pace that feels right']],
    ['Support that moves with you', 'Sessions provide a consistent, trusting space to make sense of the loss, build coping skills, and live alongside grief. Good days and hard days are both part of it, and returning to earlier feelings does not mean you have failed.', ['A steady, trusting space', 'Practical tools alongside deeper reflection', 'Gradual strengthening of coping, clarity and balance']],
    ['Pausing, continuing, returning', 'Some people continue for a long time, some step back after a while, and some return months or years later around an anniversary or a new loss. All of this is welcome. There is no required endpoint.', ['Recognition of your own growth and strengths', 'Confidence in your ways of coping', 'A respectful pause or ending when you decide', 'Clear pathways back if you need support again']],
  ];
  const body = `
${C.pageHero({ eyebrow: 'The journey', title: 'Safe, clear, and supportive, at your own pace.', intro: 'Support is not a fixed sequence of stages to complete. These are possible entry points and ways to be supported, and you can enter, pause or return at any point.', glow: 'bg-sage/40' })}

<section class="max-w-3xl mx-auto px-4 sm:px-6 md:px-10 pb-14 sm:pb-20">
  <div class="reveal flex flex-col items-center">
    <div class="arch-frame w-full max-w-md"><div class="arch-frame__inner aspect-[7/6]"><img src="/images/wellness-journey.jpg" alt="Wellness is a Journey: find what works for you, do more of what you love, embrace rest without guilt, realise movement doesn't have to mean hardcore workouts, unlearn the all-or-nothing mindset, and say no more often so you can say yes to yourself." width="735" height="654" loading="lazy" data-fallback></div></div>
    <p class="plaque">Wellness is a journey</p>
  </div>
</section>

<section class="max-w-4xl mx-auto px-4 sm:px-6 md:px-10 pb-16 sm:pb-24" aria-label="Ways support can unfold">
  <div class="reveal alert alert-info mb-8">These steps describe how Bloom&rsquo;s individual support can unfold. They are <strong>not</strong> stages of grief, and you do not need to move through them in order, or at all.</div>
  <div class="reveal border-t border-sand-line">
    ${stages.map(([t, p, items], i) => `
    <div class="border-b border-sand-line">
      <h3><button type="button" data-journey-trigger aria-expanded="${i === 0}" aria-controls="stage-${i + 1}" id="stage-btn-${i + 1}" class="w-full flex items-start sm:items-center justify-between gap-3 sm:gap-6 py-6 sm:py-8 text-left">
        <span class="flex items-start sm:items-center gap-3 sm:gap-6 min-w-0"><span class="font-display text-xl sm:text-2xl text-forest-light w-8 sm:w-10 flex-shrink-0" aria-hidden="true">0${i + 1}</span><span class="font-display text-base sm:text-xl md:text-2xl text-forest leading-snug">${esc(t)}</span></span>
        <svg class="acc-chevron w-5 h-5 text-forest flex-shrink-0 mt-1 sm:mt-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
      </button></h3>
      <div id="stage-${i + 1}" role="region" aria-labelledby="stage-btn-${i + 1}" class="acc-panel ${i === 0 ? 'is-open' : ''}">
        <div class="pb-8 sm:pb-9 pl-11 sm:pl-16 pr-2 sm:pr-6"><p class="text-sm sm:text-base text-ink-soft leading-relaxed mb-4">${esc(p)}</p><ul class="space-y-2 text-sm text-ink-soft">${items.map((x) => `<li class="flex gap-3"><span class="text-forest-light" aria-hidden="true">&middot;</span>${esc(x)}</li>`).join('')}</ul></div>
      </div>
    </div>`).join('')}
  </div>
</section>

<section class="scene scene-dark py-16 sm:py-24 md:py-28">
  <div class="glow-blob w-64 h-64 sm:w-96 sm:h-96 bg-clay/25 -left-10 bottom-0" aria-hidden="true"></div>
  <div class="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 md:px-10">
    ${C.sectionHeading({ eyebrow: 'Signs of positive change, for some', title: 'Change is gradual, personal, and never required.', dark: true, intro: 'Not everyone will notice these, and none of them is a goal you must reach.' })}
    <div class="reveal grid sm:grid-cols-2 gap-4 sm:gap-6">
      ${['A little more room between waves of feeling', 'Being able to speak about the person you lost', 'Gentler ways of coping on hard days', 'Feeling less alone in the experience'].map((t) => `<div class="bg-white/5 rounded-2xl p-6 sm:p-8 border border-sand/15"><p class="text-sm sm:text-base text-sand/90">${esc(t)}</p></div>`).join('')}
    </div>
  </div>
</section>

<section class="max-w-4xl mx-auto px-4 sm:px-6 md:px-10 py-16 sm:py-24 text-center">
  <h2 class="reveal font-display text-2xl sm:text-3xl md:text-4xl text-forest mb-4">Your first step can be this small.</h2>
  <p class="reveal text-sm sm:text-base text-ink-soft max-w-lg mx-auto mb-7">Ask a question, say hello, or tell us what you need. There is no wrong way to begin.</p>
  <a href="/contact" class="reveal btn-primary">Begin a conversation</a>
</section>`;
  return { title: 'The Journey', description: 'How support at Bloom can unfold after a suicide loss: flexible entry points, no fixed stages and no timeline.', path: '/journey', active: 'journey', body };
}

function about() {
  const site = content.site(); const a = site.about || {}; const org = site.organisation || {};
  const portrait = a.portraitImage
    ? `<img src="${esc(a.portraitImage)}" alt="${esc(a.portraitAlt || '')}" loading="lazy" data-fallback>`
    : `<div class="w-full h-full flex items-center justify-center bg-sand-deep"><svg class="w-16 h-16 sm:w-20 sm:h-20 text-sage" viewBox="0 0 400 400" fill="none" aria-hidden="true"><circle cx="200" cy="200" r="30" stroke="currentColor" stroke-width="1.2"/><circle cx="200" cy="200" r="60" stroke="currentColor" stroke-width="1" opacity="0.7"/><circle cx="200" cy="200" r="90" stroke="currentColor" stroke-width="1" opacity="0.5"/></svg></div>`;
  const body = `
<section class="scene scene-light scene-vignette relative pt-28 pb-16 sm:pt-40 sm:pb-24 md:pt-48 md:pb-28">
  <div class="glow-blob w-56 h-56 sm:w-80 sm:h-80 bg-clay/30 -right-14 top-10" aria-hidden="true"></div>
  <div class="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 md:px-10 grid md:grid-cols-5 gap-8 sm:gap-14 items-center">
    <div class="md:col-span-2 reveal"><div class="arch-frame w-48 sm:w-64 md:w-full mx-auto max-w-xs"><div class="arch-frame__inner aspect-[4/5]">${portrait}</div></div>${a.portraitImage ? `<p class="plaque">${esc(a.practitionerName || '')}</p>` : ''}</div>
    <div class="md:col-span-3 reveal text-center md:text-left">
      <p class="eyebrow mb-4 sm:mb-5">About</p>
      <h1 class="font-display text-3xl sm:text-4xl md:text-5xl text-forest leading-tight mb-5 sm:mb-6">${esc(a.practitionerName || 'Hannah')}</h1>
      ${a.bio ? `<p class="text-base sm:text-lg text-ink-soft leading-relaxed mb-4">${esc(a.bio)}</p>` : ''}
      ${org.practitionerCredentials ? `<p class="text-sm text-ink-soft leading-relaxed mb-4"><strong class="text-forest">Qualifications:</strong> ${esc(org.practitionerCredentials)}</p>` : ''}
      <p class="text-sm sm:text-base text-ink-soft leading-relaxed">Everyone who sits across from ${esc(a.practitionerName || 'Hannah')} is met as more than a diagnosis. Care begins with listening to stories, relationships and lived experience, then offering support that honours the whole person. Bloom&rsquo;s focus is now on people bereaved by suicide.</p>
    </div>
  </div>
</section>

<section class="bg-sand-deep/60 border-y border-sand-line py-16 sm:py-24 md:py-28">
  <div class="max-w-6xl mx-auto px-4 sm:px-6 md:px-10">
    ${C.sectionHeading({ eyebrow: 'Who we support', title: 'Anyone whose life has been changed by a suicide loss.', intro: 'Adults who want gentle, thoughtful support and who may be carrying a great deal beneath the surface, including people who appear to be coping outwardly.' })}
    <div class="reveal grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-sand-line">
      ${[['Partners and spouses', 'Losing the person you built a life with.'], ['Parents', 'Losing a child, whatever their age.'], ['Sons and daughters', 'Losing a parent, at any stage of life.'], ['Brothers and sisters', 'Losing a sibling and a shared history.'], ['Friends and extended family', 'Grief that is real, even when it is less visible.'], ['Those supporting others', 'Family, colleagues and friends who want to help well.']].map(([t, d]) => `<div class="bg-sand p-6 sm:p-8"><h3 class="font-display text-base sm:text-lg text-forest mb-2">${esc(t)}</h3><p class="text-sm text-ink-soft">${esc(d)}</p></div>`).join('')}
    </div>
  </div>
</section>

<section class="max-w-4xl mx-auto px-4 sm:px-6 md:px-10 py-16 sm:py-24 md:py-28 text-center">
  <div class="eyebrow-flanked mb-5 sm:mb-6"><span class="hairline"></span><span class="sprig"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.1" aria-hidden="true"><path d="M12 3c0 6-3 8-3 12a3 3 0 006 0c0-4-3-6-3-12z"/><path d="M12 10c-2 0-4 1-5 3M12 10c2 0 4 1 5 3"/></svg></span><span class="hairline"></span></div>
  <p class="reveal eyebrow mb-5 sm:mb-6">Our purpose</p>
  <p class="reveal signature-line text-xl sm:text-2xl md:text-3xl text-forest leading-relaxed">${esc(site.brand.mission)}</p>
</section>

<section class="scene scene-dark py-16 sm:py-24 md:py-28">
  <div class="glow-blob w-64 h-64 sm:w-96 sm:h-96 bg-clay/25 left-1/2 -translate-x-1/2 top-0" aria-hidden="true"></div>
  <div class="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 md:px-10 text-center">
    <p class="reveal eyebrow-light mb-5 sm:mb-6">Our commitment</p>
    <h2 class="reveal font-display text-2xl sm:text-3xl md:text-4xl mb-5 sm:mb-6">Wellness is a lasting way of living, grounded in responsible care.</h2>
    <p class="reveal text-sm sm:text-base text-sand/80 leading-relaxed max-w-2xl mx-auto">Every service reflects this principle. Care remains within professional competence, informed by evidence, and honest about what it can and cannot offer. Stories are shared only with consent, and we do not use grief to pressure anyone into giving.</p>
    <div class="reveal mt-8 sm:mt-10 flex flex-col xs:flex-row gap-3 justify-center"><a href="/services" class="btn-light">Read our scope &amp; boundaries</a><a href="/privacy" class="btn-ghost-light">How we handle your information</a></div>
  </div>
</section>

<section class="max-w-4xl mx-auto px-4 sm:px-6 md:px-10 py-16 sm:py-24 text-center">
  <h2 class="reveal font-display text-2xl sm:text-3xl md:text-4xl text-forest mb-6">Ready to reach out?</h2>
  <a href="/contact" class="reveal btn-primary">Begin a conversation</a>
</section>`;
  return { title: 'About', description: 'About Bloom: who we are, who we support, and our commitment to responsible, honest care for people bereaved by suicide.', path: '/about', active: 'about', body };
}

module.exports = { approach, services, journey, about };
