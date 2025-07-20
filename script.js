const API_KEY = "AIzaSyDvjYH0UyTxioqSOhsnF9czRNERDr2Z2UY";  // Replace with your key
const MAX_RESULTS = 12;

function getPublishedAfter(option) {
  const now = new Date();
  switch (option) {
    case 'today': now.setHours(0,0,0,0); break;
    case 'this_week': now.setDate(now.getDate()-7); break;
    case 'this_month': now.setDate(now.getDate()-30); break;
    default: return '';
  }
  return now.toISOString();
}

function formatNumber(num) {
  if (num >= 1_000_000) return (num/1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num/1_000).toFixed(1) + "K";
  return num;
}

function formatDate(dateStr) {
  return dateStr ? new Date(dateStr).toLocaleDateString() : "N/A";
}

async function fetchVideoDetails(videoIds) {
  if (videoIds.length === 0) return {};
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("key", API_KEY);
  url.searchParams.set("id", videoIds.join(","));
  url.searchParams.set("part", "statistics,contentDetails");
  const res = await fetch(url);
  const data = await res.json();
  console.log("Video details response:", data);
  const map = {};
  if(data.items) {
    data.items.forEach(item => {
      map[item.id] = {
        viewCount: parseInt(item.statistics.viewCount || 0),
        likeCount: parseInt(item.statistics.likeCount || 0),
        duration: item.contentDetails.duration
      };
    });
  }
  return map;
}

async function fetchChannelDetails(channelIds) {
  if(channelIds.length === 0) return {};
  const url = new URL("https://www.googleapis.com/youtube/v3/channels");
  url.searchParams.set("key", API_KEY);
  url.searchParams.set("id", channelIds.join(","));
  url.searchParams.set("part", "statistics,snippet");
  const res = await fetch(url);
  const data = await res.json();
  console.log("Channel details response:", data);
  const map = {};
  if(data.items) {
    data.items.forEach(item => {
      map[item.id] = {
        subscriberCount: parseInt(item.statistics.subscriberCount || 0),
        channelCreationDate: item.snippet.publishedAt
      };
    });
  }
  return map;
}

async function searchVideos() {
  const uploadDate = document.getElementById("uploadDate").value || "this_week";
  const minViews = parseInt(document.getElementById("minViews").value) || 0;
  const minSubs = parseInt(document.getElementById("minSubs").value);
  const maxSubs = parseInt(document.getElementById("maxSubs").value);

  const minSubscribers = isNaN(minSubs) ? 0 : minSubs;
  const maxSubscribers = isNaN(maxSubs) ? 1000000000 : maxSubs;

  const publishedAfter = getPublishedAfter(uploadDate);
  const query = "viral ai faceless";
  const url = new URL("https://www.googleapis.com/youtube/v3/search");

  url.searchParams.set("key", API_KEY);
  url.searchParams.set("q", query);
  url.searchParams.set("part", "snippet");
  url.searchParams.set("maxResults", MAX_RESULTS.toString());
  url.searchParams.set("type", "video");
  if (publishedAfter) url.searchParams.set("publishedAfter", publishedAfter);

  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log("Search API response:", data);

    if (!data.items || data.items.length === 0) {
      document.getElementById("results").innerHTML = "<p>No videos found.</p>";
      return;
    }

    console.log("Videos from API before filtering:", data.items);

    const videoIds = data.items.map(item => item.id.videoId);
    const channelIds = [...new Set(data.items.map(item => item.snippet.channelId))];

    const videoDetails = await fetchVideoDetails(videoIds);
    const channelDetails = await fetchChannelDetails(channelIds);

    const container = document.getElementById("results");
    container.innerHTML = "";

    let shownCount = 0;
    data.items.forEach(item => {
      const vid = item.id.videoId;
      const snippet = item.snippet;
      const vDetails = videoDetails[vid] || {};
      const cDetails = channelDetails[snippet.channelId] || {};

      // LOOSEN FILTERS for testing
      if ((vDetails.viewCount || 0) < minViews) return;
      if (cDetails.subscriberCount < minSubscribers || cDetails.subscriberCount > maxSubscribers) return;

      const card = document.createElement("div");
      card.className = "result-card";

      card.innerHTML = `
        <a href="https://www.youtube.com/watch?v=${vid}" target="_blank" rel="noopener noreferrer">
          <img src="${snippet.thumbnails.medium.url}" alt="thumbnail" />
          <h3>${snippet.title}</h3>
          <p>Channel: ${snippet.channelTitle}</p>
          <p>Published: ${formatDate(snippet.publishedAt)}</p>
          <p>Views: ${formatNumber(vDetails.viewCount || 0)}</p>
          <p>Subscribers: ${formatNumber(cDetails.subscriberCount || 0)}</p>
          <p>Channel Created: ${formatDate(cDetails.channelCreationDate)}</p>
        </a>
      `;
      container.appendChild(card);
      shownCount++;
    });

    if(shownCount === 0) {
      container.innerHTML = "<p>No videos matched the filters.</p>";
    }
  } catch (e) {
    console.error("Error fetching videos:", e);
    document.getElementById("results").innerHTML = "<p>Error fetching videos. Check console.</p>";
  }
}
