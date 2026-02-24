import axios from "axios";

const API_KEY = process.env.API_KEY;

function cleanTitle(title) {
  return title
    ? title.replace(/[^\w\s]/gi, "").replace(/\s+/g, "_")
    : "download";
}

function extractID(url) {
  const regExp =
    /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?v=))([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[7].length === 11 ? match[7] : null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false });
  }

  try {
    const { url, format } = req.body;

    if (!url) {
      return res.json({ success: false, message: "URL kosong" });
    }

    let apiUrl = "";
    let platform = "";

    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      platform = "youtube";
      const endpoint =
        format === "mp3"
          ? "https://api.ferdev.my.id/downloader/ytmp3"
          : "https://api.ferdev.my.id/downloader/ytmp4";

      apiUrl = `${endpoint}?link=${encodeURIComponent(url)}&apikey=${API_KEY}`;
    }

    else if (url.includes("instagram.com")) {
      platform = "instagram";
      apiUrl = `https://api.ferdev.my.id/downloader/instagram?link=${encodeURIComponent(url)}&apikey=${API_KEY}`;
    }

    else if (url.includes("tiktok.com")) {
      platform = "tiktok";
      apiUrl = `https://api.ferdev.my.id/downloader/tiktok?link=${encodeURIComponent(url)}&apikey=${API_KEY}`;
    }

    else {
      return res.json({ success: false, message: "Platform tidak didukung" });
    }

    const response = await axios.get(apiUrl, { timeout: 15000 });
    const result = response.data;

    if (!result.success) {
      return res.json({ success: false, message: "Gagal dari API" });
    }

    let downloadUrl = "";
    let title = "download";
    let thumbnail = null;
    let extension = "mp4";

    if (platform === "youtube") {
      downloadUrl = result.data?.dlink;
      title = cleanTitle(result.data?.metadata?.title);
      thumbnail = `https://img.youtube.com/vi/${extractID(url)}/hqdefault.jpg`;
      extension = format === "mp3" ? "mp3" : "mp4";
    }

    if (platform === "instagram") {
      const igData = result.data;
      downloadUrl = Array.isArray(igData?.dlink)
        ? igData.dlink[0]
        : igData?.dlink;

      title = `instagram_${igData?.metadata?.username || "download"}`;
      extension = igData?.type === "photo" ? "jpg" : "mp4";
      thumbnail = downloadUrl;
    }

    if (platform === "tiktok") {
      downloadUrl = result.data?.play || result.data?.video;
      title = cleanTitle(result.data?.title);
      thumbnail = result.data?.cover;
    }

    if (!downloadUrl) {
      return res.json({ success: false, message: "Link tidak ditemukan" });
    }

    return res.json({
      success: true,
      platform,
      title,
      extension,
      thumbnail,
      download: downloadUrl,
    });

  } catch (err) {
    return res.json({ success: false, message: "Server error" });
  }
}