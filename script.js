(function () {
  "use strict";

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  // 현재 연도
  const yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // 스크롤 시 네비 배경 처리
  const nav = document.getElementById("nav");
  const onScroll = () => {
    if (!nav) return;
    nav.classList.toggle("is-scrolled", window.scrollY > 8);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // 모바일 메뉴 토글
  const toggle = document.getElementById("navToggle");
  const mobileMenu = document.getElementById("mobileMenu");
  if (toggle && mobileMenu && nav) {
    const setOpen = (open) => {
      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
      mobileMenu.hidden = !open;
    };

    toggle.addEventListener("click", () => {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });

    mobileMenu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setOpen(false));
    });
  }

  // 수치 카운트업
  const counters = document.querySelectorAll(".stat__value[data-count]");
  const runCount = (el) => {
    const target = parseInt(el.getAttribute("data-count"), 10) || 0;
    if (prefersReducedMotion) {
      el.textContent = String(target);
      return;
    }
    const duration = 1100;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = String(target);
    };
    requestAnimationFrame(tick);
  };
  if (counters.length) {
    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      counters.forEach(runCount);
    } else {
      const countObserver = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              runCount(entry.target);
              obs.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.6 }
      );
      counters.forEach((el) => countObserver.observe(el));
    }
  }

  // 커리어 여정 타임라인: 진행 라인 + 현재 단계 강조
  const journey = document.querySelector(".journey");
  if (journey) {
    const items = Array.from(journey.querySelectorAll(".journey__item"));
    const updateJourney = () => {
      const rect = journey.getBoundingClientRect();
      const viewMid = window.innerHeight * 0.5;
      const total = rect.height || 1;
      const raw = (viewMid - rect.top) / total;
      const progress = Math.max(0, Math.min(1, raw));
      journey.style.setProperty("--journey-progress", String(progress));

      let currentIndex = 0;
      items.forEach((item, i) => {
        const r = item.getBoundingClientRect();
        if (r.top <= viewMid) currentIndex = i;
      });
      items.forEach((item, i) =>
        item.classList.toggle("is-current", i === currentIndex)
      );
    };
    if (prefersReducedMotion) {
      journey.style.setProperty("--journey-progress", "1");
      items.forEach((item) => item.classList.add("is-current"));
    } else {
      updateJourney();
      window.addEventListener("scroll", updateJourney, { passive: true });
      window.addEventListener("resize", updateJourney, { passive: true });
    }
  }

  // 스크롤 리빌
  const revealEls = document.querySelectorAll(".reveal");
  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  } else {
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            // 같은 그룹은 약간의 스태거
            const delay = Math.min(i * 70, 280);
            window.setTimeout(() => {
              entry.target.classList.add("is-visible");
            }, delay);
            obs.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 }
    );
    revealEls.forEach((el) => observer.observe(el));
  }
})();
