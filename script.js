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

  const openProfileBtn = document.getElementById("openProfileBtn");
  const copyBtn = document.getElementById("copyBtn");

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

  function showElement(el) {
    if (el) el.classList.remove("hidden");
  }

  function hideElement(el) {
    if (el) el.classList.add("hidden");
  }

  function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {}
    setText(themeBtnText, theme === "dark" ? "☀️ Tema" : "🌙 Tema");
  }

  function loadTheme() {
    let saved = "light";
    try {
      saved = localStorage.getItem(THEME_KEY) || "light";
    } catch {}
    setTheme(saved === "dark" ? "dark" : "light");
  }

  function setBusy(isBusy) {
    if (searchBtn) searchBtn.disabled = isBusy;
    if (input) input.disabled = isBusy;
    if (searchBtn) searchBtn.textContent = isBusy ? "Pesquisando..." : "Pesquisar 🔍";
  }

  function safeAgeYears(dateString) {
    if (!dateString) return null;
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
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          savedAt: Date.now(),
          payload: profile
        })
      );
    } catch {}
  }

  function loadCache(username) {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      if (!parsed?.savedAt || !parsed?.payload) return null;
      if (Date.now() - parsed.savedAt > CACHE_TTL) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }

      const cached = parsed.payload;
      if (cached?.name && cached.name.toLowerCase() === username.toLowerCase()) {
        return cached;
      }

      return null;
    } catch {
      return null;
    }
  }

  function clearTabsContent() {
    setText(infoText, "Pesquise um jogador para ver os detalhes públicos.");
    setText(badgesText, "Sem dados carregados.");
    setText(descriptionText, "Sem descrição disponível.");
    setText(followersText, "Sem dados carregados.");
    setText(friendsText, "Sem dados carregados.");
  }

  function updateTabs(profile) {
    if (!profile) {
      clearTabsContent();
      return;
    }

    setText(
      infoText,
      `Usuário público carregado com sucesso. Nome: ${profile.name || "—"} | ID: ${profile.id || "—"}`
    );
    setText(
      badgesText,
      "Badges públicas não disponíveis neste modo sem proxy."
    );
    setText(
      descriptionText,
      profile.description || "Sem descrição pública."
    );
    setText(
      followersText,
      "Seguidores não disponíveis sem proxy."
    );
    setText(
      friendsText,
      "Amizades não disponíveis sem proxy."
    );
  }

  function updateCorner(profile) {
    const logo = getLogoByAge(profile?.created);

    if (cornerLogo) {
      cornerLogo.src = logo.src;
      cornerLogo.alt = logo.title;
      cornerLogo.loading = "eager";
      cornerLogo.decoding = "async";
    }

    setText(cornerTitle, logo.title);
    setText(cornerSub, logo.subtitle);
    showElement(cornerBadge);
  }

  function scoreFromAge(dateString) {
    const years = safeAgeYears(dateString);
    if (years == null) return 0;
    if (years >= 16) return 96;
    if (years >= 10) return 90;
    if (years >= 5) return 82;
    if (years >= 1) return 72;
    return 58;
  }

  function renderProfile(profile) {
    currentProfile = profile;
    showElement(profileView);
    hideElement(emptyState);

    setText(displayName, profile.displayName || profile.name || "Sem nome");
    setText(usernameLine, `@${profile.name || "username"}`);
    setText(userIdValue, profile.id ? String(profile.id) : "—");
    setText(createdValue, profile.created ? formatDate(profile.created) : "—");
    setText(accountAgeValue, profile.created ? formatAge(profile.created) : "—");
    setText(scoreValue, String(profile.score ?? scoreFromAge(profile.created)));

    if (avatarImg) {
      if (profile.avatarUrl) {
        avatarImg.src = profile.avatarUrl;
        avatarImg.alt = `Avatar de ${profile.displayName || profile.name || "usuário"}`;
      } else {
        avatarImg.removeAttribute("src");
        avatarImg.alt = "Avatar indisponível";
      }
      avatarImg.loading = "lazy";
      avatarImg.decoding = "async";
      avatarImg.referrerPolicy = "no-referrer";
    }

    if (openProfileBtn) {
      if (profile.openUrl) {
        openProfileBtn.href = profile.openUrl;
        openProfileBtn.style.pointerEvents = "auto";
        openProfileBtn.style.opacity = "1";
      } else {
        openProfileBtn.href = "#";
        openProfileBtn.style.pointerEvents = "none";
        openProfileBtn.style.opacity = "0.6";
      }
    }

    updateTabs(profile);
    updateCorner(profile);
  }

  function fallbackProfile(username) {
    return {
      id: "—",
      name: username,
      displayName: username,
      created: "",
      description: "",
      avatarUrl: "",
      openUrl: "",
      score: 0
    };
  }

  function showFriendlyError(message, username) {
    const profile = fallbackProfile(username);
    renderProfile(profile);
    setText(infoText, message);
    setText(badgesText, "Sem dados carregados.");
    setText(descriptionText, "Sem descrição disponível.");
    setText(followersText, "Sem dados carregados.");
    setText(friendsText, "Sem dados carregados.");
  }

  async function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        mode: "cors",
        credentials: "omit",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          ...(options.headers || {})
        }
      });
      return response;
    } finally {
      clearTimeout(timer);
    }
  }

  async function fetchRobloxProfile(username) {
    const lookupResponse = await fetchWithTimeout(
      "https://users.roblox.com/v1/usernames/users",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          usernames: [username],
          excludeBannedUsers: false
        })
      },
      12000
    );

    if (!lookupResponse.ok) {
      throw new Error(`lookup_failed_${lookupResponse.status}`);
    }

    const lookupData = await lookupResponse.json();
    const user = lookupData?.data?.[0];
    if (!user?.id) {
      throw new Error("user_not_found");
    }

    const detailsResponse = await fetchWithTimeout(
      `https://users.roblox.com/v1/users/${encodeURIComponent(user.id)}`,
      {
        method: "GET"
      },
      12000
    );

    if (!detailsResponse.ok) {
      throw new Error(`details_failed_${detailsResponse.status}`);
    }

    const details = await detailsResponse.json();
    const id = details.id || user.id;

    return {
      id,
      name: details.name || user.name || username,
      displayName: details.displayName || user.displayName || user.name || username,
      created: details.created || "",
      description: details.description || "",
      avatarUrl: `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${encodeURIComponent(id)}&size=420x420&format=Png&isCircular=false`,
      openUrl: `https://www.roblox.com/users/${encodeURIComponent(id)}/profile`,
      score: scoreFromAge(details.created)
    };
  }

  async function search(username) {
    const clean = normalizeUsername(username);

    if (!isValidUsername(clean)) {
      showFriendlyError("Digite um username válido entre 3 e 20 caracteres.", clean);
      return;
    }

    const cached = loadCache(clean);
    if (cached) {
      renderProfile(cached);
      clearTabsContent();
      setText(infoText, "Carregado do cache local.");
      return;
    }

    setBusy(true);

    try {
      const profile = await fetchRobloxProfile(clean);
      saveCache(profile);
      renderProfile(profile);
    } catch (error) {
      console.error(error);
      showFriendlyError(
        "Não foi possível carregar os dados públicos neste momento. O site continua funcionando sem quebrar.",
        clean
      );
    } finally {
      setBusy(false);
    }
  }

  function setActiveTab(tabId) {
    tabs.forEach((tab) => {
      const active = tab.dataset.tab === tabId;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });

    panels.forEach((panel) => {
      panel.classList.toggle("active", panel.id === tabId);
    });
  }

  function attachEvents() {
    if (themeBtn) {
      themeBtn.addEventListener("click", () => {
        const current = document.documentElement.getAttribute("data-theme") || "light";
        setTheme(current === "light" ? "dark" : "light");
      });
    }

    if (form) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        search(input ? input.value : "");
      });
    }

    chips.forEach((chip) => {
      chip.addEventListener("click", () => {
        if (input) {
          input.value = chip.dataset.user || "";
          input.focus();
        }
      });
    });

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        setActiveTab(tab.dataset.tab || "info");
      });
    });

    if (input) {
      input.addEventListener("input", () => {
        const clean = normalizeUsername(input.value);
        if (clean !== input.value) input.value = clean;
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener("click", async () => {
        if (!currentProfile?.name) return;

        try {
          await navigator.clipboard.writeText(currentProfile.name);
          setText(infoText, "Nome copiado para a área de transferência.");
        } catch {
          setText(infoText, "Não foi possível copiar agora.");
        }
      });
    }
  }

  function init() {
    loadTheme();
    attachEvents();
    clearTabsContent();
    showElement(emptyState);
    hideElement(profileView);

    // Mantém a aba inicial em "Informações"
    setActiveTab("info");
    setText(themeBtnText, (document.documentElement.getAttribute("data-theme") === "dark") ? "☀️ Tema" : "🌙 Tema");
  }

  init();
})();
