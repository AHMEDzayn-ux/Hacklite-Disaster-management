## HACKELITE 3.0 | PROJECT PROPOSAL

IEEE WIE Student Branch Affinity Group | University of Moratuwa

## ResQLink

## AI-Powered Disaster Report/Response Platform for Sri Lanka

When the network fails, the rescue doesn't.

| DOMAIN | TEAM NAME | SUBMISSION DATE |
| --- | --- | --- |
| Disaster Management & | Quadruple | 23 / 5 / 2026 |
| Public Safety |   |   |

## Submitted by Team [ Your Team Name ]

## 01 TEAM INFORMATION

Provide the details of all team members below.

| # | Full Name | Role | Email | LinkedIn / GitHub |
| --- | --- | --- | --- | --- |
| 1 | M.R.Ruzaini | Team Lead | ruzainia.23@cse.mrt. | Ruzain Ahmedh | |
|   | Ahmedh |   | ac.lk | LinkedIn |
| 2 | Didula Jeewandara Team member didulaj.23@cse.mrt.a |   |   | Linkden |
|   |   |   | c.lk |   |
| 3 | G.Janushikha | Team member gnanasekaranj.23@c |   |   |
|   |   |   | se.mrt.ac.lk |   |
| 4 | M.R.F.Safrina | Team member safrinar.23@cse.mrt. |   | www.linkedin.com/in/ |
|   |   |   | ac.lk | safrinar |


University / Institution:

University of Moratuwa

Faculty / Department:

Faculty of Engineering-CSE

Contact Email: ruzainia.23@cse.mrt.ac.lk

Contact Phone: 077-1012347

## 02 PROBLEM STATEMENT

## 2.1 Context

Sri Lanka faces recurring natural disasters including floods, landslides, cyclones, and coastal hazards. The 2025 disaster events, particularly the widespread floods that displaced thousands across multiple districts, exposed major weaknesses in the country’s disaster management system. Despite advances in communication technology, disaster response still relies heavily on fragmented reporting channels, isolated hotlines, manual coordination through platforms like WhatsApp, paper-based camp records, and unstructured volunteer management.

These limitations result in delayed incident reporting, poor coordination between agencies, inefficient resource allocation, and limited real-time situational awareness during emergencies. Motivated by the challenges observed during the 2025 disaster response, this work highlights the need for an integrated, scalable, and technology-driven disaster management system to support real-time reporting, coordinated response efforts, and improved information flow among authorities, volunteers, and affected communities.

## 2.2 The Three Core Gaps

- Connectivity collapse. Floods and landslides knock out mobile data first. Victims with a single bar of signal cannot load a website, upload a photo, or submit a form — yet a basic SMS still gets through. Current disaster response platforms in Sri Lanka lack a reliable network-down reporting mechanism and do not treat SMS as a first-class reporting channel.

- Blind resource allocation. Coordinators decide where to send food, medicine, and rescue teams based on phone calls and gut feel. There is no real-time picture of how many people are gathered where, what they actually need, and which camp is closest to capacity.

- Slow volunteer dispatch. Volunteers register but wait for someone to call them. The right volunteer — nearest, with the right skill, currently available — is rarely the one contacted. Critical hours are lost in coordination overhead.

No centralized reporting and response system.There is currently no unified platform to report and manage different types of emergencies such as disaster incidents, missing persons, medical emergencies, or relief needs. As a result, information is scattered across multiple channels, making it difficult for authorities to track cases, prioritize responses, and coordinate actions in a timely and organized manner.


## 2.3 Why Now

Generative AI and on-device ML have crossed the threshold where extracting structured information from a noisy SMS or a panicked voice call is reliable enough to act on. The technology that was a research demo two years ago can today triage a 160-character emergency message in under a second. The gap is no longer technical capability — it is the absence of a platform that puts these pieces together for a country that needs them.

## 03 PROPOSED SOLUTION

## 3.1 Solution Overview

ResQLink is a unified disaster response platform that connects three groups — victims, responders, and administrators — through a single coordinated system. Its breakthrough is a multi-channel ingestion layer (web, SMS, voice) feeding an AI pipeline that extracts structured emergency data, an ML resource allocator that decides who needs what and where, and an auto-dispatch engine that routes the nearest qualified volunteer in seconds rather than hours.

The platform is already operational as a web application covering missing persons, disaster

reporting, animal rescue, camp management, volunteer registration, and donation facilitation. This proposal extends it with four AI-driven modules that transform it from a reporting tool into a decision-making system.

## 3.2 Key Features

• SMS-First Emergency Channel with AI Extraction. A victim with a single bar of signal sends a free-text SMS to a shortcode. An AI agent parses location, victim count, injury status, and specific needs from any language or mixed Sinhala/Tamil/English maximally possible, then files a structured disaster report . No app, no internet required to report during a critical internet connectivity down.

• Centralized Emergency Reporting Platform. A unified system where all types of emergency reports — including disaster incidents, missing persons, medical emergencies,

rescue requests, and trapped animal reports — are submitted and managed in one place. This ensures all data flows into a single coordinated response system instead of

fragmented channels.

- Voice Call Intelligence. Emergency hotline calls are transcribed in real time and processed by an entity-extraction model that pulls out names, addresses, and severity indicators, populating the same database as web submissions.

- Auto Volunteer Dispatch. When a need is logged, the system computes the nearest available volunteer matching the required skill set, pushes the assignment to their phone with location and context, and waits for accept/decline — all without human intervention.

- Live Operations Dashboard. Administrators see a real-time map of incidents, camp occupancy, volunteer positions, and resource flow with one-click approval for camp registrations and donation tracking.


- Transparent Donation Ledger. Instead of relying solely on traditional bank account transfers, the system enables direct donations through platforms like PayPal/Stripe, allowing both local and international individuals to contribute easily without requiring intermediary processes such as embassy coordination or complex international bank transfers. All donations are recorded in a public, auditable ledger to ensure transparency, trust, and accountability in disaster funding.

## 3.3 Architecture / System Diagram

The diagram below shows the three ingestion channels feeding a unified AI processing layer, which writes to the Supabase backend and drives the dispatch and dashboard layers.

## 04 TECHNOLOGY STACK

| Component | Technology / Tool | Purpose |
| --- | --- | --- |
| Frontend | React 19 + Vite + Tailwind | Responsive UI for reporters, |
|   | CSS | responders, and admins |
| State & Routing | Zustand + React Router 7 | Real-time client state and |
|   |   | role-based navigation |
| Maps & Geo | Leaflet + React Leaflet | Incident pinning, camp locator, |
|   |   | volunteer routing |
| Backend (BaaS) | Supabase (PostgreSQL + | Database, WebSockets, row-level |
|   | Realtime + Auth + Storage) | security, media storage |
| AI / NLP | Anthropic Claude API + spaCy | Entity extraction from SMS and |
|   | + LangChain | voice transcripts |


| Speech-to-Text | OpenAI Whisper (self-hosted) Multilingual voice call transcription |   |
| --- | --- | --- |
| SMS Gateway | Twilio + Sri Lankan SLT/Dialog | Bidirectional SMS ingestion and |
|   | shortcode | confirmation |
| ML Allocation | Python + scikit-learn + | Resource demand forecasting and |
|   | XGBoost | shortage prediction |
| Dispatch Logic | PostGIS + Haversine + | Nearest qualified volunteer |
|   | skill-match scoring | selection |
| Payments | Stripe/Paypal | Secure donation processing with |
|   |   | public ledger |
| Hosting | Vercel (frontend) + Supabase | Scalable, low-latency global |
|   | Edge Functions | delivery |

## 05 INNOVATION & ORIGINALITY

ResQLink's novelty is not any single AI model — it is the orchestration of three ingestion channels into one decision-making pipeline tuned for a country where the network goes down precisely when it is needed most. We are not aware of any operational disaster platform — domestic or regional — that combines SMS-first AI extraction, predictive resource allocation, and automated nearest-volunteer dispatch in a single system.

## 5.1 What Sets ResQLink Apart

- Centralized unified system. Unlike existing fragmented tools where disaster reporting, missing persons, relief camps, and resource tracking are scattered across multiple disconnected systems, this platform brings everything into a single coordinated ecosystem. This centralization eliminates communication gaps, improves coordination between stakeholders, and enables faster, more accurate resource allocation during emergencies.

- Degradation-resilient by design. The platform stays usable as network quality drops from 4G → 3G → 2G → SMS-only. Most disaster tech assumes the network exists; Unlike conventional disaster systems that assume continuous internet availability, this system is built on the assumption that networks will fail during crises — ensuring that critical reporting and coordination still operate when connectivity is at its worst.

- Multilingual AI tuned for Sri Lankan code-switching. Real emergency messages mix Sinhala, Tamil, and English in a single sentence. Our extraction prompts and entity models are built for this, not for clean monolingual formatted text.

- From report to dispatch in under one minute. End-to-end latency target: SMS received → entity extracted → volunteer notified in under 60 seconds. Existing manual workflows take 20+ minutes.


## 5.2 Competitive Advantage

| Existing Solutions | Our Solution (ResQLink) |
| --- | --- |
| Government hotlines (117, 119) require a | AI transcribes and extracts entities from |
| working voice call and produce no structured | every call in real time, writing structured |
| data — coordinators take notes by hand. | incidents to the same database as web |
|   | reports. |
| Current platforms such as SL Flood Report | SMS-first ingestion means a victim with one |
| and other humanitarian tools provide useful | bar of signal no data can still file a |
| services but largely assume stable internet | structured report in 160 characters. |
| connectivity for both victims and responders. |   |
| Disaster-related functions such as flood |   |
| reporting, missing persons, and animal | It combines centralized reporting for all |
| rescue are handled across separate, | emergencies (disasters, missing persons, |
| disconnected platforms, leading to | medical cases, and animal rescues) with |
| fragmented data, duplicated effort, and | multi-channel input (SMS, calls, and web) |
| slower coordinated response during | and intelligent coordination tools. By |
| emergencies. | integrating reporting, response, volunteer |
|   | dispatch, and resource management into a |
|   | single system, ResQLink eliminates |
|   | fragmentation and enables faster, more |
|   | coordinated action during critical disaster |
|   | situations. |
| WhatsApp-based volunteer coordination is | Auto-dispatch matches the nearest available |
| unsearchable, unauditable, and depends on | volunteer by skill in under five seconds with |
| a human dispatcher making calls. | accept/decline tracking. |
| Current disaster donation drives rely on | ResQLink introduces a globally accessible |
| government-provided bank account | donation system that integrates platforms |
| numbers, which limits accessibility for many | like PayPal and Stripe instead of relying |
| international donors.This lack of ease of | solely on government bank accounts. This |
| access ultimately suppresses public and | enables easy contributions from both local |
| foreign contributions during critical disaster | and international donors without transfer |
| periods. | barriers. |


## 06 REAL-WORLD IMPACT & SCALABILITY

## 6.1 Target Audience

- Primary — Disaster victims and at-risk communities. Coastal districts (Galle, Matara, Hambantota), flood-prone areas (Kalutara, Ratnapura, Colombo low-lying zones), and landslide belts (Nuwara Eliya, Badulla, Kegalle).

- Secondary — Responders. Registered volunteer groups, the Sri Lanka Red Cross, civil defence units, and ad-hoc local volunteers.

- Coordinators — Government and NGOs. Disaster Management Centre (DMC), Divisional Secretariats, and humanitarian agencies running camps and supply chains.

## 6.2 Expected Impact

- Faster rescues. Reducing average report-to-dispatch time from 20+ minutes to under 1 minute saves lives in the first golden hour of any disaster.

- Reachable victims. Around 96% of Sri Lankans own a mobile phone, but only ~67% have mobile internet. SMS-first reporting opens emergency channels to the remaining one-third — disproportionately the rural and elderly who are most at risk.

- Smarter resource use. Predictive allocation reduces both shortages and over-supply waste, freeing donor funds for actual gaps.

- A permanent data record. Every incident, dispatch, and resource flow is logged — a structured dataset for post-disaster audits, policy planning, and future ML training.

## 6.3 Scalability Plan

- Phase 1 (Months 0–3): Pilot in one high-risk district (Ratnapura) in partnership with the DMC and local volunteer groups.

- Phase 2 (Months 4–9): Roll out island-wide across all 25 districts; integrate official emergency shortcodes with SLT and Dialog and others

- ML-Based Resource Allocation(within next 4-5 months). A model trained on aggregated incident data forecasts demand for food, medicine, shelter, and personnel at the camp and district level, flagging shortages 6–24 hours before they become critical.

- partitions cleanly by district. • Technical scalability: Supabase and AWS Amplify scale horizontally; AI extraction runs as async edge functions; the dispatch engine

## 07 MARKET VIABILITY


## 7.1 Operating Model

ResQLink is positioned as public-interest infrastructure rather than a consumer product. The platform itself is free for victims and volunteers. Revenue and sustainability come from three institutional channels:

- Government licensing. Annual contract with the Disaster Management Centre for hosting, AI inference, and SMS gateway costs — comparable to existing DMC IT spend on far less capable systems.

- NGO and donor agency partnerships. Red Cross, UNDP, and World Bank disaster-resilience grants routinely fund this category of infrastructure.

- Donation platform fee. A transparent 1–2% operational fee on Stripe donations, disclosed publicly on the ledger.

## 7.2 Market Size and Demand

Sri Lanka experiences a major declared disaster nearly every year; the DMC's annual operational budget runs into the billions of rupees. Across South Asia, climate-related disaster spending is projected to grow sharply through 2030. There is no entrenched incumbent in the AI-first disaster platform category for this region — the field is open.

## 7.3 Risks and Mitigation

- SMS gateway dependency: Mitigated by signing parallel agreements with both major operators (SLT-Mobitel and Dialog) plus a fallback shortcode aggregator.

- AI extraction errors: Every high-severity AI-extracted incident is flagged for human review on the admin dashboard before dispatch; low-severity reports proceed automatically with confidence scores logged.

- Adoption inertia: Addressed by launching alongside the DMC and existing volunteer networks rather than competing with them — ResQLink replaces the spreadsheets, not the institutions.

## DECLARATION

We, the undersigned, declare that this proposal is our original work and has not been submitted elsewhere. All information is accurate to the best of our knowledge.

Team Lead Name:M.R.Ruzaini Ahmedh Date: 22/22/20260
