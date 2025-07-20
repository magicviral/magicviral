const API_KEY = "AIzaSyDvjYH0UyTxioqSOhsnF9czRNERDr2Z2UY";  // Replace with your actual API key
const MAX_RESULTS = 12;

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

function formatNumber(num) {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return num;
}

function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDuration(isoDuration) {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  let h = match[1] ? parseInt(match[1]) : 0;
  let m = match[2] ? parseInt(match[2]) : 0;
  let s = match[3] ? parseInt(match[3]) : 0;
  let result = "";
  if(h > 0) result += h + ":";
  result += (m < 10 && h > 0 ? "0" : "") + m + ":";
  result += s < 10 ? "0" + s : s;
  return result;
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
        commentCount: parseInt(item.statistics.commentCount || 0),
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
  const uploadDate = document.getElementById("uploadDate").value || "";
  const minViews = parseInt(document.getElementById("minViews").value) || 0;
  const minSubs = parseInt(document.getElementById("minSubs").value);
  const maxSubs = parseInt(document.getElementById("maxSubs").value);

  // Safe default values for subscribers filter
  const minSubscribers = isNaN(minSubs) ? 0 : minSubs;
  const maxSubscribers = isNaN(maxSubs) ? 1_000_000_000 : maxSubs;

  const publishedAfter = getPublishedAfter(uploadDate);
  const query = "viral ai faceless"; // example search term, change as needed
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

    const videoIds = data.items.map(item => item.id.videoId);
    const channelIds = [...new Set(data.items.map(item => item.snippet.channelId))];

    const videoDetails = await fetchVideoDetails(videoIds);
    const channelDetails = await fetchChannelDetails(channelIds);

    const container = document.getElementById("results");
    container.innerHTML = "";

    data.items.forEach(item => {
      const vid = item.id.videoId;
      const snippet = item.snippet;
      const vDetails = videoDetails[vid] || {};
      const cDetails = channelDetails[snippet.channelId] || {};

      // Filter videos by subscriber count
      if (cDetails.subscriberCount < minSubscribers || cDetails.subscriberCount > maxSubscribers) return;

      const card = document.createElement("div");
      card.className = "result-card";

      card.innerHTML = `
        <a href="https://www.youtube.com/watch?v=${vid}" target="_blank" rel="noopener noreferrer">
          <img src="${snippet.thumbnails.medium.url}" alt="thumbnail" />
          <h3>${snippet.title}</h3>
          <p>Channel: ${snippet.channelTitle}</p>
          <p class="published-date">Video Published: ${formatDate(snippet.publishedAt)}</p>
          <p>Views: ${formatNumber(vDetails.viewCount || 0)} | Likes: ${formatNumber(vDetails.likeCount || 0)}</p>
          <p>Duration: ${formatDuration(vDetails.duration || "PT0S")}</p>
          <p>Subscribers: ${formatNumber(cDetails.subscriberCount || 0)}</p>
          <p>Channel Created: ${formatDate(cDetails.channelCreationDate)}</p>
        </a>
      `;
      container.appendChild(card);
    });
  } catch (error) {
    console.error("Error fetching videos:", error);
    document.getElementById("results").innerHTML = "<p>Error fetching videos. Check console.</p>";
  }
}
