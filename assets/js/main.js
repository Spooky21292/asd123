const STORAGE_KEY = 'quotesVaultFavorites';

function readFavoritesFromStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Quotes Vault: localStorage недоступен, избранное сохранено только на время сессии.', error);
    return [];
  }
}

function saveFavoritesToStorage(favoritesSet) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(favoritesSet)));
  } catch (error) {
    console.warn('Quotes Vault: не удалось сохранить избранное в localStorage.', error);
  }
}

const rawQuotes = typeof quotes !== 'undefined' ? quotes : window.quotes;
const dataSource = Array.isArray(rawQuotes) ? rawQuotes : [];
const hasQuoteData = dataSource.length > 0;

const state = {
  currentFilter: 'all',
  searchQuery: '',
  visibleQuotes: [...dataSource],
  currentIndex: 0,
  favorites: new Set(readFavoritesFromStorage())
};

const quoteCard = document.getElementById('quoteCard');
const quoteText = document.getElementById('quoteText');
const quoteAuthor = document.getElementById('quoteAuthor');
const quoteCategory = document.getElementById('quoteCategory');
const quoteSource = document.getElementById('quoteSource');
const quoteTags = document.getElementById('quoteTags');
const counter = document.getElementById('counter');
const favoriteBtn = document.getElementById('favoriteBtn');
const searchInput = document.getElementById('searchInput');
const toastEl = document.getElementById('toast');

const categoryButtons = Array.from(document.querySelectorAll('[data-filter]'));
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const randomBtn = document.getElementById('randomBtn');
const dayBtn = document.getElementById('dayBtn');
const copyBtn = document.getElementById('copyBtn');

function normalize(text) {
  return text.toLowerCase().trim();
}

function getFilteredQuotes() {
  let result = dataSource;

  if (state.currentFilter === 'favorites') {
    result = result.filter((quote) => state.favorites.has(quote.id));
  } else if (state.currentFilter !== 'all') {
    result = result.filter((quote) => quote.category === state.currentFilter);
  }

  const query = normalize(state.searchQuery);
  if (query) {
    result = result.filter((quote) => {
      const tagsJoined = quote.tags.join(' ');
      const haystack = `${quote.text} ${quote.author} ${tagsJoined}`.toLowerCase();
      return haystack.includes(query);
    });
  }

  return result;
}

function updateCounter() {
  const shown = state.visibleQuotes.length === 0 ? 0 : state.currentIndex + 1;
  counter.textContent = `Показано: ${shown} из ${dataSource.length}`;
}

function updateFavoriteButton(quoteId) {
  const isFavorite = state.favorites.has(quoteId);
  favoriteBtn.innerHTML = isFavorite
    ? '<i class="fa-solid fa-star"></i>'
    : '<i class="fa-regular fa-star"></i>';
  favoriteBtn.classList.toggle('is-favorite', isFavorite);
  favoriteBtn.setAttribute(
    'aria-label',
    isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'
  );
}

function renderQuote(withAnimation = true) {
  if (withAnimation) {
    quoteCard.classList.remove('fade-in');
  }

  if (!hasQuoteData) {
    quoteCategory.textContent = 'Цитаты не загружены';
    quoteText.textContent = 'Если страница долго показывает загрузку, проверьте наличие файла assets/js/data.js и обновите страницу (Ctrl/Cmd + Shift + R).';
    quoteAuthor.textContent = '— Quotes Vault';
    quoteSource.textContent = 'Локальный файл данных недоступен';
    quoteTags.textContent = '#проверка #data.js';
    favoriteBtn.disabled = true;
    updateCounter();
    return;
  }

  if (state.visibleQuotes.length === 0) {
    quoteCategory.textContent = 'Нет совпадений';
    quoteText.textContent = 'Попробуйте изменить фильтр или поисковый запрос.';
    quoteAuthor.textContent = '— Quotes Vault';
    quoteSource.textContent = '';
    quoteTags.textContent = '';
    favoriteBtn.disabled = true;
    updateCounter();
    return;
  }

  favoriteBtn.disabled = false;
  const quote = state.visibleQuotes[state.currentIndex];

  quoteCategory.textContent = quote.category;
  quoteText.textContent = `“${quote.text}”`;
  quoteAuthor.textContent = `— ${quote.author}`;
  quoteSource.textContent = quote.sourceHint;
  quoteTags.textContent = `#${quote.tags.join(' #')}`;

  updateFavoriteButton(quote.id);
  updateCounter();

  if (withAnimation) {
    requestAnimationFrame(() => quoteCard.classList.add('fade-in'));
  }
}

function applyFilters(resetIndex = true) {
  state.visibleQuotes = getFilteredQuotes();
  if (resetIndex) {
    state.currentIndex = 0;
  } else if (state.currentIndex >= state.visibleQuotes.length) {
    state.currentIndex = 0;
  }
  renderQuote();
}

function saveFavorites() {
  saveFavoritesToStorage(state.favorites);
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('is-visible');
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    toastEl.classList.remove('is-visible');
  }, 1800);
}

function changeQuote(step) {
  if (state.visibleQuotes.length === 0) return;
  state.currentIndex = (state.currentIndex + step + state.visibleQuotes.length) % state.visibleQuotes.length;
  renderQuote();
}

function showRandomQuote() {
  if (state.visibleQuotes.length < 2) {
    renderQuote();
    return;
  }

  let nextIndex = state.currentIndex;
  while (nextIndex === state.currentIndex) {
    nextIndex = Math.floor(Math.random() * state.visibleQuotes.length);
  }

  state.currentIndex = nextIndex;
  renderQuote();
}

function getQuoteOfTheDay() {
  if (dataSource.length === 0) return null;
  const now = new Date();
  const dayStamp = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  const seed = [...dayStamp].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const index = seed % dataSource.length;
  return dataSource[index];
}

function showQuoteOfTheDay() {
  const quoteOfDay = getQuoteOfTheDay();
  if (!quoteOfDay) {
    showToast('Цитаты не загружены');
    return;
  }
  const visibleIndex = state.visibleQuotes.findIndex((item) => item.id === quoteOfDay.id);

  if (visibleIndex === -1) {
    state.currentFilter = 'all';
    state.searchQuery = '';
    searchInput.value = '';
    categoryButtons.forEach((btn) => btn.classList.toggle('is-active', btn.dataset.filter === 'all'));
    state.visibleQuotes = [...dataSource];
    state.currentIndex = dataSource.findIndex((item) => item.id === quoteOfDay.id);
  } else {
    state.currentIndex = visibleIndex;
  }

  renderQuote();
  showToast('Цитата дня открыта');
}

async function copyCurrentQuote() {
  if (state.visibleQuotes.length === 0) return;
  const quote = state.visibleQuotes[state.currentIndex];
  const payload = `«${quote.text}» — ${quote.author}`;

  try {
    await navigator.clipboard.writeText(payload);
    showToast('Цитата скопирована');
  } catch (error) {
    showToast('Не удалось скопировать автоматически');
  }
}

function setControlsDisabled(isDisabled) {
  categoryButtons.forEach((button) => {
    button.disabled = isDisabled;
  });
  searchInput.disabled = isDisabled;
  prevBtn.disabled = isDisabled;
  nextBtn.disabled = isDisabled;
  randomBtn.disabled = isDisabled;
  dayBtn.disabled = isDisabled;
  copyBtn.disabled = isDisabled;
}

categoryButtons.forEach((button) => {
  button.addEventListener('click', () => {
    state.currentFilter = button.dataset.filter;
    categoryButtons.forEach((btn) => btn.classList.toggle('is-active', btn === button));
    applyFilters(true);
  });
});

searchInput.addEventListener('input', (event) => {
  state.searchQuery = event.target.value;
  applyFilters(true);
});

prevBtn.addEventListener('click', () => changeQuote(-1));
nextBtn.addEventListener('click', () => changeQuote(1));
randomBtn.addEventListener('click', showRandomQuote);
dayBtn.addEventListener('click', showQuoteOfTheDay);
copyBtn.addEventListener('click', copyCurrentQuote);

favoriteBtn.addEventListener('click', () => {
  if (state.visibleQuotes.length === 0) return;

  const currentQuote = state.visibleQuotes[state.currentIndex];
  if (state.favorites.has(currentQuote.id)) {
    state.favorites.delete(currentQuote.id);
    showToast('Удалено из избранного');
  } else {
    state.favorites.add(currentQuote.id);
    showToast('Добавлено в избранное');
  }

  saveFavorites();

  if (state.currentFilter === 'favorites') {
    applyFilters(false);
  } else {
    updateFavoriteButton(currentQuote.id);
  }
});

if (!hasQuoteData) {
  setControlsDisabled(true);
  showToast('Цитаты не загружены: проверьте assets/js/data.js');
}

renderQuote(false);
