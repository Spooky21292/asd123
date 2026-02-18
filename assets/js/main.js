const state = {
  currentFilter: 'all',
  searchQuery: '',
  visibleQuotes: [...quotes],
  currentIndex: 0,
  favorites: new Set(JSON.parse(localStorage.getItem('quotesVaultFavorites') || '[]'))
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
  let result = quotes;

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
  counter.textContent = `Показано: ${shown} из ${quotes.length}`;
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
  localStorage.setItem('quotesVaultFavorites', JSON.stringify(Array.from(state.favorites)));
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
  const now = new Date();
  const dayStamp = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  const seed = [...dayStamp].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const index = seed % quotes.length;
  return quotes[index];
}

function showQuoteOfTheDay() {
  const quoteOfDay = getQuoteOfTheDay();
  const visibleIndex = state.visibleQuotes.findIndex((item) => item.id === quoteOfDay.id);

  if (visibleIndex === -1) {
    state.currentFilter = 'all';
    state.searchQuery = '';
    searchInput.value = '';
    categoryButtons.forEach((btn) => btn.classList.toggle('is-active', btn.dataset.filter === 'all'));
    state.visibleQuotes = [...quotes];
    state.currentIndex = quotes.findIndex((item) => item.id === quoteOfDay.id);
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

renderQuote(false);
