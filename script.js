const API_KEY = "AIzaSyCx9SLWIBvFsssaK7smMIlOfH9mv0WjNBM";  // Replace with your actual API key

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

  const res = await fetch(url);
  const data = await res.json();
  if (data.items && data.items.length > 0) {
    return data.items[0];
  }
  return null;
}

async function searchVideos() {
  const topic = document.getElementById("topicSelect").value;
  const uploadDate = document.getElementById("uploadDate").value;
  const minViews = parseInt(document.getElementById("minViews").value) || 0;
  const minSubscribers = parseInt(document.getElementById("minSubscribers").value) || 0;
  const maxSubscribers = parseInt(document.getElementById("maxSubscribers").value) || 1000000000;

  const publishedAfter = getPublishedAfter(uploadDate);

  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("key", API_KEY);
  url.searchParams.set("q", topic);
  url.searchParams.set("part", "snippet");
  url.searchParams.set("maxResults", "12");
  url.searchParams.set("type", "video");
  if (publishedAfter) url.searchParams.set("publishedAfter", publishedAfter);

  const res = await fetch(url);
  const data = await res.json();

  const container = document.getElementById("results");
  container.innerHTML = "";

  if (!data.items || data.items.length === 0) {
    container.innerHTML = "<p>No videos found.</p>";
    return;
  }

  for (const item of data.items) {
    const vid = item.id.videoId;
    const snippet = item.snippet;

    // Skip if views not fetched yet (optional, or handle separately)
    // Note: YouTube search API does not return viewCount here, would need separate video details API call

    // Fetch channel info for subscriber count and creation date
    const channelData = await fetchChannelDetails(snippet.channelId);
    if (!channelData) continue;

    const subs = parseInt(channelData.statistics.subscriberCount || 0);
    if (subs < minSubscribers || subs > maxSubscribers) continue;

    const publishedDate = new Date(snippet.publishedAt).toLocaleDateString();
    const channelCreation = new Date(channelData.snippet.publishedAt).toLocaleDateString();

    const card = document.createElement("div");
    card.className = "result-card";
    card.innerHTML = `
      <a href="https://www.youtube.com/watch?v=${vid}" target="_blank">
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
}
