const API_KEY = "AIzaSyDvjYH0UyTxioqSOhsnF9czRNERDr2Z2UY"; // Replace with your real API key

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

function sortVideos(videos, sortBy) {
  if (sortBy === "viewCountAsc") {
    return videos.sort((a, b) => a.statistics.viewCount - b.statistics.viewCount);
  } else if (sortBy === "viewCountDesc") {
    return videos.sort((a, b) => b.statistics.viewCount - a.statistics.viewCount);
  } else if (sortBy === "dateDesc") {
    return videos.sort(
      (a, b) => new Date(b.snippet.publishedAt) - new Date(a.snippet.publishedAt)
    );
  }
  return videos;
}

async function searchVideos() {
  const uploadDate = document.getElementById("uploadDate").value;
  const minViews = parseInt(document.getElementById("minViews").value) || 0;
  const minSubs = parseInt(document.getElementById("minSubscribers").value) || 0;
  const maxSubs = parseInt(document.getElementById("maxSubscribers").value) || Infinity;
  const sortBy = document.getElementById("sortBy").value;

  const publishedAfter = getPublishedAfter(uploadDate);
  const query = "viral ai faceless"; // your search keywords

  // Step 1: Search videos by keyword
  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("key", API_KEY);
  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("maxResults", "20");
  searchUrl.searchParams.set("type", "video");
  if (publishedAfter) searchUrl.searchParams.set("publishedAfter", publishedAfter);

  const searchRes = await fetch(searchUrl);
  const searchData = await searchRes.json();

  if (!searchData.items || searchData.items.length === 0) {
    document.getElementById("results").innerHTML = "<p>No videos found.</p>";
    return;
  }

  // Collect video IDs to fetch statistics
  const videoIds = searchData.items.map((item) => item.id.videoId).join(",");

  // Step 2: Fetch video statistics (views, subscriber counts need separate channel API call)
  const videosUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
  videosUrl.searchParams.set("key", API_KEY);
  videosUrl.searchParams.set("id", videoIds);
  videosUrl.searchParams.set("part", "snippet,statistics");

  const videosRes = await fetch(videosUrl);
  const videosData = await videosRes.json();

  // Step 3: Fetch channel subscriber counts for each video
  const channelIds = [...new Set(videosData.items.map((v) => v.snippet.channelId))];
  const channelsUrl = new URL("https://www.googleapis.com/youtube/v3/channels");
  channelsUrl.searchParams.set("key", API_KEY);
  channelsUrl.searchParams.set("id", channelIds.join(","));
  channelsUrl.searchParams.set("part", "statistics");

  const channelsRes = await fetch(channelsUrl);
  const channelsData = await channelsRes.json();

  const subsMap = {};
  channelsData.items.forEach((channel) => {
    subsMap[channel.id] = parseInt(channel.statistics.subscriberCount || 0);
  });

  // Step 4: Filter videos by min/max subscribers and min views
  let filteredVideos = videosData.items.filter((video) => {
    const views = parseInt(video.statistics.viewCount || 0);
    const subs = subsMap[video.snippet.channelId] || 0;
    return views >= minViews && subs >= minSubs && subs <= maxSubs;
  });

  // Step 5: Sort videos according to selection
  filteredVideos = sortVideos(filteredVideos, sortBy);

  // Step 6: Display results
  const container = document.getElementById("results");
  container.innerHTML = "";

  if (filteredVideos.length === 0) {
    container.innerHTML = "<p>No videos matched your filters.</p>";
    return;
  }

  filteredVideos.forEach((video) => {
    const snippet = video.snippet;
    const views = video.statistics.viewCount;
    const subs = subsMap[snippet.channelId] || 0;
    const publishedDate = new Date(snippet.publishedAt).toLocaleDateString();

    const card = document.createElement("div");
    card.className = "result-card";
    card.innerHTML = `
      <a href="https://www.youtube.com/watch?v=${video.id}" target="_blank" rel="noopener noreferrer">
        <img src="${snippet.thumbnails.medium.url}" alt="Thumbnail" />
        <h3>${snippet.title}</h3>
        <p>Channel: ${snippet.channelTitle} (Subscribers: ${subs.toLocaleString()})</p>
        <p>Views: ${parseInt(views).toLocaleString()}</p>
        <p class="published-date">Uploaded: ${publishedDate}</p>
      </a>
    `;
    container.appendChild(card);
  });
}
