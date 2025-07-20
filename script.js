const API_KEY = "AIzaSyDvjYH0UyTxioqSOhsnF9czRNERDr2Z2UY";

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

async function searchVideos() {
  const uploadDate = document.getElementById("uploadDate").value;
  const minViews = parseInt(document.getElementById("minViews").value) || 0;
  const minSubscribers = parseInt(document.getElementById("minSubscribers").value) || 0;
  const maxSubscribers = parseInt(document.getElementById("maxSubscribers").value) || Number.MAX_SAFE_INTEGER;
  const sortOrder = document.getElementById("sortOrder").value;
  const publishedAfter = getPublishedAfter(uploadDate);
  const query = "viral ai faceless";

  // Search API call
  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("key", API_KEY);
  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("maxResults", "12");
  searchUrl.searchParams.set("type", "video");
  if (publishedAfter) searchUrl.searchParams.set("publishedAfter", publishedAfter);

  const searchRes = await fetch(searchUrl);
  const searchData = await searchRes.json();

  if (!searchData.items) {
    console.error("No search results.");
    return;
  }

  const container = document.getElementById("results");
  container.innerHTML = "";

  // Collect video and channel IDs
  const videoIds = searchData.items.map(item => item.id.videoId).join(",");
  const channelIds = searchData.items.map(item => item.snippet.channelId).join(",");

  // Get video statistics
  const videoUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
  videoUrl.searchParams.set("key", API_KEY);
  videoUrl.searchParams.set("id", videoIds);
  videoUrl.searchParams.set("part", "snippet,statistics");

  const videoRes = await fetch(videoUrl);
  const videoData = await videoRes.json();

  // Get channel statistics
  const channelUrl = new URL("https://www.googleapis.com/youtube/v3/channels");
  channelUrl.searchParams.set("key", API_KEY);
  channelUrl.searchParams.set("id", channelIds);
  channelUrl.searchParams.set("part", "statistics");

  const channelRes = await fetch(channelUrl);
  const channelData = await channelRes.json();

  // Map channelId to subscriberCount
  const channelSubsMap = {};
  channelData.items.forEach(ch => {
    channelSubsMap[ch.id] = parseInt(ch.statistics.subscriberCount) || 0;
  });

  // Filter videos by views and subscriber counts
  let filteredVideos = videoData.items.filter(video => {
    const subs = channelSubsMap[video.snippet.channelId] || 0;
    const views = parseInt(video.statistics.viewCount) || 0;
    return (
      views >= minViews &&
      subs >= minSubscribers &&
      subs <= maxSubscribers
    );
  });

  // Sort videos by views ascending/descending
  if (sortOrder === "views_desc") {
    filteredVideos.sort((a, b) => b.statistics.viewCount - a.statistics.viewCount);
  } else if (sortOrder === "views_asc") {
    filteredVideos.sort((a, b) => a.statistics.viewCount - b.statistics.viewCount);
  }

  // Render video cards with posted date
  filteredVideos.forEach(video => {
    const snippet = video.snippet;
    const vid = video.id;
    const views = parseInt(video.statistics.viewCount).toLocaleString();
    const subs = channelSubsMap[snippet.channelId].toLocaleString();
    const publishedDate = new Date(snippet.publishedAt).toLocaleDateString();

    const card = document.createElement("div");
    card.className = "result-card";
    card.innerHTML = `
      <a href="https://www.youtube.com/watch?v=${vid}" target="_blank">
        <img src="${snippet.thumbnails.medium.url}" alt="thumbnail" />
        <h3>${snippet.title}</h3>
        <p>${snippet.channelTitle}</p>
        <p><strong>Views:</strong> ${views}</p>
        <p><strong>Subscribers:</strong> ${subs}</p>
        <p><strong>Posted on:</strong> ${publishedDate}</p>
      </a>
    `;
    container.appendChild(card);
  });
}
