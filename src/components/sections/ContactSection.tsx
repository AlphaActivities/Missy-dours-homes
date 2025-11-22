import { useState, useEffect } from "react";
import { LuxFadeIn } from "../ui/LuxFadeIn";

export default function ContactSection() {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const encode = (data: FormData) =>
    new URLSearchParams(data as any).toString();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      formData.set("form-name", "contact");

      const response = await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: encode(formData),
      });

      if (response.ok) {
        setSubmitted(true);
        e.currentTarget.reset();
      } else {
        setError("Something went wrong. Please try again.");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!submitted) return;
    const timer = setTimeout(() => {
      setSubmitted(false);
      setError(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [submitted]);

  return (
    <section
      id="contact"
      className="relative bg-transparent text-white py-24 md:py-32 lg:py-40"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-16">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-14 lg:gap-20">

          {/* LEFT – COPY / DETAILS */}
          <LuxFadeIn delay={0.05}>
            <div className="space-y-8">
              <div className="space-y-4">
                <p className="text-xs md:text-sm tracking-[0.25em] uppercase text-neutral-200">
                  Private Consultation
                </p>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight">
                  Begin a{" "}
                  <span className="text-[#F5E6C8]">confidential conversation</span>
                </h2>
                <p className="max-w-xl text-sm md:text-base text-neutral-200/90">
                  Share a few details about your goals and timeline. Whether
                  you are exploring a sale, a discreet purchase, or simply
                  evaluating options, Missy will respond personally.
                </p>
              </div>

              <div className="space-y-3 text-sm md:text-base text-neutral-100">
                <div>
                  <p className="text-neutral-300 text-xs uppercase tracking-[0.22em] mb-1">
                    Direct Contact
                  </p>
                  <p>Dallas · Fort Worth · North Texas</p>
                  <p className="mt-1">Phone: 214-861-0665</p>
                  <p>Email: missydourshomes@gmail.com</p>
                </div>

                <div className="pt-3 border-t border-white/10 max-w-md text-xs md:text-[13px] text-neutral-300/90">
                  Your information is handled with discretion and will never be
                  shared or used for unsolicited marketing.
                </div>

                <div className="pt-4">
                  <p className="text-neutral-300 text-xs uppercase tracking-[0.22em] mb-2">
                    Service Area
                  </p>
                  <a
                    href="https://www.google.com/maps/place/Dallas,+TX"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-2xl overflow-hidden border border-white/20 shadow-lg hover:border-white/40 transition-colors cursor-pointer"
                  >
                    <img
                      src="/images/google-maps.photo/Service-areas.png"
                      alt="Service Areas Map"
                      className="w-full h-auto object-cover"
                    />
                  </a>
                </div>
              </div>
            </div>
          </LuxFadeIn>

          {/* RIGHT – LUXURY FORM CARD */}
          <LuxFadeIn delay={0.12}>
            <div className="relative">
              <div className="absolute inset-0 rounded-3xl bg-[#8B6F47]/40 blur-[80px] pointer-events-none" />
              <div className="relative rounded-3xl bg-gradient-to-br from-[#8B6F47]/95 via-[#7A5F3C]/95 to-[#6B5335]/95 border border-[#c29f63]/40 backdrop-blur-[40px] shadow-[0_24px_60px_rgba(0,0,0,0.85)] px-6 py-7 md:px-8 md:py-9 lg:px-10 lg:py-10">
                <h3 className="text-lg md:text-xl font-medium mb-2">
                  Reach out with a Message
                </h3>
                <p className="text-xs md:text-sm text-neutral-200/90 mb-6">
                  A few key details help tailor the conversation to your
                  property, budget, and desired timing.
                </p>

                <form
                  name="contact"
                  method="POST"
                  data-netlify="true"
                  onSubmit={handleSubmit}
                  className="space-y-5"
                >
                  <input type="hidden" name="form-name" value="contact" />
                  <div className="space-y-2">
                    <label
                      htmlFor="contact-name"
                      className="text-xs md:text-sm font-medium tracking-wide text-neutral-100"
                    >
                      Name
                    </label>
                    <input
                      id="contact-name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      placeholder="First and last name"
                      className="w-full rounded-xl bg-white/5 border border-white/18 px-4 py-3.5 text-sm md:text-[15px] text-neutral-50 placeholder:text-neutral-300/60 focus:outline-none focus:ring-2 focus:ring-[#F5E6C8] focus:border-transparent transition"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="contact-email"
                      className="text-xs md:text-sm font-medium tracking-wide text-neutral-100"
                    >
                      Email
                    </label>
                    <input
                      id="contact-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="Preferred email for follow-up"
                      className="w-full rounded-xl bg-white/5 border border-white/18 px-4 py-3.5 text-sm md:text-[15px] text-neutral-50 placeholder:text-neutral-300/60 focus:outline-none focus:ring-2 focus:ring-[#F5E6C8] focus:border-transparent transition"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="contact-phone"
                      className="text-xs md:text-sm font-medium tracking-wide text-neutral-100"
                    >
                      Phone (optional)
                    </label>
                    <input
                      id="contact-phone"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      placeholder="Best number for a brief call"
                      className="w-full rounded-xl bg-white/5 border border-white/18 px-4 py-3.5 text-sm md:text-[15px] text-neutral-50 placeholder:text-neutral-300/60 focus:outline-none focus:ring-2 focus:ring-[#F5E6C8] focus:border-transparent transition"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="contact-message"
                      className="text-xs md:text-sm font-medium tracking-wide text-neutral-100"
                    >
                      How can Missy help?
                    </label>
                    <textarea
                      id="contact-message"
                      name="message"
                      rows={4}
                      placeholder="Share a quick overview of your property, price range, and ideal timeframe."
                      className="w-full rounded-xl bg-white/5 border border-white/18 px-4 py-3.5 text-sm md:text-[15px] text-neutral-50 placeholder:text-neutral-300/60 focus:outline-none focus:ring-2 focus:ring-[#F5E6C8] focus:border-transparent transition resize-none"
                    />
                  </div>

                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#F5E6C8] via-[#F2D9A3] to-[#E9C88A] px-6 py-3.5 text-sm md:text-[15px] font-semibold text-black shadow-[0_14px_35px_rgba(0,0,0,0.65)] hover:brightness-110 active:translate-y-px transition-transform transition-[filter] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? "Sending..." : "Send Message Now"}
                    </button>
                  </div>
                </form>

                {submitted && (
                  <div className="mt-4 rounded-xl bg-green-600/20 border border-green-500/50 px-4 py-3.5 text-sm text-green-100 backdrop-blur-sm">
                    Your message has been sent successfully. We'll be in touch soon.
                  </div>
                )}

                {error && (
                  <div className="mt-4 rounded-xl bg-red-600/20 border border-red-500/50 px-4 py-3.5 text-sm text-red-100 backdrop-blur-sm">
                    {error}
                  </div>
                )}
              </div>
            </div>
          </LuxFadeIn>
        </div>
      </div>
    </section>
  );
}
