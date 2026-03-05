import { isVideo } from "./extension.js";
const torbox_api_base = "https://api.torbox.app/v1";

async function torbox_CreateTorrent(TORBOX_API_KEY, magnet) {
  // CreateTorrent = `${torbox_api_base}/api/torrents/createtorrent`
  // getCachedAvailability = `${torbox_api_base}/api/torrents/checkcached?format=list&list_files=true`;
  console.log("Hit torbox_CreateTorrent");

  const url = new URL(`${torbox_api_base}/api/torrents/createtorrent`);
  url.search = new URLSearchParams({
    format: "list",
    list_files: true,
  }).toString();

  const formData = new FormData();
  formData.append("magnet", magnet);
  formData.append("add_only_if_cached", "true");

  let response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${TORBOX_API_KEY}` },
    body: formData,
  });
  const result = await response.json();
  // const available_hashes = Object.values(data.data).map(item => item);
  if (result.data && result.data.torrent_id) {
    return result.data.torrent_id;
  }
  return new Error("Torrent Creation Failed.");
}

async function torbox_mylist(TORBOX_API_KEY, torrentId) {
  // GetTorrentList = `${torbox_api_base}/api/torrents/mylist?id=14487314`
  console.log("Hit torbox_mylist");

  const url = new URL(`${torbox_api_base}/api/torrents/mylist`);
  url.search = new URLSearchParams({ id: torrentId }).toString();

  let response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TORBOX_API_KEY}`,
    },
  });

  const result = await response.json();
  if (result.data) {
    return result.data;
  }
  return new Error("Torrent Not Cached in My List");
}

async function torbox_requestDownloadLink(
  TORBOX_API_KEY,
  torrent_id,
  torrent_file_id,
) {
  // requestDownloadLink = `${torbox_api_base}/api/torrents/requestdl?token=${TORBOX_API_KEY}&torrent_id=${torrent_id}&file_id=${torrent_file_id}&redirect=true`
  return `${torbox_api_base}/api/torrents/requestdl?token=${TORBOX_API_KEY}&torrent_id=${torrent_id}&file_id=${torrent_file_id}&redirect=true`;
}

export async function GeneratingRequestDownloadLink(
  TORBOX_API_KEY,
  magnetLink,
) {
  try {
    if (magnetLink) {
      const torrentId = await torbox_CreateTorrent(TORBOX_API_KEY, magnetLink);

      const torrent_folder_data = await torbox_mylist(
        TORBOX_API_KEY,
        torrentId,
      );
      const torrent_files_data = torrent_folder_data.files;
      const sorted = torrent_files_data
        .filter((ele) => isVideo(ele.short_name))
        .sort((a, b) => b.size - a.size);
      const torrent_file_id = sorted[0].id;
      const RequestDownloadLink = await torbox_requestDownloadLink(
        TORBOX_API_KEY,
        torrentId,
        torrent_file_id,
      );
      return RequestDownloadLink;
    }
  } catch {
    return new Error("Torrent not Cached in TB.");
  }
}

export async function torbox_chech_availability(TORBOX_API_KEY, hashes) {
  // getCachedAvailability = `${torbox_api_base}/api/torrents/checkcached?format=list&list_files=true`;
  console.log("Hit torbox_chech_availability");
  
  const url = new URL(`${torbox_api_base}/api/torrents/checkcached`);
  url.search = new URLSearchParams({
    format: "list",
    list_files: true,
  }).toString();

  let respone = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TORBOX_API_KEY}`,
    },
    body: JSON.stringify({ hashes: hashes }),
  });

  let data = await respone.json();

  const available_hashes = Object.values(data.data).map((item) => item.hash);
  return available_hashes;
}
