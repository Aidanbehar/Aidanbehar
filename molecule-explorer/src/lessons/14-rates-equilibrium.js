/* Unit 14: Rates and equilibrium. */
(function () {
  'use strict';
  const ME = window.ME;
  const K = ME.kit;
  const { p, b, em, h4, frag, term, callout, warnCallout, okCallout, eq, table, worked, goto } = K;

  ME.course.unit({
    n: 14, id: 'rates',
    title: 'Rates and equilibrium',
    blurb: 'How fast a reaction goes, why it sometimes stops before it finishes, and how to push it back.',
    lessons: [

    {
      id: 'reaction-rates',
      title: 'What sets the speed of a reaction',
      mins: 16,
      builds_on: ['enthalpy', 'kinetic-theory'],
      hook() {
        return frag(
          p('A steel girder rusts over decades. Steel wool held in a flame burns in seconds. Same reaction — iron combining with oxygen — and a difference in speed of about a billion.'),
          p('Nothing about the chemistry changed. What changed was how often iron atoms and oxygen molecules meet, and how hard they hit.'));
      },
      pages: [
        {
          h: 'A reaction needs a collision, and not just any collision',
          body() {
            return frag(
              p('For two particles to react they have to meet. That much is obvious. What is less obvious is that most collisions achieve nothing at all.'),
              p('Two conditions have to be satisfied at once:'),
              table(['Condition', 'Why'], [
                ['enough energy', 'bonds have to break before new ones form, and that is the activation energy from the last unit'],
                ['the right orientation', 'the reacting parts have to be the parts that meet — a big molecule hit on the wrong end does nothing'],
              ]),
              p('Both together mean the fraction of collisions that produce a reaction can be tiny. In a typical gas reaction at room temperature, it can be one in many billions.'),
              callout(b('So the rate is the collision frequency times the success rate. '), 'Everything that speeds a reaction up does one or the other — more collisions, or a higher fraction of them succeeding. There is nothing else available, and that makes the whole topic reasonable rather than a list.'),
              h4('Which explains the girder and the steel wool'),
              p('A solid girder only reacts at its surface, and its surface is a tiny fraction of its mass. Steel wool is the same iron pulled into threads, with an enormous surface for its mass — so far more iron atoms are exposed to oxygen at once. Plus the flame supplies the energy, so a much larger fraction of collisions succeeds.'),
              p('More collisions and more successes, multiplied together, is how you get a factor of a billion out of the same chemistry.'));
          },
        },
        {
          h: 'The five things you can change',
          body() {
            return frag(
              table(['Change', 'Effect', 'Which mechanism'], [
                ['raise the temperature', 'much faster', 'both — more collisions, and a far larger fraction with enough energy'],
                ['raise the concentration', 'faster', 'more collisions per second'],
                ['raise the pressure (gases)', 'faster', 'same as concentration — the particles are closer together'],
                ['increase the surface area', 'faster', 'more of the solid is available to be hit'],
                ['add a catalyst', 'faster', 'a larger fraction of collisions succeeds, because the barrier is lower'],
              ]),
              p('Temperature is the outlier, and worth a moment. A 10 °C rise typically doubles or triples a reaction rate, which is far more than the increase in collision frequency can explain — that only goes up by a couple of per cent.'),
              okCallout(b('The reason is the shape of the energy distribution. '), 'At any temperature, particle energies are spread out: most near the average, a few very slow, a few very fast. Only the ones above the activation energy can react, and they are out in the thin tail of that distribution. Warming the gas shifts the whole distribution right, and the ', em('tail'), ' beyond a fixed threshold grows far faster in proportion than the average does.'),
              p('So the rate depends not on the average energy but on how many particles are in the tail — which is why a small temperature change has such a large effect.'),
              h4('And why food goes in the fridge'),
              p('Cooling works the same way in reverse. A fridge at 4 °C rather than 20 °C slows the reactions of decay by roughly a factor of four, and a freezer slows them by orders of magnitude. Nothing is prevented; everything is simply postponed — which is why frozen food still has a use-by date.'),
              ME.sims.energyDiagram());
          },
        },
        {
          h: 'Catalysts: lowering the hill',
          body() {
            return frag(
              p('A ', term('catalyst', 'A substance that speeds a reaction up by providing a lower-energy route, and is recovered unchanged at the end. It changes the rate, never the position of equilibrium.'), ' speeds a reaction up and comes out unchanged at the end. It is not consumed, so a small amount handles an unlimited quantity of reaction.'),
              p('The mechanism is not magic: the catalyst takes part, providing a different route with a lower barrier, and is regenerated. Often it holds the reactants in the right orientation, which fixes the second of the two conditions directly.'),
              warnCallout(b('And here is the crucial limit. '), 'A catalyst lowers the barrier by the same amount in both directions, so it speeds up the forward and reverse reactions equally. It cannot make a non-spontaneous reaction go, and it cannot change how much product you end up with — only how quickly you get there. It changes the rate and never the destination.'),
              p('That distinction is the single most examined point in the topic, and it follows directly from the diagram: lowering the hill does not move either end of it.'),
              h4('Where they matter'),
              table(['Catalyst', 'What it does'], [
                ['iron, in the Haber process', 'makes ammonia synthesis viable — without it, feeding the world would be a different problem'],
                ['platinum and rhodium, in a catalytic converter', 'turns CO and unburnt fuel into CO₂ and water in the half-second available'],
                ['enzymes, in you', 'speed reactions by factors up to 10¹⁷, and are specific to one substrate each'],
                ['chlorophyll and its partners', 'let sunlight drive a reaction that otherwise would not go'],
              ]),
              p('The enzyme numbers are worth dwelling on. Carbonic anhydrase converts CO₂ to hydrogen carbonate about a million times a second, which is what lets your blood carry carbon dioxide away fast enough to keep you alive. Uncatalysed, the same reaction would be far too slow to be useful.'),
              p('And enzymes work largely by the orientation half of the mechanism — holding the reactants in exactly the right arrangement in a shaped pocket. Which is the point Unit 6 made about shape deciding function, arriving from a different direction.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'choice', after: 0,
          q: 'Why does steel wool burn while a steel girder rusts slowly?',
          options: [
            { t: 'Far more iron is exposed for its mass, so there are far more collisions — and the flame makes more of them succeed.', ok: true,
              why: 'Right, and both mechanisms at once is how you get a billion-fold difference out of identical chemistry.' },
            { t: 'Steel wool is a different alloy.', ok: false,
              why: 'It can be the same steel. The difference is surface area and energy.' },
            { t: 'The girder is protected by its rust.', ok: false,
              why: 'It is, somewhat, and that is a secondary effect. Surface area is the main story.' },
          ] },
        { kind: 'choice', after: 1,
          q: 'A 10 °C rise roughly doubles a reaction rate. Why so much?',
          options: [
            { t: 'Because only particles above the activation energy react, and they are in the thin tail of the distribution, which grows far faster in proportion than the average.', ok: true,
              why: 'Right — the collision frequency only rises a couple of per cent. The effect is almost entirely about the tail beyond a fixed threshold.' },
            { t: 'Because the particles collide twice as often.', ok: false,
              why: 'Collision frequency rises by a percent or two over 10 degrees. Nowhere near enough.' },
            { t: 'Because the activation energy falls.', ok: false,
              why: 'The barrier is a property of the reaction and does not move with temperature. What changes is how many particles can clear it.' },
          ] },
      ],
      quizzes: [
        { kind: 'choice', q: 'What two conditions does a successful collision need?',
          options: [
            { t: 'Enough energy to break bonds, and the right orientation.', ok: true,
              why: 'Right, and everything that speeds a reaction up works on one or the other — collision frequency or success rate. There is nothing else.' },
            { t: 'Enough energy and enough time.', ok: false,
              why: 'A collision takes no appreciable time. Orientation is the second requirement.' },
            { t: 'The right temperature and the right pressure.', ok: false,
              why: 'Those are things you change; the conditions they act through are energy and orientation.' },
          ] },
        { kind: 'choice', q: 'Why does increasing surface area speed up a reaction with a solid?',
          options: [
            { t: 'More of the solid is exposed, so there are more places a collision can happen.', ok: true,
              why: 'Right — a solid only reacts at its surface, so the same mass in a finer form reacts far faster. It is also why flour dust can explode.' },
            { t: 'The solid becomes more reactive.', ok: false,
              why: 'The substance is unchanged. Only how much of it is accessible changes.' },
            { t: 'It raises the temperature.', ok: false,
              why: 'Grinding warms things slightly and that is not the mechanism.' },
          ] },
        { kind: 'choice', q: 'What does a catalyst do?',
          options: [
            { t: 'Provides a lower-energy route and is regenerated, so a small amount speeds an unlimited amount of reaction.', ok: true,
              why: 'Right, and it takes part rather than watching — it is just given back at the end.' },
            { t: 'Adds energy to the reaction.', ok: false,
              why: 'It supplies no energy. It lowers the barrier that has to be cleared.' },
            { t: 'Is used up making the products.', ok: false,
              why: 'Then it would be a reactant. Being recovered unchanged is the defining feature.' },
          ] },
        { kind: 'choice', q: 'Can a catalyst change how much product you end up with?',
          options: [
            { t: 'No — it lowers the barrier equally in both directions, so it changes the rate and not the destination.', ok: true,
              why: 'Right, and it is the most examined point in the topic. Lowering the hill does not move either end of it.' },
            { t: 'Yes, that is the point of using one.', ok: false,
              why: 'The point is getting there faster. The final amounts are set by thermodynamics, which a catalyst leaves alone.' },
            { t: 'Yes, but only for exothermic reactions.', ok: false,
              why: 'Neither direction, either sign. The barrier falls by the same amount both ways.' },
          ] },
        { kind: 'choice', q: 'Why does a fridge keep food longer?',
          options: [
            { t: 'The reactions of decay are slowed, not prevented — which is why frozen food still has a use-by date.', ok: true,
              why: 'Right. 4 °C against 20 °C is roughly a fourfold slowdown, and a freezer gives orders of magnitude. Everything is postponed, nothing is stopped.' },
            { t: 'Cold kills the bacteria.', ok: false,
              why: 'It mostly slows them. Freezing kills some and plenty survive, which is why thawed food spoils quickly.' },
            { t: 'It prevents the reactions entirely.', ok: false,
              why: 'If it did, frozen food would keep forever. It does not.' },
          ] },
        { kind: 'choice', q: 'Why can a small amount of enzyme handle an enormous amount of reaction?',
          options: [
            { t: 'It is regenerated each time, so one molecule can run the reaction over and over.', ok: true,
              why: 'Right — carbonic anhydrase does it about a million times a second, which is what lets your blood carry CO₂ away fast enough.' },
            { t: 'Enzymes are very large molecules.', ok: false,
              why: 'They are, and size is not why a small amount suffices. Being reusable is.' },
            { t: 'Enzymes add energy.', ok: false,
              why: 'They lower the barrier and supply no energy.' },
          ] },
        { kind: 'match', q: 'Match each change to how it works.',
          pairs: [['higher concentration', 'more collisions per second'],
                  ['finer powder', 'more of the solid exposed'],
                  ['a catalyst', 'a larger fraction of collisions succeed'],
                  ['higher temperature', 'both, and mostly the second']],
          right: 'Yes — every one acts through collision frequency or success rate, because there is nothing else to act on.',
          wrong: 'Ask whether the change makes collisions more frequent, or makes more of them work.' },
      ],
      mistakes: [
        { wrong: 'Thinking a catalyst changes the yield.',
          why: 'It lowers the barrier in both directions equally, so it changes only how fast you arrive. The destination is thermodynamics, which a catalyst does not touch.' },
        { wrong: 'Explaining the temperature effect by collision frequency.',
          why: 'Frequency rises a percent or two over 10 degrees. The effect is the tail of the energy distribution beyond a fixed threshold, which grows far faster.' },
        { wrong: 'Thinking a catalyst is a spectator.',
          why: 'It takes part and is regenerated. Often it works by holding the reactants in the right orientation, which is a very active role.' },
        { wrong: 'Believing freezing stops reactions.',
          why: 'It slows them. Frozen food has a use-by date for exactly that reason.' },
      ],
      recap: [
        'A reaction needs a collision with enough energy and the right orientation, and most collisions have neither.',
        'Rate is collision frequency times success rate, and every way of speeding a reaction up works on one of those two.',
        'A 10 °C rise doubles or triples the rate because it grows the thin tail of the energy distribution, not because collisions get much more frequent.',
        'A catalyst provides a lower-energy route and is regenerated, so a little goes a long way.',
        'It lowers the barrier equally both ways, so it changes the rate and never the amount of product.',
      ],
    },

    {
      id: 'equilibrium',
      title: 'Reactions that stop before they finish',
      mins: 17,
      builds_on: ['reaction-rates', 'strength-titration'],
      hook() {
        return frag(
          p('Seal nitrogen and hydrogen in a vessel with a catalyst and wait. Ammonia forms, the amounts change for a while, and then they stop changing.'),
          p('Not because the reactants ran out — there is plenty of both left. Not because the reaction stopped — it is still going, at full speed.'),
          p('Something more interesting is happening, and it is one of the genuinely surprising ideas in the subject.'));
      },
      pages: [
        {
          h: 'Nothing stopped: two rates matched',
          body() {
            return frag(
              p('Most reactions can run backwards. As soon as any product exists, the reverse reaction has something to work with and starts running too.'),
              p('At the start there is a lot of reactant and no product, so the forward reaction is fast and the reverse is nothing. As reactant is used up the forward rate falls, and as product builds up the reverse rate rises. Eventually the two are equal.'),
              eq('forward rate = reverse rate'),
              callout(b('And that is equilibrium: not stopped, matched. '), 'Both reactions are running at full speed, and every molecule of product made is balanced by one being unmade. The amounts stay constant while the individual molecules are constantly changing places — which is why it is called ', em('dynamic'), ' equilibrium.'),
              p('Worth being firm about, because the mental picture matters. It is not two reactants sitting next to each other having finished. It is a furiously busy stalemate.'),
              h4('Something you have already met'),
              p('Unit 11 described a saturated solution as ions leaving the crystal and rejoining it at the same rate. Unit 12 described a weak acid as mostly-intact molecules with a small fraction ionised at any moment. Both of those are this idea, and both used the double arrow.'),
              eq('N2 + 3 H2 <-> 2 NH3'),
              p('The double arrow means both directions are running. It is not a suggestion that you could run it either way — it is a statement that both are happening now.'),
              ME.sims.equilibrium());
          },
        },
        {
          h: 'How far it goes: the equilibrium constant',
          body() {
            return frag(
              p('Equilibrium can sit almost anywhere. Some reactions go essentially to completion before the reverse catches up; others barely start.'),
              p('Where it sits is captured by the ', term('equilibrium constant', 'The ratio of products to reactants at equilibrium, each raised to the power of its coefficient. A large value means the reaction goes nearly to completion; a small one means it barely proceeds.'), ' — products over reactants, each raised to its coefficient:'),
              eq('Kc = [products] / [reactants], each to the power of its coefficient'),
              table(['K is', 'Means', 'Example'], [
                ['very large (> 10³)', 'almost all product — effectively goes to completion', 'a strong acid ionising'],
                ['around 1', 'a real mixture of both', 'many industrial reactions'],
                ['very small (< 10⁻³)', 'almost all reactant — barely proceeds', 'a weak acid ionising'],
              ]),
              p('So strong and weak acids from the last unit are the two ends of this scale. A strong acid has an enormous K, which is what "ionises completely" means quantitatively.'),
              okCallout(b('And K is a constant for a given temperature only. '), 'Change the concentrations and the system shifts back to the same ratio. Change the temperature and K itself changes — which is the one lever that moves the destination rather than just the route. The next lesson explains why.'),
              h4('What K does not tell you'),
              p('K says where the reaction ends up and nothing about how long it takes to get there. Those are the two independent questions from the last unit, appearing again.'),
              table(['Question', 'Answer'], [
                ['how far?', 'K — thermodynamics'],
                ['how fast?', 'activation energy — kinetics'],
              ]),
              p('A reaction with a huge K can take geological time, and one with a tiny K can reach its unimpressive equilibrium in microseconds. Diamond to graphite has a favourable K and is famously unhurried.'));
          },
        },
        {
          h: 'And why this matters industrially',
          body() {
            return frag(
              p('A reaction that stops at 15 % conversion is a commercial problem, and equilibrium is why so much industrial chemistry is about conditions rather than reactions.'),
              p('The Haber process is the standard example, and it is worth knowing because of what it did. Nitrogen in the air is unreactive — a triple bond, among the strongest there is — so for most of history the nitrogen available to plants came from lightning and bacteria. Haber and Bosch found conditions under which nitrogen and hydrogen would combine at a viable rate and yield.'),
              eq('N2 + 3 H2 <-> 2 NH3        ΔH = −92 kJ/mol'),
              p('Roughly half the nitrogen atoms in your body passed through that reaction. It is reasonable to say it is the industrial process that most changed how many people the planet can feed.'),
              h4('And the conflict at the heart of it'),
              p('The reaction is exothermic, so a ', b('low'), ' temperature gives a better equilibrium yield. But a low temperature also makes it unbearably slow.'),
              warnCallout(b('So you cannot have both, and the answer is a compromise nobody is pleased with. '), 'About 450 °C — hot enough to be fast, cool enough to give a usable yield — with a catalyst to recover some of the speed lost by not going hotter, high pressure to push the equilibrium the right way, and the ammonia removed as it forms so the reverse reaction never gets going.'),
              p('That list is not a set of tricks. Every item is one of the levers in the next lesson, applied to a real conflict. Which is why Le Chatelier’s principle is worth learning properly rather than as a rule to recite.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'choice', after: 0,
          q: 'At equilibrium, what is happening?',
          options: [
            { t: 'Both reactions are running at full speed, at equal rates, so the amounts stay constant while molecules keep changing places.', ok: true,
              why: 'Right — a furiously busy stalemate rather than a finished reaction. That picture is what makes the next lesson make sense.' },
            { t: 'Both reactions have stopped.', ok: false,
              why: 'Nothing has stopped. The rates are equal, which is a completely different situation.' },
            { t: 'The reactants have run out.', ok: false,
              why: 'There is plenty of both left — that is exactly what makes equilibrium interesting rather than just an ending.' },
          ] },
        { kind: 'choice', after: 1,
          q: 'A reaction has K = 10⁻⁵. What does that tell you?',
          options: [
            { t: 'At equilibrium there is almost entirely reactant — it barely proceeds.', ok: true,
              why: 'Right, and it tells you nothing about the speed. A weak acid is in this range.' },
            { t: 'That it is very slow.', ok: false,
              why: 'K says how far, not how fast. Proton transfer in a weak acid is extremely quick and still stops at a small K.' },
            { t: 'That it goes to completion.', ok: false,
              why: 'That would be a very large K. 10⁻⁵ means it hardly goes at all.' },
          ] },
      ],
      quizzes: [
        { kind: 'choice', q: 'Why does an equilibrium reaction stop changing?',
          options: [
            { t: 'The forward and reverse rates become equal, so every molecule made is matched by one unmade.', ok: true,
              why: 'Right, and it happens because the forward rate falls as reactant is used and the reverse rises as product builds, until they meet.' },
            { t: 'The reaction runs out of energy.', ok: false,
              why: 'Reactions do not run out of energy in that sense. The two rates have matched.' },
            { t: 'One reactant runs out.', ok: false,
              why: 'If one ran out the reaction would be complete, not at equilibrium. Both are still present.' },
          ] },
        { kind: 'choice', q: 'What does the double arrow in an equation mean?',
          options: [
            { t: 'Both directions are running right now, at the same time.', ok: true,
              why: 'Right — not that you could choose a direction, but that both are happening. It is the same arrow the weak acids used.' },
            { t: 'The reaction can be reversed if you want.', ok: false,
              why: 'Reversal is not a choice here. Both directions run simultaneously without anyone doing anything.' },
            { t: 'The reaction is at equilibrium already.', ok: false,
              why: 'It says the reaction is reversible. Equilibrium is where it ends up.' },
          ] },
        { kind: 'choice', q: 'What does a large K tell you?',
          options: [
            { t: 'That equilibrium sits well over towards the products.', ok: true,
              why: 'Right, and nothing about how long it takes to get there. Strong acids have enormous K values.' },
            { t: 'That the reaction is fast.', ok: false,
              why: 'How far and how fast are independent — the two questions from the last unit, reappearing.' },
            { t: 'That the reaction is exothermic.', ok: false,
              why: 'Not implied. An endothermic reaction can have a large K, particularly at high temperature.' },
          ] },
        { kind: 'choice', q: 'The Haber process is exothermic. Why is it run at 450 °C rather than cool?',
          options: [
            { t: 'Cool gives a better yield and an unusably slow rate, so 450 °C is a compromise between the two.', ok: true,
              why: 'Right, and it is the clearest case of yield and rate pulling in opposite directions. The catalyst and the high pressure are there to claw back what the compromise costs.' },
            { t: 'Because it needs heat to go at all.', ok: false,
              why: 'It releases heat. The heat is for speed, not to supply the reaction.' },
            { t: 'Because the yield is better hot.', ok: false,
              why: 'The yield is worse hot, for an exothermic reaction. That is exactly the conflict.' },
          ] },
        { kind: 'choice', q: 'Why is nitrogen in the air so unreactive?',
          options: [
            { t: 'N₂ has a triple bond, among the strongest known, so the activation energy for anything is enormous.', ok: true,
              why: 'Right, and it is why fixing nitrogen was such a problem. Before Haber, most of it came from lightning and bacteria.' },
            { t: 'Because there is not much of it.', ok: false,
              why: 'It is 78 % of the atmosphere. Abundance is not the issue.' },
            { t: 'Because it is a noble gas.', ok: false,
              why: 'It is group 15, not 18. Its inertness comes from the triple bond rather than a full shell.' },
          ] },
        { kind: 'choice', q: 'What is the same idea as a saturated solution?',
          options: [
            { t: 'Dynamic equilibrium — dissolving and crystallising at matched rates.', ok: true,
              why: 'Right, and it is worth noticing how often this idea has already appeared: saturated solutions, weak acids, and now reactions proper.' },
            { t: 'A completed reaction.', ok: false,
              why: 'Nothing has completed — both processes are still running, at equal rates.' },
            { t: 'A catalysed reaction.', ok: false, why: 'Unrelated. Catalysis is about rate.' },
          ] },
        { kind: 'choice', q: 'Why is Haber’s process worth knowing about?',
          options: [
            { t: 'Roughly half the nitrogen atoms in your body came through it — it changed how many people the planet can feed.', ok: true,
              why: 'Right, and it is a good answer to "what is this topic for". Equilibrium conditions, applied to one reaction, with that consequence.' },
            { t: 'It was the first industrial reaction.', ok: false,
              why: 'Industrial chemistry is much older — smelting and soap-making go back millennia.' },
            { t: 'It is the only equilibrium reaction used industrially.', ok: false,
              why: 'Most industrial reactions are equilibria. This is the most consequential one.' },
          ] },
      ],
      mistakes: [
        { wrong: 'Thinking equilibrium means the reaction has stopped.',
          why: 'Both directions are running at full speed. The amounts are constant because the rates are matched, and molecules keep swapping sides.' },
        { wrong: 'Thinking equilibrium means equal amounts.',
          why: 'It means equal rates, not equal amounts. A reaction with a large K sits almost entirely on the product side and is every bit as much at equilibrium.' },
        { wrong: 'Reading K as a rate.',
          why: 'K says how far the reaction goes and nothing about how long. A huge K can take geological time.' },
        { wrong: 'Expecting a higher temperature always to improve a yield.',
          why: 'For an exothermic reaction it makes the yield worse. Speed and yield genuinely conflict, which is why the Haber process is a compromise.' },
      ],
      recap: [
        'Equilibrium is two matched rates, not a stopped reaction. Molecules keep changing sides while the amounts hold still.',
        'It happens because the forward rate falls as reactant is used and the reverse rises as product builds, until they meet.',
        'K is products over reactants at equilibrium, each to its coefficient. Large means nearly complete; small means barely started.',
        'K depends on temperature only, and says nothing about rate.',
        'The Haber process is the case where yield and rate conflict directly, which is why it runs at a compromise temperature with a catalyst and high pressure.',
      ],
    },

    {
      id: 'le-chatelier',
      title: 'Pushing an equilibrium about',
      mins: 16,
      builds_on: ['equilibrium'],
      hook() {
        return frag(
          p('An equilibrium is not a wall. Disturb it and it moves — and it moves in the direction that undoes some of what you did.'),
          p('That one sentence predicts every case, including the ones that look counter-intuitive. It also explains why a can of fizzy drink goes flat, why your body copes with altitude over a few days, and why the Haber process is run the way it is.'));
      },
      pages: [
        {
          h: 'The principle, and what it is really saying',
          body() {
            return frag(
              p(b('Le Chatelier’s principle: '), 'disturb a system at equilibrium and it shifts in the direction that partly opposes the disturbance.'),
              p('It is worth translating that into something less abstract. Add more of something and the system will use some of it up. Take something away and the system will make more of it. Squeeze it and it will try to take up less room. Heat it and it will try to absorb some of the heat.'),
              callout(b('And "partly" is doing real work in that sentence. '), 'The system never fully undoes your disturbance — if it did, nothing would ever change and equilibrium would be unmovable. It moves back part of the way, which is exactly why you can push a reaction towards a better yield.'),
              h4('Why it happens at all'),
              p('Nothing is deciding anything. Add more reactant and there are simply more collisions, so the forward rate goes up while the reverse rate is momentarily unchanged. The rates are now unequal, so the amounts change — and they keep changing until the rates match again.'),
              p('So the shift is just the rates re-matching after you disturbed one of them. Le Chatelier is a summary of that, not a separate law.'));
          },
        },
        {
          h: 'The four levers',
          body() {
            return frag(
              table(['You do this', 'It shifts', 'To do what'], [
                ['add a reactant', 'towards the products', 'use some of the added reactant up'],
                ['remove a product', 'towards the products', 'replace what you took'],
                ['add a product', 'towards the reactants', 'use some of the added product up'],
                ['increase pressure', 'towards whichever side has fewer gas molecules', 'occupy less volume'],
                ['heat it', 'in the endothermic direction', 'absorb some of the added heat'],
                ['add a catalyst', 'nowhere at all', 'nothing — it speeds both directions equally'],
              ]),
              h4('Pressure needs care'),
              p('Only gas molecules count, and only if the two sides differ in how many there are.'),
              eq('N2 + 3 H2 <-> 2 NH3     4 gas molecules on the left, 2 on the right'),
              p('So squeezing this one shifts it towards ammonia, because that side occupies less room. But a reaction with equal numbers of gas molecules on each side — or with no gases involved — does not respond to pressure at all, because shifting either way changes nothing about the volume needed.'),
              okCallout(b('Temperature is the odd lever, and the important one. '), 'Adding a reactant shifts the position and leaves K alone. Changing the temperature changes ', b('K itself'), ', because it changes the two rates by different amounts. It is the only lever that moves the destination rather than the route.'),
              p('And the direction follows from treating heat as a participant. For an exothermic reaction, heat is effectively a product — so adding heat pushes it backwards. Cooling an exothermic reaction improves its yield, which is the fact behind the Haber compromise.'),
              warnCallout(b('And a catalyst changes nothing about position. '), 'It appears in the table only because it is the answer people most often give wrongly. It speeds both directions equally, so the rates still match at the same place.'));
          },
        },
        {
          h: 'Working the levers',
          body() {
            return frag(
              worked('The Haber process: N₂ + 3 H₂ ⇌ 2 NH₃, ΔH = −92 kJ/mol. How do you maximise ammonia?', [
                { q: 'Pressure', why: '4 gas molecules become 2, so high pressure shifts it towards ammonia. Industry uses around 200 atmospheres — limited by what the vessels can take rather than by the chemistry.' },
                { q: 'Temperature', why: 'Exothermic, so cool is better for yield. But cool is also slow, which is the conflict from the last lesson. 450 °C is the compromise.' },
                { q: 'Concentration', why: 'Remove the ammonia as it forms — by cooling it to a liquid — so the system keeps making more to replace it. This is the lever with no downside, and it is why the plant runs as a loop.' },
                { q: 'Catalyst', why: 'Iron. It does nothing for the yield and recovers some of the speed lost by not running hotter, which is what makes the temperature compromise affordable.' },
              ]),
              p('Notice that three of the four levers are being used at once, each for a different reason, and one of them is being used against the chemistry’s preference because of a rate constraint. That is what industrial chemistry looks like.'),
              h4('The same principle outside a factory'),
              table(['Situation', 'What shifts'], [
                ['open a fizzy drink', 'CO₂ pressure above the liquid drops, so dissolved CO₂ comes out to replace it — and keeps coming until it is flat'],
                ['go to altitude for a week', 'less oxygen available, so your body makes more red blood cells to shift oxygen binding back'],
                ['breathe faster', 'CO₂ leaves, so the carbonic acid equilibrium shifts and your blood pH rises'],
                ['a cave forms in limestone', 'dissolved CO₂ shifts the carbonate equilibrium towards dissolving rock; lose the CO₂ and it deposits again as a stalactite'],
              ]),
              p('The stalactite case is a nice one: the same equilibrium, run one way in the rock above and the other way in the air of the cave, driven entirely by where the carbon dioxide is.'),
              goto('Back to the equilibrium simulation', '#/learn/equilibrium', 'Disturb it and watch the rates re-match.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'choice', after: 1,
          q: 'An exothermic reaction is heated. Which way does the equilibrium shift?',
          options: [
            { t: 'Towards the reactants — the endothermic direction, absorbing some of the added heat.', ok: true,
              why: 'Right, and treating heat as a product for an exothermic reaction makes it obvious: add more of a product and the system shifts back.' },
            { t: 'Towards the products, because heating speeds reactions up.', ok: false,
              why: 'Heating speeds both directions up, which is about rate. The shift in position goes the endothermic way.' },
            { t: 'It does not shift — temperature only affects rate.', ok: false,
              why: 'Temperature is the one lever that changes K itself, so it moves the position too.' },
          ] },
        { kind: 'choice', after: 2,
          q: 'Why does removing ammonia as it forms help the Haber process?',
          options: [
            { t: 'The system keeps making more to replace what was taken, so the loop can be run indefinitely.', ok: true,
              why: 'Right, and it is the lever with no downside — no yield-versus-rate conflict at all. It is why the plant is a loop rather than a single pass.' },
            { t: 'It makes the forward reaction faster.', ok: false,
              why: 'It slows the reverse reaction, which amounts to a net shift. The forward rate is unchanged.' },
            { t: 'It cools the reactor.', ok: false,
              why: 'The condenser is downstream. The effect on the equilibrium is about concentration.' },
          ] },
      ],
      quizzes: [
        { kind: 'choice', q: 'State Le Chatelier’s principle.',
          options: [
            { t: 'Disturb an equilibrium and it shifts so as to partly oppose the disturbance.', ok: true,
              why: 'Right, and "partly" matters — if it fully opposed you, nothing could ever be pushed anywhere.' },
            { t: 'An equilibrium cannot be disturbed.', ok: false,
              why: 'It can, easily, and that is what the whole lesson is about.' },
            { t: 'Equilibrium always ends up with equal amounts.', ok: false,
              why: 'It ends up with equal rates. The amounts can be wildly lopsided.' },
          ] },
        { kind: 'choice', q: 'N₂ + 3 H₂ ⇌ 2 NH₃. Which way does high pressure shift it?',
          options: [
            { t: 'Towards ammonia — 4 gas molecules become 2, so that side takes up less room.', ok: true,
              why: 'Right, and it is why the process runs at around 200 atmospheres. The limit is what the vessels can hold.' },
            { t: 'Towards the reactants.', ok: false,
              why: 'That side has more gas molecules, so it needs more room — the wrong way under pressure.' },
            { t: 'Pressure has no effect.', ok: false,
              why: 'It does here, because the two sides differ in gas molecule count. It would have no effect if they matched.' },
          ] },
        { kind: 'choice', q: 'A reaction has 2 gas molecules on each side. What does pressure do?',
          options: [
            { t: 'Nothing — shifting either way needs the same volume.', ok: true,
              why: 'Right, and that is the check worth doing first: count the gas molecules on each side before reasoning about pressure at all.' },
            { t: 'Shifts it towards the products.', ok: false,
              why: 'With no difference in gas molecule count there is nothing to gain either way.' },
            { t: 'Shifts it towards the reactants.', ok: false, why: 'Same answer — no difference means no shift.' },
          ] },
        { kind: 'choice', q: 'Why does a fizzy drink go flat?',
          options: [
            { t: 'Opening it drops the CO₂ pressure above the liquid, so dissolved CO₂ leaves to replace it — and keeps leaving.', ok: true,
              why: 'Right — a product was removed and the system keeps shifting to replace it. Which is also why resealing it helps a little and never fully.' },
            { t: 'The CO₂ reacts with air.', ok: false,
              why: 'It does not react. It escapes.' },
            { t: 'The drink warms up.', ok: false,
              why: 'Warming makes it worse, and even a cold open drink goes flat.' },
          ] },
        { kind: 'choice', q: 'Which lever changes K itself rather than just the position?',
          options: [
            { t: 'Temperature.', ok: true,
              why: 'Right, because it changes the forward and reverse rates by different amounts. Everything else shifts the position and leaves K alone.' },
            { t: 'Pressure.', ok: false,
              why: 'It shifts the position within the same K.' },
            { t: 'A catalyst.', ok: false,
              why: 'It changes neither. Both directions are sped up equally.' },
          ] },
        { kind: 'choice', q: 'Why does the system never fully undo your disturbance?',
          options: [
            { t: 'Because if it did, the equilibrium could never be moved and none of these levers would work.', ok: true,
              why: 'Right — which is the point of the word "partly". Industry can improve a yield precisely because the opposition is incomplete.' },
            { t: 'Because reactions are inefficient.', ok: false,
              why: 'Nothing is being wasted. A new equilibrium is simply reached at a different position.' },
            { t: 'It does fully undo it, eventually.', ok: false,
              why: 'Then adding reactant would change nothing, and it clearly does.' },
          ] },
        { kind: 'choice', q: 'How does a stalactite form?',
          options: [
            { t: 'Dissolved carbonate comes out of solution as CO₂ escapes into the cave — the same equilibrium the rock dissolved by, run backwards.', ok: true,
              why: 'Right, and it is a satisfying case: one equilibrium, pushed one way in the rock and the other way in the air, by where the carbon dioxide is.' },
            { t: 'Limestone drips down and solidifies.', ok: false,
              why: 'Nothing melts. The carbonate is dissolved and then deposited.' },
            { t: 'Water evaporates and leaves the rock behind.', ok: false,
              why: 'Evaporation contributes, and the main driver is CO₂ leaving the solution and shifting the equilibrium.' },
          ] },
        { kind: 'choice', q: 'Why does spending a week at altitude help?',
          options: [
            { t: 'Your body makes more red blood cells, shifting the oxygen-binding equilibrium back towards carrying enough.', ok: true,
              why: 'Right — Le Chatelier in physiology. It is also why athletes train at altitude, and why it takes days rather than hours.' },
            { t: 'Your lungs get larger.', ok: false,
              why: 'Lung volume barely changes. The adaptation is in the blood.' },
            { t: 'The air gets richer in oxygen.', ok: false,
              why: 'The air does not change. You do.' },
          ] },
      ],
      mistakes: [
        { wrong: 'Thinking a catalyst shifts an equilibrium.',
          why: 'It speeds both directions equally, so the rates still match at the same place. It changes when you arrive, not where.' },
        { wrong: 'Applying pressure reasoning to a reaction with equal gas counts.',
          why: 'Count the gas molecules on each side first. If they match, pressure does nothing.' },
        { wrong: 'Counting solids and liquids when reasoning about pressure.',
          why: 'Only gases respond appreciably. A solid’s volume barely changes under the pressures involved.' },
        { wrong: 'Getting the temperature direction backwards.',
          why: 'Treat heat as a participant. For an exothermic reaction it is effectively a product, so adding heat pushes the reaction backwards.' },
      ],
      recap: [
        'Disturb an equilibrium and it shifts to partly oppose the disturbance — partly, which is why the levers work at all.',
        'The shift is just the two rates re-matching after you changed one of them. It is not a separate law.',
        'Add reactant or remove product to push forward; raise the pressure to favour the side with fewer gas molecules; heat it to favour the endothermic direction.',
        'Temperature is the only lever that changes K itself. A catalyst changes neither position nor K.',
        'The Haber process uses three levers at once and accepts a worse yield for a workable rate, which is what industrial chemistry looks like.',
      ],
    },

    ],
  });
})();
