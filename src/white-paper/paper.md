<!--
Website copy of "Somatic Computing: Abilith White Paper".
The working draft is the Claude Doc at https://claude.ai/artifact/74dFZVYw3Ari7PXxcaLK73.
Edit it there first, then mirror the change here and run `python3 tools/build.py`.
Directives: `::figure fig-N` embeds src/white-paper/figures/fig-N.svg, `::pull` sets a pull quote,
`::closer line|line` sets the closing lines. Citations like [12] link to the numbered Sources list.
-->
## Thesis and motivation

AI can write code, pass the bar exam and reason through problems that stump experts. Yet it still can't do what a child's hands do without thinking: catch a ball, tie a shoe, feel their way through the world. Roboticists call this Moravec's paradox, and the industry's answer is to build AI a body of its own. But the original already exists. Evolution spent millions of years refining it, and no machine has come close. It's yours.

Abilith is pioneering **somatic computing**: AI that runs through the human body. Our first system, Hermes, is worn from the fingertips to the shoulder. It's designed to carry skills captured from the world's best people, like a surgeon's precision, a pianist's touch or a champion's swing, and to guide your arm through them until the skill becomes your own.

The last wave of AI changed what people know. Somatic computing changes what people can do.

This paper sets out why physical skill has never scaled, why it can now, how somatic computing works, and the principles we'll hold to as we build it. No one has built a somatic computer yet, but the research to build one now exists, spread across labs and products around the world, and this paper brings it together. Our thesis is simple. Physical AI's breakthrough moment won't be a robot in your kitchen. It will be the moment AI makes every person more capable, and it starts with your arm.

## Two futures

Physical AI can arrive in two ways, and the difference is where the intelligence ends up.

**The first future** is the one much of the industry is racing toward: robots learn our skills and take over the work. For heavy, repetitive and dangerous jobs, that is real progress, and no person will out-lift or out-last a machine. But the logic doesn't stop at heavy work. As machines take on skilled work too, the abilities people spent millennia building stop being practiced and stop being passed down. Pixar imagined where that ends in WALL-E: people who can barely walk, carried through their lives by machines that do everything for them. The machines learned to walk. We forgot how.

**The second future** starts from a different question. Not "how do we build a body for AI?" but "what happens when AI runs through the bodies we already have?" Robots still take the heavy, repetitive work. But skilled, varied work is different. People still outperform machines there, and hands are where robots struggle most: when BMW trialed two of Figure's humanoid robots for 11 months on a single pick-and-place task, the forearm and wrist were the top hardware failure point [1]. In that kind of work, the intelligence goes into the person instead. A surgical resident could practice suturing with guidance drawn from an expert surgeon's recorded movement, and a new hire on an assembly line could come up to speed in a fraction of the usual time. That is the productivity robots promise, delivered through the workforce that already exists.

None of this turns learning into a shortcut. The skill still has to be built in the learner's own muscles, and Hermes is designed to step back as that happens. It doesn't make experts less valuable either. An expert's skill has always reached only the few apprentices they could teach in person. Once captured, it can reach thousands of learners, and the expert is paid for it.

::pull In the first future, machines become capable and people become passengers. In the second, AI makes people capable of almost anything.

::figure fig-1

Both futures use the same ingredients: models that learn movement, sensors that see the world, and actuators that move. We're building the second one.

## The problem: knowledge scales, skill never has

::pull We can print a book a billion times. We've never been able to copy a surgeon's hands even once.

Knowledge got the printing press, then the internet, then AI. Each one made it cheaper to copy what one person knows into millions of minds, and now we're drinking from a firehose: endless ways to find, sort and summarize what we know, but limited ways to act on it. Physical skill never got its printing press. It still passes from person to person through years of practice side by side, much as it did a thousand years ago.

The cost shows up wherever skill is physical:

- **Work.** US manufacturing could need as many as 3.8 million new workers between 2024 and 2033, and 1.9 million of those jobs could go unfilled [2]. A quarter of today's manufacturing workers are 55 or older [3]. Skilled roles are still taught by hand. A formal apprenticeship usually lasts about four years [4], and in federally administered programs, the completion rate was just 38% in fiscal 2010 [5]. When a skilled worker leaves, their skill leaves with them, and replacing an employee costs a median of 21% of their annual salary [6].
- **Medicine.** A general surgeon needs at least five years of residency and at least 850 operations to qualify for board certification [7], and about 18% of general surgery residents leave before finishing [8]. The best hands in the field can only teach so many residents.
- **Learning.** People pick up an instrument or a sport and give up before it ever feels natural. Fender's CEO has said 90% of first-time guitar players quit within a year [9], and in a study of 3,303 students in the UK and Germany, about half had stopped music lessons by age 17 [10]. The gap between knowing how and being able to is filled only by practice. The famous "10,000 hours" comes from a study of violinists, in which the best had averaged about that much practice by age 20 [11].

Guidance already pays off when people get it. In a randomized, blinded trial, surgical residents trained in virtual reality made about one sixth as many errors in the operating room as residents trained the usual way [12], and in an assembly study, instructions overlaid on the parts themselves cut errors by 82% [13]. But all of these work through the eyes. Video, coaching apps and VR can show you what to do. None of them can put the movement into your body. That last step, from seeing to doing, is the one that has never scaled, and it's the step somatic computing is built for.

## The solution: somatic computing

Somatic computing is computing that works through the body. The name comes from the somatic nervous system, the part of us that controls voluntary movement, and from soma, the Greek word for body.

A somatic computer does three things. It **senses** what you're doing and what you're looking at. It **understands** how your movement compares with the way an expert would do it. And it **acts**, with light, limited guidance on a movement you've started: cues that show where and when to move, and brakes that steady a joint or stop it at the right point. We call the AI that does the understanding **somatic intelligence**.

Our first somatic computer is **Hermes**. It runs from the fingertips to the shoulder, with guides at the hand, wrist, elbow and shoulder, and pairs with camera smart glasses for context. Hermes works in three modes:

- **Enhance** makes what you can already do steadier. Brakes resist unwanted motion and a light grip assist adds holding force, for work like keeping a small part still through a fine fit.
- **Guide** takes you through a movement you haven't learned yet. Vibration cues along the arm show where and when to move, and brakes stop each finger where the movement needs it. It shows you the movement without making it for you.
- **Learn** is practice with help that fades. Hermes starts with full guidance and gives less as your errors drop, until you're doing it on your own.

The modes build on each other. Enhance helps with what you can already do, Guide gets you through what you can't do yet, and Learn turns guided practice into ability of your own.

Learn is built on a long-standing finding in motor learning: guidance that never lets go can leave people dependent on it. In one study, frequent physical guidance produced the poorest retention of any condition tested [14]. In a steering task, guidance given only as needed improved retention a week later for learners who started out less skilled [15]. Muscle stimulation shows the same pattern. In a piano study from Pedro Lopes's lab, stimulation that stepped down from demonstrating to correcting to warning left learners with 3.67 errors when they later played on their own, against 6.22 for stimulation that stayed on [16]. A review of haptic training adds a useful twist: guidance helps most with novices and timing, while making a task harder, for example by exaggerating errors, helps spatial accuracy [17]. Hermes is designed to do both, easing off as you improve and using its brakes to add resistance where harder practice helps. The goal isn't a device you depend on forever. It's a skill you keep.

## Technical foundation: the somatic loop

Somatic computing runs as a closed loop. It senses the body and the task, compares the movement with the expert's, and guides the limb, while the wearer leads. Leading has a precise meaning here: Hermes only helps with a movement the wearer has started, and it has to respond fast enough that the movement still feels like theirs. In muscle-stimulation studies, people kept that sense of authorship when the stimulation came within about 80 ms of their own timing [18]. Every turn of the loop brings the next movement closer to the skill.

::figure fig-2

### Sensing

The sleeve reads the arm three ways. Stretchable yarn sensors in the glove track the finger joints, to about 1.5° in recent work [19]. Four motion sensors follow the hand, forearm, upper arm and shoulder; in a validation study, sensors like these tracked shoulder and elbow angles to within about 7° and 8° of optical motion capture [20]. A 16-channel dry EMG band at the forearm reads intent and effort. Meta researchers trained a band like it on data from thousands of people, and it decoded gestures and handwriting for new users with no calibration [21]. Camera smart glasses add what the arm alone can't know: the object in your hand, the task in front of you, where the target is. Those glasses are now a mass-market product, and Meta and EssilorLuxottica sold more than 7 million of them in 2025 [22].

### Somatic intelligence

The models at the center learn skills from demonstration. Moment by moment, they compare the wearer's movement with the expert's and decide how much help to give, and where. No two bodies are the same, so an expert's skill has to be fitted to each wearer's arm, strength and pace before it's useful. That retargeting, from one body to another, is the core technical problem of somatic computing, and it's the problem we exist to solve. We start from methods that already work in neighboring fields. In animation, networks retarget motion between skeletons of different shapes without paired examples [23]. In robotics, human hand motion is mapped onto robot hands with very different builds [24]. And the Lopes lab has taken a first step with people: its system split a 45° wrist movement into 14° at the wrist and 31° at the elbow to stay within one wearer's limits [25]. Somatic intelligence takes that work from skeletons and robot hands to the human arm.

The models run on the glasses and phone, which send short targets to the sleeve. The fast part of the loop, from sensing to a cue or a brake, runs on two small chips in the sleeve itself. It is designed to close in an estimated 25 to 60 ms, inside that 80 ms window.

### Actuation: the lightest touch that teaches

Hermes guides in three layers, each as light as the job allows.

- **Cues.** About a dozen small vibration motors along the wrist, forearm, elbow and shoulder show where and when to move.
- **Brakes.** Electrostatic clutches about a millimeter thick steady a joint or stop a finger at the right point. In lab gloves, clutches like these have held up to 50 N per finger and locked in under 15 ms [26], and an 11 g clutch has held 100 N per electrode pair on 0.6 mW of power [27]. Brakes can resist motion but never create it, and they release the moment power is off.
- **Grip assist.** One small motor on the upper arm pulls a cable to the hand for a light, force-limited assist of about 10 N.

This makes "the wearer leads" a property of the hardware, not a software promise. Cues and brakes can't move you, and the one part that adds force is small enough to overpower. How much help each layer gives is set twice: once for each wearer, by calibrating to their arm, strength and pace, and moment to moment, by how far the movement is from the expert's. All of it steps back as skill builds.

Muscle stimulation comes later, starting with the wrist and hand, once calibration is automatic. It builds on work from Pedro Lopes's lab at the University of Chicago, which has used AI and camera glasses to plan stimulation that guides the arm [25], and paired stimulation with brakes to make stimulated fingers more precise [28]. The path to finer control is already visible. Placing electrodes on the back of the hand raised a measure of knuckle independence from 0.18 to 0.62 and cut calibration time by about two thirds [29], and in early tests a 60-electrode sleeve chose its own electrodes from the wearer's muscle signals [30]. Stimulation sleeves are already cleared medical devices: Cionic's Neural Sleeve senses a wearer's gait and times stimulation to correct it [31]. Hermes will keep every electrode pair on the arm, never across the chest, following FDA guidance [32].

### Built light

Hermes is meant to feel like clothing, not equipment. It is designed to weigh about half a kilogram from fingertips to shoulder, about a third of a motorized arm brace like Myomo's MyoPro, which weighs 3 to 4 lb [33]. It's a knit sleeve, with carbon fiber only where the brakes need something stiff to push against: a back-of-hand plate, a forearm cuff and an upper-arm cuff. The battery and radio sit at the shoulder, so only about 90 to 130 g is past the wrist. That matters, because in a study of arm-worn loads, 0.54 kg on the forearm or hand caused clear fatigue while 0.20 kg caused few signs of it [34]. The whole sleeve is estimated to average under a watt, so an 8 Wh battery of about 36 g should last an 8-hour shift.

::figure fig-3

Every part of this design has already been shown in a lab or ships in a product today. No one has yet put them together in one sleeve, and that integration is the engineering work ahead of us. The open questions are practical ones. Electrostatic brakes have needed 100 to 1,500 V, so they must be sealed against sweat, though a 2025 design already works at 100 V [35]. Cuffs have to grip firmly on soft tissue, and the sleeve has to survive washing, wear and heat. The figures here are design targets, not measurements of a finished device.

::figure fig-4

### Capturing mastery

The library starts with experts. An expert records a skill by doing what they're best at while wearing the system. Each skill becomes a file that can be refined, versioned and run on any Hermes Computer, with the expert credited by name and paid for their skill.

Expertise leaves a measurable signature in movement, which is what makes it possible to capture. In robotic surgery, a surgeon's skill level can be classified from instrument movement alone with 85 to 95% accuracy [36], and in 48 of 59 sports studies, more skilled athletes moved with less variability [37]. Hermes records that signature at its source, from the joints and muscles of the person who has it.

## The skill network

Hermes is the first device. The library of skills is the platform.

::figure fig-5

Experts record skills for the public library, and companies record their own experts for private ones. People and companies run those skills on Hermes. Every session produces data on how real people move, which is the data physical AI needs most and has least of: robot datasets are still a fraction of the size and diversity of the data behind language and vision models [38]. Wearers choose whether to share it, and what they share improves somatic intelligence, which makes every skill better and draws in more experts and more users.

This is the moat. Robot companies largely collect movement data in labs, one demonstration at a time. Video of skilled people at work already exists at scale: Ego-Exo4D alone pairs 1,286 hours of skilled activity with proficiency ratings and expert commentary [39]. What's missing is movement measured on the arm itself, with joint angles, muscle signals and outcomes captured together during real skilled work. Every Hermes collects it as a side effect of being useful, with the wearer's permission.

## Scaling beyond the first skill

We start with one ability we can own: **precision hand skills**, the fine, guided movement of the hand and wrist. It's what Hermes covers best, it's measurable in accuracy, speed and error rate, and the same ability runs from assembly lines to kitchens to music rooms.

From there, the platform grows along two paths.

**Across human life.** Every domain where skill is physical is a market for the same system.

::figure fig-6

**Into robots.** A skill captured from an expert can run through a person today and help train a robot tomorrow. The movement data the network collects is exactly what robot learning lacks. Physical Intelligence found that 14 hours of first-person human data roughly doubled a large robot model's success on tasks that appeared only in the human data, from 32% to 71% on one of them [40]. That data reaches robot makers only when people choose to share it. None of this contradicts the second future, which was never a world without robots. Machines still take the heavy, repetitive work, and real human movement is the data they need to learn it. The difference is that people keep building skill of their own and decide what they share. That makes Abilith the skill layer for all of physical AI, with people first.

## Business model: enterprise first, consumers next, robots last

Abilith grows in three stages, each building on the one before it.

1. **Enterprise first.** Manufacturers and other employers pay a monthly fee for each worker using Hermes. Their best people record skills into a private library only that company can use, so new hires can come up to speed faster and expertise stays when veterans retire.
2. **Consumers next.** People buy Hermes and subscribe to the public skill library, from a champion's serve to a chef's knife work.
3. **Robots last.** Movement data that people choose to share trains models we license to robot makers.

The order follows where value is easiest to prove. An employer can measure what Hermes is worth in training time, errors and turnover, and one task on one line is a controlled place to show that a skill transfers. Consumers come next, once the library is broad and the hardware is cheaper to make. Robot makers come last, because movement data is worth most at scale, and by then the network will hold on-body data that no lab collects on its own.

Experts are paid up front to record skills for the public library. The best-known names also share in the revenue their skills bring in, because their name is part of what people buy.

## Principles: the human stays in control

A technology that guides your body has to earn trust. The design above comes down to four commitments, and they're the line between the two futures:

1. **You lead.** Hermes only adds to movements you start, and one control cuts power and releases every brake.
2. **You keep the skill.** We'll judge Learn by what people can do once the sleeve comes off.
3. **You own your data.** Nothing is shared, with robot makers or anyone else, unless you opt in. We treat it as sensitive neural data, as laws in Colorado and California now do [41, 42].
4. **Experts are paid.** Every skill in the public library comes from an expert who is credited by name and paid to record it.

## Conclusion: why now

Three things changed at once. Camera smart glasses became a mass-market product [22]. Sensing at the wrist and arm began to work across people instead of one person at a time [21]. And models that learn movement from demonstration moved to the center of physical AI [38, 40]. For the first time, every piece of somatic computing exists.

Robots are getting cheaper, and they should take on more of the heavy, repetitive work. In February 2024, Goldman Sachs put the cost of manufacturing a humanoid robot at between $30,000 and $150,000 [43]. But price was never the only barrier. NIST advises small manufacturers to budget about three times a collaborative robot's price for integration [44], and fewer than 10% of US manufacturers use any industrial robots at all [45]. And much of what people care about doing isn't waiting for a robot at any price. The point of a golf swing or a song on the piano is that you can do it yourself. Eight billion people are already where the work and the play happen.

Physical AI is at a fork. One path builds machines that do things for us. The other builds AI that lets us do anything.

Within the next decade, we believe more people will wear physical AI than will ever live alongside a humanoid robot. Abilith is pioneering somatic computing so that the future arrives as the second one: superhuman ability, for everyone. You choose the move. AI brings the skill.

::closer AI just got a body.|Yours.

## Sources

1. [Assembly Magazine, on Figure's humanoid robot trial at a BMW assembly plant](https://www.assemblymag.com/articles/99678-humanoid-robots-complete-trial-project-at-bmw-assembly-plant), November 2025
2. [The Manufacturing Institute and Deloitte, "Manufacturers need as many as 3.8 million new employees by 2033"](https://themanufacturinginstitute.org/manufacturers-need-as-many-as-3-8-million-new-employees-by-2033/), April 3, 2024
3. [U.S. Bureau of Labor Statistics, "Employed persons by detailed industry and age," Current Population Survey table 18b](https://www.bls.gov/cps/cpsaat18b.htm), 2025 annual averages
4. [U.S. Bureau of Labor Statistics, "Apprenticeships: Occupations and outlook"](https://www.bls.gov/careeroutlook/2017/article/apprenticeships_occupations-and-outlook.htm), Career Outlook, 2017
5. [U.S. Department of Labor, Office of Apprenticeship, Bulletin 2011-07 on apprenticeship completion rates](https://apprenticeship.gov/sites/default/files/bulletins/Bulletin_2011-07_Completion_Rates.pdf), 2011
6. [Boushey and Glynn, "There Are Significant Business Costs to Replacing Employees"](https://www.americanprogress.org/article/there-are-significant-business-costs-to-replacing-employees/), Center for American Progress, 2012
7. [American Board of Surgery, general surgery training requirements](https://www.absurgery.org/general-surgery/training-requirements)
8. [Khoushhal et al., "Prevalence and Causes of Attrition Among Surgical Residents: A Systematic Review and Meta-analysis"](https://jamanetwork.com/journals/jamasurgery/fullarticle/2593310), JAMA Surgery, 2017
9. [CNBC, "Fender sales boom as guitar playing surges during the pandemic"](https://www.cnbc.com/2020/11/21/fender-sales-boom-as-guitar-playing-surges-during-the-pandemic.html), November 21, 2020
10. [Ruth and Müllensiefen, on when young people stop music lessons and activities](https://pmc.ncbi.nlm.nih.gov/articles/PMC8612519), PLoS ONE, 2021
11. [K. Anders Ericsson, Ralf Th. Krampe and Clemens Tesch-Römer, "The Role of Deliberate Practice in the Acquisition of Expert Performance"](https://doi.org/10.1037/0033-295X.100.3.363), Psychological Review 100(3), 1993
12. [Seymour et al., "Virtual Reality Training Improves Operating Room Performance: Results of a Randomized, Double-Blinded Study"](https://pmc.ncbi.nlm.nih.gov/articles/PMC1422600/), Annals of Surgery, 2002
13. [Tang, Owen, Biocca and Mou, "Comparative Effectiveness of Augmented Reality in Object Assembly"](https://researchwith.njit.edu/en/publications/comparative-effectiveness-of-augmented-reality-in-object-assembly/), CHI 2003
14. [Winstein, Pohl and Lewthwaite, "Effects of physical guidance and knowledge of results on motor learning: support for the guidance hypothesis"](https://experts.nau.edu/en/publications/effects-of-physical-guidance-and-knowledge-of-results-on-motor-le/), Research Quarterly for Exercise and Sport, 1994
15. [Marchal-Crespo et al., "The effect of haptic guidance, aging, and initial skill level on motor learning of a steering task"](https://pmc.ncbi.nlm.nih.gov/articles/PMC2832903), Experimental Brain Research, 2010
16. [Choudhary et al., adaptive muscle stimulation that steps down from demonstrating to correcting to warning](https://lab.plopes.org/published/2025-CHI-AdaptiveEMS.pdf), Lopes lab, University of Chicago, CHI 2025
17. [Basalp, Wolf and Marchal-Crespo, review of which haptic training methods help which learners](https://www.research-collection.ethz.ch/items/6bb7a2bf-9234-4a51-b8f0-1e8ea82b7d3e), IEEE Transactions on Haptics, 2021
18. [Kasahara, Nishida and Lopes, "Preemptive Action: Accelerating Human Reaction using Electrical Muscle Stimulation Without Compromising Agency"](https://lab.plopes.org/published/2019-CHI-AgencyEMS.pdf), CHI 2019
19. [Tashakori et al., stretchable smart textile gloves for tracking hand movement](https://arxiv.org/html/2410.02221), Nature Machine Intelligence, 2024
20. [Morrow et al., validation of inertial measurement units for upper-body kinematics](https://researchexperts.utmb.edu/en/publications/validation-of-inertial-measurement-units-for-upper-body-kinematic/), Journal of Applied Biomechanics, 2017
21. [Reality Labs at Meta, "A generic non-invasive neuromotor interface for human-computer interaction"](https://www.nature.com/articles/s41586-025-09255-w), Nature 645, September 2025
22. [UploadVR, "Meta and EssilorLuxottica sold 7 million smart glasses in 2025"](https://uploadvr.com/meta-essilorluxottica-sold-7-million-smart-glasses-in-2025/), February 11, 2026, reporting EssilorLuxottica's Q4 2025 results
23. [Aberman et al., "Skeleton-Aware Networks for Deep Motion Retargeting"](https://arxiv.org/abs/2005.05732), SIGGRAPH 2020
24. [Wang et al., "DexCap: Scalable and Portable Mocap Data Collection System for Dexterous Manipulation"](https://arxiv.org/abs/2403.07788), RSS 2024
25. [Ho et al., AI-generated muscle stimulation guided by camera glasses](https://arxiv.org/pdf/2505.10648v2), Lopes lab, University of Chicago, CHI 2026
26. [Hinchet and Shea, glove- and sleeve-format electrostatic clutches for haptics](https://doaj.org/article/6eb034e3195c40f28564d7c04bdd7893), Advanced Intelligent Systems, 2022
27. [Diller, Majidi and Collins, "A lightweight, low-power electroadhesive clutch and spring for exoskeleton actuation"](https://www.andrew.cmu.edu/user/shc17/Diller_2016_ICRA.pdf), ICRA 2016
28. ["DextrEMS: Increasing Dexterity in Electrical Muscle Stimulation by Combining it with Brakes"](https://par.nsf.gov/servlets/purl/10317682), Lopes lab, University of Chicago, UIST 2021
29. [Takahashi et al., muscle stimulation from the back of the hand for finger control](https://par.nsf.gov/servlets/purl/10317683), Lopes lab, University of Chicago, CHI 2021
30. [Knibbe et al., automatic calibration of high-density muscle stimulation](https://www.kasperhornbaek.dk/papers/IMWUT2017_AutomaticCalibration.pdf), IMWUT, 2017
31. [U.S. FDA 510(k) clearance K213622, Cionic Neural Sleeve](https://510kdatabase.net/k213622), February 2022
32. [U.S. Food and Drug Administration, guidance document for powered muscle stimulator 510(k)s](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/guidance-document-powered-muscle-stimulator-510ks), 1999
33. [Myomo, MyoPro 2x](https://myomo.com/users-and-caregivers/myopro-2x-daily-wear/)
34. [Knight and Baber, "Assessing the physical loading of wearable computers"](https://research.birmingham.ac.uk/files/4856336/KnightAppErgs.pdf), Applied Ergonomics, 2007
35. [Northwestern University, news release on Aksoy and Colgate's low-voltage electroadhesive clutch](https://www.mccormick.northwestern.edu/news/articles/2025/02/redesigning-electroadhesive-clutches-for-robotics-and-wearable-devices/), February 2025, on their Science Advances paper
36. [Wang and Majewicz Fey, deep learning for objective skill evaluation in robot-assisted surgery](https://arxiv.org/pdf/1806.05796), 2018, using the JIGSAWS dataset
37. [Marineau et al., systematic review of movement variability and skill level in sport](https://depot-e.uqtr.ca/id/eprint/11611/), Scandinavian Journal of Medicine and Science in Sports, 2024
38. [Open X-Embodiment Collaboration, "Open X-Embodiment: Robotic Learning Datasets and RT-X Models"](https://arxiv.org/html/2310.08864), 2023
39. [Grauman et al., "Ego-Exo4D: Understanding Skilled Human Activity from First- and Third-Person Perspectives"](https://arxiv.org/abs/2311.18259), CVPR 2024
40. [Kareer et al., Physical Intelligence, research on transferring skills from human data to robots](https://pi.website/research/human_to_robot), December 2025
41. [Colorado HB24-1058, on the privacy of biological and neural data](https://leg.colorado.gov/bills/hb24-1058), 2024
42. [California SB 1223, on neural data as sensitive personal information](https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202320240SB1223), 2024
43. [Goldman Sachs Research, "The global market for humanoid robots could reach $38 billion by 2035"](https://www.goldmansachs.com/insights/articles/the-global-market-for-robots-could-reach-38-billion-by-2035), February 27, 2024
44. [National Institute of Standards and Technology, AMS 100-41, on collaborative robot integration for small manufacturers](https://nvlpubs.nist.gov/nistpubs/ams/NIST.AMS.100-41.pdf), 2021
45. [MIT Task Force on the Work of the Future, Berger et al., on robot adoption in US manufacturing](https://workofthefuture-taskforce.mit.edu/?p=625)

*Hermes is in early development. This paper describes our vision and goals, not capabilities that have shipped.*
