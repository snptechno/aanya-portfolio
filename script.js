// === THEME (must run first) ===
(function initTheme() {
  const STORAGE_KEY = "aanya-theme";
  const stored = localStorage.getItem(STORAGE_KEY);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = stored === "light" || stored === "dark" ? stored : prefersDark ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", theme);
})();

function getTheme() {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("aanya-theme", theme);
  updateThemeToggleUI();
}

function updateThemeToggleUI() {
  const btn = document.querySelector(".theme-toggle");
  if (!btn) return;
  const isDark = getTheme() === "dark";
  const icon = btn.querySelector(".theme-toggle__icon");
  if (icon) icon.textContent = isDark ? "☀️" : "🌙";
  btn.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
}

document.addEventListener("DOMContentLoaded", () => {
  const themeBtn = document.querySelector(".theme-toggle");
  if (themeBtn) {
    updateThemeToggleUI();
    themeBtn.addEventListener("click", () => {
      setTheme(getTheme() === "dark" ? "light" : "dark");
    });
  }
});

// === SCROLL PROGRESS BAR ===
(function initScrollProgress() {
  const bar = document.createElement("div");
  bar.className = "scroll-progress";
  bar.setAttribute("role", "presentation");
  bar.setAttribute("aria-hidden", "true");
  document.body.prepend(bar);

  let ticking = false;

  function updateProgress() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const progress = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0;
    bar.style.width = progress + "%";
    ticking = false;
  }

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        requestAnimationFrame(updateProgress);
        ticking = true;
      }
    },
    { passive: true }
  );
  updateProgress();
})();

// === REVEAL ON SCROLL ===
(function initReveal() {
  const revealEls = document.querySelectorAll(".reveal");
  if (!revealEls.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );

  revealEls.forEach((el) => observer.observe(el));
})();

// === NAV SHRINK ON SCROLL ===
(function initNavScroll() {
  const nav = document.querySelector(".site-nav");
  if (!nav) return;

  function onScroll() {
    nav.classList.toggle("is-scrolled", window.scrollY > 8);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();

// === ABOUT STATS COUNTERS ===
(function initStatsCounters() {
  const strip = document.querySelector(".about-stats");
  if (!strip) return;

  const numbers = strip.querySelectorAll(".about-stats__number[data-count]");

  function animateCounter(el) {
    const target = parseInt(el.getAttribute("data-count"), 10);
    const suffix = el.getAttribute("data-suffix") || "";
    const duration = 1400;
    const start = performance.now();

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(target * eased);
      el.textContent = value + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          numbers.forEach(animateCounter);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.35 }
  );

  observer.observe(strip);
})();

// === PAGE-LOAD SPLASH ===
(function initSplash() {
  const splash = document.createElement("div");
  splash.className = "page-splash";
  splash.setAttribute("aria-hidden", "true");
  splash.innerHTML = '<p class="page-splash__brand">Aanya Sharma</p>';
  document.body.appendChild(splash);

  requestAnimationFrame(() => {
    splash.classList.add("is-active");
  });

  setTimeout(() => {
    splash.classList.add("is-done");
    splash.addEventListener(
      "transitionend",
      () => splash.remove(),
      { once: true }
    );
    setTimeout(() => splash.remove(), 400);
  }, 900);
})();

console.log("Portfolio loaded ✅");

const contactForm = document.getElementById("contact-form");
const contactSuccess = document.getElementById("contact-success");
const contactError = document.getElementById("contact-error");

if (contactForm && contactSuccess) {
  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!contactForm.checkValidity()) {
      contactForm.reportValidity();
      return;
    }

    // Hide any previous error before we try again.
    if (contactError) {
      contactError.hidden = true;
    }

    // Stop early if Supabase did not connect (wrong page or missing scripts).
    if (!supabaseClient) {
      console.error("supabaseClient is missing. Open contact.html and check script order.");
      if (contactError) {
        contactError.hidden = false;
      }
      contactSuccess.hidden = true;
      return;
    }

    // Read the four values from the form (names match our Supabase columns).
    const full_name = contactForm.fullName.value.trim();
    const email = contactForm.email.value.trim();
    const subject = contactForm.subject.value;
    const message = contactForm.message.value.trim();

    // Send one new row to the "form" table in Supabase.
    let response;
    try {
      response = await supabaseClient
        .from("form")
        .insert([{ full_name, email, subject, message }]);
    } catch (networkError) {
      console.error("Network error talking to Supabase:", networkError);
      if (contactError) {
        contactError.hidden = false;
      }
      contactSuccess.hidden = true;
      return;
    }

    // Log the full response so we can debug in the browser console.
    console.log(response);

    // If Supabase returned an error, keep the form visible and show the red message.
    if (response.error) {
      console.error("Supabase insert failed:", response.error);

      // A 401 with this text means the anon KEY is fine — RLS blocked the insert.
      if (
        response.error.message &&
        response.error.message.includes("row-level security")
      ) {
        console.error(
          "Fix: open Supabase → SQL Editor, run the file supabase-policies.sql in this project."
        );
      }

      if (contactError) {
        contactError.hidden = false;
      }
      contactSuccess.hidden = true;
      return;
    }

    // Success: hide the form, show the green thank-you message, clear the fields.
    contactForm.reset();
    contactForm.hidden = true;
    contactSuccess.hidden = false;
  });
}

const siteNav = document.querySelector(".site-nav");
const navToggle = document.querySelector(".site-nav__toggle");
const navMenu = document.getElementById("site-nav-menu");

if (siteNav && navToggle && navMenu) {
  navToggle.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
    navToggle.setAttribute(
      "aria-label",
      isOpen ? "Close navigation menu" : "Open navigation menu"
    );
  });

  navMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      siteNav.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
      navToggle.setAttribute("aria-label", "Open navigation menu");
    });
  });
}

// === ADMIN INBOX (runs only on admin.html) ===
document.addEventListener("DOMContentLoaded", () => {
  // Only run this code on pages that have the inbox grid.
  const inboxGrid = document.getElementById("admin-inbox-grid");
  if (!inboxGrid) return;

  // Grab the toolbar UI elements we need for count + filtering.
  const totalCountEl = document.getElementById("admin-total-count");
  const unreadOnlyToggle = document.getElementById("admin-unread-only");

  // Tiny helper: turn a timestamp into "just now", "5 minutes ago", etc.
  function timeAgo(dateInput) {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    const now = new Date();

    // If the date is invalid, fall back to an empty string.
    if (Number.isNaN(date.getTime())) return "";

    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    // If the timestamp is in the future (clock skew), show the absolute date.
    if (diffSeconds < 0) {
      return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    }

    if (diffSeconds < 15) return "just now";
    if (diffMinutes < 1) return `${diffSeconds} seconds ago`;
    if (diffMinutes === 1) return "1 minute ago";
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    if (diffHours === 1) return "1 hour ago";
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return "1 day ago";
    if (diffDays < 14) return `${diffDays} days ago`;

    // After ~2 weeks, show an absolute date like "21 May 2026".
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }

  // Render one message row as a card element.
  function renderMessageCard(row) {
    const card = document.createElement("article");
    card.className = "admin-card" + (row.is_read ? " is-read" : "");
    card.dataset.messageId = row.id;

    const subject = row.subject ? String(row.subject) : "(No subject)";
    const fullName = row.full_name ? String(row.full_name) : "Unknown";
    const email = row.email ? String(row.email) : "No email";
    const messageText = row.message ? String(row.message) : "";
    const createdAtLabel = row.created_at ? timeAgo(row.created_at) : "";

    // Build the card markup.
    const top = document.createElement("div");
    top.className = "admin-card__top";

    const h3 = document.createElement("h3");
    h3.className = "admin-card__subject";
    h3.textContent = subject;

    const time = document.createElement("span");
    time.className = "admin-card__time";
    time.textContent = createdAtLabel;

    top.appendChild(h3);
    top.appendChild(time);

    const sender = document.createElement("p");
    sender.className = "admin-card__sender";
    sender.textContent = `${fullName} · ${email}`;

    const body = document.createElement("p");
    body.className = "admin-card__body";
    body.textContent = messageText;

    const actions = document.createElement("div");
    actions.className = "admin-card__actions";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "admin-card__btn";
    btn.textContent = row.is_read ? "Read" : "Mark as Read";
    btn.disabled = Boolean(row.is_read);

    // When the admin clicks "Mark as Read", update that one row in Supabase.
    btn.addEventListener("click", async () => {
      // Ignore clicks if it's already read or we don't have a Supabase connection.
      if (card.classList.contains("is-read")) return;
      if (!supabaseClient) {
        console.error("supabaseClient is missing. Check script order on admin.html.");
        return;
      }

      // Lock the button while the network request is in-flight.
      btn.disabled = true;
      btn.textContent = "Saving...";

      let response;
      try {
        response = await supabaseClient
          .from("form")
          .update({ is_read: true })
          .eq("id", row.id);
      } catch (networkError) {
        console.error("Network error updating Supabase:", networkError);
        btn.disabled = false;
        btn.textContent = "Mark as Read";
        return;
      }

      // If Supabase returns an error, keep the card unread and re-enable the button.
      if (response.error) {
        console.error("Supabase update failed:", response.error);
        btn.disabled = false;
        btn.textContent = "Mark as Read";
        return;
      }

      // Success: update ONLY this card's visual state (no re-fetch).
      card.classList.add("is-read");
      btn.textContent = "Read";
      btn.disabled = true;
    });

    actions.appendChild(btn);

    card.appendChild(top);
    card.appendChild(sender);
    card.appendChild(body);
    card.appendChild(actions);

    return card;
  }

  // Fetch all messages from Supabase and render them newest-first.
  async function loadInbox() {
    // If Supabase isn't connected, show a useful message in the UI.
    if (!supabaseClient) {
      inboxGrid.innerHTML = "";
      const empty = document.createElement("p");
      empty.className = "admin-empty";
      empty.textContent = "Supabase is not connected. Check the Supabase CDN + script order on this page.";
      inboxGrid.appendChild(empty);
      return;
    }

    // Fetch from the "form" table, ordered newest first.
    let response;
    try {
      response = await supabaseClient
        .from("form")
        .select("*")
        .order("created_at", { ascending: false });
    } catch (networkError) {
      console.error("Network error fetching inbox:", networkError);
      inboxGrid.innerHTML = "";
      const empty = document.createElement("p");
      empty.className = "admin-empty";
      empty.textContent = "Could not load messages. Please try again.";
      inboxGrid.appendChild(empty);
      return;
    }

    if (response.error) {
      console.error("Supabase select failed:", response.error);
      inboxGrid.innerHTML = "";
      const empty = document.createElement("p");
      empty.className = "admin-empty";
      empty.textContent = "Could not load messages. Check your Supabase table + RLS policies.";
      inboxGrid.appendChild(empty);
      return;
    }

    const rows = Array.isArray(response.data) ? response.data : [];

    // Update the total message counter on the left.
    if (totalCountEl) {
      totalCountEl.textContent = `📬 ${rows.length} message${rows.length === 1 ? "" : "s"}`;
    }

    // Render cards.
    inboxGrid.innerHTML = "";
    if (!rows.length) {
      const empty = document.createElement("p");
      empty.className = "admin-empty";
      empty.textContent = "No messages yet.";
      inboxGrid.appendChild(empty);
      return;
    }

    const frag = document.createDocumentFragment();
    rows.forEach((row) => {
      frag.appendChild(renderMessageCard(row));
    });
    inboxGrid.appendChild(frag);
  }

  // When the "Unread only" toggle changes, hide read cards using CSS only.
  if (unreadOnlyToggle) {
    unreadOnlyToggle.addEventListener("change", () => {
      inboxGrid.classList.toggle("show-unread-only", unreadOnlyToggle.checked);
    });
  }

  // Initial load on admin.html.
  loadInbox();
});
