const API_KEY = "AIzaSyAk07jLRTA83i5HdwzVx3qTl2PC00vT5LA"; // Replace with your actual YouTube API key

const YOUTUBE_CATEGORIES = {
  1: "Film & Animation",
  2: "Autos & Vehicles",
  10: "Music",
  15: "Pets & Animals",
  17: "Sports",
  18: "Short Movies",
  19: "Travel & Events",
  20: "Gaming",
  21: "Videoblogging",
  22: "People & Blogs",
  23: "Comedy",
  24: "Entertainment",
  25: "News & Politics",
  26: "Howto & Style",
  27: "Education",
  28: "Science & Technology",
  29: "Nonprofits & Activism",
  30: "Movies",
  31: "Anime/Animation",
  32: "Action/Adventure",
  33: "Classics",
  34: "Comedy",
  35: "Documentary",
  36: "Drama",
  37: "Family",
  38: "Foreign",
  39: "Horror",
  40: "Sci-Fi/Fantasy",
  41: "Thriller",
  42: "Shorts",
  43: "Shows",
  44: "Trailers"
};

function populateCategorySelect() {
  const select = document.getElementById("topicSelect");
  select.innerHTML = `<option value="">Any Category</option>`;
  for (const [id, name] of Object.entries(YOUTUBE_CATEGORIES)) {
    select.innerHTML += `<option value="${id}">${name}</option>`;
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

async function getChannelDetails(channelId) {
  const url = new URL("https://www.googleapis.com/youtube/v3/channels");
  url.searchParams.set("key", API_KEY);
  url.searchParams.set("part", "statistics,snippet");
  url.searchParams.set("id", channelId);

  const res = await fetch(url);
  const data = await res.json();

  if (data.items && data.items.length > 0) {
    return data.items[0];
  } else {
    return null;
  }
}

async function searchVideos() {
  const query = document.getElementById("searchQuery").value.trim();
  const uploadDate = document.getElementById("uploadDate").value;
  const minViews = parseInt(document.getElementById("minViews").value) || 0;
  const minSubs = parseInt(document.getElementById("minSubscribers").value) || 0;
  const maxSubs = parseInt(document.getElementById("maxSubscribers").value);
  const categoryId = document.getElementById("topicSelect").value;

  const publishedAfter = getPublishedAfter(uploadDate);

  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("key", API_KEY);
  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("maxResults", "25");
  searchUrl.searchParams.set("type", "video");
  if (publishedAfter) searchUrl.searchParams.set("publishedAfter", publishedAfter);
  if (categoryId) searchUrl.searchParams.set("videoCategoryId", categoryId);

  const resultsContainer = document.getElementById("results");
  resultsContainer.innerHTML = `<p>Loading...</p>`;

  try {
    const res = await fetch(searchUrl);
    const data = await res.json();

    if (!data.items || data.items.length === 0) {
      resultsContainer.innerHTML = `<p>No results found.</p>`;
      return;
    }

    const maxResultsToShow = 15;
    const itemsToShow = data.items.slice(0, maxResultsToShow);
    const videoIds = itemsToShow.map(item => item.id.videoId).join(',');

    // Fetch video statistics
    const videoStatsUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
    videoStatsUrl.searchParams.set("key", API_KEY);
    videoStatsUrl.searchParams.set("id", videoIds);
    videoStatsUrl.searchParams.set("part", "statistics");

    const videoStatsRes = await fetch(videoStatsUrl);
    const videoStatsData = await videoStatsRes.json();
    const videoStatsMap = {};
    for (const item of videoStatsData.items) {
      videoStatsMap[item.id] = item.statistics;
    }

    resultsContainer.innerHTML = "";

    for (const item of itemsToShow) {
      const vid = item.id.videoId;
      const snippet = item.snippet;
      const channelId = snippet.channelId;
      const viewCount = parseInt(videoStatsMap[vid]?.viewCount || 0);

      if (viewCount < minViews) continue;

      const channelDetails = await getChannelDetails(channelId);

      let subsCount = 0;
      let channelCreatedDate = "N/A";
      if (channelDetails) {
        subsCount = parseInt(channelDetails.statistics.subscriberCount) || 0;
        channelCreatedDate = new Date(channelDetails.snippet.publishedAt).toLocaleDateString();
      }

      if (subsCount < minSubs) continue;
      if (maxSubs !== 0 && subsCount > maxSubs) continue;

      const card = document.createElement("div");
      card.className = "result-card";

      card.innerHTML = `
        <a href="https://www.youtube.com/watch?v=${vid}" target="_blank" rel="noopener noreferrer">
          <img src="${snippet.thumbnails.medium.url}" alt="thumbnail" />
          <div class="video-info">
            <h3>${snippet.title}</h3>
            <p>Channel: ${snippet.channelTitle}</p>
            <p>Views: ${viewCount.toLocaleString()}</p>
            <p>Subscribers: ${subsCount.toLocaleString()}</p>
            <p>Channel Created: ${channelCreatedDate}</p>
            <p>Published: ${new Date(snippet.publishedAt).toLocaleDateString()}</p>
          </div>
        </a>
      `;

      resultsContainer.appendChild(card);
    }

    if (resultsContainer.innerHTML.trim() === "") {
      resultsContainer.innerHTML = `<p>No results matching filters.</p>`;
    }

  } catch (error) {
    resultsContainer.innerHTML = `<p>Error fetching data: ${error.message}</p>`;
  }
}


window.onload = () => {
  populateCategorySelect();
};
