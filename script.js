const API_KEY = "AIzaSyCx9SLWIBvFsssaK7smMIlOfH9mv0WjNBM"; // replace with your key

function getPublishedAfter(option) {
  const now = new Date();
  switch (option) {
    case "today":
      now.setHours(0, 0, 0, 0);
      break;
    case "this_week":
      now.setDate(now.getDate() - 7);
      break;
    case "this_month":
      now.setDate(now.getDate() - 30);
      break;
    default:
      return "";
  }
  return now.toISOString();
}

function formatNumber(num) {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return num.toString();
}

async function fetchVideoDetails(videoIds) {
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("key", API_KEY);
  url.searchParams.set("id", videoIds.join(","));
  url.searchParams.set("part", "statistics");
  const res = await fetch(url);
  const data = await res.json();
  // Map videoId => viewCount
  const statsMap = {};
  data.items.forEach((item) => {
    statsMap[item.id] = item.statistics.viewCount;
  });
  return statsMap;
}

async function fetchChannelDetails(channelIds) {
  const url = new URL("https://www.googleapis.com/youtube/v3/channels");
  url.searchParams.set("key", API_KEY);
  url.searchParams.set("id", channelIds.join(","));
  url.searchParams.set("part", "snippet");
  const res = await fetch(url);
  const data = await res.json();
  // Map channelId => channel creation date
  const channelMap = {};
  data.items.forEach((item) => {
    channelMap[item.id] = item.snippet.publishedAt;
  });
  return channelMap;
}

async function searchVideos() {
  const uploadDate = document.getElementById("uploadDate").value;
  const minViews = parseInt(document.getElementById("minViews").value) || 0;
  const minSubs = parseInt(document.getElementById("minSubs").value) || 0;
  const maxSubs = parseInt(document.getElementById("maxSubs").value) || 0;
  const sortOrder = document.getElementById("sortOrder").value;
  const publishedAfter = getPublishedAfter(uploadDate);
  const topic = document.getElementById("topic").value || "viral ai faceless";

  // Search API
  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("key", API_KEY);
  searchUrl.searchParams.set("q", topic);
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("maxResults", "15");
  searchUrl.searchParams.set("type", "video");
  if (publishedAfter) searchUrl.searchParams.set("publishedAfter", publishedAfter);

  const res = await fetch(searchUrl);
  const data = await res.json();

  if (!data.items || data.items.length === 0) {
    document.getElementById("results").innerHTML = "<p>No results found.</p>";
    return;
  }

  // Collect videoIds and channelIds for detail fetch
  const videoIds = data.items.map((item) => item.id.videoId);
  const channelIds = [...new Set(data.items.map((item) => item.snippet.channelId))];

  // Fetch stats & channels details
  const videoStats = await fetchVideoDetails(videoIds);
  const channelDetails = await fetchChannelDetails(channelIds);

  // Filter videos by subscriber count
  // To get subscriber counts, you'd have to call channels API again with statistics part.
  // For demo simplicity, let's skip that or you can add if needed.

  // Prepare results container
  const container = document.getElementById("results");
  container.innerHTML = "";

  // Current date for comparison
  const now = new Date();

  // Build video cards with views and "NEW" badge if channel < 6 months
  data.items.forEach((item) => {
    const vid = item.id.videoId;
    const snippet = item.snippet;
    const views = videoStats[vid] ? parseInt(videoStats[vid]) : 0;
    const channelCreationDate = new Date(channelDetails[snippet.channelId]);
    const monthsSinceCreation = (now.getFullYear() - channelCreationDate.getFullYear()) * 12 + (now.getMonth() - channelCreationDate.getMonth());

    // Skip video if views < minViews (optional)
    if (views < minViews) return;

    // Check for NEW badge (channel < 6 months)
    const isNewChannel = monthsSinceCreation < 6;

    // Format date posted nicely
    const publishedDate = new Date(snippet.publishedAt).toLocaleDateString();

    const card = document.createElement("div");
    card.className = "result-card";

    card.innerHTML = `
      <a href="https://www.youtube.com/watch?v=${vid}" target="_blank" rel="noopener noreferrer">
        <div class="thumbnail-container">
          <img src="${snippet.thumbnails.medium.url}" alt="thumbnail" />
          ${isNewChannel ? `<div class="new-badge">NEW</div>` : ""}
        </div>
        <h3>${snippet.title}</h3>
        <p>${snippet.channelTitle}</p>
        <p>Views: ${formatNumber(views)}</p>
        <p>Uploaded: ${publishedDate}</p>
      </a>
    `;

    container.appendChild(card);
  });
}
