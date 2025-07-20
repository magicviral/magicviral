const API_KEY = "AIzaSyCx9SLWIBvFsssaK7smMIlOfH9mv0WjNBM";  // Replace with your key
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

async function searchVideos() {
  const query = "music";  // simple test
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("key", "YOUR_API_KEY");
  url.searchParams.set("q", query);
  url.searchParams.set("part", "snippet");
  url.searchParams.set("maxResults", "5");
  url.searchParams.set("type", "video");

  const res = await fetch(url);
  const data = await res.json();

  console.log(data);  // check console

  const container = document.getElementById("results");
  container.innerHTML = "";

  if(!data.items || data.items.length === 0) {
    container.innerHTML = "<p>No videos found.</p>";
    return;
  }

  data.items.forEach(item => {
    const vid = item.id.videoId;
    const snippet = item.snippet;
    const card = document.createElement("div");
    card.innerHTML = `<a href="https://www.youtube.com/watch?v=${vid}" target="_blank">${snippet.title}</a>`;
    container.appendChild(card);
  });
}
