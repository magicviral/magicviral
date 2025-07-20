const API_KEY = "AIzaSyCx9SLWIBvFsssaK7smMIlOfH9mv0WjNBM";  // Replace with your valid API key

// Load YouTube video categories dynamically
async function loadCategories() {
  const url = new URL("https://www.googleapis.com/youtube/v3/videoCategories");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("regionCode", "US");  // Change region as needed
  url.searchParams.set("key", API_KEY);

  try {
    const res = await fetch(url);
    const data = await res.json();

    const select = document.getElementById("topicSelect");
    select.innerHTML = '<option value="">All Topics</option>';

    data.items.forEach(cat => {
      const option = document.createElement("option");
      option.value = cat.id;
      option.textContent = cat.snippet.title;
      select.appendChild(option);
    });
  } catch (error) {
    console.error("Error loading categories:", error);
    const select = document.getElementById("topicSelect");
    select.innerHTML = '<option value="">Failed to load categories</option>';
  }
}

function getPublishedAfter(option) {
  const now = new Date();
  switch (option) {
    case 'today':
      now.setHours(0, 0, 0, 0);
      break;
    case 'this_week':
      now.setDate(now.getDate() - 7);
      break;
    case 'this_month':
      now.setDate(now.getDate() - 30);
      break;
    default:
      return '';
  }
  return now.toISOString();
}

async function fetchChannelDetails(channelId) {
  const url = new URL("https://www.googleapis.com/youtube/v3/channels");
  url.searchParams.set("key", API_KEY);
  url.searchParams.set("id", channelId);
  url.searchParams.set("part", "snippet,statistics");

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.items && data.items.length > 0) {
      return data.items[0];
    }
  } catch (error) {
    console.error("Error fetching channel details:", error);
  }
  return null;
}

async function searchVideos() {
  const query = document.getElementById("searchQuery").value.trim();
  if (!query) {
    document.getElementById("results").innerHTML = "<p>Please enter a search keyword.</p>";
    return;
  }

  const categoryId = document.getElementById("topicSelect").value;
  const uploadDate = document.getElementById("uploadDate").value;
  const minViews = parseInt(document.getElementById("minViews").value) || 0;
  const minSubscribers = parseInt(document.getElementById("minSubscribers").value) || 0;
  const maxSubscribers = parseInt(document.getElementById("maxSubscribers").value) || 1000000000;

  const publishedAfter = getPublishedAfter(uploadDate);

  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("key", API_KEY);
  url.searchParams.set("part", "snippet");
  url.searchParams.set("maxResults", "12");
  url.searchParams.set("type", "video");
  url.searchParams.set("q", query);
  if (publishedAfter) url.searchParams.set("publishedAfter", publishedAfter);
  if (categoryId) url.searchParams.set("videoCategoryId", categoryId);

  const container = document.getElementById("results");
  container.innerHTML = "Loading...";

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!data.items || data.items.length === 0) {
      container.innerHTML = "<p>No videos found.</p>";
      return;
    }

    container.innerHTML = "";

    for (const item of data.items) {
      const vid = item.id.videoId;
      const snippet = item.snippet;

      // Check view count with a separate API call (optional, if you want strict filtering)
      // Skipped here for simplicity; you can add it if needed.

      // Fetch channel info
      const channelData = await fetchChannelDetails(snippet.channelId);
      if (!channelData) continue;

      const subs = parseInt(channelData.statistics.subscriberCount || 0);
      if (subs < minSubscribers || subs > maxSubscribers) continue;

      const publishedDate = new Date(snippet.publishedAt).toLocaleDateString();
      const channelCreation = new Date(channelData.snippet.publishedAt).toLocaleDateString();

      const card = document.createElement("div");
      card.className = "result-card";
      card.innerHTML = `
        <a href="https://www.youtube.com/watch?v=${vid}" target="_blank" rel="noopener noreferrer">
          <img src="${snippet.thumbnails.medium.url}" alt="thumbnail" />
          <div class="video-info">
            <h3>${snippet.title}</h3>
            <p>Channel: ${snippet.channelTitle}</p>
            <p>Subscribers: ${subs.toLocaleString()}</p>
            <p>Channel Created: ${channelCreation}</p>
            <p>Video Published: ${publishedDate}</p>
          </div>
        </a>
      `;
      container.appendChild(card);
    }

  } catch (error) {
    console.error("Error searching videos:", error);
    container.innerHTML = "<p>Error loading videos. Try again later.</p>";
  }
}

window.onload = () => {
  loadCategories();
};
