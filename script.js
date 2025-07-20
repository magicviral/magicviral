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
  return num.toString();
}

function formatDateAgo(dateStr) {
  const now = new Date();
  const past = new Date(dateStr);
  const diffMs = now - past;
  const diffDays = Math.floor(diffMs / (1000*60*60*24));
  if(diffDays === 0) return "Today";
  if(diffDays === 1) return "1 day ago";
  if(diffDays < 30) return `${diffDays} days ago`;
  return past.toLocaleDateString();
}

function formatDuration(isoDuration) {
  // ISO 8601 duration format PT#H#M#S
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "N/A";
  const hours = match[1] ? parseInt(match[1]) : 0;
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const seconds = match[3] ? parseInt(match[3]) : 0;
  let result = "";
  if (hours > 0) result += hours + ":";
  result += (hours > 0 && minutes < 10 ? "0" : "") + minutes + ":";
  result += seconds < 10 ? "0" + seconds : seconds;
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
  const query = "music";
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

    let shownCount = 0;
    data.items.forEach(item => {
      const vid = item.id.videoId;
      const snippet = item.snippet;
      const vDetails = videoDetails[vid] || {};
      const cDetails = channelDetails[snippet.channelId] || {};

      // Filters
      if ((vDetails.viewCount || 0) < minViews) return;
      if (cDetails.subscriberCount < minSubscribers || cDetails.subscriberCount > maxSubscribers) return;

      // Calculate view-to-subscriber ratio safely
      let viewToSubRatio = "N/A";
      if(cDetails.subscriberCount > 0) {
        viewToSubRatio = (vDetails.viewCount / cDetails.subscriberCount).toFixed(2);
      }

      const card = document.createElement("div");
      card.className = "result-card";

      card.innerHTML = `
        <a href="https://www.youtube.com/watch?v=${vid}" target="_blank" rel="noopener noreferrer">
          <img src="${snippet.thumbnails.medium.url}" alt="thumbnail" />
          <div class="video-info">
            <h3>${snippet.title}</h3>
            <p><strong>Channel:</strong> ${snippet.channelTitle}</p>
            <p><strong>Channel Created:</strong> ${new Date(cDetails.channelCreationDate).toLocaleDateString()}</p>
            <p><strong>Published:</strong> ${formatDateAgo(snippet.publishedAt)}</p>
            <p><strong>Duration:</strong> ${formatDuration(vDetails.duration)}</p>
            <p><strong>Views:</strong> ${formatNumber(vDetails.viewCount || 0)}</p>
            <p><strong>Likes:</strong> ${formatNumber(vDetails.likeCount || 0)}</p>
            <p><strong>Subscribers:</strong> ${formatNumber(cDetails.subscriberCount || 0)}</p>
            <p><strong>View/Sub Ratio:</strong> ${viewToSubRatio}</p>
          </div>
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
