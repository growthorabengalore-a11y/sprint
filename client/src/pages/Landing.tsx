import { Link } from "react-router-dom";
import type { IconType } from "react-icons";
import {
  FiSun,
  FiMoon,
  FiUserCheck,
  FiBarChart2,
  FiDownload,
  FiLogIn,
  FiArrowRight,
  FiCheckCircle,
  FiGlobe,
  FiMail,
  FiLayers,
} from "react-icons/fi";
import { FaTrophy } from "react-icons/fa";

const LOGO = "/assets/images/logo.jpeg";

const features: { icon: IconType; title: string; text: string }[] = [
  {
    icon: FiSun,
    title: "Morning & Evening Scrum",
    text: "Every employee posts a quick plan in the morning and a wrap-up in the evening. No more chasing updates on WhatsApp.",
  },
  {
    icon: FiUserCheck,
    title: "Face Attendance",
    text: "Check in and out with a simple face scan. Fast, contactless and accurate, with no proxy attendance.",
  },
  {
    icon: FiBarChart2,
    title: "Admin Dashboard",
    text: "See who is present, who has updated and what is pending, all in one clean live view.",
  },
  {
    icon: FiDownload,
    title: "One-Tap PNG Reports",
    text: "Download daily sprint and attendance reports as images, ready to share with the team.",
  },
];

const steps = [
  { n: "1", title: "Check in", text: "Scan your face when you reach the office." },
  { n: "2", title: "Post your sprint", text: "Add today's plan in the morning scrum." },
  { n: "3", title: "Wrap up", text: "Share your progress in the evening scrum." },
];

export default function Landing() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-b from-[#fff5f4] via-[#fff9f8] to-white font-sans text-[#2a0a22]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[#f3d9d6] bg-[#fff5f4]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="h-11 w-11 shrink-0 border border-[#f0cfcb] bg-white p-1">
              <img
                src={LOGO}
                alt="Growthora logo"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="leading-tight">
              <p className="text-base font-extrabold tracking-wide text-[#5a0042]">GROWTHORA</p>
              <p className="text-[11px] font-medium text-[#d9573a]">Sprint &amp; Attendance</p>
            </div>
          </div>

          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#5a0042] px-5 py-2 text-sm font-semibold text-white shadow-md shadow-[#5a0042]/20 transition hover:bg-[#4a0036] active:scale-95"
          >
            <FiLogIn className="h-4 w-4" />
            Login
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-6 md:pt-14">
        <div className="pointer-events-none absolute -right-20 -top-10 h-64 w-64 rounded-full bg-[#d9573a]/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 top-40 h-64 w-64 rounded-full bg-[#5a0042]/10 blur-3xl" />

        <div className="relative grid items-center gap-10 md:grid-cols-2">
          <div className="text-center md:text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f0cfcb] bg-white px-3 py-1 text-xs font-semibold text-[#d9573a]">
              <FaTrophy className="h-3 w-3" />
              Bangalore Champions
            </span>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight text-[#5a0042] sm:text-4xl lg:text-5xl">
              Daily Sprint Updates &amp; Smart Attendance,{" "}
              <span className="text-[#d9573a]">in one place</span>
            </h1>
            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-[#5b3a52] sm:text-base md:mx-0">
              Run your team's morning and evening scrum, mark face attendance and track everyone's progress with a simple, fast and mobile-friendly system.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center md:justify-start">
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#5a0042] to-[#8a1a50] px-8 py-3 text-sm font-bold text-white shadow-lg shadow-[#5a0042]/25 transition hover:opacity-95 active:scale-95"
              >
                Login to Dashboard
                <FiArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#d9573a] bg-white px-8 py-3 text-sm font-bold text-[#d9573a] transition hover:bg-[#fff0ec] active:scale-95"
              >
                <FiLayers className="h-4 w-4" />
                See Features
              </a>
            </div>
          </div>

          {/* Logo + preview card */}
          <div className="relative mx-auto w-full max-w-sm">
            <div className="rounded-3xl border border-[#f3d9d6] bg-white p-4 shadow-xl shadow-[#5a0042]/10">
              <div className="mx-auto flex h-48 w-48 items-center justify-center border border-[#f3d9d6] bg-white p-3 sm:h-56 sm:w-56">
                <img
                  src={LOGO}
                  alt="Growthora Advisory Private Limited"
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="mt-2 space-y-2.5">
                <div className="flex items-center justify-between rounded-xl bg-[#fff5f4] px-3 py-2.5">
                  <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#5a0042]">
                    <FiCheckCircle className="h-4 w-4 text-[#d9573a]" />
                    Present Today
                  </span>
                  <span className="text-sm font-extrabold text-[#d9573a]">42 / 45</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-[#fff5f4] px-3 py-2.5">
                  <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#5a0042]">
                    <FiSun className="h-4 w-4 text-[#d9573a]" />
                    Morning Scrum
                  </span>
                  <span className="text-sm font-extrabold text-[#d9573a]">Submitted</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-[#fff5f4] px-3 py-2.5">
                  <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#5a0042]">
                    <FiMoon className="h-4 w-4 text-[#5a0042]" />
                    Evening Scrum
                  </span>
                  <span className="text-sm font-extrabold text-[#5a0042]">Pending</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="text-center">
          <h2 className="text-2xl font-extrabold text-[#5a0042] sm:text-3xl">Everything your team needs</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[#5b3a52]">
            Simple tools that make daily updates and attendance effortless.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="rounded-2xl border border-[#f3d9d6] bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg hover:shadow-[#5a0042]/10"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#fff0ec] to-[#fde3df] text-[#d9573a]">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-3 text-base font-bold text-[#5a0042]">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#5b3a52]">{f.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="rounded-3xl bg-gradient-to-br from-[#5a0042] to-[#7d1250] px-5 py-9 text-white sm:px-10">
          <h2 className="text-center text-2xl font-extrabold sm:text-3xl">How it works</h2>
          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="rounded-2xl bg-white/10 p-5 text-center backdrop-blur">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#d9573a] text-lg font-extrabold">
                  {s.n}
                </div>
                <h3 className="mt-3 font-bold">{s.title}</h3>
                <p className="mt-1 text-sm text-white/80">{s.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-7 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3 text-sm font-bold text-[#5a0042] transition hover:bg-[#fff0ec] active:scale-95"
            >
              <FiLogIn className="h-4 w-4" />
              Login Now
            </Link>
          </div>
        </div>
      </section>

      {/* Bangalore Champions */}
      <section className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
        <div className="rounded-3xl border border-[#f3d9d6] bg-white px-5 py-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#fff0ec] to-[#fde3df] text-[#d9573a]">
            <FaTrophy className="h-7 w-7" />
          </div>
          <h2 className="mt-3 text-xl font-extrabold text-[#5a0042] sm:text-2xl">Bangalore Champions</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[#5b3a52]">
            Built for the Growthora Bangalore team: consistent, accountable and always growing.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#f3d9d6] bg-[#fff5f4]">
        <div className="mx-auto max-w-6xl px-4 py-8 text-center sm:px-6">
          <p className="text-sm font-bold text-[#5a0042]">
            Powered by <span className="text-[#d9573a]">Growthora</span>
          </p>
          <div className="mt-3 flex flex-col items-center justify-center gap-2 text-sm text-[#5b3a52] sm:flex-row sm:gap-6">
            <a
              href="https://www.growthora.co.in"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 font-medium hover:text-[#d9573a]"
            >
              <FiGlobe className="h-4 w-4 text-[#d9573a]" />
              www.growthora.co.in
            </a>
            <a
              href="mailto:info@growthora.co.in"
              className="inline-flex items-center gap-2 font-medium hover:text-[#d9573a]"
            >
              <FiMail className="h-4 w-4 text-[#d9573a]" />
              info@growthora.co.in
            </a>
          </div>
          <p className="mt-4 text-xs text-[#8a6a82]">
            © {new Date().getFullYear()} Growthora Advisory Private Limited. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}