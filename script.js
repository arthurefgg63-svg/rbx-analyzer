"use strict";

(() => {
  const themeBtn = document.getElementById("themeBtn");
  const themeBtnText = document.getElementById("themeBtnText");
  const form = document.getElementById("searchForm");
  const input = document.getElementById("usernameInput");
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

  const RE_USERNAME = /^[A-Za-z0-9_]{3,20}$/;
  const CACHE_KEY = "gifthub-cache";
  const THEME_KEY = "gifthub-theme";

  let currentProfile = null;

  function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
    themeBtnText.textContent = theme === "dark" ? "☀️ Tema" : "🌙 Tema";
  }

  function loadTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    setTheme(saved === "dark" ? "dark" : "light");
  }

  function isValidUsername(name) {
    return RE_USERNAME.test(name);
  }

  function normalizeName(value) {
    return String(value || "").trim().replace(/[^A-Za-z0-9_]/g, "");
  }

  function ageYears(dateString) {
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

  function setPanel(tabName) {
    tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === tabName));
    panels.forEach((panel) => panel.classList.toggle("active", panel.id === tabName));
  }

  function saveCache(profile) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(profile));
    } catch {}
  }

  function loadCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function scoreFromAge(created) {
    const years = ageYears(created);
    if (years == null) return 0;
    if (years >= 16) return 95;
    if (years >= 10) return 90;
    if (years >= 5) return 82;
    if (years >= 1) return 70;
    return 58;
  }

  function updateTabs(profile) {
    if (!profile) {
      infoText.textContent = "Pesquise um jogador para ver os detalhes públicos.";
      badgesText.textContent = "Sem dados carregados.";
      descriptionText.textContent = "Sem descrição disponível.";
      followersText.textContent = "Sem dados carregados.";
      friendsText.textContent = "Sem dados carregados.";
      return;
    }

    infoText.textContent = `Usuário público carregado com sucesso. Nome: ${profile.name || "—"} | ID: ${profile.id || "—"}`;
    badgesText.textContent = "Badges públicas não consultadas neste modo estático.";
    descriptionText.textContent = profile.description || "Sem descrição pública.";
    followersText.textContent = "Seguidores não disponíveis sem consultas adicionais.";
    friendsText.textContent = "Amizades não disponíveis sem consultas adicionais.";
  }

  function renderProfile(profile) {
    currentProfile = profile;
    emptyState.classList.add("hidden");
    profileView.classList.remove("hidden");

    displayName.textContent = profile.displayName || profile.name || "Sem nome";
    usernameLine.textContent = `@${profile.name || "username"}`;
    userIdValue.textContent = profile.id ? String(profile.id) : "—";
    createdValue.textContent = profile.created ? formatDate(profile.created) : "—";
    accountAgeValue.textContent = profile.created ? formatAge(profile.created) : "—";
    scoreValue.textContent = String(scoreFromAge(profile.created));
    updateTabs(profile);

    if (profile.avatarUrl) {
      avatarImg.src = profile.avatarUrl;
      avatarImg.alt = `Avatar de ${profile.displayName || profile.name || "usuário"}`;
    } else {
      avatarImg.removeAttribute("src");
      avatarImg.alt = "Avatar indisponível";
    }
  }

  function showEmpty() {
    emptyState.classList.remove("hidden");
    profileView.classList.add("hidden");
    currentProfile = null;
    updateTabs(null);
  }

  async function fetchRobloxProfile(username) {
    const lookupResponse = await fetch("https://users.roblox.com/v1/usernames/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usernames: [username],
        excludeBannedUsers: false
      })
    });

    if (!lookupResponse.ok) {
      throw new Error("Falha ao buscar username.");
    }

    const lookupData = await lookupResponse.json();
    const user = lookupData?.data?.[0];
    if (!user?.id) {
      throw new Error("Usuário não encontrado.");
    }

    const detailResponse = await fetch(`https://users.roblox.com/v1/users/${user.id}`);
    if (!detailResponse.ok) {
      throw new Error("Falha ao buscar detalhes.");
    }

    const details = await detailResponse.json();
    const id = details.id || user.id;

    return {
      id,
      name: details.name || user.name || username,
      displayName: details.displayName || user.displayName || user.name || username,
      created: details.created || "",
      description: details.description || "",
      avatarUrl: `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${encodeURIComponent(id)}&size=420x420&format=Png&isCircular=false`
    };
  }

  async function search(username) {
    const clean = normalizeName(username);

    if (!isValidUsername(clean)) {
      showEmpty();
      alert("Digite um username válido entre 3 e 20 caracteres.");
      return;
    }

    const cached = loadCache();
    if (cached && cached.name === clean) {
      renderProfile(cached);
      return;
    }

    try {
      const profile = await fetchRobloxProfile(clean);
      saveCache(profile);
      renderProfile(profile);
    } catch (error) {
      console.error(error);
      showEmpty();
      alert("Não foi possível carregar os dados públicos neste momento.");
    }
  }

  themeBtn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    setTheme(current === "light" ? "dark" : "light");
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    search(input.value);
  });

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      input.value = chip.dataset.user || "";
      input.focus();
    });
  });

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => setPanel(tab.dataset.tab));
  });

  input.addEventListener("input", () => {
    const clean = normalizeName(input.value);
    if (clean !== input.value) input.value = clean;
  });

  loadTheme();
  showEmpty();
})();
