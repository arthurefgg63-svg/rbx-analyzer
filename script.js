"use strict";

(() => {
  const themeBtn = document.getElementById("themeBtn");
  const themeBtnText = document.getElementById("themeBtnText");
  const form = document.getElementById("searchForm");
  const input = document.getElementById("usernameInput");
  const searchBtn = document.getElementById("searchBtn");
  const emptyState = document.getElementById("emptyState");
  const profileView = document.getElementById("profileView");
  const avatarImg = document.getElementById("avatarImg");
  const displayName = document.getElementById("displayName");
  const usernameLine = document.getElementById("usernameLine");
  const userIdValue = document.getElementById("userIdValue");
  const createdValue = document.getElementById("createdValue");
  const accountAgeValue = document.getElementById("accountAgeValue");
  const scoreValue = document.getElementById("scoreValue");
  const infoText = document.getElementById("infoText");
  const badgesText = document.getElementById("badgesText");
  const descriptionText = document.getElementById("descriptionText");
  const followersText = document.getElementById("followersText");
  const friendsText = document.getElementById("friendsText");
  const tabs = document.querySelectorAll(".tab");
  const panels = document.querySelectorAll(".tab-panel");
  const chips = document.querySelectorAll(".chip");
  const cornerBadge = document.getElementById("cornerBadge");
  const cornerLogo = document.getElementById("cornerLogo");
  const cornerTitle = document.getElementById("cornerTitle");
  const cornerSub = document.getElementById("cornerSub");

  const RE_USERNAME = /^[A-Za-z0-9_]{3,20}$/;
  const CACHE_KEY = "gifthub-cache";
  const THEME_KEY = "gifthub-theme";
  const CACHE_TTL = 5 * 60 * 1000;

  let currentProfile = null;

  function normalizeUsername(value) {
    return String(value || "").trim().replace(/[^A-Za-z0-9_]/g, "");
  }

  function isValidUsername(value) {
    return RE_USERNAME.test(value);
  }

  function setText(el, value) {
    if (el) el.textContent = String(value ?? "");
  }

  function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
    setText(themeBtnText, theme === "dark" ? "☀️ Tema" : "🌙 Tema");
  }

  function loadTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    setTheme(saved === "dark" ? "dark" : "light");
  }

  function setBusy(isBusy) {
    if (searchBtn) searchBtn.disabled = isBusy;
    if (input) input.disabled = isBusy;
    if (searchBtn) searchBtn.textContent = isBusy ? "Pesquisando..." : "Pesquisar 🔍";
  }

  function showEmpty() {
    emptyState.classList.remove("hidden");
    profileView.classList.add("hidden");
    currentProfile = null;
    updateTabs(null);
    cornerBadge.classList.add("is-hidden");
  }

  function showProfile() {
    emptyState.classList.add("hidden");
    profileView.classList.remove("hidden");
  }

  function safeAgeYears(dateString) {
    const created = new Date(dateString);
    if (Number.isNaN(created.getTime())) return null;
    return (Date.now() - created.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    }).format(date);
  }

  function formatAge(dateString) {
    const created = new Date(dateString);
    if (Number.isNaN(created.getTime())) return "—";

    const days = Math.max(0, Math.floor((Date.now() - created.getTime()) / 86400000));

    if (days >= 365) {
      const years = Math.floor(days / 365);
      const months = Math.floor((days % 365) / 30);
      return months > 0 ? `${years} ano(s) e ${months} mês(es)` : `${years} ano(s)`;
    }

    if (days >= 30) {
      return `${Math.floor(days / 30)} mês(es)`;
    }

    return `${days} dia(s)`;
  }

  function getLogoByAge(dateString) {
    const years = safeAgeYears(dateString);

    if (years == null) {
      return {
        src: "logo-kids.jpg",
        title: "Aguardando conta",
        subtitle: "A logo muda conforme o tempo da conta"
      };
    }

    if (years < 9) {
      return {
        src: "logo-kids.jpg",
        title: "Roblox Kids",
        subtitle: "Conta com menos de 9 anos"
      };
    }

    if (years < 16) {
      return {
        src: "logo-select.jpg",
        title: "Roblox Select",
        subtitle: "Conta entre 9 e 15 anos"
      };
    }

    return {
      src: "logo-blue.jpg",
      title: "Roblox Classic",
      subtitle: "Conta com 16 anos ou mais"
    };
  }

  function saveCache(profile) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        savedAt: Date.now(),
        payload: profile
      }));
    } catch {}
  }

  function loadCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      if (!parsed?.savedAt || !parsed?.payload) return null;

      if (Date.now() - parsed.savedAt > CACHE_TTL) {
        localStorage.remove
