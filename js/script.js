// Find our date picker inputs on the page
const startInput = document.getElementById('startDate');
const endInput = document.getElementById('endDate');
const getImagesButton = document.getElementById('getImagesButton');
const gallery = document.getElementById('gallery');
const spaceFact = document.getElementById('spaceFact');
const imageModal = document.getElementById('imageModal');
const closeModalButton = document.getElementById('closeModalButton');
const modalImage = document.getElementById('modalImage');
const modalTitle = document.getElementById('modalTitle');
const modalDate = document.getElementById('modalDate');
const modalExplanation = document.getElementById('modalExplanation');

const apiUrl = 'https://science.nasa.gov/wp-json/wp/v2/apod-basic/?api_key=DEMO_KEY';
const selectedStartDate = '2025-02-01';
const selectedEndDate = '2025-02-09';
let selectedItems = [];
let requestNumber = 0;
let lastFocusedElement;

const spaceFacts = [
  'A day on Venus is longer than a year on Venus.',
  'Neutron stars are so dense that a teaspoon of their material would weigh about a billion tons.',
  'The footprints left by Apollo astronauts on the Moon could remain for millions of years.',
  'Jupiter is the largest planet in our solar system.',
  'There are more stars in the universe than grains of sand on all of Earth’s beaches.',
  'Saturn would float in water because its average density is lower than water.'
];

// Call the setupDateInputs function from dateRange.js
// This sets up the date pickers to:
// - Default to a range of 9 days (from 9 days ago to today)
// - Restrict dates to NASA's image archive (starting from 1995)
setupDateInputs(startInput, endInput);
startInput.value = selectedStartDate;
endInput.value = selectedEndDate;
spaceFact.textContent = spaceFacts[Math.floor(Math.random() * spaceFacts.length)];

// Fetch the pages that can contain the selected dates.
async function getApodItems(startDate, endDate) {
  const firstPageResponse = await fetch(`${apiUrl}&page=1`);

  if (!firstPageResponse.ok) {
    throw new Error('Unable to load images from NASA.');
  }

  const firstPageItems = await firstPageResponse.json();
  const newestDate = new Date(firstPageItems[0].date);
  const lastSelectedDate = new Date(endDate);
  const daysFromNewest = Math.max(0, Math.ceil((newestDate - lastSelectedDate) / 86400000));
  const estimatedPage = Math.max(1, Math.floor(daysFromNewest / 25) + 1);
  const totalPages = Number(firstPageResponse.headers.get('X-WP-TotalPages'));
  const firstPage = Math.max(1, estimatedPage - 1);
  const lastPage = Math.min(estimatedPage + 1, totalPages);
  const pageRequests = [];

  for (let page = firstPage; page <= lastPage; page += 1) {
    pageRequests.push(fetch(`${apiUrl}&page=${page}`));
  }

  const pageResponses = await Promise.all(pageRequests);

  if (pageResponses.some((response) => !response.ok)) {
    throw new Error('Unable to load images from NASA.');
  }

  const pageItems = await Promise.all(pageResponses.map((response) => response.json()));
  return [firstPageItems, ...pageItems].flat().filter((item) => {
    return item.date >= startDate && item.date <= endDate && item.media_type === 'image';
  });
}

// Fetch the APOD records and display the images in the selected date range.
async function getSpaceImages() {
  const startDate = startInput.value;
  const endDate = endInput.value;
  const currentRequest = requestNumber + 1;
  requestNumber = currentRequest;

  if (!startDate || !endDate) {
    gallery.innerHTML = '<div class="placeholder"><p>Please select a start and end date.</p></div>';
    return;
  }

  gallery.innerHTML = '<div class="placeholder"><p>Loading space images...</p></div>';

  try {
    const apodItems = await getApodItems(startDate, endDate);

    if (currentRequest !== requestNumber) {
      return;
    }

    selectedItems = apodItems.filter((item, index, items) => {
      return items.findIndex((otherItem) => otherItem.date === item.date) === index;
    });

    if (selectedItems.length === 0) {
      gallery.innerHTML = '<div class="placeholder"><p>No space images were found for these dates.</p></div>';
      return;
    }

    gallery.innerHTML = selectedItems.map((item, index) => `
      <article class="gallery-item" data-index="${index}" tabindex="0" role="button" aria-label="View details for ${item.title}">
        <img src="${item.hdurl || item.url}" alt="${item.alt || item.title}">
        <p><strong>${item.title}</strong></p>
        <p>${item.date}</p>
      </article>
    `).join('');
  } catch (error) {
    gallery.innerHTML = `<div class="placeholder"><p>${error.message}</p></div>`;
  }
}

// Fill the modal with the selected photo's details and show it.
function openModal(item) {
  if (!item) {
    return;
  }

  const explanationText = document.createElement('div');
  explanationText.innerHTML = item.explanation || '';

  lastFocusedElement = document.activeElement;
  modalImage.src = item.hdurl || item.url;
  modalImage.alt = item.alt || item.title;
  modalTitle.textContent = item.title;
  modalDate.textContent = item.date;
  modalExplanation.textContent = explanationText.textContent;
  imageModal.hidden = false;
  closeModalButton.focus();
}

function closeModal() {
  imageModal.hidden = true;

  if (lastFocusedElement) {
    lastFocusedElement.focus();
  }
}

gallery.addEventListener('click', (event) => {
  const galleryItem = event.target.closest('.gallery-item');

  if (galleryItem) {
    openModal(selectedItems[galleryItem.dataset.index]);
  }
});

gallery.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    openModal(selectedItems[event.target.dataset.index]);
  }
});

closeModalButton.addEventListener('click', closeModal);
imageModal.addEventListener('click', (event) => {
  if (event.target === imageModal) {
    closeModal();
  }
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !imageModal.hidden) {
    closeModal();
  }
});

getImagesButton.addEventListener('click', getSpaceImages);
