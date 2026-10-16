"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { ArrowDown, ArrowDownRight, ArrowRight, ArrowUpRight, BadgeCheck, Check, ChevronDown, CircleCheck, Copy, Fingerprint, Globe2, Info, Layers3, Link2, LoaderCircle, LockKeyhole, Menu, Minus, ScanLine, ShieldCheck, Sparkles, X } from "lucide-react";
import ComparisonResults from "@/components/ComparisonResults";
import PhoneVisual from "@/components/PhoneVisual";
import type { Comparison } from "@/lib/types";

const stores = [
  { id: "amazon", name: "Amazon", domains: ["amazon.in", "www.amazon.in", "m.amazon.in"], label: "amazon", className: "amazon-word" },
  { id: "flipkart", name: "Flipkart", domains: ["flipkart.com", "www.flipkart.com", "m.flipkart.com"], label: "Flipkart", className: "flipkart-word" },
  { id: "croma", name: "Croma", domains: ["croma.com", "www.croma.com"], label: "croma", className: "croma-word" },
  { id: "reliance", name: "Reliance Digital", domains: ["reliancedigital.in", "www.reliancedigital.in"], label: "Reliance Digital", className: "reliance-word" },
  { id: "vijay", name: "Vijay Sales", domains: ["vijaysales.com", "www.vijaysales.com"], label: "VIJAY SALES", className: "vijay-word" }
];

function Brand({ small = false }: { small?: boolean }) { return <a href="#top" className={`brand ${small ? "brand-small" : ""}`} aria-label="Pricewise home"><span className="brand-mark"><Layers3 size={23} strokeWidth={2.2} /></span><span>price<span className="brand-light">wise</span><span className="brand-period">.</span></span></a>; }

function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return <motion.div className={className} initial={{ opacity: 0, y: 25 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.12 }} transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}>{children}</motion.div>;
}

function MagneticLink({ children, href, className = "", onClick }: { children: React.ReactNode; href: string; className?: string; onClick?: () => void }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const reduced = useReducedMotion();
  return <a ref={ref} className={className} href={href} onClick={onClick} onPointerMove={e => { if (reduced || e.pointerType !== "mouse" || !ref.current) return; const box = ref.current.getBoundingClientRect(); ref.current.style.transform = `translate(${(e.clientX - box.left - box.width / 2) * 0.08}px, ${(e.clientY - box.top - box.height / 2) * 0.14}px)`; }} onPointerLeave={() => { if (ref.current) ref.current.style.transform = ""; }}>{children}</a>;
}

function HeroPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const reduced = useReducedMotion();
  const y = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 65]);
  return <motion.div style={{ y }} ref={ref} className="hero-visual" aria-label="Illustrative product comparison preview, no live prices">
    <div className="visual-orbit orbit-one" /><div className="visual-orbit orbit-two" /><div className="visual-cross cross-one">+</div><div className="visual-cross cross-two">+</div>
    <div className="preview-main"><div className="preview-topline"><span><span className="purple-dot" />A CLOSER LOOK</span><ScanLine size={16} /></div><div className="phone-stage"><div className="phone-aura" /><PhoneVisual /><span className="phone-stage-grid" /></div><div className="preview-product"><span className="preview-brand">APPLE</span><h3>iPhone 16</h3><p>128 GB <span /> Black <span /> Same exact variant</p></div><div className="preview-match"><Fingerprint size={16} /><span>Every detail matters.</span><ShieldCheck size={15} /></div></div>
    <div className="floating-badge"><span className="badge-symbol"><Check size={18} /></span><div><strong>Same model. Same variant.</strong><span>That’s the only fair comparison.</span></div></div>
    <div className="preview-prices"><div className="preview-prices-heading"><span>YOUR RETAILER LINEUP</span><ArrowDownRight size={14} /></div><div className="preview-price-row"><span className="mini-store mini-amazon">a</span><strong>Amazon</strong><span className="price-unverified">—</span><span className="mini-pending"><span />Awaiting source</span></div><div className="preview-price-row"><span className="mini-store mini-flipkart">f</span><strong>Flipkart</strong><span className="price-unverified">—</span><span className="mini-pending"><span />Awaiting source</span></div><div className="preview-price-row"><span className="mini-store mini-croma">c</span><strong>Croma</strong><span className="price-unverified">—</span><span className="mini-pending"><span />Awaiting source</span></div><div className="preview-disclaimer"><Info size={11} />Interface preview. No live prices shown.</div></div>
    <div className="visual-caption"><span className="caption-line" /> LESS GUESSWORK, BY DESIGN.</div>
  </motion.div>;
}

const features = [
  { icon: Fingerprint, title: "A match means an exact match.", description: "Same model. Same storage. Same colour. Because a lower price means nothing if it’s a different product.", tag: "01 — PRODUCT IDENTITY" },
  { icon: Layers3, title: "The total. Not the teaser.", description: "Delivery and mandatory charges belong in the comparison. Conditional bank and membership deals stay separate.", tag: "02 — COMPLETE COSTS" },
  { icon: ShieldCheck, title: "Proof behind every price.", description: "Clear sources, freshness checks, and honest coverage. If a price can’t be verified, it doesn’t get ranked.", tag: "03 — TRANSPARENT VERIFICATION" }
];

function DetailPanel({ active }: { active: number }) {
  return <div className="detail-panel"><div className="detail-panel-top"><span><span className="purple-dot" />{["THE EXACT-MATCH STANDARD", "WHAT YOU ACTUALLY PAY", "VERIFICATION, MADE VISIBLE"][active]}</span><span>0{active + 1} / 03</span></div><AnimatePresence mode="wait"><motion.div key={active} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
    {active === 0 ? <><div className="identity-product"><div className="identity-phone"><PhoneVisual compact /></div><div><span className="eyebrow">ILLUSTRATIVE PRODUCT</span><h3>Apple iPhone 16</h3><p>The details are the identity.</p><div className="spec-pills"><span>128 GB</span><span>Black</span><span>iPhone 16</span></div></div></div><div className="identity-label">VARIANT CHECK</div><div className="identity-check"><span className="identity-check-icon"><Check size={15} /></span><div><strong>iPhone 16 · 128 GB · Black</strong><span>Identical specification</span></div><span className="check-chip">Exact variant</span></div><div className="identity-check excluded"><span className="identity-check-icon"><X size={15} /></span><div><strong>iPhone 16 · 256 GB · Black</strong><span>Different storage capacity</span></div><span className="excluded-chip">Excluded</span></div><p className="panel-footnote"><LockKeyhole size={12} />Specification example. Not a verified retailer listing.</p></> : active === 1 ? <div className="cost-visual"><div className="cost-icon"><Layers3 size={34} /></div><h3>Nothing hidden in the total.</h3><p>Verified product price</p><span className="cost-plus">+</span><p>Delivery & mandatory charges</p><div className="cost-total"><span>Comparable total</span><ShieldCheck size={19} /></div><div className="conditional-note"><Info size={15} />Bank offers, coupons, and memberships are shown separately, with their conditions.</div></div> : <div className="verification-visual"><div className="verification-orb"><ShieldCheck size={40} /></div><h3>Transparency comes standard.</h3><div className="proof-row"><Check size={16} /><span>Authorized product source</span></div><div className="proof-row"><Check size={16} /><span>Exact identity & variant</span></div><div className="proof-row"><Check size={16} /><span>Timestamp & availability</span></div><div className="proof-row"><Check size={16} /><span>Freshness before ranking</span></div><p className="panel-footnote">A missing check means no verified price.</p></div>}
  </motion.div></AnimatePresence><div className="panel-bottom"><span className="purple-dot" />BUILT AROUND CERTAINTY, NOT CLICKS.<span className="panel-code">PW/01</span></div></div>;
}

const faqs = [
  { question: "How do you know it’s the exact same product?", answer: "The engine checks reliable product identifiers such as GTIN and manufacturer model, then verifies variant details including storage, colour, generation, and pack size. An ambiguous or conflicting identity is excluded from verified rankings." },
  { question: "Are the prices live?", answer: "A price appears only when an authorized retailer source is connected and passes identity and freshness checks. Each offer shows when it was checked, and cached data is explicitly labeled." },
  { question: "What happens if a price can’t be verified?", answer: "You’ll see “Price currently unavailable — verification required.” We never estimate a price or invent an offer to fill an empty result. You can expand each retailer row to see why an offer is unavailable." },
  { question: "Are bank offers and delivery included?", answer: "Known delivery fees and mandatory charges are included in the comparable total. An offer with unknown mandatory costs is not eligible as the cheapest total. Conditional bank offers, coupons, and membership discounts are shown separately." }
];

export default function Home() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Comparison | null>(null);
  const [activeFeature, setActiveFeature] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [coverageOpen, setCoverageOpen] = useState(false);
  const [configuredStores, setConfiguredStores] = useState<string[]>([]);
  const [coverageStatus, setCoverageStatus] = useState<"loading" | "known" | "unavailable">("loading");
  const inputRef = useRef<HTMLInputElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const storyRef = useRef<HTMLElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastStoryStage = useRef(0);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });
  const { scrollYProgress: storyProgress } = useScroll({ target: storyRef, offset: ["start center", "end end"] });
  const storyRotate = useTransform(storyProgress, [0, 1], [-18, 18]);
  useMotionValueEvent(storyProgress, "change", value => {
    if (reduced || window.innerWidth < 901) return;
    const stage = Math.min(2, Math.max(0, Math.floor(value * 3)));
    if (stage !== lastStoryStage.current) { lastStoryStage.current = stage; setActiveFeature(stage); }
  });

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/retailers", { signal: controller.signal }).then(response => response.ok ? response.json() : null).then(data => { if (data?.retailers) { setConfiguredStores(data.retailers.filter((r: { configured: boolean }) => r.configured).map((r: { name: string }) => r.name)); setCoverageStatus("known"); } else setCoverageStatus("unavailable"); }).catch(() => { if (!controller.signal.aborted) setCoverageStatus("unavailable"); });
    return () => { controller.abort(); abortRef.current?.abort(); };
  }, []);

  useEffect(() => {
    if (coverageOpen && !dialogRef.current?.open) dialogRef.current?.showModal();
    if (!coverageOpen && dialogRef.current?.open) dialogRef.current?.close();
  }, [coverageOpen]);

  function focusInput() { setMobileMenu(false); setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 250); }

  async function compare(event: FormEvent) {
    event.preventDefault(); if (loading) return; setError("");
    let parsed: URL;
    try { parsed = new URL(url.trim()); } catch { setError("Paste a complete product link, starting with https://."); inputRef.current?.focus(); return; }
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || (parsed.port && parsed.port !== "443") || !stores.some(store => store.domains.includes(parsed.hostname.toLowerCase()))) { setError("Use an HTTPS product link from Amazon India, Flipkart, Croma, Reliance Digital, or Vijay Sales."); inputRef.current?.focus(); return; }
    setLoading(true); setResult(null);
    setTimeout(() => document.getElementById("comparison")?.scrollIntoView({ behavior: reduced ? "instant" : "smooth", block: "start" }), 80);
    const controller = new AbortController(); abortRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch("/api/compare", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: url.trim() }), signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : response.status === 429 ? "Too many comparisons. Wait a minute and try again." : "We couldn’t verify that link. Please check the product URL and try again.");
      setResult(data);
    } catch (err) { setError(err instanceof Error && err.name !== "AbortError" ? err.message : "The verification service didn’t respond in time. Please try again."); document.getElementById("compare")?.scrollIntoView({ behavior: reduced ? "instant" : "smooth", block: "center" }); }
    finally { clearTimeout(timeout); setLoading(false); }
  }

  return <MotionConfig reducedMotion="user"><div id="top" onPointerMove={event => { if (event.pointerType !== "mouse" || reduced || !glowRef.current) return; glowRef.current.style.setProperty("--pointer-x", `${event.clientX}px`); glowRef.current.style.setProperty("--pointer-y", `${event.clientY}px`); }}>
    <a className="skip-link" href="#compare">Skip to comparison</a><motion.div className="scroll-progress" style={{ scaleX: progress }} /><div className="cursor-glow" ref={glowRef} aria-hidden="true" />
    <header className="site-header"><div className="nav-inner"><Brand /><nav className={mobileMenu ? "nav-links menu-open" : "nav-links"} aria-label="Main navigation"><a href="#how-it-works" onClick={() => setMobileMenu(false)}>How it works</a><a href="#the-difference" onClick={() => setMobileMenu(false)}>The difference</a><button onClick={() => { setCoverageOpen(true); setMobileMenu(false); }}>Retailer coverage <span className="nav-count">5</span></button></nav><MagneticLink href="#compare" className="nav-cta" onClick={focusInput}>Start comparing <ArrowUpRight size={15} /></MagneticLink><button className="mobile-menu-button" aria-label={mobileMenu ? "Close navigation" : "Open navigation"} aria-expanded={mobileMenu} onClick={() => setMobileMenu(!mobileMenu)}>{mobileMenu ? <X /> : <Menu />}</button></div></header>
    <main>
      <section className="hero section-wrap"><div className="hero-grid-background" aria-hidden="true" /><div className="hero-copy"><Reveal><div className="hero-eyebrow"><span className="status-dot" /> LESS SEARCHING. MORE CERTAINTY.<span className="eyebrow-spark"><Sparkles size={12} /></span></div><h1>One product.<br />Every verified price.<br /><span>The smarter choice.</span></h1><p className="hero-description">Paste a product link. Compare matching offers across supported stores. Find the lowest verified price without advertisements or misleading deals.</p></Reveal>
        <Reveal delay={0.15}><form className={`compare-form ${error ? "form-error" : ""}`} id="compare" onSubmit={compare}><label className="input-label" htmlFor="product-url">YOUR NEXT SMARTER PURCHASE STARTS HERE</label><div className="input-shell"><Link2 size={20} className="input-link-icon" /><input ref={inputRef} id="product-url" name="url" type="text" inputMode="url" autoComplete="url" spellCheck={false} placeholder="Paste an Amazon, Flipkart, or other supported product link..." value={url} onChange={event => { setUrl(event.target.value); if (error) setError(""); }} aria-invalid={Boolean(error)} aria-describedby={error ? "url-error" : "input-help"} required /><button type="submit" disabled={loading}>{loading ? <><LoaderCircle size={16} className="spin" /><span>Checking</span></> : <><span>Compare prices</span><ArrowRight size={17} /></>}</button></div>{error && <p id="url-error" className="input-error" role="alert"><Info size={14} />{error}</p>}<div className="input-helper" id="input-help"><span><ShieldCheck size={13} />No sign-up. No ads. Just clarity.</span><button type="button" onClick={() => setCoverageOpen(true)}>Supported stores <ArrowUpRight size={12} /></button></div></form></Reveal>
        <Reveal delay={0.25}><div className="hero-trust"><span className="trust-icon"><BadgeCheck size={17} /></span><p><strong>Built to compare. Designed to be fair.</strong><span>Exact variants. Transparent sources. No sponsored rankings.</span></p></div></Reveal>
      </div><Reveal className="hero-visual-wrap" delay={0.15}><HeroPreview /></Reveal><a className="hero-scroll" href="#retailers"><span className="scroll-circle"><ArrowDown size={13} /></span><span>A LITTLE SCROLL. A LOT MORE CLARITY.</span><div /></a></section>
      <section className="retailers-section section-wrap" id="retailers" aria-label="Supported retailer link formats"><div className="retailers-heading"><span className="eyebrow">ONE LINK. A WIDER PERSPECTIVE.</span><button onClick={() => setCoverageOpen(true)}>Explore coverage <ArrowUpRight size={13} /></button></div><div className="retailer-wordmarks">{stores.map(store => <button key={store.id} onClick={() => setCoverageOpen(true)} className={store.className} aria-label={`${store.name} coverage details`}>{store.label}{store.id === "amazon" && <span className="amazon-smile" />}{store.id === "croma" && <span className="croma-dot" />}</button>)}</div><p className="retailer-clarification">Supported product link formats. Verified prices depend on authorized source availability.</p></section>
      {(loading || result) && <ComparisonResults result={result} loading={loading} onReset={() => { document.getElementById("compare")?.scrollIntoView({ behavior: reduced ? "instant" : "smooth", block: "center" }); focusInput(); }} />}
      <section className="how-section section-wrap" id="how-it-works"><Reveal className="section-heading"><div><span className="eyebrow"><span className="tiny-line" />01 / A BETTER WAY TO BUY</span><h2>From endless tabs.<br />To one clear answer.</h2></div><p>You bring the product.<br />We bring the perspective.</p></Reveal><div className="steps-grid">{[{ icon: Link2, title: "Drop the link.", body: "Found something you love? Paste its product link from a supported store.", tag: "START WITH ONE LINK" }, { icon: Fingerprint, title: "Check every detail.", body: "We check the model, variant, and available identifiers. Close enough isn’t enough.", tag: "IDENTITY BEFORE PRICE" }, { icon: ArrowDownUpIcon, title: "Compare with clarity.", body: "See verified totals side by side. Choose the lowest trusted offer among stores checked.", tag: "YOUR CHOICE, INFORMED" }].map((step, index) => <Reveal key={step.title} delay={index * 0.1} className="step-card"><div className="step-card-top"><span className={`step-icon step-icon-${index}`}><step.icon size={22} strokeWidth={1.7} /></span><span className="step-number">0{index + 1}</span></div><h3>{step.title}</h3><p>{step.body}</p><div className="step-tag"><span />{step.tag}</div>{index < 2 && <span className="step-connector"><ArrowRight size={15} /></span>}</Reveal>)}</div></section>
      <section className="difference-section" id="the-difference" ref={storyRef}><motion.div className="story-orbit" style={{ rotate: storyRotate }} aria-hidden="true" /><div className="section-wrap difference-grid"><div className="difference-copy"><Reveal><span className="eyebrow"><span className="tiny-line" />02 / DETAILS MAKE THE DIFFERENCE</span><h2>A lower price.<br /><span>A higher standard.</span></h2><p className="section-description">Comparison is easy. Getting it right is what matters.</p></Reveal><div className="feature-list" role="tablist" aria-label="Comparison standards">{features.map((feature, index) => <button key={feature.title} role="tab" id={`feature-tab-${index}`} aria-selected={activeFeature === index} aria-controls="feature-panel" tabIndex={activeFeature === index ? 0 : -1} onClick={() => setActiveFeature(index)} onKeyDown={event => { if (["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft", "Home", "End"].includes(event.key)) { event.preventDefault(); const next = event.key === "Home" ? 0 : event.key === "End" ? 2 : (activeFeature + (["ArrowDown", "ArrowRight"].includes(event.key) ? 1 : 2)) % 3; setActiveFeature(next); document.getElementById(`feature-tab-${next}`)?.focus(); } }} className={`feature-item ${activeFeature === index ? "feature-active" : ""}`}><span className="feature-symbol"><feature.icon size={20} /></span><span className="feature-text"><strong>{feature.title}</strong><span>{feature.description}</span></span><ChevronDown size={16} className="feature-chevron" /></button>)}</div></div><Reveal className="detail-panel-wrap"><div id="feature-panel" role="tabpanel" aria-labelledby={`feature-tab-${activeFeature}`} tabIndex={0}><DetailPanel active={activeFeature} /></div></Reveal></div></section>
      <section className="principles-section section-wrap"><Reveal className="principles-banner"><div className="principles-emblem"><ShieldCheck size={29} /></div><div><span className="eyebrow">YOUR INTERESTS. NEVER THE HIGHEST BIDDER’S.</span><h3>Better decisions don’t need distractions.</h3></div><div className="principle-chips"><span><Check size={13} />No ads</span><span><Check size={13} />No sponsored spots</span><span><Check size={13} />No fake urgency</span></div></Reveal></section>
      <section className="faq-section section-wrap" id="questions"><Reveal><span className="eyebrow"><span className="tiny-line" />03 / NO GUESSWORK</span><h2>A few good questions.<br />Straight answers.</h2><p className="section-description">Trust starts with knowing how it works.</p><button className="text-button faq-coverage" onClick={() => setCoverageOpen(true)}>See retailer coverage <ArrowUpRight size={16} /></button></Reveal><div className="faq-list">{faqs.map((faq, index) => <div key={faq.question} className={`faq-item ${openFaq === index ? "faq-open" : ""}`}><h3><button id={`faq-button-${index}`} aria-expanded={openFaq === index} aria-controls={`faq-answer-${index}`} onClick={() => setOpenFaq(openFaq === index ? null : index)}>{faq.question}<span>{openFaq === index ? <Minus size={17} /> : <span className="plus-sign">+</span>}</span></button></h3><AnimatePresence initial={false}>{openFaq === index && <motion.div id={`faq-answer-${index}`} role="region" aria-labelledby={`faq-button-${index}`} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}><p>{faq.answer}{index === 1 && coverageStatus === "known" && (configuredStores.length === 0 ? " This installation currently has no retailer price feeds connected." : ` This installation has ${configuredStores.length} authorized retailer source${configuredStores.length === 1 ? "" : "s"} connected.`)}</p></motion.div>}</AnimatePresence></div>)}</div></section>
      <section className="closing-section section-wrap"><Reveal className="closing-inner"><span className="closing-spark"><Sparkles size={21} /></span><span className="eyebrow">YOUR NEXT PURCHASE, WITH PERSPECTIVE.</span><h2>One link away from<br /><span>a smarter choice.</span></h2><MagneticLink href="#compare" className="primary-link" onClick={focusInput}>Let’s compare <ArrowRight size={17} /></MagneticLink><p>Same product. Clearer picture. Your call.</p><div className="closing-ring ring-one" /><div className="closing-ring ring-two" /></Reveal></section>
    </main>
    <footer className="site-footer section-wrap"><div className="footer-top"><div><Brand small /><p>A little more certainty.<br />A lot less tab switching.</p></div><div className="footer-links"><a href="#how-it-works">How it works</a><button onClick={() => setCoverageOpen(true)}>Retailer coverage</button><a href="#questions">Common questions</a></div><a href="#top" className="back-to-top">BACK TO TOP <ArrowUpRight size={15} /></a></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Pricewise. Made for the informed choice.</span><span><span className="purple-dot" />Independent by design.</span></div></footer>
    <dialog ref={dialogRef} className="coverage-dialog" aria-labelledby="coverage-title" onCancel={() => setCoverageOpen(false)} onClose={() => setCoverageOpen(false)} onClick={event => { if (event.target === event.currentTarget) setCoverageOpen(false); }}><div className="coverage-content"><button className="dialog-close" aria-label="Close retailer coverage" onClick={() => setCoverageOpen(false)}><X size={21} /></button><span className="eyebrow"><Globe2 size={14} />COVERAGE, CLEARLY EXPLAINED</span><h2 id="coverage-title">Know what’s checked.</h2><p>These retailers have supported product link formats. A verified price also needs an authorized product source.</p><div className="coverage-store-list">{stores.map(store => <div key={store.id}><span className={`retailer-avatar ${store.id}`}>{store.label[0]}</span><div><strong>{store.name}</strong><span>{store.domains[0]}</span></div><span className={`connection-status ${configuredStores.includes(store.name) ? "connected" : ""}`}>{configuredStores.includes(store.name) ? <CircleCheck size={13} /> : <ClockIcon />} {coverageStatus === "loading" ? "Checking source" : coverageStatus === "unavailable" ? "Status unavailable" : configuredStores.includes(store.name) ? "Source connected" : "Source not connected"}</span></div>)}</div><div className="coverage-note"><ShieldCheck size={18} /><span>No source means no invented price. Coverage describes supported links, not a guarantee of live offers.</span></div><button className="primary-link" onClick={() => setCoverageOpen(false)}>Got it <Check size={16} /></button></div></dialog>
  </div></MotionConfig>;
}

function ArrowDownUpIcon({ size = 22, strokeWidth = 1.7 }: { size?: number; strokeWidth?: number }) { return <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"><path d="M7 4v16m-4-4 4 4 4-4M17 20V4m-4 4 4-4 4 4" /></svg>; }
function ClockIcon() { return <span className="connection-dot" />; }
